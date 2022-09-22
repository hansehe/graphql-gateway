const http = require('http');
const url = require('url');
// const filterConsole = require('filter-console');
import { useServer } from "graphql-ws/lib/use/ws";
import WebSocket, { WebSocketServer } from "ws";
import { ApolloServer, Config, GraphQLOptions } from "apollo-server-express";
import { ApolloServerPluginDrainHttpServer } from "apollo-server-core";
import express from "express"
import {
    ApolloServerPluginLandingPageGraphQLPlayground
} from "apollo-server-core";

import { backOff, IBackOffOptions } from "exponential-backoff";
import { GraphQLSchema } from "graphql";
import { getGatewaySchema, httpUriToWsUri } from "./remote-schema";
import { getENV, getENVArray } from "./env";
import { updateSchemaWithMqtt, updateSchemaWithTimer } from "./update-schema";
import { ExtendedApolloServer } from "./extended-apollo-server";

const start = async () => {
    const uris = getENVArray("GRAPHQL_URL");
    let finalSchema = await getGatewaySchema(uris).catch((e) => {
        console.error(e);
        process.exit(1);
    });

    const HOST: string = getENV("HOST", "http://localhost");
    const PORT: string = getENV("PORT", "4000");

    let WS_HOST = httpUriToWsUri(HOST);

    const app = express();
    const httpServer = http.createServer(app);

    function getApolloServer(schema) {
        return new ApolloServer({
            schema: schema,
            plugins: [
                ApolloServerPluginLandingPageGraphQLPlayground(),
                ApolloServerPluginDrainHttpServer({ httpServer })
            ],
            context: (contextForHttpExecutor) => ({
                type: "http",
                value: contextForHttpExecutor,
            }),
        })
    }

    let apolloServer = getApolloServer(finalSchema);

    // let apolloServer = new ExtendedApolloServer({
    //     schema: finalSchema,
    //     plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
    //     context: (contextForHttpExecutor) => ({
    //       type: "http",
    //       value: contextForHttpExecutor,
    //     }),
    //     schemaCallback: async (req) => {
    //       const schema = await getGatewaySchema(uris);
    //       return schema;
    //     },
    //   });

    await apolloServer.start();
    apolloServer.applyMiddleware({ app, path: "/graphql", cors: true });

    let middleware = apolloServer.getMiddleware({
        path: getENV("GRAPHQL_URL_PATH", '/graphql'),
        bodyParserConfig: {
            limit: getENV("BODY_PARSER_CONFIG_LIMIT", '100mb'),
        }
    });

    // app.use((req, res, next) => {
    //     const pathname = url.parse(req.url).pathname;
    //     if (pathname === '/status/health') {
    //         res.end(JSON.stringify({ healthy: true }))
    //         return
    //     }
    //     middleware(req, res, next);
    // });

    const useBackOffPolicyWithSchemaUpdate: boolean = getENV("GRAPHQL_UPDATE_GATEWAY_USE_BACKOFF_POLICY", "true") === "true";
    const backOffPolicyMaxDelay: number = parseInt(getENV("GRAPHQL_UPDATE_GATEWAY_BACKOFF_POLICY_MAX_DELAY_MS", Infinity));
    const backOffPolicyNumOfAttempts: number = parseInt(getENV("GRAPHQL_UPDATE_GATEWAY_BACKOFF_POLICY_NUM_OF_ATTEMPTS", "10"));

    const backoffOptions: Partial<IBackOffOptions> = {
        maxDelay: backOffPolicyMaxDelay,
        numOfAttempts: backOffPolicyNumOfAttempts,
    }

    let updatingSchemaOngoing = false;
    const updateSchema = async () => {
        if (updatingSchemaOngoing) {
            console.log('Schema update already ongoing..')
            return;
        }
        updatingSchemaOngoing = true;
        try {
            let updatedSchema: GraphQLSchema | undefined = undefined;
            if (useBackOffPolicyWithSchemaUpdate) {
                updatedSchema = await backOff(() => getGatewaySchema(uris), backoffOptions);
            }
            else {
                updatedSchema = await getGatewaySchema(uris);
            }
            if (updatedSchema) {
                // const schemaDerivedData = await server.generateSchemaDerivedData(updatedSchema);
                // server.schema = updatedSchema;
                // server.schemaDerivedData = schemaDerivedData;
                // server.subscriptionServer.schema = updatedSchema;
                console.log('Updated schema');
            }
        } catch (error) {
            console.error(error);
        } finally {
            updatingSchemaOngoing = false;
        }
    }

    const activateUpdateGatewayWithTimer: boolean = getENV("GRAPHQL_UPDATE_GATEWAY_WITH_TIMER", "false") === "true";
    const updateGatewayInterval: number = parseInt(getENV("GRAPHQL_UPDATE_GATEWAY_INTERVAL_MS", "60000"));
    const timer = await updateSchemaWithTimer(
        activateUpdateGatewayWithTimer,
        updateGatewayInterval,
        updateSchema);

    const activateUpdateGatewayWithMqtt: boolean = getENV("GRAPHQL_UPDATE_GATEWAY_WITH_MQTT", "false") === "true";
    const mqttConnectionString: string = getENV("GRAPHQL_UPDATE_GATEWAY_MQTT_CONNECTION_STRING", "ws://rabbitmq:15675/ws");
    const mqttSubscriptionTopic: string = getENV("GRAPHQL_UPDATE_GATEWAY_MQTT_SUBSCRIPTION_TOPIC", "graphql-gateway/update");
    const mqttSubscriptionClientId: string = getENV("GRAPHQL_UPDATE_GATEWAY_MQTT_CLIENT_ID", "mqtt-graphql-gateway");
    const mqttSubscriptionUsername: string | undefined = getENV("GRAPHQL_UPDATE_GATEWAY_MQTT_USERNAME", undefined);
    const mqttSubscriptionPassword: string | undefined = getENV("GRAPHQL_UPDATE_GATEWAY_MQTT_PASSWORD", undefined);
    const mqttClient = await updateSchemaWithMqtt(
        activateUpdateGatewayWithMqtt,
        mqttConnectionString,
        mqttSubscriptionTopic,
        mqttSubscriptionClientId,
        mqttSubscriptionUsername,
        mqttSubscriptionPassword,
        updateSchema);

    // filterConsole(['The addResolveFunctionsToSchema function takes named options now; see IAddResolveFunctionsToSchemaOptions']);

    const server = app.listen(PORT, () => {
        const wsServer = new WebSocketServer({
            noServer: true,
        });

        const wsServerGraphql = new WebSocketServer({
            noServer: true,
        });

        wsServer.on("connection", (ws) => {
            let context: any = {};
        });

        server.on("upgrade", (request, socket, head) => {
            const pathname = request.url;

            if (pathname === "/graphql") {
                wsServerGraphql.handleUpgrade(request, socket, head, (ws) => {
                    wsServerGraphql.emit("connection", ws);
                });
            } else if (pathname === "/") {
                wsServer.handleUpgrade(request, socket, head, (ws) => {
                    wsServer.emit("connection", ws);
                });
            } else {
                socket.destroy();
            }
        });

        useServer(
            {
                schema: finalSchema,
                context: (...contextForWsExecutor) => ({
                    type: "subscription",
                    value: contextForWsExecutor,
                }),
            },
            wsServerGraphql,
        );

        console.log(`🚀 Server ready at ${HOST}:${PORT}/graphql`)
        console.log(`🚀 Subscriptions ready at ${WS_HOST}:${PORT}/graphql`)
    });
}

start();