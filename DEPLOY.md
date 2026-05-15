# Deploy — BudStack PDV

## Arquitetura de Produção

```
Hostinger Business (hPanel Node.js)
  └── apps/web  →  Next.js  (porta 3000)

Railway
  ├── apps/api  →  NestJS API  (porta 3001)
  ├── PostgreSQL  (gerenciado pelo Railway)
  └── Redis  (gerenciado pelo Railway)
```

---

## 1. Railway — API + Banco

### 1.1 Criar projeto no Railway
1. Acesse [railway.app](https://railway.app) e crie um projeto
2. Adicione um serviço PostgreSQL (clique em "Add Service → Database → PostgreSQL")
3. Adicione um serviço Redis (clique em "Add Service → Database → Redis")
4. Adicione um serviço para a API (clique em "Add Service → GitHub Repo")

### 1.2 Variáveis de ambiente da API no Railway
```
NODE_ENV=production
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}
JWT_SECRET=gere-uma-chave-forte-aqui
JWT_REFRESH_SECRET=gere-outra-chave-forte-aqui
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
FRONTEND_URL=https://seudominio.com.br
PORT=3001
```

### 1.3 Migrations em produção
O Railway executa automaticamente via Procfile ou railway.toml.
Para executar manualmente:
```bash
railway run npx prisma migrate deploy
```

---

## 2. Hostinger Business — Frontend Next.js

### 2.1 Configurar Node.js no hPanel
1. Acesse hPanel → Avançado → Node.js
2. Crie um aplicativo Node.js:
   - Versão: Node.js 20
   - Modo: Produção
   - Pasta do app: `/public_html/budstack`
   - Arquivo de inicialização: `apps/web/.next/standalone/server.js`

### 2.2 Conectar via SSH e fazer deploy
```bash
# Conectar via SSH
ssh usuario@seudominio.com.br

# Clonar repositório
cd /home/usuario/public_html
git clone https://github.com/seu-usuario/budstack-pdv budstack
cd budstack

# Instalar dependências
npm install -g pnpm pm2
pnpm install --frozen-lockfile

# Configurar variáveis de ambiente
cp apps/web/.env.example apps/web/.env.local
nano apps/web/.env.local
# Adicione: NEXT_PUBLIC_API_URL=https://sua-api.railway.app/api/v1

# Build
pnpm --filter @budstack/web build

# Iniciar com PM2
pm2 start apps/web/.next/standalone/server.js --name budstack-web
pm2 save
pm2 startup
```

### 2.3 Variáveis de ambiente do frontend
```
NEXT_PUBLIC_API_URL=https://sua-api.up.railway.app/api/v1
NEXT_PUBLIC_WS_URL=https://sua-api.up.railway.app
NEXTAUTH_URL=https://seudominio.com.br
NEXTAUTH_SECRET=gere-uma-chave-aqui
```

---

## 3. GitHub Actions (CI/CD automático)

### Secrets necessários no GitHub
```
# Railway
RAILWAY_TOKEN=seu-token-do-railway

# Hostinger
HOSTINGER_HOST=seudominio.com.br
HOSTINGER_USER=seu-usuario-ssh
HOSTINGER_SSH_KEY=sua-chave-privada-ssh

# Next.js
NEXT_PUBLIC_API_URL=https://sua-api.up.railway.app/api/v1
NEXT_PUBLIC_WS_URL=https://sua-api.up.railway.app
```

---

## 4. Desenvolvimento Local

```bash
# Subir banco e redis
docker compose up postgres redis -d

# Configurar env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local

# Instalar dependências
pnpm install

# Migrations
cd packages/database && npx prisma migrate dev && npx prisma db seed
cd ../..

# Iniciar tudo
pnpm dev
```

Acesse:
- Frontend: http://localhost:3000
- API: http://localhost:3001/api/v1
- Swagger: http://localhost:3001/api/docs
- Prisma Studio: http://localhost:5555 (pnpm db:studio)
