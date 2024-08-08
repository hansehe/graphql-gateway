import { buildHTTPExecutor } from '@graphql-tools/executor-http'
import { schemaFromExecutor } from '@graphql-tools/wrap'
import { stitchSchemas } from '@graphql-tools/stitch'
import { GraphQLSchema } from 'graphql'
import { WebSocketServer } from 'ws'
import { YogaServerInstance } from 'graphql-yoga'
import { useServer } from 'graphql-ws/lib/use/ws'
import { SubscriptionServer } from 'subscriptions-transport-ws'
import { UrlLoader, SubscriptionProtocol } from '@graphql-tools/url-loader';

// See:
// - https://the-guild.dev/graphql/stitching/docs/getting-started/basic-example 
// - https://the-guild.dev/graphql/stitching/docs/getting-started/remote-subschemas
// - Next step is to convert to graphql-sse: https://github.com/enisdenjo/graphql-sse

export const subscriptionProtocol = SubscriptionProtocol.GRAPHQL_SSE;

export const httpUriToWsUri = (uri: string): string => {
    let wsUri = uri.replace('http:', 'ws:');
    if (uri.startsWith('https:')) {
        wsUri = uri.replace('https:', 'wss:');
    }
    return wsUri;
}

export const envelopWsServer = (wsServer: WebSocketServer, yogaApp: YogaServerInstance<{}, {}>, schema: GraphQLSchema): any => {
    if (false) {
        const subscriptionServer = new SubscriptionServer(
            {
                schema: schema,
                execute: (args: any) => args.rootValue.execute(args),
                subscribe: (args: any) => args.rootValue.subscribe(args),
                onOperation: async (ctx, msg) => {
                    console.log('operation', msg);
                    const { schema, execute, subscribe, contextFactory, parse, validate } = yogaApp.getEnveloped(ctx);

                    const args = {
                        schema,
                        operationName: msg.payload.operationName,
                        document: parse(msg.payload.query),
                        variableValues: msg.payload.variables,
                        contextValue: await contextFactory(),
                        rootValue: {
                            execute,
                            subscribe
                        }
                    }

                    const errors = validate(args.schema, args.document)
                    if (errors.length) return errors
                    return args
                }
            },
            {
                server: wsServer,
                path: yogaApp.graphqlEndpoint,
            },
        );
        return subscriptionServer;
    }
    return useServer(
        {
            execute: (args: any) => {
                try {
                    return args.rootValue.execute(args)
                } catch (e) {
                    console.error(e);
                }
            },
            subscribe: (args: any) => {
                try {
                    return args.rootValue.subscribe(args)
                } catch (e) {
                    console.error(e);
                }
            },
            onSubscribe: async (ctx, msg) => {
                try {
                    const { schema, execute, subscribe, contextFactory, parse, validate } = yogaApp.getEnveloped(ctx);

                    const args = {
                        schema,
                        operationName: msg.payload.operationName,
                        document: parse(msg.payload.query),
                        variableValues: msg.payload.variables,
                        contextValue: await contextFactory(),
                        rootValue: {
                            execute,
                            subscribe
                        }
                    }

                    const errors = validate(args.schema, args.document)
                    if (errors.length) return errors
                    return args
                }
                catch (e) {
                    console.error(e);
                }
            }
        },
        wsServer
    )
}

export const buildCombinedExecutor = (uri: string) => {
    const wsUri = httpUriToWsUri(uri);
    const urlLoader = new UrlLoader();
    const executor = urlLoader.getExecutorSync(uri, {
        subscriptionsEndpoint: wsUri,
        subscriptionsProtocol: SubscriptionProtocol.LEGACY_WS,
        headers: (executorRequest) => {
            const headers = executorRequest.context?.req?.headers;
            if (!headers) return {};
            let headersConfig = { ...headers };
            return {
                'host': headersConfig['host'],
                'connection': headersConfig['connection'],
                'accept': headersConfig['accept'],
                'tenant': headersConfig['tenant'],
                'authorization': headersConfig['authorization'],
                'origin': headersConfig['origin'],
                'referer': headersConfig['referer'],
                'cookie': headersConfig['cookie'],
            };
        }
    });
    return executor;
}

export const getSubSchema = async (uri: string) => {
    const combinedExecutor = buildCombinedExecutor(uri);
    const schema = await schemaFromExecutor(combinedExecutor, {
        schemaDescription: true,
        inputValueDeprecation: true,
    })

    const subschema = {
        schema: schema,
        executor: combinedExecutor
    }
    return subschema;
}

export const getGatewaySchema = async (uris: Array<String>): Promise<GraphQLSchema> => {
    const subschemas = await Promise.all(uris.map(async (uri: string) => await getSubSchema(uri)));
    const gatewaySchema = stitchSchemas({
        subschemas: subschemas,
    });
    return gatewaySchema;
}