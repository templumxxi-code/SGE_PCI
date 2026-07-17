# 🚂 Setup do PostgreSQL no Railway

## 📋 Pré-requisitos
- Conta GitHub OU email
- Navegador web

---

## 🔧 Passo 1: Criar Banco PostgreSQL

### A. Acesso ao Railway
1. Abra: **https://railway.app**
2. Clique em **"Start a New Project"**
3. Faça login com **GitHub** (ou email)

### B. Selecionar Database
1. Clique em **"Provision PostgreSQL"**
2. Aguarde criar o banco (30 segundos)

---

## 📝 Passo 2: Copiar Credenciais

Após criar, você verá a tela de credenciais. Copie:

```
DB_HOST: _______________
DB_PORT: _______________
DB_NAME: _______________
DB_USER: _______________
DB_PASSWORD: _______________
```

**Dica**: Clique em cada campo para copiar para área de transferência

---

## ⚙️ Passo 3: Atualizar .env

Abra o arquivo `.env` (criado na raiz do projeto) e cole as credenciais:

```env
# Banco de Dados PostgreSQL (do Railway)
DB_HOST=seu_host_aqui
DB_PORT=seu_port_aqui
DB_NAME=seu_database_aqui
DB_USER=seu_usuario_aqui
DB_PASSWORD=sua_senha_aqui

# Servidor
PORT=3000
NODE_ENV=development

# JWT
JWT_SECRET=sua_chave_secreta_muito_segura_aqui

# Upload
MAX_FILE_SIZE=10485760
UPLOAD_DIR=./uploads

# Logs
LOG_LEVEL=info
```

---

## 🗂️ Passo 4: Criar Schema

Após configurar `.env`, execute:

```bash
# Usar psql remotamente (se PostgreSQL está instalado)
psql "postgresql://usuario:senha@host:port/database" -f database/schema.sql

# OU via Node.js
npm run init-db
```

**Alternativa**: No Railway, abra o "Database" e execute o SQL manualmente:

1. Na interface do Railway, clique em **"Data"**
2. Cole o conteúdo de `database/schema.sql`
3. Execute

---

## 🎉 Passo 5: Iniciar Servidor

```bash
npm run dev
```

Acesse: **http://localhost:3000**

Login com:
- **Email**: admin@pci.rn.gov.br
- **Senha**: admin123

---

## 🆘 Solução de Problemas

### Erro: "ECONNREFUSED"
- Verifique se copiar credenciais corretamente no `.env`
- Confirme que seu IP está na whitelist do Railway

### Erro: "relation already exists"
- Banco já existe. Limpe com: `DROP SCHEMA public CASCADE; CREATE SCHEMA public;`

### Não consegue conectar via psql local
- Sua máquina pode não ter PostgreSQL instalado
- Use a interface web do Railway para administrar

---

## 💡 Dicas

1. **Gratuito**: Railway oferece créditos grátis ($5 USD/mês)
2. **Seguro**: Senhas criptografadas, conexão SSL por padrão
3. **Fácil escala**: Pode aumentar recursos quando precisar
4. **Backups automáticos**: Railway faz backup diariamente

---

## 📞 Precisa de Help?

1. Veja a documentação do Railway: https://docs.railway.app
2. Verifique o arquivo `DEVELOPMENT.md` deste projeto
3. Consulte logs: `npm run dev` e veja o terminal

---

**Quando tiver as credenciais, me avise!** 🚀
