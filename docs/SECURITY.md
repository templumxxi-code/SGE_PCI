# 🔐 SEGURANÇA - SMP PCI/RN

Documentação do modelo de segurança implementado no Sistema de Monitoramento de Processos BPM.

**Versão**: 2.0
**Data**: 2026-09-01
**Instituição**: Polícia Científica do Rio Grande do Norte
**Classificação**: Público (Requisitos de Segurança)

---

## 📋 Índice

1. [Autenticação](#autenticação)
2. [Autorização (RBAC)](#autorização-rbac)
3. [Criptografia](#criptografia)
4. [Comunicação](#comunicação)
5. [Variáveis de Ambiente](#variáveis-de-ambiente)
6. [Gestão de Secrets](#gestão-de-secrets)
7. [Logs e Auditoria](#logs-e-auditoria)
8. [Proteção contra Ataques](#proteção-contra-ataques)
9. [Checklist de Deploy](#checklist-de-deploy)

---

## Autenticação

### JWT (JSON Web Token)

**Implementação**:
- Tokens assinados com JWT (algoritmo HS256)
- Expiração: 24 horas
- Validação em middleware `src/middleware/auth.js`
- Token no header `Authorization: Bearer <token>`

**Fluxo**:
1. Usuário faz login com email/senha
2. Backend valida credenciais no banco
3. JWT é gerado com `iat` (issued at) e `exp` (expiration)
4. Cliente armazena token
5. Cada requisição envia token no header
6. Middleware valida token e extrai usuário

**Segurança**:
- ✅ JWT_SECRET obrigatório (sem fallback inseguro em produção ou mock)
- ✅ Token assinado (tamper-proof)
- ✅ Expiração curta (24h)
- ✅ Fallback local gerado apenas em ambiente de teste e sem uso em produção
- ⚠️ Token armazenado no localStorage (XSS risk - implementar CSP)

### Credenciais de Teste

**Centralizado em**: `test/helpers/test-credentials.js`

```javascript
const TEST_CREDENTIALS = {
    admin: { email: 'admin@pci.rn.gov.br', senha: 'admin123' },
    setor: { email: 'setor@pci.rn.gov.br', senha: 'setor123' }
};
```

**Uso**:
- ✅ Todas as referências via helpers
- ✅ Não hardcoded em múltiplos arquivos
- ✅ Fácil auditar e mudar

**⚠️ IMPORTANTE**: Estas são credenciais de TESTE apenas. Em produção:
- Nunca commitar no código
- Gerar senhas aleatórias para produção
- Usar LDAP corporativo se disponível

---

## Autorização (RBAC)

### Perfis (Roles)

Sistema de dois níveis:

**1. Nível Institucional (Global)**:
- `NGE` - Nível Central (Administrador)
- `SETOR` - Nível de Unidade

**2. Nível de Unidade Organizacional**:
- `ADMIN` - Gerente da unidade
- `USER` - Usuário padrão

### Verificação de Acesso

**Middleware**: `src/middleware/auth.js`

```javascript
const isAdmin = (req, res, next) => {
    if (req.user?.perfil === 'NGE') return next();
    return res.status(403).json({ error: 'Acesso negado' });
};

const isSector = (req, res, next) => {
    if (req.user?.perfil === 'SETOR') return next();
    return res.status(403).json({ error: 'Acesso negado' });
};
```

**Isolamento de Dados**:
- Usuários SETOR só acessam dados de seu setor
- Queries filtram por `setor_id` automaticamente
- NGE acessa todos os dados

### Recomendações

- ⚠️ Expandir com mais permissões granulares
- ⚠️ Implementar matrix de permissões
- ✅ Testes de RBAC implementados (`test/functional/role-access.test.js`)

---

## Criptografia

### Senhas

**Implementação**: `bcryptjs`
- Salt rounds: 12 (produção), 4 (teste)
- Algoritmo: bcrypt (adaptável)
- Hash NUNCA reversível

**Armazenamento** (`usuarios.senha_hash`):
```sql
CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    senha_hash VARCHAR(255) NOT NULL,  -- Nunca armazena senha em texto plano
    ...
);
```

**Comparação**:
```javascript
const validPassword = await bcryptjs.compare(inputPassword, storedHash);
```

### Dados em Trânsito

**Recomendações**:
- ✅ HTTPS obrigatório em produção (via Helmet)
- ✅ Helmet.js implementado (`src/server.js`)
- ✅ CORS configurado
- ❓ HSTS (HTTP Strict Transport Security) - verificar

---

## Comunicação

### CORS

**Configuração** (`src/config/config.js` e `src/server.js`):
```javascript
const parseCorsOrigins = () => {
    const configured = process.env.CORS_ORIGINS || defaultOrigins;
    const origins = configured.split(',').map((value) => value.trim()).filter(Boolean);

    if (process.env.NODE_ENV === 'production' && origins.includes('*')) {
        throw new Error('CORS_ORIGINS em produção não pode conter "*"');
    }

    return origins;
};
```

**⚠️ CRÍTICO**: Em produção, nunca usar `*` ou domínio genérico.
- Exigir `CORS_ORIGINS` com lista de domínios específicos
- Validar no bootstrap do servidor

### Helmet.js

**Implementado**: `src/server.js`
```javascript
app.use(helmet());
```

**Proteções**:
- ✅ CSP (Content Security Policy)
- ✅ X-Frame-Options (Clickjacking)
- ✅ X-Content-Type-Options (MIME sniffing)
- ✅ Strict-Transport-Security (HSTS)

---

## Variáveis de Ambiente

### Variáveis Obrigatórias (Produção)

```bash
# Segurança (OBRIGATÓRIO)
JWT_SECRET=<chave-aleatória-32+chars>

# Banco de Dados (OBRIGATÓRIO)
DATABASE_HOST=<hostname>
DATABASE_PORT=5432
DATABASE_NAME=<dbname>
DATABASE_USER=<username>
DATABASE_PASSWORD=<password>

# Configuração (OBRIGATÓRIO EM PRODUÇÃO)
NODE_ENV=production
PORT=3000
CORS_ORIGINS=https://app.exemplo.gov.br,https://admin.exemplo.gov.br
LOG_LEVEL=info
```

### Validação

**Validador**: `src/config/env-validator.js`

Executado ao iniciar o servidor:
```bash
$ node src/server.js
# Se JWT_SECRET não estiver definido:
# ❌ Variáveis de ambiente obrigatórias não configuradas:
#    JWT_SECRET
#    ...
```

### Geração de JWT_SECRET Seguro

```bash
# Linux/Mac
openssl rand -hex 32

# Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Python
python3 -c "import secrets; print(secrets.token_hex(32))"
```

**Resultado**: String de 64 caracteres (ex: `a3f9e2d1c8b4f7e6d9a2c5b8e1f4a7d0b3c6e9f2a5d8c1e4b7a0d3e6f9c2a5`)

---

## Gestão de Secrets

### Arquivo `.env`

**⚠️ NUNCA commitar**:
```bash
.env              # Arquivo local (no .gitignore)
.env.local        # Desenvolvimento local
.env.production   # NUNCA commitar
```

**✅ Sim commitar**:
```bash
.env.example      # Template SEM valores reais
```

### Em Produção

**Recomendações**:
1. **Variáveis de Ambiente da Plataforma**
   - Heroku Config Vars
   - AWS Systems Manager Parameter Store
   - Railway Environment Variables
   - Docker Secrets

2. **Rotação de Secrets**
   - ✅ Rotacionar JWT_SECRET a cada 90 dias
   - ✅ Rotacionar DATABASE_PASSWORD a cada 180 dias
   - ✅ Manter secrets anteriores por 24h para transição

3. **Auditoria**
   - ✅ Logs de quem alterou secrets
   - ✅ Não armazenar secrets em logs
   - ✅ Mascarar secrets em outputs

---

## Logs e Auditoria

### Logs de Aplicação

**Arquivo**: `src/models/db.js`
```javascript
console.log(`📊 Query executada em ${duration}ms`);
```

**✅ Ajuste aplicado**: não há exposição de SQL, senha, token ou `DATABASE_PASSWORD` nos logs.

**Em Produção**:
- Logar apenas métricas e erros críticos
- Nunca logar senhas, tokens, JWT ou strings de conexão
- Não enviar segredos em exceptions ou payloads

### Auditoria

**Tabela**: `logs` (database/schema.sql)
```sql
CREATE TABLE logs (
    id SERIAL PRIMARY KEY,
    usuario_id INT REFERENCES usuarios(id),
    acao VARCHAR(255),
    tabela_afetada VARCHAR(255),
    dados_antes JSONB,
    dados_depois JSONB,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Rastreamento**:
- ✅ Quem fez
- ✅ O que fez
- ✅ Quando fez
- ✅ Dados antes/depois (GDPR risk - considerar anonimizar)

---

## Proteção contra Ataques

### SQL Injection

**Status**: ✅ Protegido

**Implementação**:
```javascript
// ❌ NUNCA FAZER:
const query = `SELECT * FROM usuarios WHERE email = '${email}'`;

// ✅ CORRETO:
const query = 'SELECT * FROM usuarios WHERE email = $1';
await pool.query(query, [email]);  // Parametrizado
```

**Todos os queries** no projeto usam prepared statements com `$1, $2, ...`

### Cross-Site Scripting (XSS)

**Status**: ⚠️ Parcialmente protegido

**Implementado**:
- ✅ Helmet.js CSP headers
- ✅ Input validation (frontend)
- ✅ Output encoding (implícito em JSON)

**Melhorias**:
- [ ] Implementar Content Security Policy mais rigoroso
- [ ] Adicionar sanitização HTML se aceitar rich text

### Cross-Site Request Forgery (CSRF)

**Status**: ⚠️ Vulnerável

**Problema**: Sem proteção CSRF token

**Recomendação**:
```bash
npm install csurf
```

Implementar middleware CSRF para mutações (POST, PUT, DELETE)

### Rate Limiting

**Status**: ✅ Implementado (login)

**Implementação** (`src/middleware/loginLimiter.js`):
```javascript
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,  // 15 min
    max: 5,                     // 5 tentativas
    message: 'Muitas tentativas de login. Tente novamente mais tarde.'
});
```

**Aplicado em**: `POST /api/auth/login`

**Melhorias**:
- [ ] Rate limiting em outras rotas críticas
- [ ] Rate limiting por IP + email (evitar enumeration)

---

## Checklist de Deploy

### ✅ Antes de Colocar em Produção

- [ ] **Segurança**
  - [ ] JWT_SECRET gerado e configurado (32+ chars)
  - [ ] DATABASE_USER e DATABASE_PASSWORD configurados
  - [ ] CORS_ORIGIN definido para domínio específico
  - [ ] NODE_ENV=production
  - [ ] Executado `npm audit` - zero vulnerabilidades altas

- [ ] **Banco de Dados**
  - [ ] Database criado e migrado
  - [ ] Backups configurados
  - [ ] Credenciais de conexão validadas
  - [ ] SSL/TLS ativado (se remoto)

- [ ] **Variáveis de Ambiente**
  - [ ] Validadas com env-validator (startup)
  - [ ] Não contêm valores padrão
  - [ ] Secrets não estão no git

- [ ] **Testes**
  - [ ] `npm test` = 20/20 PASS
  - [ ] Testes de segurança executados
  - [ ] Testes de RBAC passando
  - [ ] Autenticação validada

- [ ] **Logs e Monitoramento**
  - [ ] LOG_LEVEL=info (não debug)
  - [ ] Queries verbosas desativadas
  - [ ] Alertas configurados para erros críticos
  - [ ] Rotação de logs configurada

- [ ] **Documentação**
  - [ ] README atualizado
  - [ ] DEPLOYMENT.md criado
  - [ ] Runbook de backup disponível
  - [ ] Contatos de emergência documentados

### 🚀 Depois de Deploy

- [ ] Verificar logs pela primeira hora
- [ ] Testar fluxo de autenticação completo
- [ ] Validar isolamento de dados (RBAC)
- [ ] Executar teste de carga (se crítico)
- [ ] Configurar monitoramento contínuo

---

## Referências

- **OWASP Top 10**: https://owasp.org/Top10/
- **NIST Cybersecurity**: https://www.nist.gov/cyberframework
- **JWT Best Practices**: https://tools.ietf.org/html/rfc7519
- **bcryptjs**: https://github.com/dcodeIO/bcrypt.js
- **Helmet.js**: https://helmetjs.github.io/
- **CORS**: https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS

---

## Contatos

**Segurança**: security@pci.rn.gov.br
**Suporte**: suporte@pci.rn.gov.br
**Responsável Técnico**: [Responsável da instituição]

---

## Histórico de Revisões

| Data | Versão | Alteração |
|------|--------|-----------|
| 2026-09-01 | 2.0 | Primeira versão completa com correções de segurança |
| 2026-08-15 | 1.0 | Versão inicial |

---

**Documento Confidencial - Apenas para Uso Interno**
