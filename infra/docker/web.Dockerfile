# Next.js dashboard (standalone output)
FROM node:20-slim AS deps
WORKDIR /app/apps/web
COPY apps/web/package.json ./
RUN npm install

FROM node:20-slim AS builder
WORKDIR /app
COPY --from=deps /app/apps/web/node_modules /app/apps/web/node_modules
COPY apps/web /app/apps/web
COPY packages /app/packages
WORKDIR /app/apps/web
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:20-slim AS runner
WORKDIR /app/apps/web
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
COPY --from=builder /app/apps/web/.next/standalone /app
COPY --from=builder /app/apps/web/.next/static /app/apps/web/.next/static
COPY --from=builder /app/apps/web/public /app/apps/web/public
EXPOSE 3000
CMD ["node", "/app/apps/web/server.js"]
