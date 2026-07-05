#!/bin/sh
# Renders the nginx conf from /etc/nginx/templates/default.conf.template
# (substituting ${DOMAIN}), then starts nginx and re-renders + reloads every 6h
# to pick up renewed SSL certificates. Certbot renews certs every 12h — a 6h
# reload window ensures we never serve an expired cert for more than one interval.
#
# Bootstrap: on first deploy the Let's Encrypt cert does not exist yet, so the
# full template (which references it on `listen 443 ssl`) would prevent nginx from
# starting at all — and a dead nginx can't serve the ACME challenge, deadlocking
# certbot. When the cert is absent we render an HTTP-only config so nginx starts
# and certbot can complete the challenge; the 6h loop (or a container restart)
# then upgrades to the full HTTPS config once the cert is present.
set -e

if [ -z "$DOMAIN" ]; then
    echo "ERROR: DOMAIN env var is required (set it in .env.prod)." >&2
    exit 1
fi

CERT="/etc/letsencrypt/live/$DOMAIN/fullchain.pem"
OUT="/etc/nginx/conf.d/default.conf"

render() {
    if [ -f "$CERT" ]; then
        envsubst '${DOMAIN}' \
            < /etc/nginx/templates/default.conf.template \
            > "$OUT"
    else
        echo "[reload-certs] cert absent for $DOMAIN → HTTP-only bootstrap config" >&2
        cat > "$OUT" <<EOF
server {
    listen 80;
    server_name ${DOMAIN} www.${DOMAIN};
    server_tokens off;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location /nginx-health {
        access_log off;
        return 200 "ok";
        add_header Content-Type text/plain;
    }

    location / {
        return 503;
    }
}
EOF
    fi
}

render

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
    if kill -0 "$NGINX_PID" 2>/dev/null; then
        render  # re-render so the config upgrades to HTTPS once the cert exists
        nginx -t 2>/dev/null && nginx -s reload 2>/dev/null || true
    fi
done
