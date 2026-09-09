# 📋 PRE-PRODUCTION AUDIT - FASE 1 - AUDITORIA INICIAL
## SGE PCI/RN - Diagnóstico de Estado Atual

**Data**: 2026-09-01  
**Auditoria**: Estado atual do sistema antes de correções  
**Auditor**: Validação técnica sistemática  
**Resultado**: Lista de achados classificados por severidade

---

## 🎯 RESUMO EXECUTIVO

O **SGE PCI/RN** possui uma arquitetura sólida com:
- ✅ Autenticação JWT implementada
- ✅ RBAC com escopo por unidade organizacional
- ✅ Testes funcionais: **20/20 passando** (Sprint 2.3.1)
- ✅ Documentação de segurança e deployment
- ✅ Sanitização de erros (não expõe stack traces)
- ✅ Rate limiting implementado
- ✅ Helmet.js para headers de segurança

**PORÉM**, identifiquei **14 problemas** que precisam tratamento antes da produção:
- **4 CRÍTICOS** 🔴
- **7 ALTOS** 🟠
- **3 MÉDIOS** 🟡

---

## 🔴 CRÍTICO (Impede Produção)

### 1. Vulnerabilidades de Dependências (npm audit)
**Severity**: 🔴 CRÍTICO  
**Status**: ❓ Não executado  
**Risco**: Código vulnerável em produção  

**Problema**:
- Não foi executado `npm audit` neste ambiente (Windows PowerShell tem restrições)
- Dependências podem conter vulnerabilidades conhecidas
- CVEs podem estar presentes em: bcryptjs, cors, express, helmet, multer, pg, pdfkit

**Arquivos Envolvidos**:
- `package.json` (todas as dependências)
- `package-lock.json`

**Impacto**:
- Vazamento de dados
- RCE (Remote Code Execution)
- DoS (Denial of Service)

**Plano de Correção**:
- [ ] Executar `npm audit` em máquina com Node.js instalado
- [ ] Gerar relatório de vulnerabilidades
- [ ] Atualizar pacotes críticos
- [ ] Validar compatibilidade com codebase

---

### 2. Credenciais Expostas em .env Local
**Severity**: 🔴 CRÍTICO  
**Status**: ⚠️ Configurado  
**Risco**: Senhas de banco em texto plano  

**Problema**:
- Arquivo `.env` contém: `DB_PASSWORD=mateusn717`
- Arquivo `.env` contém: `JWT_SECRET=f28cd985...` (fixo, fraco)
- `.env` está protegido no `.gitignore`, mas desenvolvedor pode expor

**Arquivo Envolvido**:
- `.env` (não commited, mas contém credenciais reais locais)

**Impacto**:
- Se `.env` for exposto: acesso ao banco de dados
- Se `.env` for commitado por acidente: credenciais no Git histórico
- JWT_SECRET fraco: tokens podem ser forjados

**Validação**:
- ✅ `.env` está no `.gitignore`
- ✅ `.env.production` está no `.gitignore`
- ✅ `.env.example` não contém credenciais reais

**Plano de Correção**:
- [ ] Gerar JWT_SECRET seguro (32+ chars aleatórios)
- [ ] Gerar DB_PASSWORD novo (16+ chars, caracteres especiais)
- [ ] Documentar não compartilhar `.env` entre desenvolvedores
- [ ] Implementar .env.local para desenvolvimento pessoal

---

### 3. CORS Configuração Insegura em Produção
**Severity**: 🔴 CRÍTICO  
**Status**: ⚠️ Configurado  
**Risco**: Acesso de origem não autenticada  

**Problema**:
- Em desenvolvimento: `CORS_ORIGIN=""` (vazio) = bloqueia
- Em produção: `CORS_ORIGIN=""` (vazio) = bloqueia
- Mas documentação não está clara sobre qual valor usar em produção

**Código Encontrado** (`src/server.js`):
```javascript
const parseCorsOrigins = () => {
    const defaultOrigins = process.env.NODE_ENV === 'production'
        ? ''  // ← Vazio em produção = rejeitará todas as origins!
        : 'http://localhost:3000,http://127.0.0.1:3000,...';
    const configured = process.env.CORS_ORIGINS || defaultOrigins;
    return configured.split(',').map((value) => value.trim()).filter(Boolean);
};
```

**Impacto**:
- Se CORS_ORIGIN vazio: frontend não consegue comunicar
- Se CORS_ORIGIN "*": qualquer site pode acessar
- Se CORS_ORIGIN não configurado em produção: aplicação falha

