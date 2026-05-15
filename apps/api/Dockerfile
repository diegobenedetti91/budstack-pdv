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
RUN cd packages/database && npx prisma generate
RUN pnpm --filter @budstack/api build

# ── Runner (produção) ────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/package.json ./

# Cria pasta uploads com permissão de escrita
RUN mkdir -p /app/uploads

EXPOSE 3001
CMD ["node", "dist/main"]
