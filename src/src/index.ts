import { makeExecutableSchema } from "@graphql-tools/schema";
import { stitchSchemas } from "@graphql-tools/stitch";
import { stitchingDirectives } from "@graphql-tools/stitching-directives";
import {
  AsyncExecutor,
  observableToAsyncIterable,
  printSchemaWithDirectives,
} from "@graphql-tools/utils";
import { FilterRootFields, FilterTypes, wrapSchema } from "@graphql-tools/wrap";
import { ApolloServerPluginDrainHttpServer } from "apollo-server-core";
import { ExpressContext } from "apollo-server-express";
import express, { Request } from "express";
import {
  ExecutionArgs,
  getOperationAST,
  OperationTypeNode,
  print,
  printSchema,
} from "graphql";
import gql from "graphql-tag";
import { Context, createClient, SubscribeMessage } from "graphql-ws";
import { useServer } from "graphql-ws/lib/use/ws";
import http from "http";
import fetch from "node-fetch";
import WebSocket, { WebSocketServer } from "ws";
import {
    ApolloServerPluginLandingPageGraphQLPlayground
} from "apollo-server-core";

import { ExtendedApolloServer } from "./extended-apollo-server";

type Headers = Record<string, string | undefined | unknown>;

const createSchema = async (
  microservices: CreateGatewayParameters["microservices"],
  buildHttpHeaders: CreateGatewayParameters["buildHttpHeaders"],
  buildSubscriptionHeaders: CreateGatewayParameters["buildSubscriptionHeaders"],

  fallbackReq?: Request,
) => {
  const { stitchingDirectivesTransformer } = stitchingDirectives();

  const remoteSchemas = await Promise.all(
    microservices.map(async ({ endpoint }) => {
      const httpExecutor: AsyncExecutor = async ({
        document,
        variables,
        operationName,
        extensions,
        context: contextForHttpExecutor,
      }) => {
        const query = print(document);

        const fallback = { req: fallbackReq, res: undefined };

        const isSubscriptionContext =
          contextForHttpExecutor?.type === "subscription";

        const fetchResult = await fetch(`http://${endpoint}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",

            ...(isSubscriptionContext
              ? await buildSubscriptionHeaders?.(
                  contextForHttpExecutor?.value?.[0],
                  contextForHttpExecutor?.value?.[1],
                  contextForHttpExecutor?.value?.[2],
                )
              : await buildHttpHeaders?.(
                  contextForHttpExecutor?.value || fallback,
                )),
          },
          body: JSON.stringify({ query, variables, operationName, extensions }),
        });

        return fetchResult.json();
      };

      const subscriptionClient = createClient({
        url: `ws://${endpoint}`,
        webSocketImpl: WebSocket,
      });

      const wsExecutor: AsyncExecutor = async ({
        document,
        variables,
        operationName,
        extensions,
        context: contextForWsExecutor,
      }) => {
        const subscriptionHeaders = await buildSubscriptionHeaders?.(
          contextForWsExecutor?.value?.[0],
          contextForWsExecutor?.value?.[1],
          contextForWsExecutor?.value?.[2],
        );

        return observableToAsyncIterable({
          subscribe: (observer) => ({
            unsubscribe: subscriptionClient.subscribe(
              {
                query: print(document),
                variables: {
                  ...variables,

                  __headers: subscriptionHeaders,
                } as Record<string, any>,
                operationName,
                extensions,
              },
              {
                next: (data) => observer.next && observer.next(data as any),
                error: (err) => {
                  if (!observer.error) {
                    return;
                  }
                  if (err instanceof Error) {
                    observer.error(err);
                  } else if (err instanceof CloseEvent) {
                    observer.error(
                      new Error(`Socket closed with event ${err.code}`),
                    );
                  } else if (Array.isArray(err)) {
                    // graphQLError[]
                    observer.error(
                      new Error(err.map(({ message }) => message).join(", ")),
                    );
                  }
                },
                complete: () => observer.complete && observer.complete(),
              },
            ),
          }),
        });
      };

      const executor: AsyncExecutor = async (args) => {
        // get the operation node of from the document that should be executed
        const operation = getOperationAST(args.document, args.operationName);
        // subscription operations should be handled by the wsExecutor
        if (operation?.operation === OperationTypeNode.SUBSCRIPTION) {
          return wsExecutor(args);
        }
        // all other operations should be handles by the httpExecutor
        return httpExecutor(args);
      };

      let sdlResponse: any = await httpExecutor({
        document: gql`
          {
            _sdl
          }
        `,
      });

      let sdl = sdlResponse?.data?._sdl;

      if (!sdl) {
        sdlResponse = await httpExecutor({
          document: gql`
            {
              _service 
              {
                sdl
              }
            }
          `,
        });

        sdl = sdlResponse?.data?._service?.sdl;
        if (!sdl) {
          throw new Error("microservice SDL could not be found!");
        }
      }

      const remoteSchema = wrapSchema({
        schema: makeExecutableSchema({ typeDefs: sdl }),
        executor,
      });

      return {
        schema: remoteSchema,
      };
    }),
  );

  // build the combined schema
  const gatewaySchema = stitchSchemas({
    subschemaConfigTransforms: [stitchingDirectivesTransformer],
    subschemas: remoteSchemas,
  });

  const finalSchema = wrapSchema({
    schema: gatewaySchema,
    transforms: [
      new FilterTypes((type) => {
        switch (type.name) {
          case "_Entity":
            return false;

          default:
            return true;
        }
      }),
      new FilterRootFields((operationName, fieldName) => {
        if (operationName === "Query") {
          switch (fieldName) {
            case "_sdl":
              return false;

            default:
              return true;
          }
        }

        return true;
      }),
    ],
  });

  return finalSchema;
};

