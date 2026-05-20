FROM node:20-alpine AS base
RUN npm install -g pnpm@9.4.0
WORKDIR /app

# ── Instalar dependências ────────────────────────────────────────────────────
FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY apps/web/package.json ./apps/web/
COPY packages/types/package.json ./packages/types/
RUN pnpm install --frozen-lockfile

# ── Build ────────────────────────────────────────────────────────────────────
FROM deps AS builder
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN cd packages/types && npx tsc
RUN pnpm --filter @budstack/web build

# ── Runner ───────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Standalone output: server.js fica em apps/web/server.js dentro do output
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
# public deve ficar ao lado do server.js (apps/web/public)
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
CMD ["node", "apps/web/server.js"]
