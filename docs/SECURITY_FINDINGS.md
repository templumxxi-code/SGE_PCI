# Security Findings - Sprint 0

Data: 24/08/2026  
Projeto: SGE PCI/RN  
Branch: `sprint-07c-perfis-escopos`  
Commit: `cfc60518a1e01985005732be7975b5b5ef135e89`

## SEC-001

**Severidade:** CRITICO  
**Titulo:** Credenciais de demonstracao em texto puro  
**Descricao:** O mock define senhas diretamente em `src/mockData.js`; o fluxo de reset tambem atribui nova senha em claro no objeto em memoria. Existe ainda campo legado de senha em `storage/users.json`.  
**Evidencia:** `src/mockData.js`, rotas de login/reset em `src/routes/mockApi.js`, `storage/users.json`.  
**Impacto:** Leitura do codigo/dados permite autenticar contas demonstrativas e o modelo nao e aceitavel para ambiente institucional.  
**Recomendacao:** Remover credenciais dos artefatos de runtime, usar seed isolado e hashes fortes no backend definitivo; nunca devolver senha/token de reset na resposta.  
**Sprint de correcao:** Sprint 1-3.

## SEC-002

**Severidade:** CRITICO  
**Titulo:** Escalacao de privilegio por atualizacao de usuario  
**Descricao:** `PUT /api/auth/usuarios/:id` permite ao proprio usuario enviar `perfil` e `setor_id`; o mock altera esses campos diretamente e o controller real tambem aceita perfil vindo do payload.  
**Evidencia:** `src/routes/mockApi.js` e `src/controllers/authController.js`.  
**Impacto:** Um usuario autenticado pode tentar alterar seu perfil/lotacao e ampliar acesso a dados ou funcoes administrativas.  
**Recomendacao:** Aplicar whitelist por operacao, proibir autoalteracao de perfil/lotacao, exigir autorizacao administrativa e registrar auditoria transacional.  
**Sprint de correcao:** Sprint 1.

## SEC-003

**Severidade:** ALTO  
**Titulo:** Recuperacao de senha exposta e previsivel no mock  
**Descricao:** O endpoint de reset usa `Math.random()`, retorna o token e link na resposta e grava o token no log.  
**Evidencia:** `src/routes/mockApi.js`, endpoints `/api/auth/solicitar-reset-senha` e `/api/auth/reset-senha`.  
**Impacto:** Token pode vazar por resposta, logs ou observabilidade; nao existe envio de email real nem armazenamento seguro/expiracao persistente.  
**Recomendacao:** Implementar fluxo backend com CSPRNG, hash do token em armazenamento duravel, uso unico, TTL e entrega por canal institucional sem incluir segredo na resposta/log.  
**Sprint de correcao:** Sprint 2-3.

## SEC-004

**Severidade:** ALTO  
**Titulo:** Token e dados de negocio no localStorage  
**Descricao:** O frontend armazena JWT, sessao, usuarios locais, processos, indicadores, estrutura organizacional e fila de aprovacao no localStorage.  
**Evidencia:** `public/js/app.js`, `public/js/auth.js`, `public/js/access-control.js`, `public/js/processes.js`, `public/js/indicators.js`.  
**Impacto:** Qualquer XSS no mesmo origin pode ler o token e dados sensiveis; alteracoes locais nao sao uma fonte confiavel de autorizacao ou integridade.  
**Recomendacao:** Migrar dados para PostgreSQL/API autorizada; avaliar cookie HttpOnly/SameSite ou outra estrategia de sessao, CSP rigorosa e validacao server-side.  
**Sprint de correcao:** Sprint 2-4.

## SEC-005

**Severidade:** ALTO  
**Titulo:** Divergencia entre perfis institucionais e autorizacao efetiva  
**Descricao:** O frontend modela oito perfis institucionais e escopos hierarquicos, enquanto o mock e partes do backend aplicam principalmente NGE versus SETOR.  
**Evidencia:** `public/js/access-control.js`, `src/services/roles.js`, `src/routes/mockApi.js`, `src/services/access.js`.  
**Impacto:** Pode haver acesso indevido, negacao incorreta ou falsa sensacao de segregacao quando a decisao depende apenas do frontend.  
**Recomendacao:** Centralizar politica no backend definitivo e cobrir IDOR por entidade e por cada perfil/lotacao.  
**Sprint de correcao:** Sprint 1-2.

## SEC-006