**Plano de Correção**:
- [ ] Definir CORS_ORIGIN em produção (ex: `https://seu-dominio.com`)
- [ ] Testar que CORS funciona com domínio específico
- [ ] Documentar claramente qual valor usar em produção

---

### 4. Sem Estratégia de Backup/Recuperação Comprovada
**Severity**: 🔴 CRÍTICO  
**Status**: ❌ Não testada  
**Risco**: Perda total de dados em produção  

**Problema**:
- Nenhum script de backup PostgreSQL encontrado em `/scripts`
- Nenhuma documentação de procedimento de backup
- Nenhuma validação de restauração

**Diretórios Verificados**:
- `/scripts` - contém: migrate-local-data.js, migrate-passwords.js, setup-postgres.js
- `/storage/backups/` - vazio

**Impacto**:
- Falha do BD → perda total de dados
- Sem recuperação possible
- Violação de SLA institucional

**Plano de Correção**:
- [ ] Criar script `scripts/backup-postgresql.sh`
- [ ] Implementar backup diário com pg_dump
- [ ] Testar restauração de backup
- [ ] Documentar procedimento de backup/recuperação
- [ ] Configurar retenção (mínimo 30 dias)

---

## 🟠 ALTO (Deve ser Corrigido)

### 5. LOG_LEVEL Pode Expor Informações Sensíveis
**Severity**: 🟠 ALTO  
**Status**: ⚠️ Parcialmente Protegido  
**Risco**: Vazamento de informações via logs  

**Problema**:
- Não há log filtering claro
- Queries SQL completas podem ser logadas
- Stack traces podem conter caminhos/estrutura

**Código Encontrado** (`src/models/db.js`):
```javascript
console.log(`📊 Query executada em ${duration}ms:`, text.substring(0, 50) + '...');
```

**Status**:
- ✅ errorHandler.js sanitiza mensagens
- ⚠️ Queries ainda são logadas (safe substring)
- ❌ Não há filtro para NODE_ENV=production

**Impacto**:
- Exposição de estrutura de banco
- Informações de debug em produção

**Plano de Correção**:
- [ ] Desativar query logging em NODE_ENV=production
- [ ] Filtrar senha/token de mensagens de erro
- [ ] Implementar LOG_LEVEL env var
- [ ] Validar que logs não contêm dados sensíveis

---

### 6. Sem Validação Explícita de Entrada em Upload
**Severity**: 🟠 ALTO  
**Status**: ⚠️ Parcialmente Protegido  
**Risco**: Upload de arquivo malicioso  

**Problema**:
- MIME type validation existe, mas apenas `['application/pdf', 'image/jpeg', 'image/png']`
- Sem validação de conteúdo (magic bytes)
- Sem escaneamento antivírus
- Sem limitação de caminho (path traversal check)

**Código Encontrado** (`src/routes/attachments.js`):
```javascript
const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
if (!allowedTypes.includes(file.mimetype)) {
    return cb(new Error('MIME inválido'));
}
```

**Status**:
- ⚠️ MIME validation: presente mas básica
- ❌ Magic bytes validation: ausente
- ❌ Antivírus scan: ausente
- ❌ Path traversal protection: nome arquivo sanitizado, mas não testado

**Impacto**:
- Upload de arquivo .exe disfarçado como PDF
- Execução de código via upload
- Path traversal para sobrescrever arquivos

**Plano de Correção**:
- [ ] Implementar validação de magic bytes (libmagic/file-type)
- [ ] Adicionar sanitização de nome de arquivo
- [ ] Implementar escaneamento antivírus (ClamAV ou similar)
- [ ] Testar path traversal com payloads conhecidos

---

### 7. Health Check Endpoint Expõe Informação de Ambiente
**Severity**: 🟠 ALTO  
**Status**: ⚠️ Implementado  
**Risco**: Informação disclosure  

**Problema**:
- Endpoint `/api/health` retorna `environment: NODE_ENV`
- Em produção, expõe que está em produção (info gathering)

**Código Encontrado** (`src/server.js`):
```javascript
app.get('/api/health', async (req, res) => {
    res.json({
        status: 'ok',
        environment: process.env.NODE_ENV || 'development'  // ← Expõe
    });
});
```

**Impacto**:
- Attacker sabe que é produção
- Peut facilitar ataques específicos

**Plano de Correção**:
- [ ] Remover `environment` da resposta em produção
- [ ] Manter apenas `status` e `timestamp`
- [ ] Testar que health check não expõe env

---

### 8. Sem Autenticação em Endpoint /api/health
**Severity**: 🟠 ALTO  
**Status**: ⚠️ Não protegido  
**Risco**: DoS/information gathering sem autenticação  

