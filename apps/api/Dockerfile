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
# 1. Compilar @budstack/types
RUN cd packages/types && npx tsc
# 2. Gerar Prisma Client
RUN cd packages/database && npx prisma generate
# 3. Build NestJS
RUN pnpm --filter @budstack/api build
# 4. Criar deploy standalone com node_modules reais (sem symlinks do pnpm)
RUN pnpm --filter @budstack/api --prod deploy /standalone
# 5. Copiar o Prisma client gerado para o deploy
RUN cp -r /app/node_modules/.prisma /standalone/node_modules/.prisma 2>/dev/null || true

# ── Runner (produção) ────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /standalone/node_modules ./node_modules
COPY --from=builder /app/apps/api/package.json ./

RUN mkdir -p /app/uploads

EXPOSE 3001
CMD ["node", "dist/main"]
