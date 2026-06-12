# Configuração de Uploads - Hostinger

## Local Storage (Development & Production)

Os uploads são salvos em `public/uploads/` e servidos via `http://seu-dominio.com/uploads/{filename}`

### Estrutura

```
apps/api/
├── public/
│   ├── .gitkeep
│   └── uploads/          # Pasta gerada automaticamente (não versionada)
│       ├── image1.jpg
│       ├── image2.png
│       └── ...
```

### Fluxo

1. **Upload via API**
   ```bash
   POST /api/v1/uploads
   Content-Type: multipart/form-data
   
   file: <binary>
   ```

2. **Response**
   ```json
   {
     "url": "http://seu-dominio.com/uploads/uuid-123.jpg",
     "filename": "uuid-123.jpg"
   }
   ```

3. **Arquivo servido como static asset**
   - NestJS serve `public/uploads/` com prefix `/uploads`
   - Hostinger não precisa fazer nada especial

## No Hostinger

### Setup Inicial

1. **Permissões da pasta**
   ```bash
   chmod 755 public
   chmod 755 public/uploads
   chmod 644 public/uploads/*
   ```

2. **PM2 ecosystem.config.js**
   ```js
   module.exports = {
     apps: [{
       name: 'budstack-api',
       script: './dist/main.js',
       cwd: './',
       instances: 'max',
       exec_mode: 'cluster',
       env: {
         NODE_ENV: 'production',
         PORT: 3001,
         APP_URL: 'https://seu-dominio.com',
         FRONTEND_URL: 'https://seu-dominio.com'
       }
     }]
   }
   ```

3. **Nginx (se usar reverse proxy)**
   ```nginx
   location /uploads {
     alias /home/user/budstack/apps/api/public/uploads;
     expires 30d;
     add_header Cache-Control "public, immutable";
   }
   ```

### Backup de Uploads

Como os uploads são locais, **faça backup regular**:

```bash
# Cron job (diário às 2AM)
0 2 * * * tar -czf ~/backups/uploads-$(date +\%Y\%m\%d).tar.gz ~/budstack/apps/api/public/uploads/

# Manter últimos 30 dias
0 3 * * * find ~/backups -name "uploads-*.tar.gz" -mtime +30 -delete
```

## Limites

- **Máximo por arquivo**: 5MB
- **Tipos**: JPEG, PNG, WebP
- **Uso de disco**: Monitorar `/public/uploads`

## Troubleshooting

### Upload falha (403 Forbidden)
- Verificar permissões: `chmod 755 public/uploads`
- Verificar espaço em disco: `df -h`

### Arquivo não aparece
- Verificar se `public/uploads` existe
- Verificar logs: `pm2 logs budstack-api`

### Performance ruim
- Considerar S3 ou CDN para volumes altos
- Limpar uploads antigos periodicamente

## Alternativa: Cloud Storage

Se quiser mudar para S3 depois:

```bash
npm install @aws-sdk/client-s3
```

Atualize `.env`:
```
STORAGE_TYPE=s3
AWS_REGION=us-east-1
AWS_BUCKET=seu-bucket
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx
```

E atualize o controller para usar S3.
