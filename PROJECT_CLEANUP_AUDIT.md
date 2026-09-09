# Auditoria de limpeza pré-produção

Data: 2026-09-03
Escopo: auditoria somente leitura. Nenhum arquivo foi apagado e nenhum código, configuração ou banco foi alterado durante esta auditoria.

## Resumo executivo

O projeto possui um núcleo de produção coerente, mas também contém grande volume de documentação histórica, artefatos de validação, logs e PDFs gerados. A limpeza deve ocorrer somente após aprovação explícita e com backup/arquivamento dos artefatos necessários.

Inventário observado fora de `node_modules`:

- 211 arquivos de configuração/artefatos diversos;
- 1696 arquivos `.js` incluindo dependências instaladas em `node_modules` no inventário bruto;
- 126 arquivos `.js` retornados pela busca do workspace;
- 87 arquivos Markdown/documentação retornados pela busca;
- 13 migrations SQL;
- 32 arquivos de teste sob `test/` incluindo helpers e artefatos;
- 14 arquivos auxiliares sob `validation/`;
- 41 itens em grupos de temporários, validações, logs e backups;
- 3.574.593 bytes nesses grupos.

O worktree já estava sujo antes desta auditoria, com muitos arquivos modificados e não rastreados. Esses arquivos não foram revertidos nem tratados como lixo automaticamente.

## Arquivos essenciais para produção

### Aplicação

- `package.json` e `package-lock.json`: entrada, scripts, versões e instalação reprodutível.
- `src/server.js`: bootstrap Express, middleware, rotas e health.
- `src/config/config.js` e `src/config/env-validator.js`: configuração e validação de ambiente.
- `src/models/db.js`: pool PostgreSQL e transações.
- `src/controllers/`: controllers usados pelas rotas reais.
- `src/repositories/`: persistência usada pelo backend.
- `src/routes/`: rotas reais registradas por `src/server.js`.
- `src/middleware/`: autenticação, autorização, escopo, rate limit e tratamento de erros.
- `src/services/`: papéis, acesso, notificações e geração de PDF/POP usados por rotas.
- `src/adapters/`: adapters usados pelo middleware de autenticação e escopo.
- `public/index.html`, `public/css/` e `public/js/`: frontend servido pelo Express.
- `database/schema.sql` e `database/migrations/`: definição e evolução do banco.
- `scripts/backup-database.ps1`: backup operacional.
- `scripts/backup.env`: configuração local sensível do backup; não deve ser versionado nem incluído no pacote de deploy.
- `Procfile`, `Dockerfile`, `railway.json`: manter somente se o destino de deploy realmente usar essas plataformas.

### Documentação operacional a manter

- `README.md`
- `QUICK_START.md`
- `DEVELOPMENT.md`
- `docs/DEPLOYMENT.md`
- `docs/SECURITY.md`
- `docs/AUTHENTICATION.md`
- `docs/RBAC_SECURITY.md`
- `docs/BPM_API.md`
- `docs/BPM_DATABASE.md`
- `docs/DATABASE_SCHEMA.md`
- `docs/BACKEND_ARCHITECTURE.md`
- `BACKUP_POLICY.md`
- `docs/NOTIFICATIONS.md`
- `docs/ACCESS_CONTROL.md`

Classificação: **ESSENCIAL PARA PRODUÇÃO** ou **ÚTIL MAS NÃO NECESSÁRIO**, conforme o documento for runbook obrigatório ou referência técnica.

## Arquivos somente desenvolvimento

- `test/` e seus helpers: CI, regressão e validação de desenvolvimento; não entram no runtime de produção.
- `test-runner.js`, `test-runner-v2.js`, `check-tests.js`: runners/diagnóstico de testes.
- `test/seven-tests.js`, `test/simple-test.js`, `test/pool-test.js`: parecem experimentais ou diagnósticos; revisar antes de manter no CI.
- `test/functional/planejar.test.js.bak`: cópia de teste, não deve entrar no CI.
- `src/models/bootstrap-test-db.js`: bootstrap `pg-mem` exclusivo de testes.
- `src/mockData.js`, `src/routes/mockApi.js`: caminho de mock, desativado no `.env` atual, mas ainda referenciado por `server.js` e scripts/testes; não remover sem eliminar o modo mock e suas referências.
- `src/models/userStore.js`: caminho legado/local ainda referenciado pelo mock e por documentação; não é seguro classificar como morto.
- `scripts/setup-postgres.js`, `scripts/configure-database-env.js`, `scripts/migrate-passwords.js`, `scripts/migrate-local-data.js`: ferramentas de setup/migração, úteis para operação controlada, mas não runtime.
- `src/scripts/init-db.js`: ferramenta de inicialização administrativa; não é chamada pelo `package.json`.

Classificação: **SOMENTE DESENVOLVIMENTO** ou **ÚTIL MAS NÃO NECESSÁRIO**.

## Arquivos candidatos a remoção

Nenhuma remoção deve ser feita automaticamente. Os candidatos abaixo precisam de aprovação e, quando aplicável, arquivamento:

### `validation/`

