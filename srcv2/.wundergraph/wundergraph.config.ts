import {
  configureWunderGraphApplication,
  cors,
  EnvironmentVariable,
  introspect,
  LoggerLevel,
  templates,
} from "@wundergraph/sdk";
import server from "./wundergraph.server";
import operations from "./wundergraph.operations";

const graphqlServices = [];
const account1 = introspect.graphql({
  apiNamespace: "account1",
  url: "http://host.docker.internal:5001/graphql",
  introspection: {
    pollingIntervalSeconds: 30,
  },
});
const account2 = introspect.graphql({
  apiNamespace: "account2",
  url: "http://host.docker.internal:5002/graphql",
  introspection: {
    pollingIntervalSeconds: 30,
  },
});

graphqlServices.push(account1);
graphqlServices.push(account2);

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
