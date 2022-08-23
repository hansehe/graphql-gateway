import logging

import uvicorn

from PyTemplate import config
from PyTemplate.graphql.Schema import graphql_app

logging.basicConfig(format=config.LOG_FORMAT, level=config.LOG_LEVEL)

from fastapi import FastAPI
from healthcheck import HealthCheck, EnvironmentDump

from PyTemplate import amqp, mqtt
from PyTemplate.graphql import Schema
from PyTemplate.graphql import GraphiQlTemplate

log = logging.getLogger(__name__)

health = HealthCheck()
envdump = EnvironmentDump()

app = FastAPI()
# sockets = Sockets(app)
pikaBusSetup = amqp.GetPikaBusSetup()


def application_data():
    return {"maintainer": "Neate AS",
            "git_repo": "https://github.com/neate-org/neate-template-python"}


envdump.add_section("application", application_data)
health.add_check(lambda: amqp.HealthCheck(pikaBusSetup))
health.add_check(lambda: mqtt.HealthCheck(mqtt.MQTT_CLIENT))

# subscription_server = GeventSubscriptionServer(Schema.Schema)
# app.app_protocol = lambda environ_path_info: 'graphql-ws'


# @sockets.route('/graphql')
# def GraphqlWebSocket(ws):
#     subscription_server.handle(ws)
#     return []


# @app.get('/graphql')
# def GraphqlPlayground():
#     return make_response(GraphiQlTemplate.render_graphiql())


@app.get("/status/health")
def read_root():
    return health.run()


@app.get("/status/environment")
def read_item():
    return envdump.run()


def InitializeApp(app) -> None:
    app.include_router(graphql_app, prefix="/graphql")
    # app.add_route("/graphql", graphql_app)
    # app.add_websocket_route("/graphql", graphql_app)
    # app.add_url_rule('/graphql/schema', view_func=Schema.GetSchemaSdl)
    # app.add_url_rule('/graphql/introspection', view_func=Schema.GetSchemaIntrospection)
    # app.add_url_rule(
    #     '/graphql',
    #     view_func=GraphQLView.as_view(
    #         'graphql',
    #         schema=Schema.Schema,
    #         graphiql=True
    #     )
    # )


def Init():
    # Do any database initialization or such here.
    pass


def Run(runFlask: bool = True) -> None:
    amqp.InitializeAmqp(pikaBusSetup)
    mqtt.InitializeMqttClient(mqtt.MQTT_CLIENT)
    InitializeApp(app)
    log.info(f">>>>> Starting graphql server at http://{config.SERVER_HOST}:{config.SERVER_PORT}/graphql <<<<<")
    if runFlask:
        Init()
        uvicorn.run(app, host="0.0.0.0", port=8001)
    return app

