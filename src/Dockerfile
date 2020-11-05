FROM node:8.9.0-alpine

WORKDIR /app

COPY package.json package.json
COPY package-lock.json package-lock.json

RUN npm install
RUN apk --no-cache add curl

COPY . .

ENV PORT=80

HEALTHCHECK --interval=30s --timeout=10s --retries=3 --start-period=10s CMD curl --fail http://localhost:80/status/health || exit 1

ENTRYPOINT [ "npm" ]
CMD [ "start" ] 