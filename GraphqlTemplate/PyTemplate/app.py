import logging

from PyTemplate import config
logging.basicConfig(format=config.LOG_FORMAT, level=config.LOG_LEVEL)

from flask import Flask, make_response
from flask_graphql import GraphQLView
from flask_sockets import Sockets
from gevent import pywsgi
from geventwebsocket.handler import WebSocketHandler
from healthcheck import HealthCheck, EnvironmentDump

from graphql_ws.gevent import GeventSubscriptionServer

from PyTemplate import amqp, mqtt
from PyTemplate.graphql import Schema
from PyTemplate.graphql import GraphiQlTemplate

log = logging.getLogger(__name__)

health = HealthCheck()
envdump = EnvironmentDump()

# graphql sockets example: https://github.com/graphql-python/graphql-ws/blob/master/examples/flask_gevent/app.py
app = Flask(__name__)
sockets = Sockets(app)
pikaBusSetup = amqp.GetPikaBusSetup()


def application_data():
    return {"maintainer": "Neate AS",
            "git_repo": "https://github.com/neate-org/neate-template-python"}


envdump.add_section("application", application_data)
health.add_check(lambda: amqp.HealthCheck(pikaBusSetup))
health.add_check(lambda: mqtt.HealthCheck(mqtt.MQTT_CLIENT))

subscription_server = GeventSubscriptionServer(Schema.Schema)
app.app_protocol = lambda environ_path_info: 'graphql-ws'


@sockets.route('/graphql')
def GraphqlWebSocket(ws):
    subscription_server.handle(ws)
    return []


@app.route('/graphql')
def GraphqlPlayground():
    return make_response(GraphiQlTemplate.render_graphiql())


def InitializeApp(app: Flask) -> None:
    app.url_map.strict_slashes = False
    app.add_url_rule('/status/health', 'healthcheck', view_func=lambda: health.run())
    app.add_url_rule('/status/environment', 'environment', view_func=lambda: envdump.run())
    app.add_url_rule('/graphql/schema', view_func=Schema.GetSchemaSdl)
    app.add_url_rule('/graphql/introspection', view_func=Schema.GetSchemaIntrospection)
    app.add_url_rule(
        '/graphql',
        view_func=GraphQLView.as_view(
            'graphql',
            schema=Schema.Schema,
            graphiql=True
        )
    )


def Init():
    # Do any database initialization or such here.
    pass


def Run(runFlask: bool = True) -> Flask:
    amqp.InitializeAmqp(pikaBusSetup)
    mqtt.InitializeMqttClient(mqtt.MQTT_CLIENT)
    InitializeApp(app)
    log.info(f">>>>> Starting graphql server at http://{config.SERVER_HOST}:{config.SERVER_PORT}/graphql <<<<<")
    if runFlask:
        Init()
        server = pywsgi.WSGIServer((config.SERVER_HOST, config.SERVER_PORT), app, handler_class=WebSocketHandler)
        server.serve_forever()
    return app