**Severidade:** MEDIO  
**Titulo:** Enumeracao de usuarios no fluxo de login  
**Descricao:** `/api/auth/opcoes-login` lista nome, email e perfil de usuarios ativos sem autenticacao; `/api/auth/perfis-disponiveis` permite consulta por email no fluxo real.  
**Evidencia:** `src/routes/auth.js` e `src/routes/mockApi.js`.  
**Impacto:** Exposicao de dados cadastrais e apoio a ataques direcionados.  
**Recomendacao:** Remover listagem publica; usar identificador institucional controlado, mensagens uniformes e rate limiting em todos os endpoints de descoberta.

## SEC-007

**Severidade:** MEDIO  
**Titulo:** CSP nao explicitamente definida e cobertura de XSS incompleta  
**Descricao:** `helmet()` esta aplicado e o runtime retorna CSP padrao, HSTS, `nosniff`, `Referrer-Policy` e `X-Frame-Options`, mas nao retorna `Permissions-Policy`. A CSP permite `unsafe-inline` em estilos, nao esta documentada como contrato de producao e ha varios usos de `innerHTML`; parte usa `escapeHtml`, mas a cobertura de todos os valores de entrada nao foi demonstrada.  
**Evidencia:** `src/server.js`, `public/js/dashboard.js`, `public/js/app.js` e `public/js/processes.js`.  
**Impacto:** Uma falha de escape pode permitir XSS e roubo do JWT em localStorage.  
**Recomendacao:** Definir CSP baseada nos scripts efetivos, substituir interpolacoes por APIs DOM seguras quando possivel e adicionar testes de payload benigno.

## SEC-008

**Severidade:** MEDIO  
**Titulo:** Fluxo mock de anexos nao replica validacoes reais  
**Descricao:** O controller real valida tamanho, extensao, MIME, assinatura, UUID e escopo; as rotas mock de Planejar aceitam metadados em memoria e simulam download.  
**Evidencia:** `src/controllers/attachmentController.js` versus `src/routes/mockApi.js`.  
**Impacto:** Testes no modo local podem aprovar comportamento que nao representa o backend real; anexos nao persistem e nao oferecem evidencia de integridade.

## SEC-009

**Severidade:** BAIXO  
**Titulo:** Logs de requisicao e operacao sem politica de redacao documentada  
**Descricao:** O servidor registra metodo e caminho; operacoes de reset registram token e varias rotas registram dados operacionais. Nao ha politica central de redacao/retencao.  
**Evidencia:** `src/server.js`, `src/routes/mockApi.js`, `src/models/db.js`.  
**Impacto:** Risco operacional de vazamento e retenção inadequada de dados pessoais/segredos.

## SEC-010

**Severidade:** ALTO  
**Titulo:** Vulnerabilidades altas em dependencias  
**Descricao:** `npm audit` reportou 6 vulnerabilidades: 5 altas e 1 baixa. Uma correcao indicada exigiria `npm audit fix --force` e poderia instalar uma major de `nodemon`; nenhuma correcao foi aplicada nesta Sprint.  
**Evidencia:** `package.json`, `package-lock.json` e comando `npm.cmd audit --audit-level=low`.  
**Impacto:** Dependencias vulneraveis podem permitir DoS, bypass de fronteira de confianca ou ReDoS dependendo do caminho de execucao.  
**Recomendacao:** Revisar a arvore transitiva, atualizar sem major automatico quando possivel, executar testes e somente entao promover versoes aprovadas.

## SEC-011

**Severidade:** MEDIO  
**Titulo:** API mock local nao e persistente nem reproduz todos os testes de anexos  
**Descricao:** A suite funcional falhou em cenarios de aceite de PDF/JPEG/PNG e autorizacao de anexos; o modo ativo usa arrays em memoria e referencias organizacionais incompletas, fazendo processos demonstrativos retornarem 404.  
**Evidencia:** `src/mockData.js`, `src/routes/mockApi.js`, `test/functional/attachment.test.js` e execucao `npm test` em 24/08/2026.  
**Impacto:** Nao ha garantia de persistencia apos reinicio nem de que o caminho exercitado localmente represente producao.

## Resumo por severidade

- CRITICO: 2 (`SEC-001`, `SEC-002`)
- ALTO: 4 (`SEC-003`, `SEC-004`, `SEC-005`, `SEC-010`)
- MEDIO: 4 (`SEC-006`, `SEC-007`, `SEC-008`, `SEC-011`)
- BAIXO: 1 (`SEC-009`)

## Decisao

**NO-GO para producao.** O sistema deve permanecer restrito a desenvolvimento/auditoria ate corrigir os criticos e altos e validar o backend definitivo.
