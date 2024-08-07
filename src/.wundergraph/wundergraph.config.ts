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


const graphqlUris = getENVArray("GRAPHQL_URL");
const defaultGraphqlPollingIntervalSeconds = getenv.int("GRAPHQL_URL_POLLING_INTERVAL_SECONDS", 5);
const graphqlServices: AsyncApiIntrospector<any>[] = [];
graphqlUris.forEach((graphqlUri, index) => {
  const graphqlService = introspect.graphql({
    apiNamespace: getEnv(`GRAPHQL_URL_NAMESPACE_${index}`),
    url: graphqlUri,
    introspection: {
      pollingIntervalSeconds: getenv.int(`GRAPHQL_URL_POLLING_INTERVAL_SECONDS_${index}`, defaultGraphqlPollingIntervalSeconds),
    },
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
  },
});
