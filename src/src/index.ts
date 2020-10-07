const http = require('http');
const { ApolloServer } = require('apollo-server-express');
const express = require('express');

import { getRemoteSchemas } from "./remote-schema/";
import { getENV, getENVArray } from "./env";

const start = async () => {
    const uris = getENVArray("GRAPHQL_URL");
    let schema = await getRemoteSchemas(uris).catch((e) => {
        console.error(e);
        process.exit(1);
    });

    const HOST: string = getENV("HOST", "http://localhost");
    const PORT: string = getENV("PORT", "4000");

    let WS_HOST = HOST.replace('http:', 'ws:');
    if (HOST.startsWith('https:')) {
        WS_HOST = HOST.replace('https:', 'wss:');
    }

    const app = express();
    let server = new ApolloServer({ schema })

    let middleware = server.getMiddleware({});

    app.use((req, res, next) => {
        middleware(req, res, next);
    });

    const httpServer = http.createServer(app);
    server.installSubscriptionHandlers(httpServer);

    const activateUpdateGatewayInterval = getENV("GRAPHQL_UPDATE_GATEWAY", "true") === "true";
    const updateGatewayInterval = getENV("GRAPHQL_UPDATE_GATEWAY_INTERVAL_MS", "60000");
    if (activateUpdateGatewayInterval === true)
    {
        setInterval(async () => {
            try {
                const updatedSchema = await getRemoteSchemas(uris).catch((e) => {
                    console.error(e);
                });
                if (updatedSchema) {
                    schema = updatedSchema
                    server = new ApolloServer({ schema })
                    middleware = server.getMiddleware({});
                }
            } catch (error) {
                console.error(error);
            }
        }, updateGatewayInterval);
    }

    httpServer.listen(PORT, () => {
        console.log(`🚀 Server ready at ${HOST}:${PORT}${server.graphqlPath}`)
        console.log(`🚀 Subscriptions ready at ${WS_HOST}:${PORT}${server.subscriptionsPath}`)
    })
}

start();