# Build stage: was previously the whole image, shipping `npm run dev` in
# production. Vite's dev server is not meant to serve traffic — no minification,
# no caching headers, and it rebuilds on every request.
FROM node:22.11.0-slim AS build
WORKDIR /usr/src/app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# Runtime stage: a static build served by nginx.
FROM nginx:1.27-alpine
COPY --from=build /usr/src/app/dist /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 5173
ENTRYPOINT ["/entrypoint.sh"]
