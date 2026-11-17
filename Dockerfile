# Build: a static Vite build. (Previously the image shipped `npm run dev`.)
FROM node:22-slim AS build
WORKDIR /usr/src/app

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .
RUN npm run build \
    # CSP hash of index.html's inline theme script, so the policy allows
    # exactly that script and no other inline code.
    && node -e "const h=require('fs').readFileSync('dist/index.html','utf8');const m=[...h.matchAll(/<script>([\s\S]*?)<\/script>/g)];if(m.length!==1)throw new Error('expected one inline script, found '+m.length);console.log('sha256-'+require('crypto').createHash('sha256').update(m[0][1]).digest('base64'))" > dist-csp-hash

# Runtime: unprivileged nginx (no root in the container).
FROM nginxinc/nginx-unprivileged:1.27-alpine
COPY --from=build /usr/src/app/dist /usr/share/nginx/html
COPY --from=build /usr/src/app/dist-csp-hash /etc/nginx/csp-script-hash
COPY docker/nginx.conf.template /etc/nginx/nginx.conf.template
COPY --chmod=755 docker/entrypoint.sh /entrypoint.sh

USER root
# The entrypoint writes config.js and the final server block at start.
RUN touch /usr/share/nginx/html/config.js \
    && chown nginx /usr/share/nginx/html /usr/share/nginx/html/config.js /etc/nginx/conf.d \
    && rm -f /etc/nginx/conf.d/default.conf
USER nginx

EXPOSE 5173
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://127.0.0.1:5173/healthz || exit 1
ENTRYPOINT ["/entrypoint.sh"]