Arquivo: todos os 14 scripts em `validation/`.
Motivo: scripts criados para auditorias Sprints 4–8, não importados pelo servidor nem referenciados em `package.json`.
Evidência: nomes `sprint4-*`, `sprint5-*`, `restore-*`, `orphan-*`, `real-*`; nenhum deles é ponto de entrada do runtime.
Risco de remover: perda de reprodutibilidade e evidência histórica das validações reais.
Ação recomendada: arquivar em pacote de evidências fora do deploy; remover do produto apenas após aprovação.
Classificação: **TEMPORÁRIO / POSSÍVEL REMOÇÃO**.

### `test-result.log`

Arquivo: `test-result.log`.
Motivo: log de execução de testes, com 2.786.143 bytes.
Evidência: não é importado nem usado pelo `package.json`.
Risco de remover: perda do diagnóstico histórico, incluindo falhas do `pg-mem`.
Ação recomendada: arquivar ou mover para armazenamento de evidências; não embarcar no deploy.
Classificação: **TEMPORÁRIO / POSSÍVEL REMOÇÃO**.

### `public/tmp/*.pdf`

Arquivos: `check-auditoria.pdf`, `check-indicadores.pdf`, `check-processos.pdf`, `test_relatorio.pdf`.
Motivo: PDFs gerados em diretório temporário sob o web root, total de 75.070 bytes.
Evidência: nomes de check/test; não são referências de entrada no servidor.
Risco de remover: perda de relatórios de teste; risco de exposição se forem mantidos publicamente.
Ação recomendada: arquivar se necessário e limpar antes do deploy; revisar se `public/tmp` deve existir em produção.
Classificação: **TEMPORÁRIO / POSSÍVEL REMOÇÃO**.

### `storage/logs/*.log`

14 logs, total de 19.923 bytes.
Motivo: saídas de inicialização, restart e Sprints.
Evidência: nomes `sprint4`, `sprint5`, `restore-app`, `local-server`.
Risco de remover: perda de trilha de diagnóstico; alguns logs podem conter detalhes operacionais.
Ação recomendada: arquivar com retenção definida e não incluir no artefato de deploy.
Classificação: **TEMPORÁRIO**.

### `test/functional/planejar.test.js.bak`

Motivo: backup de teste com extensão `.bak`, 12.361 bytes.
Evidência: não é descoberto como teste padrão pelo `node --test`.
Risco de remover: baixo, desde que a versão original esteja preservada.
Ação recomendada: arquivar ou remover após aprovação.
Classificação: **POSSÍVEL REMOÇÃO**.

### Documentação histórica de Sprints

Arquivos: `SPRINT2_*`, `SPRINT4_BPM_PRODUCTION_READINESS.md`, `SPRINT5_DATABASE_PRODUCTION_APPROVAL.md`, `SPRINT6_GO_LIVE_APPROVAL.md`, `SPRINT7_GO_LIVE_CHECKLIST.md`, relatórios `FINAL_*`, auditorias datadas e relatórios de implementação.
Motivo: documentos de etapas concluídas, duplicados parcialmente por relatórios finais.
Evidência: 33 Markdown no diretório raiz e 53 em `docs/`.
Risco de remover: perda de decisões, evidências de aprovação e histórico de segurança.
Ação recomendada: consolidar em arquivo de release/evidências e mover documentos históricos para `archive/` fora do pacote de produção.
Classificação: **ÚTIL MAS NÃO NECESSÁRIO / POSSÍVEL REMOÇÃO**.

### Backups duplicados

Arquivos `.sql` sob `storage/backups/` incluem cópias com 155.793 bytes e subdiretório `manual-validation`; total do grupo de backups: 641.589 bytes.
Motivo: múltiplas cópias de validação com conteúdo potencialmente equivalente.
Evidência: nomes com timestamps e `manual-validation`.
Risco de remover: perda de ponto de restauração; um backup pode ser necessário como evidência.
Ação recomendada: calcular hashes, manter o backup aprovado e armazenar os demais em retenção externa; não apagar nesta etapa.
Classificação: **ESSENCIAL COMO RETENÇÃO OPERACIONAL / POSSÍVEL REMOÇÃO DE DUPLICATAS APÓS HASH**.

## Código morto ou legado encontrado

- `src/routes/mockApi.js` e `src/mockData.js`: caminho de mock, não runtime quando `USE_MOCK_API=false`, mas importado por `server.js` e scripts.
- `src/models/userStore.js`: armazenamento local legado; referenciado pelo mock, não é seguro remover sem desmontar compatibilidade.
- `src/scripts/init-db.js`: script administrativo fora dos scripts npm.
- `test-runner-v2.js`, `check-tests.js`, `test/seven-tests.js`, `test/simple-test.js`, `test/pool-test.js`: candidatos a consolidação, não comprovadamente mortos.
- `src/adapters/processAdapter.js` e `src/adapters/unitAdapter.js`: têm pouca evidência de uso direto nas buscas; precisam de confirmação semântica antes de remoção. `userAdapter.js` é usado por `src/middleware/auth.js` e deve ser mantido.
- `database/scripts/fix_orphan_processes.sql`: procedimento de auditoria/correção de Sprint; não é migration nem runtime.

