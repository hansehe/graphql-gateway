FROM docker.io/node:18-alpine
ARG wg_public_node_url

WORKDIR /app

COPY package.json package-lock.json /app/
ENV CI=true WG_COPY_BIN_PATH=/usr/bin/wunderctl
RUN npm ci --prefer-offline --no-audit
COPY .wundergraph ./.wundergraph

EXPOSE 80
ENV WG_NODE_URL=http://127.0.0.1:80 WG_NODE_INTERNAL_URL=http://127.0.0.1:9993 WG_NODE_HOST=0.0.0.0 WG_NODE_PORT=80 WG_NODE_INTERNAL_PORT=9993 WG_SERVER_URL=http://127.0.0.1:9992 WG_SERVER_HOST=127.0.0.1 WG_SERVER_PORT=9992

ENV WG_PUBLIC_NODE_URL=${wg_public_node_url}

HEALTHCHECK --interval=30s --timeout=10s --retries=3 --start-period=10s CMD curl --fail http://localhost:80/health || exit 1

ENTRYPOINT wunderctl up --wundergraph-dir=.wundergraph
# ENTRYPOINT wunderctl generate --wundergraph-dir=.wundergraph && wunderctl start --wundergraph-dir=.wundergraph
