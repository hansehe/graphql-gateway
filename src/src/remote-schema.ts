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
  GraphQLSchema,
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


export const httpUriToWsUri = (uri: string): string => {
  let wsUri = uri.replace('http:', 'ws:');
  if (uri.startsWith('https:')) {
    wsUri = uri.replace('https:', 'wss:');
  }
  return wsUri;
}


export const getGatewaySchema = async (endpoints: string[]): Promise<GraphQLSchema> => {
  const remoteSchemas = await Promise.all(
    endpoints.map(async (endpoint) => {
      const httpExecutor: AsyncExecutor = async ({
        document,
        variables,
        operationName,
        extensions,
        context: contextForHttpExecutor,
      }) => {
        const query = print(document);

        const fallback = { req: undefined, res: undefined };

        const isSubscriptionContext =
          contextForHttpExecutor?.type === "subscription";

        const fetchResult = await fetch(`${endpoint}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
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
        return observableToAsyncIterable({
          subscribe: (observer) => ({
            unsubscribe: subscriptionClient.subscribe(
              {
                query: print(document),
                variables: {
                  ...variables,
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
                  }
                  else if (Array.isArray(err)) {
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

      const sdlAlternatives = [
        gql`
          {
            _service 
            {
              _sdl
            }
          }
        `,
        gql`
          {
            _sdl
          }
        `
      ]

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

  const { stitchingDirectivesTransformer } = stitchingDirectives();
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
}
