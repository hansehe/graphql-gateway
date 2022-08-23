import asyncio
import logging
from typing import Dict, List
from reactivex.subject import Subject

import graphene
# from graphene_plugin import patch_object_type

from PyTemplate.graphql import AuthResolver
from PyTemplate import mqtt

# patch_object_type()
log = logging.getLogger(__name__)
MQTT_SUBSCRIPTION_SUBJECT = Subject()


def GetMqttSubscriptionProps() -> Dict[str, graphene.Scalar]:
    return {
        'authorization': graphene.String(description="Authorization token as jwt."),
    }


class MqttSubscription(graphene.ObjectType):

    topic = graphene.String(description="topic.")
    payload = graphene.String(description="payload.")

    @staticmethod
    async def resolve(info, **kwargs):
        user = AuthResolver.AssertAuth(info, token=kwargs.get('authorization', None))
        queue = asyncio.Queue()

        def on_next(value: dict):
            queue.put_nowait([value])

        disposable = mqtt.MQTT_MESSAGE_SUBJECT.subscribe(
            on_next=on_next,
        )

        try:
            while True:
                payload = queue.get()
                if payload is not None:
                    log.info("sending payload")
                    yield payload
        finally:
            disposable.dispose()

