FROM node:22.11.0-slim

RUN npm install -g npm@11.2.0

RUN npm install -g serve

WORKDIR /usr/src/app

COPY . .

EXPOSE 5173

RUN npm i

CMD npm run dev -- --host 0.0.0.0