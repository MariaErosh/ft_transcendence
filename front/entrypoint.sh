#!/bin/sh

set -e

echo "Substituting environment variables in nginx.conf..."

envsubst '${GATEWAY_SERVICE} ${GATEWAY_PORT}' \
  < /etc/nginx/conf.d/default.conf \
  > /etc/nginx/conf.d/default.conf.tmp

mv /etc/nginx/conf.d/default.conf.tmp /etc/nginx/conf.d/default.conf

echo "Waiting for gateway to be ready..."
MAX_RETRIES=${GATEWAY_MAX_RETRIES:-20}
RETRY_INTERVAL=${GATEWAY_RETRY_INTERVAL:-1}
attempt=0

while ! wget -qO- "${GATEWAY_SERVICE}:${GATEWAY_PORT}/health" >/dev/null 2>&1; do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge "$MAX_RETRIES" ]; then
    echo "gateway not ready after $MAX_RETRIES attempts, giving up."
    exit 1
  fi
  echo "gateway not ready yet, sleeping..."
  sleep "$RETRY_INTERVAL"
done

echo "Gateway is up, starting nginx..."
exec nginx -g 'daemon off;'