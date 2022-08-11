import logging
import time
from typing import List, Tuple

import pika
import pika.exceptions
from PikaBus.PikaErrorHandler import PikaErrorHandler
from PikaBus.abstractions.AbstractPikaErrorHandler import AbstractPikaErrorHandler
from PikaBus.tools import PikaConstants
from PikaBus.PikaBusSetup import PikaBusSetup
from PikaBus.PikaProperties import PikaProperties
from PikaBus.abstractions.AbstractPikaBus import AbstractPikaBus
from PikaBus.abstractions.AbstractPikaBusSetup import AbstractPikaBusSetup

from PyTemplate import config, topics

log = logging.getLogger(__name__)
lastReceivedMessageTimestamp = time.time()


def AmqpMessageHandler(**kwargs) -> None:
    global lastReceivedMessageTimestamp
    lastReceivedMessageTimestamp = time.time()
    pikaBus: AbstractPikaBus = kwargs['bus']
    payload: dict = kwargs['payload']
    headerFrame: pika.BasicProperties = kwargs['data'][PikaConstants.DATA_KEY_INCOMING_MESSAGE][PikaConstants.DATA_KEY_HEADER_FRAME]
    payloadType = headerFrame.type
    log.warning(f'Received amqp type payload: {payloadType}')


def GetConnectionParams() -> pika.ConnectionParameters:
    credentials = pika.PlainCredentials(config.RABBITMQ_AMQP_USER, config.RABBITMQ_AMQP_PASSWORD)
    connParams = pika.ConnectionParameters(
        host=config.RABBITMQ_AMQP_HOSTNAME,
        port=config.RABBITMQ_AMQP_PORT,
        virtual_host=config.RABBITMQ_AMQP_VIRTUAL_HOST,
        credentials=credentials)
    return connParams


def GetPikaBusSetup(pikaErrorHandler: AbstractPikaErrorHandler = None) -> AbstractPikaBusSetup:
    connParams = GetConnectionParams()
    pikaProperties = PikaProperties(headerPrefix=config.RABBITMQ_AMQP_HEADER_PREFIX)
    logging.getLogger("pika").setLevel(config.RABBITMQ_AMQP_PIKA_LOG_LEVEL)
    if pikaErrorHandler is None:
        pikaErrorHandler = PikaErrorHandler(maxRetries=config.RABBITMQ_AMQP_ERROR_HANDLER_MAX_RETRIES,
                                            delay=config.RABBITMQ_AMQP_ERROR_HANDLER_DELAY,
                                            backoff=config.RABBITMQ_AMQP_ERROR_HANDLER_BACKOFF_DELAY)
    pikaBusSetup: AbstractPikaBusSetup = PikaBusSetup(connParams,
                                                      defaultPrefetchCount=config.RABBITMQ_AMQP_PREFETCH_COUNT,
                                                      defaultListenerQueue=config.RABBITMQ_AMQP_LISTENER_QUEUE,
                                                      defaultSubscriptions=topics.GetAmqpSubscriptionTopics(),
                                                      pikaProperties=pikaProperties,
                                                      pikaErrorHandler=pikaErrorHandler)
    return pikaBusSetup


def InitializeAmqp(pikaBusSetup: AbstractPikaBusSetup = None) -> None:
    if pikaBusSetup is None:
        pikaBusSetup = GetPikaBusSetup()
    WaitUntilRabbitLives(pikaBusSetup)
    pikaBusSetup.AddMessageHandler(AmqpMessageHandler)
    pikaBusSetup.StartConsumers(consumerCount=config.RABBITMQ_AMQP_CONSUMERS)


def HealthCheck(pikaBusSetup: AbstractPikaBusSetup) -> Tuple[bool, str]:
    global lastReceivedMessageTimestamp
    try:
        healthy = len(pikaBusSetup.channels) > 0
        log.info(f'nChannels: {len(pikaBusSetup.channels)}, nConnections: {len(pikaBusSetup.connections)}')
        for channelId in pikaBusSetup.channels:
            channel: pika.adapters.blocking_connection.BlockingChannel = pikaBusSetup.channels[channelId]
            log.info(f'Channel {channelId} open: {channel.is_open}, tags: {channel.consumer_tags}')
            healthy &= channel.is_open
        consumerIsHealthy = pikaBusSetup.HealthCheck()
        log.info(f'Consumer status is {consumerIsHealthy}')
        healthy &= consumerIsHealthy
        assert healthy
    except Exception as error:
        log.exception(f"Health check with rabbitmq amqp is unhealthy. {str(error)}")
        return False, "Amqp is unhealthy"
    return True, "Amqp is healthy"


def WaitUntilRabbitLives(pikaBusSetup: AbstractPikaBusSetup, timeoutSec: int = config.RABBITMQ_AMQP_ASSERT_CONNECTED_TIMEOUT_SEC) -> None:
    deadline = time.time() + timeoutSec
    while True:
        if HealthCheck(pikaBusSetup):
            break
        if time.time() > deadline:
            errorMessage = f'Could not connect amqp with broker within {timeoutSec} seconds.'
            log.error(errorMessage)
            raise Exception(errorMessage)
        time.sleep(0.1)
