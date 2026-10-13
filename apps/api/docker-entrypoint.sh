#!/bin/sh
set -eu

./apps/api/node_modules/.bin/prisma migrate deploy --schema apps/api/prisma/schema.prisma
exec node apps/api/dist/server.js
