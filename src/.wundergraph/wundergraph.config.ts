import {
  configureWunderGraphApplication,
  EnvironmentVariable,
  introspect,
  LoggerLevel,
} from "@wundergraph/sdk";
import { getEnv, getENVArray } from "./env";
import server from "./wundergraph.server";
import operations from "./wundergraph.operations";
import getenv from "getenv";
import { AsyncApiIntrospector } from "@wundergraph/sdk/dist/configure";
import { IHeadersBuilder } from "@wundergraph/sdk/dist/definition/headers-builder";

const graphqlRequestHeaders = getENVArray("GRAPHQL_REQUEST_HEADER");

const buildHeaders = (builder: IHeadersBuilder): IHeadersBuilder => {
  for (let i = 0; i < graphqlRequestHeaders.length; i++) {
    builder = builder.addClientRequestHeader(graphqlRequestHeaders[i], graphqlRequestHeaders[i]);
  }
  return builder;
}

const graphqlUris = getENVArray("GRAPHQL_URL");
const defaultGraphqlPollingIntervalSeconds = getenv.int("GRAPHQL_URL_POLLING_INTERVAL_SECONDS", 60);
const graphqlServices: AsyncApiIntrospector<any>[] = [];
graphqlUris.forEach((graphqlUri, index) => {
  const graphqlService = introspect.graphql({
    apiNamespace: getEnv(`GRAPHQL_URL_NAMESPACE_${index}`),
    url: graphqlUri,
    introspection: {
      pollingIntervalSeconds: getenv.int(`GRAPHQL_URL_POLLING_INTERVAL_SECONDS_${index}`, defaultGraphqlPollingIntervalSeconds),
    },
    headers: buildHeaders,
  });
  graphqlServices.push(graphqlService);
});

configureWunderGraphApplication({
  apis: graphqlServices,
  server,
  operations,
  security: {
    enableGraphQLEndpoint: true,
  },
  options: {
    listen: {
      host: new EnvironmentVariable('WG_NODE_HOST', 'localhost'),
      port: new EnvironmentVariable('WG_NODE_PORT', '8181'),
    },
    logger: {
      level: new EnvironmentVariable<LoggerLevel>('WG_LOG_LEVEL', 'info'),
    },
    defaultRequestTimeoutSeconds: getenv.int('WG_DEFAULT_REQUEST_TIMEOUT_SECONDS', 60),
  },
});
