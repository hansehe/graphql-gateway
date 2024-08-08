FROM node:20.8.0-alpine

WORKDIR /app

COPY package.json package.json
COPY package-lock.json package-lock.json

RUN npm ci --legacy-peer-deps
RUN apk --no-cache add curl

COPY . .

ENV PORT=80
ENV NODE_OPTIONS=--max_http_header_size=128000

HEALTHCHECK --interval=30s --timeout=10s --retries=3 --start-period=10s CMD curl --fail http://localhost:80/status/health || exit 1

ENTRYPOINT [ "npm" ]
CMD [ "start" ] 