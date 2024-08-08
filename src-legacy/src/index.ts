// const filterConsole = require('filter-console');

import url from 'url';
import express from 'express';
import { createServer } from 'http'
import { createYoga } from 'graphql-yoga';
import { WebSocketServer } from 'ws'
import { backOff, IBackOffOptions } from "exponential-backoff";
import { envelopWsServer, getGatewaySchema, httpUriToWsUri, subscriptionProtocol } from "./remote-schema";
import { getENV, getENVArray } from "./env";
import { updateSchemaWithMqtt, updateSchemaWithTimer } from "./update-schema";

const start = async () => {
    const uris = getENVArray("GRAPHQL_URL");
    let schema = await getGatewaySchema(uris).catch((e) => {
        console.error(e);
        process.exit(1);
    });

    const host: string = getENV("HOST", "http://localhost");
    const port: string = getENV("PORT", "8181");
    const wsHost = httpUriToWsUri(host);

    const app = express();
    const yogaApp = createYoga({
        schema: schema,
        graphiql: {
            subscriptionsProtocol: subscriptionProtocol
        },
    })

    app.use(yogaApp.graphqlEndpoint, yogaApp);
    app.use('/status/health', (req, res) => res.end(JSON.stringify({healthy: true})));

    const httpServer = createServer(app);
    // const wsServer = new WebSocketServer({
    //     server: httpServer,
    //     path: yogaApp.graphqlEndpoint
    // })
    // const envelopedWsServer = envelopWsServer(wsServer, yogaApp, schema);    

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
            // let updatedSchema: GraphQLSchema | undefined = undefined;
            // if (useBackOffPolicyWithSchemaUpdate) {
            //     updatedSchema = await backOff(() => getRemoteSchemas(uris), backoffOptions);
            // }
            // else {
            //     updatedSchema = await getRemoteSchemas(uris);
            // }
            // if (updatedSchema) {
            //     const schemaDerivedData = await server.generateSchemaDerivedData(updatedSchema);
            //     server.schema = updatedSchema;
            //     server.schemaDerivedData = schemaDerivedData;
            //     server.subscriptionServer.schema = updatedSchema;
            //     console.log('Updated schema');
            // }
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

    httpServer.listen(port, () => {
        console.log(`🚀 Server ready at ${host}:${port}${yogaApp.graphqlEndpoint}`)
        console.log(`🚀 Subscriptions ready at ${wsHost}:${port}${yogaApp.graphqlEndpoint}`)
    })
}

start();