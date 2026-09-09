# Security Baseline - Sprint 0

## 1. Data da auditoria

24/08/2026.

## 2. Projeto analisado

- **PROJECT_ROOT_REAL:** `C:\Users\Luiz Mateus\Documents\SISTEMAS\PCI-RN\SMP PCI`
- **Branch:** `sprint-07c-perfis-escopos`
- **Commit analisado:** `cfc60518a1e01985005732be7975b5b5ef135e89`
- **Servidor local:** PID 12080, `node.exe`, ouvindo em `:::3000`; processo iniciado com `node src/server.js` por `npm.cmd start`.
- **Modo efetivo:** `USE_MOCK_API=true`; a mensagem de inicializacao confirma API mock sem banco.

## 3. Arquitetura atual

Frontend servido estaticamente por Express, composto por HTML5, CSS3 e JavaScript vanilla. Backend Node.js com Express. Dependencias relevantes: `helmet`, `cors`, `jsonwebtoken`, `bcryptjs`, `multer`, `pdfkit` e `pg`.

O ciclo BPM esta representado por Planejar, Analisar, Desenhar, Implementar e Monitorar. As definicoes de atividades e templates estao principalmente em `src/mockData.js`, `public/js/processes.js` e `public/js/planejar.js`.

## 4. Persistencia atual

- **Modo local em execucao:** arrays em `src/mockData.js`, com dados demonstrativos em memoria.
- **Armazenamento local alternativo:** `storage/users.json`, com hashes bcrypt e ainda um campo legado de senha em claro.
- **Banco preparado:** PostgreSQL em `src/models/db.js` e `database/`, usado por testes/fluxo alternativo, mas nao e a persistencia do processo que atende a porta 3000.
- **Frontend:** processos, usuarios locais, estrutura organizacional, indicadores, notificacoes, aprovacao, sessao e token em `localStorage`.
- **Backup:** nao implementado.

## 5. Autenticacao

Login mock valida `email` e `senha` diretamente no campo em claro de `src/mockData.js` e emite JWT. O fluxo de banco/local store usa bcrypt. O JWT e enviado pelo frontend no header `Authorization: Bearer` e fica em `localStorage` na chave `smp_token`, com expiracao configuravel (padrao observado no codigo: 15 minutos para o controller).

Existe rate limiting de login com janela de 15 minutos e limite padrao de 10 tentativas. Usuario inativo e filtrado no fluxo de banco, mas o mock nao aplica a mesma verificacao no login. Logout remove o token no navegador; a invalidacao no mock usa timestamp global em memoria e nao e uma sessao persistente.

Recuperacao de senha real nao esta implementada: no mock o token e gerado com `Math.random()`, devolvido na resposta e escrito no log; a nova senha e atribuida em claro ao objeto em memoria.

## 6. Autorizacao

O frontend possui matriz detalhada em `public/js/access-control.js` para NGE, Diretor de Instituto, Subcoordenadores, Assessor, Chefe de Nucleo, Chefe de Setor e Operacional. O backend efetivo do mock autoriza principalmente NGE versus SETOR e nao reproduz integralmente os escopos hierarquicos do frontend.

Ha filtros de setor em varias rotas e os testes de visibilidade basica passam. Entretanto, atualizacao de usuario aceita `perfil` e `setor_id` enviados pelo proprio usuario, sem whitelist, permitindo risco de escalacao de privilegio. A autorizacao de producao nao pode depender de ocultacao de botoes ou de localStorage.

## 7. LocalStorage

Chaves criticas ou relacionadas a dados de negocio: `smp_token`, `sge_pci_current_user`, `sge_pci_local_users`, `sge_pci_org_structure`, `sge_pci_processos`, `sge_pci_indicators`, `sge_pci_notifications`, `sge_pci_approval_history` e `sge_pci_selected_indicators_process`. Chaves de preferencia/estado: `sge_pci_theme`, `sge_pci_selected_indicator`, `sge_pci_activity_selection`, `sge_pci_localstorage_version` e `sge_pci_planejar_ab_swap`.

Classificacao para migracao: token/sessao e usuarios sao criticos; processos, atividades, checklists, anexos metadata, indicadores, notificacoes, aprovacoes e auditoria devem sair do frontend. Preferencias visuais e selecoes temporarias podem permanecer no navegador.

## 8. APIs

