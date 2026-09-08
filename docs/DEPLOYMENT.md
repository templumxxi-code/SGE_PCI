# 🚀 DEPLOYMENT - SMP PCI/RN

Guia completo para colocar o Sistema de Monitoramento de Processos BPM em produção.

**Versão**: 1.0
**Data**: 2026-09-01
**Público**: Administradores de Sistema e DevOps

---

## 📋 Índice

1. [Pré-requisitos](#pré-requisitos)
2. [Checklist de Segurança](#checklist-de-segurança)
3. [Preparação do Ambiente](#preparação-do-ambiente)
4. [Deploy em Produção](#deploy-em-produção)
5. [Validação Pós-Deploy](#validação-pós-deploy)
6. [Rollback](#rollback)
7. [Monitoramento](#monitoramento)
8. [Troubleshooting](#troubleshooting)

---

## Pré-requisitos

### Software Necessário

- **Node.js**: v18.0.0 ou superior
- **PostgreSQL**: v12 ou superior
- **npm**: v8.0.0 ou superior
- **Git**: v2.30.0 ou superior

### Verificar Versões

```bash
node --version          # v18.x.x
npm --version           # v8.x.x
psql --version          # psql 12.x
```

### Hardware Recomendado (Inicial)

- **CPU**: 2 cores (escalar conforme necessário)
- **RAM**: 4 GB (escalar conforme necessário)
- **Disco**: 20 GB SSD
- **Rede**: Conectividade interna e internet para atualizações

---

## Checklist de Segurança

**ANTES DE FAZER DEPLOY, VERIFICAR TODOS OS ITENS**:

### Configuração

- [ ] `JWT_SECRET` gerado (32+ caracteres aleatórios)
- [ ] `DATABASE_HOST` configurado (não localhost em produção)
- [ ] `DATABASE_USER` configurado (não default genérico)
- [ ] `DATABASE_PASSWORD` configurado (senha forte, 16+ chars)
- [ ] `DATABASE_NAME` configurado (nome específico)
- [ ] `NODE_ENV=production`
- [ ] `PORT` configurado (default 3000)
- [ ] `CORS_ORIGINS` definido para domínios específicos, sem `*`
- [ ] `validateEnvironment('production')` executa sem falhas

### Segurança

- [ ] Senha do PostgreSQL alterada (não default)
- [ ] Firewall configurado (apenas tráfego necessário)
- [ ] SSL/TLS disponível (se acesso remoto)
- [ ] Backups configurados (banco de dados)
- [ ] Usuário de aplicação criado (não root/admin)
- [ ] Permissões de arquivo restritas (não 777)

### Testes

- [ ] `npm test` = 20/20 testes passando
- [ ] Teste de login manual
- [ ] Teste de acesso por SETOR
- [ ] Teste de acesso por NGE
- [ ] Teste de upload de arquivo

### Documentação

- [ ] Backup das credenciais (seguro)
- [ ] Documentação de runbook disponível
- [ ] Contatos de emergência registrados
- [ ] Plano de rollback preparado

---

## Preparação do Ambiente

### 1. Clonar Repositório

```bash
git clone <seu-repositório> smp-pci
cd smp-pci
git checkout main  # Ou branch de produção
```

### 2. Instalar Dependências

```bash
npm install
# Verificar se há vulnerabilidades
npm audit
# Se houver, tentar:
npm audit fix
# Se ainda houver, documentar como dependência conhecida
```

### 3. Preparar PostgreSQL

```bash
# Conectar como admin
psql -U postgres

# Criar banco de dados
CREATE DATABASE smp_pci;

# Criar usuário
CREATE USER smp_app WITH PASSWORD 'sua_senha_forte_aqui';

# Conceder permissões
GRANT CONNECT ON DATABASE smp_pci TO smp_app;
\c smp_pci
GRANT ALL PRIVILEGES ON SCHEMA public TO smp_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO smp_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO smp_app;
```

### 4. Configurar Variáveis de Ambiente

```bash
# Criar arquivo .env em produção (NUNCA commitar)
cat > .env <<EOF
NODE_ENV=production
PORT=3000
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
DATABASE_HOST=db.internal
DATABASE_PORT=5432
DATABASE_NAME=smp_pci
DATABASE_USER=smp_app
DATABASE_PASSWORD=sua_senha_forte_aqui
CORS_ORIGINS=https://app.exemplo.gov.br
LOG_LEVEL=info
UPLOAD_DIR=/var/www/smp-pci/uploads
EOF
```

**⚠️ IMPORTANTE**: Permissões do arquivo `.env`
```bash
chmod 600 .env  # Apenas proprietário pode ler
```

### 5. Aplicar Migrations

```bash
npm run migrate
# Verificar se executou sem erros
```

### 6. Instalar PM2 (Process Manager)

```bash
npm install -g pm2

# Criar arquivo de configuração
cat > ecosystem.config.js <<EOF
module.exports = {
    apps: [{
        name: 'smp-pci',
        script: './src/server.js',
        instances: 'max',
        exec_mode: 'cluster',
        env: {
            NODE_ENV: 'production',
            PORT: 3000
        },
        error_file: '/var/log/smp-pci/error.log',
        out_file: '/var/log/smp-pci/out.log',
        log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
        merge_logs: true,
        watch: false,
        max_memory_restart: '1G',
        restart_delay: 4000,
        max_restarts: 10,
        min_uptime: '10s'
    }]
};
EOF
```

---

## Deploy em Produção

### Opção 1: Manual (com PM2)

```bash
# Parar aplicação anterior (se houver)
pm2 stop smp-pci || true
pm2 delete smp-pci || true

# Iniciar nova versão
pm2 start ecosystem.config.js
pm2 save

# Configurar para iniciar no boot
pm2 startup
pm2 save
```

### Opção 2: Heroku

```bash
# Instalar Heroku CLI
npm install -g heroku

# Login
heroku login

# Criar aplicação
heroku create smp-pci-rn

# Configurar variáveis
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
heroku config:set DATABASE_HOST=<seu-host>
# ... outras variáveis

# Colocar banco de dados PostgreSQL
heroku addons:create heroku-postgresql:premium-0

# Deploy
git push heroku main
```

### Opção 3: Docker

```bash
# Criar Dockerfile (se não existir)
cat > Dockerfile <<EOF
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .

EXPOSE 3000
CMD ["node", "src/server.js"]
EOF

# Build e run
docker build -t smp-pci:latest .
docker run -d \
  --name smp-pci \
  -p 3000:3000 \
  --env-file .env \
  smp-pci:latest
```

### Opção 4: Railway/Render

1. Conectar repositório (GitHub/GitLab)
2. Configurar variáveis de ambiente
3. Deploy automático

---

## Validação Pós-Deploy

### 1. Verificar Status da Aplicação

```bash
# Se usando PM2
pm2 status
pm2 logs smp-pci

# Se usando Docker
docker ps
docker logs smp-pci

# Se usando Heroku
heroku logs --tail
```

### 2. Testar Endpoints Críticos

```bash
# Teste de saúde (se implementado)
curl http://localhost:3000/health

# Teste de login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@pci.rn.gov.br",
    "senha": "admin123"
  }'

# Teste com token
curl -H "Authorization: Bearer <seu-token>" \
  http://localhost:3000/api/processos
```

### 3. Validar Banco de Dados

```bash
# Conectar ao banco
psql -U smp_app -h localhost -d smp_pci

# Verificar tabelas
\dt

# Contar registros
SELECT COUNT(*) FROM usuarios;
SELECT COUNT(*) FROM processos;

# Verificar usuários de teste
SELECT email, perfil, ativo FROM usuarios;
```

### 4. Testar Isolamento de Dados (RBAC)

```bash
# Login como SETOR
TOKEN_SETOR=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"setor@pci.rn.gov.br","senha":"setor123"}' | jq -r '.token')

# Verificar que vê apenas seus dados
curl -H "Authorization: Bearer $TOKEN_SETOR" \
  http://localhost:3000/api/processos

# Tentar acessar dados de outro setor (deve falhar)
curl -H "Authorization: Bearer $TOKEN_SETOR" \
  http://localhost:3000/api/processos/999/detalhes
```

### 5. Monitorar por Algumas Horas

```bash
# Verificar logs frequentemente
tail -f /var/log/smp-pci/out.log

# Verificar uso de recursos
top
ps aux | grep node

# Verificar conectividade de banco
psql -U smp_app -h localhost -d smp_pci -c "SELECT 1;"
```

---

## Rollback

### Se Algo Deu Errado

```bash
# PM2
pm2 stop smp-pci
pm2 delete smp-pci

# Restaurar versão anterior (se usando git)
git checkout HEAD~1
npm install
pm2 start ecosystem.config.js

# Restaurar banco (se com backup)
pg_restore -U smp_app -d smp_pci /backups/smp_pci_backup_antes_deploy.sql
```

### Heroku Rollback

```bash
heroku releases
heroku rollback v123  # Números da versão anterior
```

### Docker Rollback

```bash
docker stop smp-pci
docker rm smp-pci
docker run -d \
  --name smp-pci \
  -p 3000:3000 \
  --env-file .env \
  smp-pci:versao-anterior
```

---

## Monitoramento

### Logs Estruturados

```bash
# Configure log rotation
cat > /etc/logrotate.d/smp-pci <<EOF
/var/log/smp-pci/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 nobody nobody
    sharedscripts
    postrotate
        pm2 reload smp-pci
    endscript
}
EOF
```

### Alertas Críticos

Configure alertas para:
- ❌ Mais de 5 erros por minuto
- ❌ Tempo de resposta > 5 segundos
- ❌ Taxa de erro de autenticação alta
- ❌ Uso de memória > 80%
- ❌ Disco cheio
- ❌ Banco de dados indisponível

### Backup Regular

```bash
# Backup diário
0 2 * * * /usr/bin/pg_dump -U smp_app smp_pci | gzip > /backups/smp_pci_$(date +\%Y\%m\%d).sql.gz

# Reter últimos 30 dias
find /backups -name "smp_pci_*.sql.gz" -mtime +30 -delete
```

---

## Troubleshooting

### Erro: "JWT_SECRET não configurado"

```
❌ Variáveis de ambiente obrigatórias não configuradas: JWT_SECRET
```

**Solução**:
```bash
# Verificar arquivo .env
cat .env | grep JWT_SECRET

# Se vazio, gerar:
export JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
# E adicionar ao .env
echo "JWT_SECRET=$JWT_SECRET" >> .env
```

### Erro: "Database connection failed"

```
❌ ECONNREFUSED 127.0.0.1:5432
```

**Solução**:
```bash
# Verificar se PostgreSQL está rodando
psql -U postgres -c "SELECT 1;"

# Verificar credenciais
psql -U smp_app -h localhost -d smp_pci

# Reiniciar PostgreSQL
sudo systemctl restart postgresql
```

### Erro: "Token inválido ou expirado"

```
❌ Error: Token inválido ou expirado
```

**Solução**:
```bash
# Logout forçado (limpar localStorage no cliente)
# E fazer login novamente
# Tokens expiram em 24h, precisam renovação

# Verificar JWT_SECRET não mudou (teria invalidado todos os tokens):
echo $JWT_SECRET
cat .env | grep JWT_SECRET
```

### Erro: "CORS policy blocked request"

```
❌ Access to XMLHttpRequest has been blocked by CORS policy
```

**Solução**:
```bash
# Verificar CORS_ORIGIN
echo $CORS_ORIGIN

# Deve ser domínio real em produção:
# ✅ CORS_ORIGIN=https://seu-dominio.com
# ❌ CORS_ORIGIN=*
# ❌ CORS_ORIGIN=localhost
```

### Erro: "Out of memory"

```
❌ JavaScript heap out of memory
```

**Solução**:
```bash
# Aumentar memória Node.js
node --max-old-space-size=2048 src/server.js

# Ou via PM2
pm2 start ecosystem.config.js --max-memory-restart 2G
```

---

## Suporte e Contatos

**Emergência**:
- Phone: [Número de emergência]
- Email: urgente@pci.rn.gov.br

**Suporte Técnico**:
- Email: suporte@pci.rn.gov.br
- Horário: Segunda-Sexta, 8h-18h

**Segurança**:
- Email: security@pci.rn.gov.br

---

**Documento de Confidencialidade: Apenas para pessoal autorizado**
