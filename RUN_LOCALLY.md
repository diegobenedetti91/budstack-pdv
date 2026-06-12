# Como Rodar BudStack Localmente

## Pré-requisitos

- Node.js 18+
- pnpm (ou npm/yarn)
- PostgreSQL 14+
- Redis

## Setup Rápido

### 1. Instalar dependências

```bash
pnpm install
```

### 2. Configurar variáveis de ambiente

**API (`apps/api/.env.dev`)**:
```env
NODE_ENV=development
PORT=3001
APP_URL=http://localhost:3001
FRONTEND_URL=http://localhost:3000

DATABASE_URL=postgresql://user:password@localhost:5432/budstack
REDIS_URL=redis://localhost:6379

JWT_SECRET=sua-chave-secreta
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=refresh-secreta
JWT_REFRESH_EXPIRES_IN=7d

STORAGE_TYPE=local
```

**Frontend (`apps/web/.env.local`)**:
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
```

### 3. Rodas o Banco (Docker)

```bash
docker compose up -d postgres redis
```

Ou manualmente:
```bash
# PostgreSQL
createdb budstack
psql budstack

# Redis
redis-server
```

### 4. Migrations do Prisma

```bash
cd packages/database
npx prisma migrate deploy
# ou se for primeira vez:
npx prisma db push
```

### 5. Rodar o projeto

```bash
pnpm dev
```

Esse comando roda **API + Frontend simultaneamente** via Turbo.

Se quiser rodar um de cada vez:
```bash
# Apenas API
cd apps/api && npm run dev

# Apenas Frontend  
cd apps/web && npm run dev
```

## Acessar

- **Frontend (Admin)**: http://localhost:3000
- **Kiosk Self-Service**: http://localhost:3000/kiosk/seu-slug-aqui
- **Swagger API Docs**: http://localhost:3001/api/docs
- **Database UI**: Opcional com `prisma studio`

## Testar as Novas Features

### 1. Modal de Detalhes do Produto
- Abra o Kiosk
- Clique em qualquer produto
- Deve abrir modal com foto grande e descrição

### 2. Cupom na Tela de Pagamento
- Crie um cupom em: Admin → Cupons
- Vá para Kiosk → Cardápio → Carrinho → Pagamento
- Insira o código do cupom
- Desconto deve aparecer em tempo real

### 3. Tempo Estimado
- Na tela de rastreamento do pedido
- Deve mostrar "~X minutos" baseado em quantidade de itens

### 4. Repetir Último Pedido
- Complete um pedido no Kiosk
- Abra o Kiosk novamente (mesmo navegador)
- Deve aparecer banner "Repetir último pedido?"
- Clique para adicionar itens automaticamente

### 5. Página de Estoque e Cupons
- Admin → Estoque (novo)
- Admin → Cupons (novo)
- Teste criar, editar, deletar cupons
- Veja produtos com baixo estoque em destaque

## Troubleshooting

### Erro: "DATABASE_URL não configurada"
```bash
# Verifique .env.dev
cat apps/api/.env.dev

# Se vazio, configure:
echo "DATABASE_URL=postgresql://postgres:password@localhost:5432/budstack" >> apps/api/.env.dev
```

### Erro: "Redis não conectado"
```bash
# Verifique se Redis está rodando
redis-cli ping
# Esperado: PONG

# Se não estiver, inicie:
redis-server
```

### Erro: "Migrations não rodaram"
```bash
cd packages/database
npx prisma migrate deploy --skip-generate
```

### Erro: "Porta 3000/3001 já em uso"
```bash
# Mudar para outra porta
PORT=3002 NEXT_PUBLIC_API_URL=http://localhost:3002/api/v1 pnpm dev
```

## Estrutura de Pastas

```
budstack-pdv/
├── apps/
│   ├── api/             ← NestJS backend
│   │   ├── src/
│   │   │   ├── modules/ ← Controllers/Services
│   │   │   └── main.ts
│   │   └── .env.dev
│   └── web/             ← Next.js frontend
│       ├── src/
│       │   ├── app/     ← Pages
│       │   └── components/
│       └── .env.local
├── packages/
│   ├── database/        ← Prisma schema
│   └── types/           ← Types compartilhados
└── pnpm-workspace.yaml
```

## Dados de Teste

1. **Criar restaurante**:
   - Abra http://localhost:3000
   - Clique em "Registrar restaurante"
   - Preencha dados

2. **Criar produtos**:
   - Admin → Cardápio → Adicionar categoria
   - Admin → Cardápio → Adicionar produto (com foto, descrição, custo)

3. **Testar Kiosk**:
   - Admin → Autoatendimento → Copiar link
   - Ou acesse: http://localhost:3000/kiosk/seu-slug-aqui

4. **Testar Cupons**:
   - Admin → Cupons → Novo cupom
   - Preencha: código (ex: TESTE10), desconto (10%), válido até (data futura)
   - Use no Kiosk na tela de pagamento

## Deploy

Veja [UPLOADS.md](UPLOADS.md) para instruções de upload local no Hostinger.
