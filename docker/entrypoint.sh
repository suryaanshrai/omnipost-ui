#!/bin/sh
set -eu

API_URL="${VITE_API_URL:-http://localhost:8000}"

# The URL goes into a JS string: escape backslashes and quotes, and "<" so
# it can't close a script tag.
js_url=$(printf '%s' "$API_URL" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g' -e 's/</\\u003c/g')
printf 'window.__OMNIPOST_CONFIG__ = { apiUrl: "%s" };\n' "$js_url" > /usr/share/nginx/html/config.js

# CSP: scripts only from this origin plus the inline theme script (by hash);
# API calls, and media served by the API or S3, from the API origin / https.
api_origin=$(printf '%s' "$API_URL" | sed -E 's#^(https?://[^/]+).*#\1#')
# The origin is written into the nginx config, so accept only a plain
# scheme://host[:port].
if ! printf '%s' "$api_origin" | grep -Eq '^https?://[A-Za-z0-9.-]+(:[0-9]+)?$'; then
  echo "VITE_API_URL must look like https://api.example.com (got: $API_URL)" >&2
  exit 1
fi
script_hash=$(cat /etc/nginx/csp-script-hash)
csp="default-src 'self'; script-src 'self' '${script_hash}'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https: ${api_origin}; media-src 'self' blob: https: ${api_origin}; font-src 'self' data:; connect-src 'self' ${api_origin}; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'"
sed "s#__CSP__#${csp}#g" /etc/nginx/nginx.conf.template > /etc/nginx/conf.d/default.conf

exec nginx -g 'daemon off;'
