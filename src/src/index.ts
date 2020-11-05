const http = require('http');
const url = require('url');
const { ApolloServer } = require('apollo-server-express');
const express = require('express');

import { getRemoteSchemas, httpUriToWsUri } from "./remote-schema";
import { getENV, getENVArray } from "./env";

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

    let middleware = server.getMiddleware({});

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

    const activateUpdateGatewayInterval = getENV("GRAPHQL_UPDATE_GATEWAY", "false") === "true";
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
                    server = getApolloServer(schema);
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