import { HttpLink } from 'apollo-link-http';
const { split } = require('apollo-link')
import { getMainDefinition } from 'apollo-utilities'
import { mergeSchemas } from 'graphql-tools';
import * as ws from 'ws';
import { SubscriptionClient } from 'subscriptions-transport-ws/dist/client';

import fetch from 'node-fetch';
import { introspectSchema, makeRemoteExecutableSchema } from 'graphql-tools';
import { GraphQLSchema } from "graphql";


export const getRemoteSchema =  async (uri: String, subUri: String): Promise<GraphQLSchema> => {
    const httpLink = new HttpLink({ uri, fetch });
    const wsLink = new SubscriptionClient(subUri, {
        reconnect: true
    }, ws);

    const link = split(
        ({query}) => {
            const {kind, operation} = getMainDefinition(query);
            return kind === 'OperationDefinition' && operation === 'subscription'
        },
        wsLink,
        httpLink,
    );
    const schema = await introspectSchema(httpLink);

    const executableSchema = makeRemoteExecutableSchema({
        schema,
        link,
    });
    return executableSchema;
}

export const getRemoteSchemas =  async (uris: Array<String>): Promise<GraphQLSchema> => {    
    const schemas = await Promise.all(uris.map(async (uri: string) => {
        let websocketUri = uri.replace('http:', 'ws:');
        if (websocketUri.startsWith('https://')) {
            websocketUri = uri.replace('https:', 'wss');
        }
        return await getRemoteSchema(
            uri,
            websocketUri);
    }))

    const schema = mergeSchemas({
        schemas: schemas,
    });

    return schema;
}