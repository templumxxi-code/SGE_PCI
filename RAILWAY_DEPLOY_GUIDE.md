# 🚀 Guia Completo de Deploy no Railway

## SMP PCI - Sistema de Monitoramento de Processos BPM

Este guia fornece instruções passo a passo para fazer deploy da aplicação no Railway.

---

## 📋 Pré-requisitos

- ✅ Conta no GitHub (com repositório criado)
- ✅ Conta no Railway ([railway.app](https://railway.app))
- ✅ Repositório GitHub vinculado: `templumxxi-code/SMP-PCI`

---

## 🎯 Passo 1: Acessar Railway

1. Ir para [https://railway.app](https://railway.app)
2. Fazer login com sua conta GitHub
3. Clicar em **"+ New Project"** ou **"Create"**

---

## 📦 Passo 2: Conectar ao Repositório GitHub

1. Selecionar **"Deploy from GitHub repo"**
2. Autorizar Railway a acessar seus repositórios GitHub
3. Encontrar e selecionar **`templumxxi-code/SMP-PCI`**
4. Clicar em **"Deploy"**

> Railway iniciará o build automático

---

## 🔗 Passo 3: Provisionar Banco de Dados PostgreSQL

### 3.1 Adicionar Serviço PostgreSQL
1. Na dashboard do seu projeto, clicar em **"+ Add Service"**
2. Selecionar **"Database"** → **"PostgreSQL"**
3. Aguardar o Railway criar a instância (leva alguns minutos)

### 3.2 Variáveis Automáticas
Railway criará automaticamente as variáveis:
- `DATABASE_URL` - URL completa de conexão
- `PGHOST` - Host do banco
- `PGPORT` - Porta
- `PGDATABASE` - Nome do banco
- `PGUSER` - Usuário
- `PGPASSWORD` - Senha

> ⚠️ **Importante**: Copiar essas informações para usar na próxima etapa

---

## 🔐 Passo 4: Configurar Variáveis de Ambiente

### 4.1 Na Dashboard do Railway

1. Selecionar o serviço **SMP-PCI** (Node.js)
2. Ir para a aba **"Variables"**
3. Adicionar as seguintes variáveis:

| Variável | Valor | Descrição |
|----------|-------|-----------|
| `NODE_ENV` | `production` | Ambiente de produção |
| `PORT` | `3000` | Porta da aplicação |
| `DB_HOST` | Valor de `PGHOST` | Host do PostgreSQL |
| `DB_PORT` | Valor de `PGPORT` | Porta do PostgreSQL |
| `DB_NAME` | Valor de `PGDATABASE` | Nome do banco |
| `DB_USER` | Valor de `PGUSER` | Usuário do banco |
| `DB_PASSWORD` | Valor de `PGPASSWORD` | Senha do banco |
| `JWT_SECRET` | `gerar_uma_chave_aleatoria_segura` | Chave secreta JWT |

### 4.2 Gerar JWT_SECRET Seguro
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copiar o resultado e colar em `JWT_SECRET` no Railway.

---

## 🗄️ Passo 5: Criar Tabelas do Banco de Dados

### 5.1 Conectar ao PostgreSQL Railway
```bash
# Instalar psql-cli (PostgreSQL client)
# Windows (Chocolatey)
choco install postgresql12

# Ou usar a URL de conexão fornecida pelo Railway
psql "postgresql://user:password@host:port/dbname"
```

### 5.2 Executar Schema SQL
```bash
cd "C:\Users\luizm\Desktop\Sistema 1\SMP PCI"

# Se possuir psql instalado
psql -U user -h host -d dbname -f database/schema.sql

# Ou manualmente:
# 1. Conectar ao PostgreSQL Railway com ferramenta GUI (pgAdmin, DBeaver)
# 2. Abrir arquivo database/schema.sql
# 3. Executar todo o conteúdo
```

### 5.3 Seed de Dados (Somente desenvolvimento)
Nao execute este seed em producao. Ele contem dados e credenciais de teste.
Use somente em um banco local descartavel:
```bash
psql -U user -h host -d dbname -f database/seed.sql
```

---

## ✅ Passo 6: Verificar Deploy

1. Na dashboard do Railway, ir para a aba **"Deployments"**
2. Verificar status:
   - 🟢 **Build successful** - Deploy concluído
   - 🔴 **Build failed** - Verifique os logs

### Logs
Clicar em **"View Logs"** para diagnosticar erros:
```
[INFO] Starting application
[INFO] Connected to database
[INFO] Server running on port 3000
```

---

## 🌐 Passo 7: Acessar a Aplicação

1. Railway fornecerá um URL automático (ex: `https://smp-pci-production.railway.app`)
2. Acessar no navegador
3. Fazer login com credenciais de teste:
   - **Admin**: `admin@pci.rn.gov.br` / `admin123`
   - **Setor**: `setor@pci.rn.gov.br` / `setor123`

---

## 🔄 Passo 8: Deploy Contínuo (CI/CD)

### Automático
- Cada push em `sprint-07c-perfis-escopos` dispara novo deploy
- Railway monitora automaticamente o repositório GitHub

### Manual
Se precisar fazer deploy manualmente:
1. Railway → **Deployments** → **Redeploy**

---

## 🐛 Troubleshooting

### Erro: "Cannot connect to database"
- Verificar variáveis `DB_*` configuradas corretamente
- Testar conexão usando ferramenta GUI (pgAdmin)
- Verificar whitelist de IP (Railway permite automaticamente)

### Erro: "Build failed"
- Verificar logs completos
- Garantir `Procfile` ou `package.json` correto
- Verificar se todas as dependências estão em `package.json`

### Erro: "Port already in use"
- Railway já fornece PORT, não é necessário configurar
- Remover `--port 3000` se existir em `Procfile`

### Aplicação carrega mas database vazio
- Executar `database/schema.sql` manualmente (ver Passo 5)
- Verificar logs para erros SQL

---

## 📊 Monitoramento

Na dashboard do Railway:
- **Metrics**: CPU, memória, disk
- **Logs**: Todos os logs da aplicação
- **Environment**: Variáveis de ambiente
- **Settings**: Configurações avançadas

---

## 🔒 Segurança

✅ Usar HTTPS (Railway fornece automático)
✅ Gerar nova `JWT_SECRET` em produção
✅ Nunca commitar `.env` no repositório
✅ Usar variáveis de ambiente para dados sensíveis
✅ Monitorar logs para atividades suspeitas

---

## 📞 Suporte

- Railway Docs: [https://docs.railway.app](https://docs.railway.app)
- Railway Support: [https://railway.app/support](https://railway.app/support)
- GitHub Issues: [https://github.com/templumxxi-code/SMP-PCI/issues](https://github.com/templumxxi-code/SMP-PCI/issues)

---

## ✨ Próximas Etapas

- [ ] Configurar domínio customizado no Railway
- [ ] Implementar backups automáticos do banco
- [ ] Configurar alertas de performance
- [ ] Implementar logs centralizados
- [ ] Configurar CI/CD pipeline com testes automatizados

---

**Última atualização**: 2026-08-14  
**Versão**: SMP PCI v1.0.0