Não foi possível provar nenhum controller, repository ou service de produção como morto apenas por contagem textual. A maioria está conectada às rotas reais; remoções exigem teste de cobertura/importação.

## Testes

### Manter no CI/qualidade

- `test/functional/security-auth.test.js`
- `test/functional/access-control.test.js`
- `test/functional/access-visibility.test.js`
- `test/functional/role-access.test.js`
- `test/functional/postgresql-integration.test.js`
- `test/functional/dashboard-activity-flow.test.js`
- `test/functional/notification-source.test.js`
- `test/functional/attachment.test.js`
- `test/bpm-api.test.js`
- `test/bpm-schema.test.js`
- `test/bootstrap-idempotency.test.js`
- testes unitários de `authorize`, `errorHandler` e `loginLimiter`.

### Revisar/consolidar

- `test/functional/planejar-01-06.test.js`, `planejar-07-09.test.js`, `planejar-10.test.js`, `planejar-11.test.js`, `planejar-12.test.js`: manter se cada parte cobre requisito distinto; consolidar apenas com cobertura equivalente.
- `test/dashboard.test.js`, `test/notifications.test.js`, `test/reports.test.js`: verificar sobreposição com testes funcionais.
- `test/seven-tests.js`, `test/simple-test.js`, `test/pool-test.js`: somente desenvolvimento/experimentais.
- `test/functional/planejar.test.js.bak`: temporário.
- `test/tmp/validation-report.pdf`: artefato temporário,  não deve ser CI input.

## Documentação

Manter no pacote ou repositório principal: deploy, segurança, banco, backup, arquitetura, autenticação, RBAC, API BPM e quick start.

Arquivar após aprovação: relatórios de Sprints, auditorias datadas, relatórios de implementação/fix e documentos duplicados. Não excluir evidências regulatórias sem política de retenção.

## Backups, logs e arquivos temporários

| Grupo | Quantidade | Espaço | Classificação |
|---|---:|---:|---|
| `validation/` | 14 | 39.507 bytes | Temporário |
| `public/tmp/` | 4 | 75.070 bytes | Temporário |
| `storage/logs/` | 14 | 19.923 bytes | Temporário |
| `storage/backups/` | 7 | 641.589 bytes | Retenção operacional |
| `test-result.log` | 1 | 2.786.143 bytes | Temporário/diagnóstico |
| `.bak` de teste | 1 | 12.361 bytes | Possível remoção |
| **Total auditado** | **41** | **3.574.593 bytes** | Misturado |

Não foram apagados arquivos. Os tamanhos são do inventário realizado em 2026-09-03.

## Dependências suspeitas

- `pg-mem`: usada por `src/models/bootstrap-test-db.js` e testes; **SOMENTE DESENVOLVIMENTO**, não precisa estar no runtime de produção.
- `nodemon`: apenas script `dev`; **SOMENTE DESENVOLVIMENTO**.
- `bcryptjs`, `cors`, `dotenv`, `express`, `express-rate-limit`, `helmet`, `jsonwebtoken`, `multer`, `pdfkit` e `pg`: possuem uso em `src/` e são dependências de runtime.
- Não foi encontrada dependência duplicada no `package.json`.
- Não foi possível provar dependência runtime não utilizada; não recomendar remoção de pacote sem `npm ls`, cobertura e teste de build.

## Economia estimada

- Grupo misto de temporários, validações, logs e backups: 3.574.593 bytes, aproximadamente 3,41 MiB.
- Candidatos claramente temporários sem considerar backups: `validation/`, `public/tmp/`, `storage/logs/`, `test-result.log` e `.bak`: 2.933.004 bytes, aproximadamente 2,80 MiB.
- Maior ganho individual: `test-result.log` com 2.786.143 bytes.
- Backups não devem ser contabilizados como economia antes de hash, retenção e restauração independente.

## Plano seguro de limpeza

1. Congelar um inventário com hashes e confirmar quais artefatos são evidência obrigatória.
2. Separar pacote de deploy de arquivo de trabalho: excluir do pacote `test/`, `validation/`, logs, PDFs temporários, backups locais e relatórios históricos.
3. Arquivar documentação e evidências fora do runtime, mantendo somente runbooks atuais no repositório principal.
4. Revisar e consolidar runners de teste e remover somente cópias `.bak` aprovadas.
5. Confirmar se o modo mock/legado será oficialmente descontinuado; somente então avaliar remoção de `mockApi`, `mockData` e `userStore`.
6. Executar `npm audit`, testes de CI e smoke test após cada lote de limpeza.
7. Validar o artefato final em ambiente limpo e conferir que nenhum segredo, backup ou log sensível foi incluído.

## Decisão da auditoria

Status: **AUDITORIA CONCLUÍDA — NENHUMA REMOÇÃO EXECUTADA**.

A lista de candidatos depende de aprovação explícita. O principal risco atual não é somente excesso de arquivos: é remover caminhos legados ou evidências ainda referenciadas sem uma matriz de desativação e sem teste de regressão.
