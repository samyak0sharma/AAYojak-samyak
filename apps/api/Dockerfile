FROM node:20-alpine AS build
WORKDIR /workspace
RUN corepack enable
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @aayojak/api prisma:generate
RUN pnpm --filter @aayojak/api build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S aayojak && adduser -S aayojak -G aayojak
COPY --from=build --chown=aayojak:aayojak /workspace/node_modules ./node_modules
COPY --from=build --chown=aayojak:aayojak /workspace/apps/api/node_modules ./apps/api/node_modules
COPY --from=build --chown=aayojak:aayojak /workspace/apps/api/dist ./apps/api/dist
COPY --from=build --chown=aayojak:aayojak /workspace/apps/api/package.json ./apps/api/package.json
COPY --from=build --chown=aayojak:aayojak /workspace/apps/api/prisma ./apps/api/prisma
COPY --from=build --chown=aayojak:aayojak /workspace/packages ./packages
COPY --from=build --chown=aayojak:aayojak /workspace/apps/api/docker-entrypoint.sh ./apps/api/docker-entrypoint.sh
RUN chmod +x ./apps/api/docker-entrypoint.sh
USER aayojak
EXPOSE 4000
ENTRYPOINT ["./apps/api/docker-entrypoint.sh"]
