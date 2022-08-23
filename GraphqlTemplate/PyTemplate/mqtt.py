import atexit
import logging
import uuid
import time
from typing import Dict, List, Tuple
from reactivex.subject import Subject

import paho.mqtt.client as mqtt

from PyTemplate import config

log = logging.getLogger(__name__)


SUBSCRIPTIONS: List[str] = ['test_topic']
MQTT_MESSAGE_SUBJECT = Subject()


def OnConnect(client: mqtt.Client, userdata: object, flags: Dict[str, int], rc: int) -> None:
    log.info(f'Connected with result code: {str(rc)}')
    for subscription in SUBSCRIPTIONS:
        client.subscribe(subscription)


def OnMessage(client: mqtt.Client, userdata: object, msg: mqtt.MQTTMessage) -> None:
    log.debug(f"{msg.topic}: {str(msg.payload.decode('utf-8'))}")
    MQTT_MESSAGE_SUBJECT.on_next({
        'topic': msg.topic,
        'payload': str(msg.payload.decode('utf-8'))
    })


def OnDisconnect(client: mqtt.Client, userdata: object, rc: int) -> None:
    log.error(f'Disconnected with result code: {str(rc)}')


def GetMqttClient() -> mqtt.Client:
    clientId = f'mqtt-graphql-template-{uuid.uuid1()}'
    client = mqtt.Client(client_id=clientId)
    return client


def HealthCheck(client: mqtt.Client) -> Tuple[bool, str]:
    if client.is_connected():
        log.debug(f"Health check with rabbitmq mqtt is healthy.")
        return True, "Mqtt is healthy"
    log.debug(f"Health check with rabbitmq mqtt is unhealthy.")
    return False, "Mqtt is unhealthy"


def StopMqttClient(client: mqtt.Client) -> None:
    try:
        client.loop_stop()
    except Exception as exception:
        log.exception(str(exception))


def AssertConnectedClient(client: mqtt.Client,
                          timeoutSec: int = config.RABBITMQ_MQTT_ASSERT_CONNECTED_TIMEOUT_SEC) -> None:
    deadline = time.time() + timeoutSec
    while True:
        if client.is_connected():
            break
        if time.time() > deadline:
            errorMessage = f'Could not connect mqtt with broker within {timeoutSec} seconds.'
            log.error(errorMessage)
            raise Exception(errorMessage)
        time.sleep(0.1)


def InitializeMqttClient(client: mqtt.Client,
                         host: str = config.RABBITMQ_MQTT_HOSTNAME,
                         port: int = config.RABBITMQ_MQTT_PORT,
                         virtualHost: str = config.RABBITMQ_MQTT_VIRTUAL_HOST,
                         username: str = config.RABBITMQ_MQTT_USER,
                         password: str = config.RABBITMQ_MQTT_PASSWORD,
                         keepalive: int = config.RABBITMQ_MQTT_KEEP_ALIVE_SEC,
                         timeoutSec: int = config.RABBITMQ_MQTT_ASSERT_CONNECTED_TIMEOUT_SEC) -> None:

    client.on_connect = OnConnect
    client.on_message = OnMessage
    client.on_disconnect = OnDisconnect

    if client.is_connected():
        StopMqttClient(client)

    if virtualHost is not None:
        username = f'{virtualHost}:{username}'
    client.username_pw_set(username, password=password)
    client.connect(host, port=port, keepalive=keepalive)
    client.loop_start()
    atexit.register(StopMqttClient, client)
    AssertConnectedClient(client, timeoutSec=timeoutSec)


MQTT_CLIENT: mqtt.Client = GetMqttClient()


def Publish(topic: str, payload: str,
            client: mqtt.Client = MQTT_CLIENT) -> None:
    if not(client.is_connected()):
        errorMessage = 'Cannot publish since mqtt is disconnected.'
        log.error(errorMessage)
        raise Exception(errorMessage)

    info = client.publish(topic=topic,
                          payload=payload,
                          retain=True)

    info.wait_for_publish()
