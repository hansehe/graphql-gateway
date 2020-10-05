import { GraphQLServer, Options } from 'graphql-yoga'
import { getRemoteSchemas } from "./remote-schema/";
import { getENV, getENVArray } from "./env";

const start = async () => {

    const uris = getENVArray("GRAPHQL_URL");
    const schema = await getRemoteSchemas(uris);

    const server = new GraphQLServer({
        schema,
    });

    const activateUpdateGatewayInterval = getENV("GRAPHQL_UPDATE_GATEWAY", "true") === "true";
    const updateGatewayInterval = getENV("GRAPHQL_UPDATE_GATEWAY_INTERVAL_MS", "60000");
    if (activateUpdateGatewayInterval === true)
    {
        setInterval(async () => {
        try {
            const updatedSchema = await getRemoteSchemas(uris);
            server.executableSchema = updatedSchema;
        } catch (error) {
            console.error(error);
        }
        }, updateGatewayInterval);
    }

    const HOST = getENV("HOST", "http://localhost");
    const PORT = getENV("PORT", "4000");

    const options: Options = {
        port: PORT,
        endpoint: '/graphql',
        playground: '/graphql',
    }

    server.start(options, ({ port, endpoint }) => console.log(`Server is running on ${HOST}:${port}${endpoint}`))
}

start();