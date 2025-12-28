#!/bin/sh

echo "Waiting for gateway to be ready..."
while ! nc -z gateway 3000; do
  echo "gateway not ready yet, sleeping..."
  sleep 1
done

echo "Gateway is up, starting nginx..."
nginx -g 'daemon off;'