// eslint-disable-next-line @typescript-eslint/ban-types
type CreateGatewayParameters = {
  port?: number;
  microservices: { endpoint: string }[];

  onWebsocketMessage?: (message: WebSocket.RawData, context: any) => void;
  onWebsocketClose?: (context: any) => void;

  buildHttpHeaders?: ({
    req,
    res,
  }: {
    req: ExpressContext["req"] | undefined;
    res: ExpressContext["res"] | undefined;
  }) => Promise<Headers> | Headers;

  buildSubscriptionHeaders?: (
    context: Context,
    message: SubscribeMessage,
    args: ExecutionArgs,
  ) => Promise<Headers> | Headers;
};

export const createGateway = async ({
  microservices,
  port,
  onWebsocketMessage,
  onWebsocketClose,
  buildHttpHeaders,
  buildSubscriptionHeaders,
}: CreateGatewayParameters) => {
  const finalSchema = await createSchema(
    microservices,
    buildHttpHeaders,
    buildSubscriptionHeaders,
  );

  const app = express();
  const httpServer = http.createServer(app);

  const apolloServer = new ExtendedApolloServer({
    schema: finalSchema,
    plugins: [
        ApolloServerPluginLandingPageGraphQLPlayground(),
        ApolloServerPluginDrainHttpServer({ httpServer })
    ],
    context: (contextForHttpExecutor) => ({
      type: "http",
      value: contextForHttpExecutor,
    }),
    schemaCallback: async (req) => {
      const schema = await createSchema(
        microservices,
        buildHttpHeaders,
        buildSubscriptionHeaders,
        req,
      );

      return schema;
    },
  });

  await apolloServer.start();

  apolloServer.applyMiddleware({ app, path: "/graphql", cors: true });

  const wsServerGraphql = new WebSocketServer({
    server: app,
    path: "/graphql",
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

  app.listen(port || 4000, () => {
    console.log(`🚀 Gateway ready at http://localhost:${port || 4000}/graphql`);
  });

  return {
    expressApp: app,

    executableSchema: finalSchema,

    // an option to print out the schema SDL
    sdl: (options: { withDirectives?: boolean } = {}) =>
      options.withDirectives ?? true
        ? printSchemaWithDirectives(finalSchema)
        : printSchema(finalSchema),
  };
};

(async () => {
    const microservices = await Promise.all([
      {endpoint: 'localhost:5000/graphql'},
      {endpoint: 'localhost:8003/graphql'},
    ]);
  
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { sdl, expressApp, executableSchema } = await createGateway({
      microservices,
  
      onWebsocketMessage: (data) => {
        console.log("received:", data.toString());
      },
      onWebsocketClose: ((context: any) => {
        console.log({ context });
      }) as any,
  
      buildHttpHeaders: async ({ req }) => ({
        "authorization": req?.headers.authorization,
      }),
      buildSubscriptionHeaders: async ({ connectionParams }) => ({
        "authorization": connectionParams?.authorization,
      }),
    });
  })();