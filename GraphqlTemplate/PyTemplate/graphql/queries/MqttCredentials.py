from typing import Dict
import logging

import graphene
# from graphene_plugin import patch_object_type

from PyTemplate.graphql import AuthResolver
from PyTemplate.models.MqttCredentialsModel import MqttCredentialsModel

# patch_object_type()
log = logging.getLogger(__name__)


def GetMqttCredentialsProps() -> Dict[str, graphene.Scalar]:
    return {
        'someInputVariable': graphene.String(description="Some input variable."),
    }


class MqttCredentials(graphene.ObjectType):
    username = graphene.String(description="Mqtt username output variable.")
    password = graphene.String(description="Mqtt password output variable.")
    virtualHost = graphene.String(description="RabbitMq virtual host output variable.")

    @staticmethod
    def resolve(info, **kwargs) -> Dict[str, any]:
        if 'someInputVariable' in kwargs:
            log.info(f"Input graphql variable: {kwargs['someInputVariable']}")
        user = AuthResolver.AssertAuth(info)
        return MqttCredentialsModel().Dump()
