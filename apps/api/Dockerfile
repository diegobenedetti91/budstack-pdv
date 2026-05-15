FROM node:20-alpine AS base
RUN npm install -g pnpm@9.4.0
WORKDIR /app

# ── Instalar dependências ────────────────────────────────────────────────────
FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY apps/api/package.json ./apps/api/
COPY packages/database/package.json ./packages/database/
COPY packages/types/package.json ./packages/types/
RUN pnpm install --frozen-lockfile

# ── Build ────────────────────────────────────────────────────────────────────
FROM deps AS builder
COPY . .
# 1. Compilar @budstack/types para gerar .d.ts
RUN cd packages/types && npx tsc
# 2. Gerar Prisma Client
RUN cd packages/database && npx prisma generate
# 3. Compilar API
RUN pnpm --filter @budstack/api build

# ── Runner (produção) ────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/package.json ./

RUN mkdir -p /app/uploads

EXPOSE 3001
CMD ["node", "dist/main"]
