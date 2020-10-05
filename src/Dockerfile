FROM node:8.9.0-alpine

WORKDIR /app

COPY package.json package.json
COPY package-lock.json package-lock.json

RUN npm install

COPY . .

ENV PORT=80

ENTRYPOINT [ "npm" ]
CMD [ "start" ] 