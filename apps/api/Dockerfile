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
RUN cd packages/types && npx tsc
RUN cd packages/database && npx prisma generate
RUN pnpm --filter @budstack/api build
# Deploy standalone sem symlinks do pnpm
RUN pnpm --filter @budstack/api --prod deploy /standalone
# Copia o Prisma client gerado (fica no pnpm store: .pnpm/@prisma+client@.../node_modules/.prisma/client/)
# Usa "/. " para copiar conteúdo dentro do dir de destino (que já existe com stubs)
RUN pkg=$(ls /app/node_modules/.pnpm | grep "^@prisma+client" | head -1) && \
    [ -n "$pkg" ] && \
    cp -r "/app/node_modules/.pnpm/$pkg/node_modules/.prisma/." \
          "/standalone/node_modules/.pnpm/$pkg/node_modules/.prisma/" 2>/dev/null || true

# ── Runner ───────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

RUN apk add --no-cache openssl

ENV NODE_ENV=production

# Mantém a mesma estrutura de paths do monorepo:
# /app/apps/api/dist/  ← dist compilado
# /app/packages/types/dist/  ← required pelos decorators Swagger
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /standalone/node_modules ./apps/api/node_modules
COPY --from=builder /app/packages/types/dist ./packages/types/dist
# Copia schema + migrations para rodar prisma migrate deploy no startup
COPY --from=builder /app/packages/database/prisma ./packages/database/prisma

RUN mkdir -p /app/apps/api/uploads

WORKDIR /app/apps/api
EXPOSE 3001
# Aplica migrations pendentes antes de iniciar
CMD ["sh", "-c", "npx prisma@5 migrate deploy --schema=/app/packages/database/prisma/schema.prisma && node dist/main"]
