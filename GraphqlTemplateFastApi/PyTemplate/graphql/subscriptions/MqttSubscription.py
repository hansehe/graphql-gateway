import logging
from typing import Dict, List
from rx.subjects import Subject

import graphene
from graphene_plugin import patch_object_type

from PyTemplate.graphql import AuthResolver
from PyTemplate import mqtt

patch_object_type()
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
    def resolve(info, **kwargs):
        user = AuthResolver.AssertAuth(info, token=kwargs.get('authorization', None))

        def OnMqttUpdate(**kwargs):
            return [kwargs]

        return mqtt.MQTT_MESSAGE_SUBJECT.map(lambda x: OnMqttUpdate(**x))
