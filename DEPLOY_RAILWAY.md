# Deploy no Railway

Guia passo a passo para fazer deploy da aplicação Kubstorm no Railway.

## Pré-requisitos

1. Conta no [Railway.app](https://railway.app)
2. Repositório GitHub conectado
3. Variáveis de ambiente configuradas

## Passo 1: Conectar ao Railway

```bash
# Instalar CLI do Railway (opcional)
npm install -g @railway/cli

# Fazer login (vai abrir navegador)
railway login
```

## Passo 2: Variáveis de Ambiente

No painel do Railway, adicione as seguintes variáveis:

```env
# Banco de dados
DATABASE_URL=postgresql://user:password@host:5432/kubstorm

# NextAuth
NEXTAUTH_SECRET=seu-secret-aleatorio-256-bits
NEXTAUTH_URL=https://seu-dominio.railway.app

# Optional: Google Cloud (se usar GCP metrics)
GCP_PROJECT_ID=seu-project-id
GOOGLE_APPLICATION_CREDENTIALS=/app/gcp-key.json
```

### Gerar NEXTAUTH_SECRET:
```bash
openssl rand -base64 32
```

## Passo 3: Configurar PostgreSQL

No Railway:
1. Clique em "New" → "Database" → "PostgreSQL"
2. Railway criará automaticamente uma instância
3. A variável `DATABASE_URL` será injetada automaticamente

## Passo 4: Deploy via GitHub

1. Vá para [Railway.app](https://railway.app)
2. Clique em "New Project"
3. Escolha "Deploy from GitHub repo"
4. Selecione `edleder/kubstorm`
5. Railway detectará automaticamente o `Dockerfile`
6. Clique em "Deploy"

## Passo 5: Configurar Domínio (Opcional)

No painel do Railway:
1. Vá para "Settings" → "Public Networking"
2. Clique em "Generate Domain"
3. Você receberá um domínio `seu-app.railway.app`

## Passo 6: Atualizar NEXTAUTH_URL

Se criou um domínio customizado:
1. Na variável `NEXTAUTH_URL`, atualize para seu domínio
2. Salve e Railway fará redeploy automático

## Passo 7: Inicializar Banco de Dados

### Opção A: Via Railway CLI
```bash
railway shell
npx prisma migrate deploy
npx ts-node scripts/create-user.ts
```

### Opção B: Via Logs do Railway
1. Na aba "Deployments", abra o log
2. Execute os mesmos comandos

## Verificar Status

```bash
# Ver logs em tempo real
railway logs

# Verificar saúde da aplicação
curl https://seu-app.railway.app/api/health
```

## Troubleshooting

### Erro: "Cannot find module 'prisma'"
- Railway fará rebuild automático - espere 5 min

### Erro: "Database connection failed"
- Verifique se `DATABASE_URL` está correta
- Teste a conexão: `psql $DATABASE_URL`

### Erro: "Kubernetes client error"
- Certifique-se que kubeconfigs estão encriptados
- Verifique a chave de encriptação em `.env`

## Monitoramento

Railway oferece:
- 📊 Métricas de CPU/RAM
- 📈 Logs em tempo real
- 🔄 Redeploys automáticos (quando push para GitHub)
- 🚨 Alertas configuráveis

## Custo Estimado

- **PostgreSQL**: $5/mês (5GB)
- **Aplicação**: $5/mês (512MB RAM)
- **Total**: ~$10/mês (com free tier, pode ser $0)

## Próximas Ações

1. ✅ Deploy feito
2. ✅ Banco de dados criado
3. ✅ Variáveis configuradas
4. → Adicionar kubeconfigs dos clusters
5. → Testar acesso aos clusters
6. → Configurar HTTPS/SSL (Railway faz automático)

## Links Úteis

- [Railway Docs](https://docs.railway.app)
- [Railway Dashboard](https://railway.app/dashboard)
- [Prisma Deployment](https://www.prisma.io/docs/guides/deployment/deployment)
- [NextAuth.js Deployment](https://next-auth.js.org/deployment)
