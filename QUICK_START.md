# 🚀 QUICK START - SMP PCI

## ⏱️ Tempo Estimado: 10 minutos

### Pré-requisitos
- Node.js v14+ instalado
- PostgreSQL instalado e rodando
- Git (opcional)

---

## 1️⃣ Instalar Dependências (2 min)

```bash
npm install
```

---

## 2️⃣ Configurar Banco de Dados (3 min)

### Opção A: Usando pgAdmin ou DBeaver
1. Abra seu gerenciador PostgreSQL
2. Crie novo banco: `smp_pci`
3. Execute: `database/schema.sql`
4. (Opcional) Execute: `database/seed.sql`

### Opção B: Linha de comando
```bash
# Criar banco
createdb smp_pci

# Executar schema
psql -U postgres -d smp_pci -f database/schema.sql

# (Opcional) Carregar dados de teste
psql -U postgres -d smp_pci -f database/seed.sql
```

---

## 3️⃣ Configurar Variáveis de Ambiente (2 min)

```bash
# Copiar template
cp .env.example .env

# Editar .env
# Abra o arquivo e configure:
# DB_HOST=localhost
# DB_USER=postgres
# DB_PASSWORD=sua_senha
# JWT_SECRET=sua_chave_secreta
```

---

## 4️⃣ Iniciar Servidor (1 min)

```bash
# Desenvolvimento (com auto-reload)
npm run dev

# Produção
npm start
```

---

## 5️⃣ Acessar o Sistema (2 min)

### URL
```
http://localhost:3000
```

### Credenciais de Teste
| Tipo | Email | Senha |
|------|-------|-------|
| Admin | admin@pci.rn.gov.br | admin123 |
| Usuário | setor@pci.rn.gov.br | setor123 |

---

## 📋 Passos Rápidos em Uma Linha

```bash
npm install && cp .env.example .env && npm run dev
```

---

## ⚠️ Solução de Problemas

### Erro: "Cannot find module 'pg'"
```bash
npm install
```

### Erro: "ECONNREFUSED" (Sem conexão com BD)
```bash
# Verificar se PostgreSQL está rodando
# Windows: Verificar Services > PostgreSQL
# Linux: sudo service postgresql status
# Mac: brew services list
```

### Erro: "Database does not exist"
```bash
# Criar banco manualmente
createdb -U postgres smp_pci

# Executar schema
psql -U postgres -d smp_pci -f database/schema.sql
```

---

## 📁 Estrutura Criada

```
✓ Backend (Node.js/Express)
✓ Frontend (HTML/CSS/JS)
✓ Banco de Dados (PostgreSQL)
✓ API RESTful (18 endpoints)
✓ Autenticação JWT
✓ Dashboards Interativos
✓ Relatórios e Indicadores
✓ Controle de Acesso
```

---

## 🎯 Próximas Ações

1. **Explorar o Dashboard** - Faça login com credenciais de teste
2. **Criar Processos** - Teste a funcionalidade de cadastro
3. **Visualizar Indicadores** - Veja os gráficos de desempenho
4. **Gerar Relatórios** - Exporte dados
5. **Gerenciar Usuários** - Configure permissões (como admin)

---

## 📚 Documentação

- **README.md** - Visão geral do projeto
- **DEVELOPMENT.md** - Guia de desenvolvimento
- **CHECKLIST.md** - Status de implementação
- **Código comentado** - Explicações inline

---

## 🔗 Endpoints Principais

```
POST   /api/auth/login
GET    /api/processes
POST   /api/processes
GET    /api/indicators
POST   /api/indicators
GET    /api/reports/dashboard
```

Veja a documentação completa em `DEVELOPMENT.md`

---

## 💡 Dicas

1. Use DevTools do navegador (F12) para ver requisições
2. Logs do servidor aparecem no terminal
3. Modificar CSS: Edite `public/css/style.css`
4. Adicionar funcionalidade: Crie novo arquivo em `public/js/`
5. Testar API: Use cURL ou Insomnia

---

## ✅ Verificação Rápida

Após iniciar, verifique:

- [ ] Página carrega em http://localhost:3000
- [ ] Login funciona com `admin@pci.rn.gov.br` / `admin123`
- [ ] Dashboard exibe métricas
- [ ] Gráficos são renderizados
- [ ] Console do navegador sem erros
- [ ] Terminal mostra servidor rodando

---

## 🎉 Sucesso!

Se chegou aqui, o sistema está pronto para uso!

**Desenvolvido com ❤️ para a Polícia Científica do RN**

---

**Questões?** Veja `DEVELOPMENT.md` para informações detalhadas.
