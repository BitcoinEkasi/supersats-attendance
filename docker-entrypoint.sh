#!/bin/sh
set -e

echo "Running prisma db push..."
node node_modules/prisma/build/index.js db push

echo "Starting app..."
exec node server.js
