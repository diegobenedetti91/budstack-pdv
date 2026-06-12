# Deploy na Hostinger

## ✅ Pré-requisitos

1. **Repositório GitHub público**
   - Confirmado ✅

2. **Conta Hostinger com plano Business Web Hosting**
   - Node.js Web App suportado
   - MySQL database incluído

3. **Variáveis de Ambiente**
   - Ver `.env.example` como referência

---

## 📋 Passo a Passo

### 1. Criar Banco de Dados MySQL

**No hPanel → Databases → MySQL**

```
Nome do Banco: budstack
Usuário: seu_usuario (ex: budstack_user)
Senha: SenhaForteMuitoSegura123!
Host: sql123.mysql.hostinger.com (será fornecido)
Porta: 3306
```

**Salve as credenciais!**

---

### 2. Conectar GitHub ao Hostinger

**No hPanel → Integrations**

- Clique em "Connect with GitHub"
- Autorize Hostinger a acessar seus repositórios
- Selecione `budstack-pdv`

---

### 3. Deploy da API (NestJS)

**No hPanel → Websites → Add website → Node.js Web App**

```
┌─────────────────────────────────────────┐
│ Repository:                             │
│ diegobenedetti91/budstack-pdv          │
├─────────────────────────────────────────┤
│ Branch: main                            │
│ Node Version: 20.x                      │
├─────────────────────────────────────────┤
│ Build Command:                          │
│ npm install && npm db:generate &&     │
│ npm db:migrate && npm build:api       │
├─────────────────────────────────────────┤
│ Start Command:                          │
│ npm start:api                          │
├─────────────────────────────────────────┤
│ Root Directory: /                       │
└─────────────────────────────────────────┘
```

**Variáveis de Ambiente (hPanel → Environment Variables):**

```env
NODE_ENV=production
PORT=3000
DATABASE_URL=mysql://seu_usuario:SenhaForteMuitoSegura123!@sql123.mysql.hostinger.com:3306/budstack
FRONTEND_URL=https://seu-dominio.com
APP_URL=https://api.seu-dominio.com
JWT_SECRET=gera-uma-chave-aleatoria-aqui-com-64-caracteres
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=gera-outra-chave-aleatoria-com-64-caracteres
JWT_REFRESH_EXPIRES_IN=7d
STORAGE_TYPE=local
NEXT_PUBLIC_API_URL=https://api.seu-dominio.com/api/v1
```

---

### 4. Deploy do Frontend (Next.js)

**No hPanel → Websites → Add website → Node.js Web App**

```
┌─────────────────────────────────────────┐
│ Repository:                             │
│ diegobenedetti91/budstack-pdv          │
├─────────────────────────────────────────┤
│ Branch: main                            │
│ Node Version: 20.x                      │
├─────────────────────────────────────────┤
│ Build Command:                          │
│ npm install && npm build:web          │
├─────────────────────────────────────────┤
│ Start Command:                          │
│ npm start:web                          │
├─────────────────────────────────────────┤
│ Root Directory: /apps/web               │
└─────────────────────────────────────────┘
```

**Variáveis de Ambiente (mesmo que a API):**

```env
NEXT_PUBLIC_API_URL=https://api.seu-dominio.com/api/v1
NODE_ENV=production
```

---

## 🔧 Troubleshooting

### ❌ Erro: "ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING"

**Já corrigido!** Adicionamos:
- `.npmrc` com configurações npm
- `.node-version` e `.nvmrc` para versão Node.js consistente

Se ainda ocorrer:
1. Limpe o cache no hPanel: **Websites → Clear Cache**
2. Redeploy: **Deploy → Redeploy**

### ❌ Erro: "Cannot find module"

**Solução:**
1. Verifique se `npm install` está no Build Command
2. Confirm que Node.js v20.x está selecionado

### ❌ Banco não conecta

**Verificar:**
1. DATABASE_URL está correto?
2. Banco MySQL foi criado?
3. Firewall do Hostinger permite conexão?

---

## 📊 Monitoramento

Após deploy:

1. **Acessar logs**: hPanel → Websites → [seu-site] → Logs
2. **Verificar saúde da API**: `curl https://api.seu-dominio.com/health`
3. **Testar banco**: Qualquer endpoint que use database

---

## 🚀 Atualizações Futuras

Para atualizar a aplicação:

1. Faça `git push` para main
2. No hPanel: **Websites → [seu-site] → Deployments → Deploy**
3. Aguarde ~5 minutos

---

## 📝 Notas Importantes

- **Redis foi removido**: App funciona sem cache agora
- **PostgreSQL → MySQL**: Schema completamente compatível
- **WebSockets**: Podem ter limitações em shared hosting
- **Uploads**: Salvos em `/storage` local do servidor

---

## ❓ Dúvidas?

- Hostinger Support: hPanel → Support
- GitHub Issues: https://github.com/diegobenedetti91/budstack-pdv/issues
