#!/bin/sh
# Renders the nginx conf from /etc/nginx/templates/default.conf.template
# (substituting ${DOMAIN}), then starts nginx and reloads it every 6h to pick
# up renewed SSL certificates. Certbot renews certs every 12h — a 6h reload
# window ensures we never serve an expired cert for more than one interval.
set -e

if [ -z "$DOMAIN" ]; then
    echo "ERROR: DOMAIN env var is required (set it in .env.prod)." >&2
    exit 1
fi

envsubst '${DOMAIN}' \
    < /etc/nginx/templates/default.conf.template \
    > /etc/nginx/conf.d/default.conf

nginx -g "daemon off;" &
NGINX_PID=$!

_stop() {
    nginx -s quit
    wait "$NGINX_PID" 2>/dev/null
    exit 0
}
trap _stop TERM INT

while kill -0 "$NGINX_PID" 2>/dev/null; do
    sleep 21600 &  # 6 hours
    wait $!
    kill -0 "$NGINX_PID" 2>/dev/null && nginx -s reload 2>/dev/null || true
done
