FROM node:20.8.0-alpine

WORKDIR /app

COPY package.json package.json
COPY package-lock.json package-lock.json

RUN npm ci --omit=dev
RUN apk --no-cache add curl

COPY . .

ENV UWS_HTTP_MAX_HEADERS_SIZE=16384
ENV PORT=80

HEALTHCHECK --interval=30s --timeout=10s --retries=3 --start-period=10s CMD curl --fail http://localhost:80/status/health || exit 1

ENTRYPOINT [ "npm" ]
CMD [ "start" ] 