**Problema**:
- Endpoint `/api/health` não requer token JWT
- Pode ser abusado para DoS ou información gathering

**Impacto**:
- Attacker pode fazer polling constante
- Descobrir status do sistema sem credenciais

**Plano de Correção**:
- [ ] Adicionar rate limiting a `/api/health`
- [ ] Considerar JWT opcional (com rate limit menor se sem token)
- [ ] Testar rate limiting com ferramentas de stress test

---

### 9. PASSWORD_HASH Pode Estar Visível em Respostas
**Severity**: 🟠 ALTO  
**Status**: ✅ Protegido  
**Risco**: Exposição de hash de senha  

**Problema**:
- Campo `senha_hash` em queries SQL, mas sanitizado em respostas
- Se alguém adicionar novo endpoint sem usar `safeUser()`, hash vaza

**Código Encontrado** (`src/routes/users.js`):
```javascript
const safeUser = (user) => {
    const { senha_hash, password_hash, passwordHash, ...safe } = user;
    return safe;  // ✅ Hash removido
};
```

**Status**:
- ✅ Função `safeUser` implementada
- ⚠️ Mas é responsabilidade do desenvolvedor usar
- ❌ Sem middleware automático

**Plano de Correção**:
- [ ] Criar middleware que automaticamente remove campos sensíveis
- [ ] Documentar padrão de sanitização
- [ ] Auditar todos endpoints que retornam usuários

---

### 10. Sem Proteção CSRF Explícita
**Severity**: 🟠 ALTO  
**Status**: ❌ Ausente  
**Risco**: Cross-Site Request Forgery em aplicações web  

**Problema**:
- Nenhum middleware CSRF implementado
- Tokens de formulário não existem
- API usa apenas JWT (protege API, mas não formulários)

**Impacto**:
- Se frontend tiver formulários tradicionais, vulnerável a CSRF
- Frontend atual (SPA com JWT) está protegido

**Plano de Correção**:
- [ ] Se usar formulários: implementar CSRF token
- [ ] Se SPA com JWT apenas: documentar que está protegido
- [ ] Validar que POST/PUT/DELETE usam JWT (não cookies simples)

---

### 11. Sem Rate Limiting em Endpoints Críticos (exceto login)
**Severity**: 🟠 ALTO  
**Status**: ⚠️ Parcial  
**Risco**: Brute force, DoS  

**Problema**:
- Rate limiting existe apenas em `/auth/login` (loginLimiter)
- Endpoints de API não têm rate limiting
- Usuário pode fazer PATCH /users infinitamente

**Código Encontrado** (`src/middleware/loginLimiter.js`):
- max: 10 tentativas em 15 minutos
- Aplicado apenas em POST /auth/login

**Impacto**:
- Brute force de senha pode contornar
- Ataque de enumeração de usuários
- DoS em endpoints críticos

**Plano de Correção**:
- [ ] Implementar rate limiting global ou por endpoint
- [ ] 100 requisições / 15 minutos por IP por padrão
- [ ] Endpoints críticos (admin): limite menor
- [ ] Testar com ferramentas de stress test

---

### 12. Sem Implementação de Secret Rotation
**Severity**: 🟠 ALTO  
**Status**: ❌ Ausente  
**Risco**: Credentials comprometidas não são rotacionadas  

**Problema**:
- Não há procedimento para rotação de JWT_SECRET
- Não há procedimento para rotação de DATABASE_PASSWORD
- Não há suporte para múltiplos secrets (old key + new key)

**Impacto**:
- Se JWT_SECRET vazar: todos os tokens são inválidos
- Invalidar sessões de todos usuários
- Sem suporte para rolling updates

**Plano de Correção**:
- [ ] Documentar procedimento de rotação
- [ ] Implementar suporte para múltiplas chaves JWT
- [ ] Criar script de rotação de credenciais
- [ ] Definir cadência de rotação (90 dias recomendado)

---

## 🟡 MÉDIO (Recomendável Corrigir)

### 13. Documentação de Migrações Incompleta
**Severity**: 🟡 MÉDIO  
**Status**: ⚠️ Presente mas não documentada  
**Risco**: Erros ao executar migrações em produção  

**Problema**:
- 13 arquivos de migração em `/database/migrations/`
- Nenhuma documentação de ordem de execução
- Nenhuma documentação de rollback
- Nenhum script de migração automático

**Migrações Encontradas**:
```
0001_add_attachment_fields.sql
0002_create_planejar_phase_tables.sql
...
0013_strategy_notifications.sql
```

**Impacto**:
- Erro ao executar migrações manualmente
- Inconsistência entre ambientes

