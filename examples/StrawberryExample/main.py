import asyncio
from typing import AsyncGenerator, Optional, List

import uvicorn
from fastapi import FastAPI
import strawberry
from strawberry.fastapi import GraphQLRouter
from strawberry.types import Info


@strawberry.type
class Query:
    @strawberry.field()
    def hello(self) -> str:
        return "Hello World"


@strawberry.type
class Mutation:
    @strawberry.mutation()
    def create_flavour(self, payload: Optional[str], info: Info) -> List[str]:
        return [payload]


@strawberry.type
class Subscription:
    @strawberry.subscription
    async def count_strawberry(self) -> AsyncGenerator[str, None]:
        for i in range(10):
            yield i
            await asyncio.sleep(1)


schema = strawberry.federation.Schema(query=Query, mutation=Mutation, subscription=Subscription, enable_federation_2=True)
graphqlApp = GraphQLRouter(schema)

app = FastAPI()
app.include_router(graphqlApp, prefix="/graphql")
uvicorn.run(app, host="0.0.0.0", port=8002)
