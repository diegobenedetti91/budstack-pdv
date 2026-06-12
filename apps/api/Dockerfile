FROM node:20-alpine AS base
WORKDIR /app

# ── Instalar dependências ────────────────────────────────────────────────────
FROM base AS deps
COPY package*.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/database/package.json ./packages/database/
COPY packages/types/package.json ./packages/types/
RUN npm ci

# ── Build ────────────────────────────────────────────────────────────────────
FROM deps AS builder
COPY . .
RUN cd packages/types && npx tsc
RUN cd packages/database && npx prisma generate
RUN cd apps/api && npm run build

# ── Runner ───────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

RUN apk add --no-cache openssl

ENV NODE_ENV=production

COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /app/packages/types/dist ./packages/types/dist
COPY --from=builder /app/packages/database/prisma ./packages/database/prisma
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./package.json

RUN mkdir -p /app/apps/api/uploads

WORKDIR /app
EXPOSE 3001
CMD ["node", "apps/api/dist/main"]
