const { getENVArray } = require("./env");

const { ApolloServer } = require("apollo-server-express");
const { ApolloGateway, RemoteGraphQLDataSource } = require("@apollo/gateway");

const urls = getENVArray("GRAPHQL_URL");
const names = getENVArray("GRAPHQL_NAME", []);

const gateway = new ApolloGateway({
  serviceList: urls.map((x, i) => ({ name: names[i] || x, url: x })),
  buildService({ name, url }) {
    return new RemoteGraphQLDataSource({
      url,
      willSendRequest({ request, context }) {
        // request.http.headers.set('x-correlation-id', '...');
        if (
          context.req &&
          context.req.headers &&
          context.req.headers["authorization"]
        ) {
          request.http.headers.set(
            "authorization",
            context.req.headers["authorization"]
          );
        }
        // console.log('will send request -> ', name, JSON.stringify(request));
      },
    });
  },
});

const getApolloServer = async () => {
  const { schema, executor } = await gateway.load();

  const server = new ApolloServer({
    schema,
    executor,
    context: ({ req }) => ({ req }),
  });
  return server;
};

module.exports.getApolloServer = getApolloServer;
