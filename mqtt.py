import paho.mqtt.client as mqtt
import uuid
import time

# Test code to trig the gateway to update with mqtt.

# Requirements:
#   - pip install paho-mqtt

stopMqttClient = False

# The callback for when the client receives a CONNACK response from the server.
def on_connect(client, userdata, flags, rc):
    print('Connected with result code '+str(rc))

    # Subscribing in on_connect() means that if we lose the connection and
    # reconnect then subscriptions will be renewed.
    client.subscribe('graphql-gateway/update')
    client.publish('graphql-gateway/update', 'Update gateway')

# The callback for when a PUBLISH message is received from the server.
def on_message(client, userdata, msg):
    global stopMqttClient
    print(msg.topic+': '+str(msg.payload.decode('utf-8')))
    stopMqttClient = True


def on_disconnect(client, userdata: object, rc: int):
    print('Disconnected with result code '+str(rc))


def get_client():
    clientId = f'mqtt-test-{uuid.uuid1()}'
    print(clientId)
    client = mqtt.Client(client_id=clientId, transport='websockets')
    client.on_connect = on_connect
    client.on_message = on_message
    client.on_disconnect = on_disconnect

    host = 'localhost'
    port = 15675

    client.ws_set_options(path='/ws', headers=None)
    client.username_pw_set('amqp', password='amqp')
    client.connect(host, port=port, keepalive=3)
    return client

client = get_client()
client.loop_start()

print('Waiting until mqtt message is published and received.')
while not stopMqttClient:
    time.sleep(0.1)
client.loop_stop(force=True)

# Blocking call that processes network traffic, dispatches callbacks and
# handles reconnecting.
# Other loop*() functions are available that give a threaded interface and a
# manual interface.
# client.loop_forever()