**Plano de Correção**:
- [ ] Documentar ordem de execução
- [ ] Criar script de migração (migrator.js)
- [ ] Testar migrações em banco limpo
- [ ] Implementar rollback procedures

---

### 14. Sem Testes de Performance
**Severity**: 🟡 MÉDIO  
**Status**: ❌ Ausente  
**Risco**: Degradação de performance em produção  

**Problema**:
- Não há testes de carga
- Não há validação de tempo de resposta
- Não há análise de índices de banco

**Testes Existentes**:
- ✅ 20/20 testes funcionais passando
- ❌ 0 testes de performance
- ❌ 0 testes de carga

**Impacto**:
- N+1 queries não detectadas
- Índices faltando não detectados
- Timeout em produção

**Plano de Correção**:
- [ ] Adicionar teste de performance com k6 ou similar
- [ ] Testar com 100+ requisições simultâneas
- [ ] Validar que tempo de resposta < 2s em 95º percentil
- [ ] Analisar slow queries com EXPLAIN

---

## ✅ VALIDADO E OK

### Autenticação e Autorização
- ✅ JWT implementado com expiração 24h
- ✅ Bcryptjs com salt 12 configurado
- ✅ Middleware verifyToken implementado
- ✅ Middleware authorize com permissions
- ✅ Rate limiting em login (10 tentativas/15min)

### RBAC e Escopo
- ✅ Perfis: NGE (global) e SETOR (escopo unitário)
- ✅ getUserScope implementado com CTE recursiva
- ✅ Isolamento de dados por unidade organizacional
- ✅ Testes de isolamento passando (planejar-11.test.js)

### Proteção de API
- ✅ SQL injection: queries com parâmetros ($1, $2...)
- ✅ Helmet.js habilitado (headers de segurança)
- ✅ CORS implementado com whitelist
- ✅ Input validation em endpoints críticos
- ✅ Error sanitization (sem stack trace exposto)

### Segurança de Configuração
- ✅ .env no .gitignore
- ✅ .env.example sem credenciais reais
- ✅ .env.production no .gitignore
- ✅ env-validator.js validando variáveis obrigatórias em produção
- ✅ JWT_SECRET obrigatório (sem default inseguro)
- ✅ DATABASE_PASSWORD obrigatório (sem default vazio)

### Testes
- ✅ 20/20 testes passando
- ✅ Testes de funcionalidade (Planejar, Dashboard, Auth)
- ✅ Testes de isolamento (RBAC)
- ✅ Testes de notificações
- ✅ test-runner.js com --test-concurrency=1

### Documentação
- ✅ SECURITY.md com modelo de segurança
- ✅ DEPLOYMENT.md com guia de produção
- ✅ SECURITY_AUDIT_2026-09-01.md com achados
- ✅ README.md com instruções
- ✅ Documentação de BPM e dashboard

---

## 📊 RESUMO POR SEVERIDADE

| Severidade | Quantidade | Status |
|-----------|-----------|--------|
| 🔴 CRÍTICO | 4 | Requer ação imediata |
| 🟠 ALTO | 7 | Requer ação antes de produção |
| 🟡 MÉDIO | 3 | Recomendável antes de produção |
| 🟢 OK | ✅ Arquitetura validada | - |

**Total de Achados**: 14  
**Problemas Críticos**: 4 (bloqueiam produção)  
**Problemas Altos**: 7 (devem ser corrigidos)  
**Problemas Médios**: 3 (bom ter antes, mas não bloqueador)

---

## 🎯 PRÓXIMOS PASSOS

### Fase 2 - Dependências (npm audit)
- Executar `npm audit` em máquina com Node/npm
- Documentar vulnerabilidades encontradas
- Atualizar pacotes conforme necessário

### Fase 3-18 - Continuação da Auditoria
Basicamente, implementar as correções listadas acima de forma ordenada.

---

## 📌 CONCLUSÃO DA FASE 1

**Estado Atual**: Sistema funcional e relativamente seguro, mas com **4 CRÍTICOS** que precisam resolução:

1. **npm audit** - Verificar vulnerabilidades de dependências
2. **Credenciais em .env** - JWT_SECRET e DB_PASSWORD fraco
3. **CORS Production** - Configuração incerta em produção
4. **Backup/Recuperação** - Sem estratégia comprovada

Além disso, **7 ALTOS** e **3 MÉDIOS** que devem ser endereçados.

**Recomendação**: Não fazer GO para produção até que os **CRÍTICOS** sejam resolvidos.

---

**Status da Auditoria**: ✅ COMPLETA - Aguardando aprovação para Fase 2
