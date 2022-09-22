import asyncio

import graphene
import uvicorn

from fastapi import FastAPI
from starlette_graphene3 import GraphQLApp, make_graphiql_handler, make_playground_handler


class User(graphene.ObjectType):
    id = graphene.ID()
    name = graphene.String()


class Query(graphene.ObjectType):
    me = graphene.Field(User)

    def resolve_me(root, info):
        return {"id": "john", "name": "John"}


class FileUploadMutation(graphene.Mutation):
    class Arguments:
        file = graphene.String(required=False)

    ok = graphene.Boolean()

    def mutate(self, info, **kwargs):
        return FileUploadMutation(ok=True)


class Mutation(graphene.ObjectType):
    upload_file = FileUploadMutation.Field()


class Subscription(graphene.ObjectType):
    count = graphene.Int(upto=graphene.Int())

    async def subscribe_count(root, info, upto=3):
        for i in range(10):
            yield i
            await asyncio.sleep(1)


app = FastAPI()
schema = graphene.Schema(query=Query, mutation=Mutation, subscription=Subscription)

app.mount("/", GraphQLApp(schema, on_get=make_graphiql_handler()))  # Graphiql IDE

# app.mount("/", GraphQLApp(schema, on_get=make_playground_handler()))  # Playground IDE
# app.mount("/", GraphQLApp(schema)) # no IDE


uvicorn.run(app, host="0.0.0.0", port=8001)