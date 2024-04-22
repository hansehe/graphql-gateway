import {
  configureWunderGraphApplication,
  cors,
  EnvironmentVariable,
  introspect,
  templates,
} from "@wundergraph/sdk";
import server from "./wundergraph.server";
import operations from "./wundergraph.operations";

const graphqlServices = [];
const spaceX = introspect.graphql({
  apiNamespace: "spacex",
  url: "https://spacex-api.fly.dev/graphql",
});
const account1 = introspect.graphql({
  apiNamespace: "account1",
  url: "http://localhost:5001/graphql",
});
const account2 = introspect.graphql({
  apiNamespace: "account2",
  url: "http://localhost:5002/graphql",
});

graphqlServices.push(spaceX);
graphqlServices.push(account1);
graphqlServices.push(account2);

// configureWunderGraph emits the configuration
configureWunderGraphApplication({
  apis: graphqlServices,
  server,
  operations,
  codeGenerators: [
    {
      templates: [
        // use all the typescript react templates to generate a client
        ...templates.typescript.all,
      ],
      // create-react-app expects all code to be inside /src
      // path: "../frontend/src/generated",
    },
  ],
  cors: {
    ...cors.allowAll,
    allowedOrigins:
      process.env.NODE_ENV === "production"
        ? [
            // change this before deploying to production to the actual domain where you're deploying your app
            "http://localhost:3000",
          ]
        : [
            "http://localhost:3000",
            new EnvironmentVariable("WG_ALLOWED_ORIGIN"),
          ],
  },
  dotGraphQLConfig: {
    hasDotWunderGraphDirectory: false,
  },
  security: {
    enableGraphQLEndpoint:
      process.env.NODE_ENV !== "production" ||
      process.env.GITPOD_WORKSPACE_ID !== undefined,
  },
});
