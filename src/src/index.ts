const express = require( "express" );
import {
  graphqlExpress,
  graphiqlExpress,
} from 'apollo-server-express';
import { execute, subscribe } from 'graphql';
import { createServer } from 'http';
import { SubscriptionServer } from 'subscriptions-transport-ws';

import { getRemoteSchemas } from "./remote-schema/";
import { getENV, getENVArray } from "./env";
import bodyParser = require('body-parser');

const start = async () => {
    const uris = getENVArray("GRAPHQL_URL");
    const schema = await getRemoteSchemas(uris).catch((e) => {
        console.error(e);
        process.exit(1);
    });

    const HOST: string = getENV("HOST", "http://localhost");
    const PORT: string = getENV("PORT", "4000");
    const server = express();

    server.use('/graphql', bodyParser.json(), graphqlExpress({
        schema
    }));

    let WS_HOST = HOST.replace('http:', 'ws:');
    if (HOST.startsWith('https:')) {
        WS_HOST = HOST.replace('https:', 'wss:');
    }
    
    const endpointURL = '/graphql'
    const subscriptionsEndpointUrl = '/graphql'
    const subscriptionsEndpoint = `${WS_HOST}:${PORT}${subscriptionsEndpointUrl}`

    server.use('/graphiql', graphiqlExpress({
        endpointURL: endpointURL,
        subscriptionsEndpoint: subscriptionsEndpoint
    }));

    // Wrap the Express server
    const ws = createServer(server);
    ws.listen(PORT, () => {
        console.log(`Apollo Server is now running on ${HOST}:${PORT}${endpointURL}`);
        console.log(`Apollo Server subscriptions is now running on ${subscriptionsEndpoint}`);
        // Set up the WebSocket for handling GraphQL subscriptions
        new SubscriptionServer({
            execute,
            subscribe,
            schema
        }, {
                server: ws,
                path: subscriptionsEndpointUrl,
            });
    });
}

start();