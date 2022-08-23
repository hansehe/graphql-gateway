import uuid
from typing import List

from PyTemplate import config


def GetAmqpSubscriptionTopics() -> List[str]:
    return [
        GetSomeTypeTopic(),
    ]


def GetSomeTypeTopic(typeId: uuid.UUID = None,
                     mqttTopic: bool = False,
                     rootTopic: str = config.ROOT_TOPIC) -> str:
    topic = f'{rootTopic}.some.type'
    if typeId is None:
        topic += '.*'
    else:
        topic += f'.{str(typeId)}'
    if mqttTopic:
        topic = topic.replace('.', '/')
    return topic

