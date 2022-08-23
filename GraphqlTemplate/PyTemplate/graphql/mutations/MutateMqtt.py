from __future__ import annotations
import random
import graphene
# from graphene_plugin import patch_object_type

from PyTemplate import mqtt
from PyTemplate.graphql import AuthResolver

# patch_object_type()


class MutateMqtt(graphene.Mutation):
    class Arguments:
        payload = graphene.String(description="payload.")

    topics = graphene.List(graphene.String, description="Topics that the paylod was sent on.")

    def mutate(self, info, **kwargs) -> MutateMqtt:
        user = AuthResolver.AssertAuth(info)
        payload = kwargs.get('payload', f'some_random_stuff - {random.random()}')
        for subscription in mqtt.SUBSCRIPTIONS:
            mqtt.Publish(topic=subscription, payload=payload)
        return MutateMqtt(topics=mqtt.SUBSCRIPTIONS)
