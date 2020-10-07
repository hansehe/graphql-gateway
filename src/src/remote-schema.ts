import { HttpLink } from 'apollo-link-http';
const { split } = require('apollo-link')
import { getMainDefinition } from 'apollo-utilities'
import { mergeSchemas } from 'graphql-tools';
import { setContext } from 'apollo-link-context';
import * as ws from 'ws';
import { SubscriptionClient } from 'subscriptions-transport-ws/dist/client';

import fetch from 'node-fetch';
import { introspectSchema, makeRemoteExecutableSchema } from 'graphql-tools';
import { GraphQLSchema } from "graphql";
import { ApolloLink } from 'apollo-link';


export const httpUriToWsUri = (uri: string): string => {
    let wsUri = uri.replace('http:', 'ws:');
    if (uri.startsWith('https:')) {
      wsUri = uri.replace('https:', 'wss:');
    }
    return wsUri;
  }


export const getRemoteSchema =  async (uri: String, websocketUri: String): Promise<GraphQLSchema> => {
    const httpLink = new HttpLink({ uri, fetch });
    const wsLink = new SubscriptionClient(websocketUri, {
        reconnect: true
    }, ws);
    const authLink = setContext((request, previousContext) => {
        if (previousContext.graphqlContext && 
            previousContext.graphqlContext.req && 
            previousContext.graphqlContext.req.headers) {
            const previousHeaders = previousContext.graphqlContext.req.headers;
            return {
                headers: {
                    ...previousHeaders,
                }
            }
        }
        return {}
    })

    const link = split(
        ({query}) => {
            const {kind, operation} = getMainDefinition(query);
            return kind === 'OperationDefinition' && operation === 'subscription'
        },
        wsLink,
        httpLink,
    );
    const schema = await introspectSchema(httpLink);
    const authHttpLink = ApolloLink.from([authLink, link])

    const executableSchema = makeRemoteExecutableSchema({
        schema: schema,
        link: authHttpLink,
    });
    return executableSchema;
}

export const getRemoteSchemas =  async (uris: Array<String>): Promise<GraphQLSchema> => {    
    const schemas = await Promise.all(uris.map(async (uri: string) => {
        let websocketUri = httpUriToWsUri(uri);
        return await getRemoteSchema(
            uri,
            websocketUri);
    }))

    const schema = mergeSchemas({
        schemas: schemas,
    });

    return schema;
}