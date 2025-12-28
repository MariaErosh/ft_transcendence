#!/bin/sh

SSL_DIR=/etc/nginx/ssl
CERT=$SSL_DIR/self.crt
KEY=$SSL_DIR/self.key

mkdir -p $SSL_DIR
if [ ! -f "$CERT" ] || [ ! -f "$KEY" ]; then
  echo "Generating self-signed SSL certificate..."
  openssl req -x509 -nodes -days 365 \
    -subj "/CN=localhost" \
    -newkey rsa:2048 \
    -keyout "$KEY" \
    -out "$CERT"
fi

echo "Waiting for gateway to be ready..."
MAX_RETRIES=${GATEWAY_MAX_RETRIES:-60}
RETRY_INTERVAL=${GATEWAY_RETRY_INTERVAL:-1}
attempt=0
while ! nc -z gateway 3000; do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge "$MAX_RETRIES" ]; then
    echo "gateway not ready after $MAX_RETRIES attempts, giving up."
    exit 1
  fi
  echo "gateway not ready yet, sleeping..."
  sleep "$RETRY_INTERVAL"
done

echo "Gateway is up, starting nginx..."
nginx -g 'daemon off;'
