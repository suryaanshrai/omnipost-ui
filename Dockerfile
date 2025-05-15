FROM node:22.11.0-slim

RUN npm install -g npm@11.2.0

RUN npm install -g serve

WORKDIR /usr/src/app

COPY . .

EXPOSE 5173

RUN npm i && npm run build

CMD serve -s -l 5173