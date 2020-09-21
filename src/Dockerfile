FROM node:8.9.0-alpine

WORKDIR /app

COPY package.json package.json
COPY package-lock.json package-lock.json

RUN rm -rf node_modules && \
    npm install --only=production && \
    npm install apollo-engine-binary-linux

COPY . .

ENTRYPOINT [ "npm" ]
CMD [ "start" ] 