#!/bin/sh
set -e

echo "Running prisma db push..."
node node_modules/prisma/build/index.js db push

echo "Seeding default users..."
node node_modules/.bin/tsx prisma/seed.ts

echo "Starting app..."
exec node server.js
