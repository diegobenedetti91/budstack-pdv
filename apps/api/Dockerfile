FROM node:20-alpine AS base
RUN npm install -g pnpm@9.4.0
WORKDIR /app

# Instalar dependências
FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY apps/api/package.json ./apps/api/
COPY packages/database/package.json ./packages/database/
COPY packages/types/package.json ./packages/types/
RUN pnpm install --frozen-lockfile

# Gerar Prisma client
FROM deps AS prisma
COPY packages/database/prisma ./packages/database/prisma
RUN cd packages/database && npx prisma generate

# Build
FROM prisma AS builder
COPY . .
RUN pnpm --filter @budstack/api build

# Produção
FROM node:20-alpine AS runner
RUN npm install -g pnpm@9.4.0
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/package.json ./
COPY --from=prisma /app/node_modules/.prisma ./node_modules/.prisma

EXPOSE 3001
CMD ["node", "dist/main"]
