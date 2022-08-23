import asyncio
import random
import typing

import strawberry
from typing import AsyncGenerator, Optional, List

from strawberry import BasePermission
from strawberry.fastapi import GraphQLRouter
from strawberry.types import Info

from PyTemplate import mqtt
from PyTemplate.graphql import AuthResolver


class IsAuthenticated(BasePermission):
    message = "User is not authenticated"

    # This method can also be async!
    def has_permission(self, source: typing.Any, info: Info, **kwargs) -> bool:
        user = AuthResolver.AssertAuth(info)
        return True


@strawberry.type
class Query:
    @strawberry.field(permission_classes=[IsAuthenticated])
    def hello(self) -> str:
        return "Hello World"


@strawberry.type
class Mutation:
    @strawberry.mutation(permission_classes=[IsAuthenticated])
    def create_flavour(self, payload: Optional[str], info: Info) -> List[str]:
        # user = AuthResolver.AssertAuth(info)
        payload = payload if payload is not None else f'some_random_stuff - {random.random()}'
        for subscription in mqtt.SUBSCRIPTIONS:
            mqtt.Publish(topic=subscription, payload=payload)
        return mqtt.SUBSCRIPTIONS


@strawberry.type
class Subscription:
    @strawberry.subscription
    async def count(self, target: int = 100) -> AsyncGenerator[str, None]:
        queue = asyncio.Queue()

        def on_next(value: dict):
            queue.put_nowait(value.get('payload', None))

        disposable = mqtt.MQTT_MESSAGE_SUBJECT.subscribe(
            on_next=on_next,
        )

        try:
            while True:
                payload = queue.get()
                yield payload
        finally:
            disposable.dispose()


schema = strawberry.federation.Schema(query=Query, mutation=Mutation, subscription=Subscription, enable_federation_2=True)
# schema = strawberry.federation.Schema(query=Query, mutation=Mutation, enable_federation_2=True)
# schema = strawberry.Schema(query=Query, mutation=Mutation, subscription=Subscription)
graphql_app = GraphQLRouter(schema)
