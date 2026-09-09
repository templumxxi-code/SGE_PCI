# Fase 3 - Remediação de Segurança e Ambiente

## Data
2026-09-01

## Objetivo
Corretivos de segurança e ambiente exigidos antes de prosseguir para a próxima fase do projeto, sem adicionar novas funcionalidades nem alterar regras de negócio.

## Achados corrigidos

### 1. Fallback JWT inseguro em mock API
- Arquivo: `src/routes/mockApi.js`
- Problema: `process.env.JWT_SECRET || 'local-mock-secret'` permitia uso de segredo fraco em ambiente mock.
- Correção: substituído por `crypto.randomBytes(32).toString('hex')` quando o JWT_SECRET não estiver definido em ambiente de teste local, sem cair em secret hardcoded.

### 2. Defaults inseguros de banco em produção
- Arquivos: `src/config/config.js`, `src/models/db.js`
- Problema: valores fixos como `localhost`, `smp_pci`, `''` e `postgres` podiam mascarar falhas de configuração em produção.
- Correção: em produção, a aplicação passa a depender de `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_NAME`, `DATABASE_USER` e `DATABASE_PASSWORD` definidos explicitamente.

### 3. Validação de ambiente reforçada
- Arquivo: `src/config/env-validator.js`
- Problema: produção aceitava configurações incompletas e CORS wildcard.
- Correção: produção agora exige `JWT_SECRET`, `DATABASE_*` e `CORS_ORIGINS`; também rejeita `JWT_SECRET` menor que 32 caracteres e `CORS_ORIGINS` contendo `*`.

### 4. CORS reforçado
- Arquivos: `src/server.js`, `src/config/config.js`
- Problema: wildcard em produção era permissivo e inconsistente entre variáveis.
- Correção: `CORS_ORIGINS` deve conter domínios específicos; em produção, se houver `*`, a aplicação falha no bootstrap.

### 5. Isolamento de credenciais de teste
- Arquivo: `test/helpers/test-credentials.js`
- Problema: credenciais de teste não eram bloqueadas em produção.
- Correção: quando `NODE_ENV=production`, o arquivo dispara erro explícito para impedir uso indevido.

### 6. Logs sem exposição de segredos
- Arquivos: `src/models/db.js`, `src/routes/mockApi.js`
- Problema: logs poderiam expor SQL, tokens ou dados sensíveis em reset de senha.
- Correção: removidos logs que expunham token/senha; mensagens de erro limitadas a mensagens sem segredos.

### 7. Health endpoint reduzido
- Arquivo: `src/server.js`
- Problema: `/api/health` expunha detalhes de ambiente desnecessários.
- Correção: removidos campos de ambiente e mantido apenas status e timestamp, preservando saúde sem expor configuração.

## Achados pendentes
- Revisar eventuais logs adicionais fora dos pontos críticos que ainda possam expor valores em outras rotas.
- Validar secret manager/hosting real do ambiente de produção antes do deploy final.
- Confirmar se os arquivos de ambiente local do operador foram limpos de segredos reais antes do merge final.

## Critérios de aceite
- `npm audit`: 0 vulnerabilidades
- Testes: todos passando
- Aplicação: inicia corretamente com configuração válida
- Produção: falha sem `JWT_SECRET` e sem `DATABASE_PASSWORD`
- Produção: rejeita `CORS_ORIGINS=*`
- Segurança: nenhum segredo hardcoded, nenhum segredo em logs, credenciais de teste isoladas

## Status final
A fase 3 foi remediada no escopo solicitado, com validação de ambiente, segredos, CORS e isolamento de testes. A próxima fase somente deve prosseguir se os critérios de aceite forem confirmados com evidências no ambiente alvo.
