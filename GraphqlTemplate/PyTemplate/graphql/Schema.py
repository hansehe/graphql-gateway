from typing import Dict

import graphene
from graphene_federation import build_schema
from graphql.utils import schema_printer

from PyTemplate import config
from PyTemplate.graphql.queries.MqttCredentials import MqttCredentials, GetMqttCredentialsProps
from PyTemplate.graphql.mutations.MutateMqtt import MutateMqtt
from PyTemplate.graphql.queries.Random import Random, GetRandomProps
from PyTemplate.graphql.subscriptions.MqttSubscription import MqttSubscription, GetMqttSubscriptionProps


class Query(graphene.ObjectType):
    mqtt_credentials = graphene.Field(MqttCredentials, **GetMqttCredentialsProps())
    if config.GRAPHQL_INCLUDE_RANDOM_SCHEMA:
        random = graphene.Field(Random, **GetRandomProps())

    def resolve_mqtt_credentials(self, info, **kwargs) -> Dict[str, any]:
        return MqttCredentials.resolve(info, **kwargs)

    def resolve_random(self, info, **kwargs) -> Dict[str, any]:
        return Random.resolve(info, **kwargs)


class Mutation(graphene.ObjectType):
    mutate_mqtt = MutateMqtt.Field()


class Subscription(graphene.ObjectType):
    mqtt_subscription = graphene.List(MqttSubscription, **GetMqttSubscriptionProps())

    def resolve_mqtt_subscription(self, info, **kwargs):
        return MqttSubscription.resolve(info, **kwargs)


Schema = build_schema(query=Query, mutation=Mutation, subscription=Subscription)


def GetSchemaSdl(schema: graphene.Schema = Schema):
    schemaSdl = schema_printer.print_schema(schema)
    return schemaSdl


def GetSchemaIntrospection(schema: graphene.Schema = Schema):
    return schema.introspect()
