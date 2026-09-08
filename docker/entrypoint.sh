#!/bin/sh
set -eu

# Regenerate the runtime config the SPA reads on load (see src/conf.ts), so
# the same built image can be pointed at a different API without a rebuild.
cat > /usr/share/nginx/html/config.js <<EOF
window.__OMNIPOST_CONFIG__ = { apiUrl: "${VITE_API_URL:-http://localhost:8000}" };
EOF

exec nginx -g 'daemon off;'