Existem APIs reais sob `/api/auth`, `/api/processes`, `/api/indicators`, `/api/reports`, `/api/planejar` e anexos; no processo efetivo local elas sao substituidas pelas rotas de `src/routes/mockApi.js` sob `/api`.

Rotas de login/opcoes de login e perfis disponiveis nao exigem autenticacao. Rotas de negocio exigem JWT, mas a cobertura de autorizacao varia. O endpoint `/api/health` responde `200`.

## 9. Uploads

No fluxo real, `multer` usa memoria, limita a 10 MB, aceita PDF/JPEG/PNG, valida MIME, extensao e assinatura, gera nome UUID, calcula SHA-256 e grava em `storage/attachments` fora de `public`. O controller verifica vinculo processo/atividade e escopo setorial.

No mock, uploads de Planejar sao simulados em memoria e aceitam campos de arquivo sem a mesma validacao de assinatura/armazenamento. O risco de arquivos publicos e traversal e menor no controller real, mas o mock nao e uma base de producao.

## 10. XSS, CSP, CORS e CSRF

Ha uso de `innerHTML` em varias telas; parte dos valores passa por `escapeHtml`, mas a cobertura deve ser revisada para todos os dados de usuario. `helmet()` esta instalado e aplicado globalmente. No runtime foram observados CSP padrao, HSTS, `X-Content-Type-Options`, `Referrer-Policy` e `X-Frame-Options`; `Permissions-Policy` nao foi retornado. A CSP permite `unsafe-inline` em estilos e nao esta documentada como contrato de producao.

CORS usa allowlist configuravel no servidor principal e permite origens localhost em desenvolvimento; `src/config/config.js` ainda contem fallback legado `origin: '*'`, embora nao seja o middleware efetivamente configurado pelo servidor. A autenticacao usa header Bearer, nao cookie; portanto CSRF nao e o mecanismo primario atual. O token em localStorage aumenta impacto de XSS.

## 11. Auditoria

O mock mantem logs em memoria e registra login, criacao/alteracao/remocao de processos, atividades e anexos. O fluxo real grava logs PostgreSQL em varias operacoes. Nao ha garantia append-only, armazenamento duravel no mock, nem evidencia de cobertura completa para alteracao de lotacao, homologacao e todos os eventos de usuario.

## 12. Dependencias

`package-lock.json` esta presente. `npm audit` encontrou 6 vulnerabilidades: 5 altas e 1 baixa. Nenhuma correcao automatica foi aplicada e nao foi executado `npm audit fix --force`.

## 13. Testes

A suite configurada cobre testes funcionais de acesso, autenticacao, anexos, dashboard, Planejar, roles e integracao PostgreSQL, alem de dois testes unitarios. Os testes de matriz/visibilidade passaram. A execucao completa falhou em cenarios de anexos, incluindo aceite de arquivos validos e casos de autorizacao, conforme a saida do runner Node; os nomes dos testes falhos foram preservados no terminal e nao foram ocultados.

Nao foi executado teste E2E de navegador nem teste completo do fluxo Ctrl+F5, pois nao ha pagina compartilhada no navegador nesta sessao. O PostgreSQL definitivo nao foi criado.

## 14. Achados

- 2 criticos
- 4 altos
- 4 medios
- 1 baixo
- detalhes em `docs/SECURITY_FINDINGS.md`.

## 15. Riscos de producao

Credenciais de demonstracao, recuperacao de senha insegura, escalacao de privilegio por atualizacao de perfil/lotacao, divergencia entre autorizacao frontend/backend, dados de negocio no navegador, ausencia de persistencia definitiva e falhas da suite de anexos bloqueiam uma decisao positiva.

## 16. Decisao GO/NO-GO

**STATUS ATUAL: NO-GO.**

A decisao e baseada nos achados reais e no fato de que o processo local em uso e uma API mock em memoria, nao o backend/PostgreSQL definitivo.

## 17. Recomendacoes para Sprint 1

1. Congelar a matriz de perfis e escopos no backend, com testes IDOR por processo, indicador, usuario, anexo e aprovacao.
2. Remover credenciais em claro e separar seed de desenvolvimento de qualquer dado institucional.
3. Definir contrato de persistencia PostgreSQL e trilha de auditoria append-only antes de migrar dados.
4. Corrigir e estabilizar os testes de upload antes de ampliar funcionalidades.
5. Definir politica CSP, headers esperados e estrategia de sessao/token para producao.
6. Manter `NO-GO` ate que o backend definitivo, armazenamento privado e controles de autorizacao sejam validados.
