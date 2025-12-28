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
while ! nc -z gateway 3000; do
  echo "gateway not ready yet, sleeping..."
  sleep 1
done

echo "Gateway is up, starting nginx..."
nginx -g 'daemon off;'
