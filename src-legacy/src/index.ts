const http = require('http');
const url = require('url');
const { ApolloServer } = require('apollo-server-express');
const express = require('express');
const filterConsole = require('filter-console');

import { backOff, IBackOffOptions } from "exponential-backoff";
import { GraphQLSchema } from "graphql";
import { getRemoteSchemas, httpUriToWsUri } from "./remote-schema";
import { getENV, getENVArray } from "./env";
import { updateSchemaWithMqtt, updateSchemaWithTimer } from "./update-schema";

function getApolloServer(schema) {
    return new ApolloServer({ 
        schema: schema,
        context: async ({ req, connection }) => {
            if (connection) {
                return connection.context;
            } else {
                return {
                    req
                };
            }
        } 
    })
}

const start = async () => {
    const uris = getENVArray("GRAPHQL_URL");
    let schema = await getRemoteSchemas(uris).catch((e) => {
        console.error(e);
        process.exit(1);
    });

    const HOST: string = getENV("HOST", "http://localhost");
    const PORT: string = getENV("PORT", "4000");

    let WS_HOST = httpUriToWsUri(HOST);

    const app = express();
    let server = getApolloServer(schema);

    let middleware = server.getMiddleware({
        path: getENV("GRAPHQL_URL_PATH", '/graphql'),
        bodyParserConfig: {
            limit: getENV("BODY_PARSER_CONFIG_LIMIT", '100mb'),
        }
    });

    app.use((req, res, next) => {
        const pathname = url.parse(req.url).pathname;
        if (pathname === '/status/health') {
            res.end(JSON.stringify({healthy: true}))
            return
        }
        middleware(req, res, next);
    });

    const httpServer = http.createServer(app);
    server.installSubscriptionHandlers(httpServer);

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
                updatedSchema = await backOff(() => getRemoteSchemas(uris), backoffOptions);
            }
            else {
                updatedSchema = await getRemoteSchemas(uris);
            }
            if (updatedSchema) {
                const schemaDerivedData = await server.generateSchemaDerivedData(updatedSchema);
                server.schema = updatedSchema;
                server.schemaDerivedData = schemaDerivedData;
                server.subscriptionServer.schema = updatedSchema;
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

    filterConsole(['The addResolveFunctionsToSchema function takes named options now; see IAddResolveFunctionsToSchemaOptions']);

    httpServer.listen(PORT, () => {
        console.log(`🚀 Server ready at ${HOST}:${PORT}${server.graphqlPath}`)
        console.log(`🚀 Subscriptions ready at ${WS_HOST}:${PORT}${server.subscriptionsPath}`)
    })
}

start();