# Instruções de Desenvolvimento - SMP PCI

## Resumo do Projeto

Este é um **Sistema Web de Monitoramento de Processos BPM** para a Polícia Científica do RN (PCI-RN), desenvolvido com:

- **Frontend**: HTML5, CSS3, JavaScript ES6+
- **Backend**: Node.js + Express
- **Banco de Dados**: PostgreSQL
- **Autenticação**: JWT + bcryptjs
- **API RESTful**: Segura e documentada

---

## 🚀 Iniciando Desenvolvimento

### 1. Instalar Dependências

```bash
npm install
```

### 2. Configurar Banco de Dados

#### Criar banco de dados:
```bash
createdb smp_pci
```

#### Executar schema:
```bash
psql -U postgres -d smp_pci -f database/schema.sql
```

### 3. Configurar Variáveis de Ambiente

```bash
cp .env.example .env
```

Editar `.env` com:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=smp_pci
DB_USER=postgres
DB_PASSWORD=sua_senha
PORT=3000
JWT_SECRET=sua_chave_secreta_muito_segura
```

### 4. Iniciar Servidor

```bash
# Desenvolvimento (com nodemon)
npm run dev

# Produção
npm start
```

O servidor estará disponível em `http://localhost:3000`

---

## 👤 Usuários de Teste

| Usuário | Senha | Perfil | Acesso |
|---------|-------|--------|--------|
| admin@pci.rn.gov.br | admin123 | NGE | Completo (Admin) |
| setor@pci.rn.gov.br | setor123 | SETOR | Restrito ao setor |

---

## 📁 Estrutura do Projeto

```
SMP PCI/
├── public/                 # Frontend (arquivos estáticos)
│   ├── index.html         # Página principal
│   ├── css/               # Estilos
│   │   ├── style.css      # Estilos gerais
│   │   ├── dashboard.css  # Estilos dashboard
│   │   └── responsive.css # Responsividade
│   ├── js/                # Scripts JavaScript
│   │   ├── app.js         # Controlador principal
│   │   ├── auth.js        # Autenticação & API
│   │   ├── dashboard.js   # Dashboard
│   │   ├── processes.js   # Gerenciamento de processos
│   │   ├── indicators.js  # Indicadores KPI
│   │   ├── reports.js     # Relatórios
│   │   ├── settings.js    # Configurações
│   │   └── utils.js       # Utilitários
│   ├── assets/            # Imagens e ícones
│   └── components/        # Componentes reutilizáveis (futura expansão)
│
├── src/                   # Backend (Node.js)
│   ├── server.js          # Configuração Express
│   ├── routes/            # Rotas API
│   │   ├── auth.js        # Autenticação
│   │   ├── processes.js   # Processos
│   │   ├── indicators.js  # Indicadores
│   │   └── reports.js     # Relatórios
│   ├── middleware/        # Middlewares
│   │   ├── auth.js        # Autenticação JWT
│   │   └── errorHandler.js # Tratamento de erros
│   ├── controllers/       # Lógica de negócio
│   │   ├── authController.js
│   │   ├── processController.js
│   │   └── indicatorController.js
│   ├── models/            # Modelos & DB
│   │   └── db.js          # Conexão PostgreSQL
│   └── config/            # Configurações (futura)
│
├── database/
│   └── schema.sql         # Schema PostgreSQL
│
├── uploads/               # Arquivos enviados (POP, PAP, BPMN)
├── .env.example           # Exemplo de variáveis
├── .gitignore
├── package.json
├── README.md
└── DEVELOPMENT.md         # Este arquivo
```

---

## 🔌 API Endpoints

### Autenticação
- `POST /api/auth/login` - Login
- `POST /api/auth/registrar` - Registrar (admin)
- `GET /api/auth/perfil` - Obter perfil
- `GET /api/auth/usuarios` - Listar usuários (admin)
- `POST /api/auth/alterar-senha` - Alterar senha

### Processos
- `GET /api/processes` - Listar processos
- `POST /api/processes` - Criar processo
- `GET /api/processes/:id` - Obter processo
- `PUT /api/processes/:id` - Atualizar processo
- `DELETE /api/processes/:id` - Deletar processo (admin)
- `GET /api/processes/:id/indicadores` - Indicadores do processo

### Indicadores
- `POST /api/indicators` - Criar indicador
- `GET /api/indicators/:id` - Obter indicador
- `PUT /api/indicators/:id/valor` - Atualizar valor
- `GET /api/indicators/setor/:setorId` - Indicadores por setor

### Relatórios
- `GET /api/reports/processos` - Relatório de processos
- `GET /api/reports/indicadores` - Relatório de indicadores
- `GET /api/reports/dashboard` - Dados do dashboard

---

## 🔐 Segurança

- ✅ Senhas criptografadas com bcryptjs
- ✅ Autenticação JWT
- ✅ Validação de inputs (frontend + backend)
- ✅ Proteção contra SQL injection (prepared statements)
- ✅ CORS configurado
- ✅ Logs de auditoria

---

## 📋 Metodologia BPM

O sistema suporta 5 fases:

1. **Planejar** - Definição do processo
2. **Analisar** - Análise detalhada
3. **Desenhar** - Desenho do processo
4. **Implementar** - Implementação
5. **Monitorar** - Monitoramento em tempo real

---

## 🎨 Identidade Visual

- **Cor Primária**: Azul escuro (#001a4d)
- **Cor Secundária**: Dourado (#ffc107)
- **Cor Sucesso**: Verde (#28a745)
- **Fonte**: Inter (sans-serif)
- **Estilo**: Clean, minimalista, moderno

---

## 🧪 Testar API com cURL

```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@pci.rn.gov.br","senha":"admin123"}'

# Listar processos (com token)
curl -X GET http://localhost:3000/api/processes \
  -H "Authorization: Bearer SEU_TOKEN"
```

---

## 📦 Próximas Etapas (Roadmap)

- [ ] Autenticação LDAP corporativa
- [ ] Exportação de relatórios (PDF/Excel)
- [ ] WebSocket para atualizações em tempo real
- [ ] Notificações por email
- [ ] Dashboard de análise preditiva
- [ ] Integração com sistema de RH
- [ ] App mobile (React Native)
- [ ] Testes automatizados
- [ ] CI/CD pipeline

---

## 🐛 Troubleshooting

### Erro: "Cannot find module 'pg'"
```bash
npm install
```

### Erro: "ECONNREFUSED" (Conexão recusada)
Verificar se PostgreSQL está rodando:
```bash
# Linux/Mac
brew services list
# ou
sudo service postgresql status

# Windows
Services > PostgreSQL
```

### Erro de CORS
Verificar configuração em `src/server.js`:
```javascript
app.use(cors({
    origin: '*',  // Ou seu domínio específico
    credentials: true
}));
```

---

## 📞 Contato & Suporte

- **Desenvolvedor**: [Sua informação]
- **E-mail**: [email de contato]
- **Issues**: Reporte no sistema interno

---

**Desenvolvido com ❤️ para a Polícia Científica do Rio Grande do Norte**
