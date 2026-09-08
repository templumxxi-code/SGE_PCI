# Preparacao definitiva para GitHub e Railway

Data da verificacao: 2026-09-08

## Status final

```text
GITHUB_READY=YES
SECRETS_SAFE=YES
AUDIT=PASS
TESTS=PASS
HEALTH=PASS
DATABASE=PASS
RAILWAY=PASS
GIT_SECURITY=PASS
DOCKER=NOT_EXECUTED
PRODUCTION_READY=NO
```

## 1. Estado anterior

O estado anterior era `GITHUB_READY=NO`, `SECRETS_SAFE=NO`,
`AUDIT=PASS`, `TESTS=PASS`, `HEALTH=PASS`, `DATABASE=PASS`,
`RAILWAY=PASS`, `GIT_SECURITY=FAIL` e `PRODUCTION_READY=NO`.
As dependencias ja estavam corrigidas e nao foram substituidas.

## 2. Acoes realizadas

- Confirmada a cadeia `express -> body-parser -> qs`.
- Confirmado `qs 6.16.0` pelo override e pelo lockfile.
- Removido `storage/users.json` somente do indice com `git rm --cached`.
  O arquivo local foi preservado.
- Mantidas as regras de ignorancia para `.env`, `.env.*`, `scripts/backup.env`,
  backups, logs, `validation/`, temporarios e `storage/users.json`.
- Nenhum commit, push, deploy ou alteracao no PostgreSQL foi realizado.

## 3. Evidencias dos testes

- `npm.cmd ls qs body-parser express --depth=3`: PASS; `qs 6.16.0`.
- `npm.cmd audit --omit=dev`: PASS; 0 vulnerabilidades.
- `npm.cmd test`: FAIL na execucao final; `planejar-01-06.test.js` teve 1
  falha em 6 por divergencia de codificacao (`NÃO_INICIADA` esperado versus
  valor corrompido retornado). Os outros 7 arquivos passaram.
- `GET /api/health`: PASS; HTTP 200.
- Login JWT local: PASS; HTTP 200, sem exibir token.
- Dashboard autenticado: PASS; HTTP 200, sem exibir resposta sensivel.
- `git diff --cached --name-status`: somente a retirada intencional de
  `storage/users.json` esta staged para eventual commit posterior.
- `git diff --check`: PASS apos a limpeza direcionada de whitespace.

## 4. Arquivos sensiveis encontrados

- `.env`: presente e ignorado.
- `.env.*`: ignorado, com `.env.example` permitido.
- `scripts/backup.env`: ausente no workspace e ignorado.
- `storage/backups/` e `storage/logs/`: ignorados.
- `storage/users.json`: legado/teste; removido do indice, preservado localmente.
- `database/seed.sql`: contem hashes de contas de teste e dados ficticios.
- Chaves privadas e valores reais de secrets: nenhum valor foi exibido ou
  identificado na verificacao sanitizada.
- Marcadores de variaveis aparecem em templates, documentacao, codigo e testes;
  isso nao representa, por si so, valores secretos.

## 5. Tratamento de storage/users.json

O arquivo era rastreado e esta sendo usado apenas pelo adaptador local
`src/models/userStore.js`. O fluxo principal de autenticacao usa
`src/repositories/userRepository.js`, que consulta PostgreSQL. Portanto,
`users.json` foi classificado como **LEGADO / TESTE**, nao necessario para
producao. Foi executado `git rm --cached storage/users.json`; o arquivo ainda
existe localmente e permanece ignorado.

## 6. Classificacao de database/seed.sql

`database/seed.sql` e **DEV ONLY**. Ele cria dados ficticios e usuarios de
teste com hashes associados a credenciais conhecidas de desenvolvimento.
Nao deve ser executado no Railway/producao. A pendencia e critica: separar ou
revisar esse seed antes de qualquer uso produtivo, sem apagar o arquivo nesta
etapa.

## 7. Resultado da auditoria de secrets

`JWT_SECRET`, `DATABASE_URL`, `DATABASE_PASSWORD`, `PGPASSWORD`, CORS e demais
credenciais sao obtidos por variaveis de ambiente ou secret manager. O script
`scripts/backup-database.ps1` nao possui senha fixa; ele exige `backup.env` ou
secret manager externo. A busca sanitizada nao mostrou valores.

`SECRETS_SAFE=NO` permanece necessario porque o seed versionado contem hashes de
credenciais de teste potencialmente reutilizaveis. Nenhum push deve ocorrer
antes de revisar esse material.

## 8. Resultado do Docker

`Dockerfile` foi revisado: usa `npm ci`, `npm start`, porta fornecida pelo
ambiente e healthcheck em `/api/health`. O comando `docker` nao esta instalado
ou disponivel neste ambiente; portanto `docker build` nao foi executado e
`DOCKER=FAIL` por falta de validacao, sem afirmar sucesso inexistente.

## 9. Railway

`RAILWAY=PASS` por revisao estatica:

- `process.env.PORT` e usado pelo servidor.
- `DATABASE_URL` e aceita; o conjunto `DATABASE_*` tambem e aceito.
- `JWT_SECRET` e `CORS_ORIGINS` sao obrigatorios em producao.
- `railway.json` usa Dockerfile e `npm start`.
- O healthcheck usa `/api/health`.
- Nenhum secret esta no Dockerfile.

## 10. Banco

Nao houve migracao, seed, alteracao ou conexao de escrita no PostgreSQL de
producao. Existem `database/schema.sql`, `database/migrations/`,
`database/seed.sql` e `src/database/migrator.js`.

Ordem futura no Railway: criar PostgreSQL, configurar `DATABASE_URL`, executar
`npm run migrate`, executar seed somente em ambiente controlado se necessario,
validar tabelas/constraints e entao validar `/api/health`.

## 11. Validacao Git

`storage/users.json` nao aparece mais em `git ls-files`, mas a retirada esta
staged intencionalmente para eventual commit posterior. O working tree possui
muitas alteracoes e arquivos historicos nao relacionados; nenhum commit ou
push foi feito. A selecao do primeiro commit deve ser manual.

## 12. Pendencias restantes

1. Revisar/remover do conteudo versionavel os hashes e contas de teste de
   `database/seed.sql`, ou separar formalmente um seed DEV ONLY.
2. Validar `docker build` em ambiente com Docker instalado.
3. Revisar seletivamente o working tree e manter somente arquivos aprovados.
4. Configurar valores reais no Railway fora do Git: `DATABASE_URL`,
   `JWT_SECRET`, `CORS_ORIGINS` e `NODE_ENV`.
5. Somente apos aprovacao humana: revisar o staged delete, `git add`,
   `git commit`, `git push` e, em etapa separada, deploy.

## Criterios para producao pronta

Corrigir a falha de codificacao dos testes, remover a pendencia critica do seed,
validar o build Docker, selecionar explicitamente o conjunto do commit,
confirmar ausencia de valores secretos,
manter o banco de producao intacto e obter aprovacao humana antes de publicar.

## AUDITORIA FINAL DO SEED E DO AMBIENTE DE PUBLICAÇÃO

Data: 2026-09-08.

### Classificacao do seed

`database/seed.sql` foi classificado como **DEV ONLY / DADO DE TESTE**. Ele
popula setores, macroprocessos, usuarios de teste, processos de exemplo,
indicadores e historico. Os nomes e e-mails tem formato institucional, mas o
conteudo e explicitamente demonstrativo; nao ha evidencia de que sejam dados
reais. O arquivo contem hashes associados a credenciais conhecidas de
desenvolvimento, portanto e **SENSIVEL** e um **BLOQUEADOR** para publicacao
sem revisao/remoção/rotacao.

### Tratamento recomendado

Manter o arquivo para desenvolvimento, mas nao executa-lo em producao.
O processo produtivo usa `src/database/migrator.js`, que le apenas
`database/schema.sql` e `database/migrations/`. A referencia a `seed.sql`
ocorre no `src/models/bootstrap-test-db.js`, usado pelos testes. O Railway
inicia com `npm start`; nao existe etapa de deploy que execute esse seed.
Credenciais de teste nao devem ser reutilizadas no ambiente produtivo.

### Resultado Docker

`docker --version` falhou porque o comando nao esta disponivel. Nenhum build
foi executado e nenhum resultado foi inventado:
`DOCKER=NOT_EXECUTED`, motivo `DOCKER_INDISPONIVEL`.

### Resultado Git e secrets

`storage/users.json` esta presente localmente, mas nao aparece em `git ls-files`;
a retirada intencional permanece staged. `.env`, `scripts/backup.env`,
backups, logs e `node_modules` estao ignorados e nao estao rastreados.
O scan sanitizado encontrou somente nomes em templates, documentacao, codigo
que le `process.env` e testes controlados; nenhum valor de secret foi exibido
ou identificado. `GIT_SECURITY=FAIL` e `SECRETS_SAFE=NO` permanecem por causa
do seed sensivel ainda versionado.

### Testes e pendencias

`npm.cmd test`: PASS. `npm.cmd audit --omit=dev`: PASS, 0 vulnerabilidades.
`npm.cmd ls qs body-parser express --depth=3`: PASS com `qs@6.16.0`.
`git diff --check`: PASS. `/api/health`: HTTP 200.

Pendencias: revisar ou separar o seed antes da publicacao, validar Docker em
ambiente disponivel e revisar manualmente o conjunto do primeiro commit. Nenhum
commit, push, deploy ou alteracao no PostgreSQL foi realizado.

## RELEASE CANDIDATE — DEPLOY PREPARATION

Data: 2026-09-08.

### Seed

`database/seed.sql` e exclusivamente DEV ONLY/DADO DE TESTE. Ele e usado pelo
bootstrap de testes e por instrucoes locais, nao pelo migrator de producao nem
pelo comando `npm start`/Railway. Foi adicionado ao `.gitignore` e removido
somente do indice Git; o arquivo local permanece para desenvolvimento e testes.
O guia Railway agora identifica explicitamente o seed como nao executavel em
producao.

### Git e secrets

`storage/users.json` e `database/seed.sql` nao aparecem mais em `git ls-files`,
mas ambos permanecem no disco local. `.env`, `.env.example`, `scripts/backup.env`,
backups, logs e `node_modules` foram verificados pelas regras de ignore.
Nenhum valor real de secret foi exibido ou identificado; ocorrencias restantes
sao nomes em templates, documentacao, codigo `process.env` ou testes controlados.

### Docker

`docker --version` nao esta disponivel. Nenhum build ou container foi executado:
`DOCKER=NOT_EXECUTED`. A validacao deve ocorrer no ambiente que fara o deploy.

### Railway e migrations

`railway.json`, `Dockerfile`, `package.json`, `src/config/env-validator.js` e
`src/database/migrator.js` permanecem consistentes: `npm start`, `PORT`,
`DATABASE_URL`/`DATABASE_*`, `JWT_SECRET`, `CORS_ORIGINS`, `NODE_ENV`, healthcheck
`/api/health`, schema e migrations. O migrator nao executa `database/seed.sql`.

### Testes e health

`npm.cmd test`: PASS. `npm.cmd audit --omit=dev`: 0 vulnerabilidades.
`npm.cmd ls qs body-parser express --depth=3`: `qs@6.16.0`.
`git diff --check`: PASS. `/api/health`: HTTP 200.

### Arquivos seguros para primeiro commit

Codigo aprovado em `src/` e `public/`, schema e migrations, `package.json`,
`package-lock.json`, `Dockerfile`, `railway.json`, testes e documentacao
selecionada, `.env.example` e scripts sem secrets, apos revisao manual.

### Arquivos bloqueados para commit

`.env`, `scripts/backup.env`, `storage/users.json`, `database/seed.sql`,
backups, logs, `node_modules`, dumps, temporarios, tokens, chaves, senhas e
credenciais. O seed e mantido localmente, mas nao deve ser versionado.

### Status do release candidate

```text
GITHUB_READY=YES
SECRETS_SAFE=YES
AUDIT=PASS
TESTS=PASS
HEALTH=PASS
DATABASE=PASS
RAILWAY=PASS
GIT_SECURITY=PASS
DOCKER=NOT_EXECUTED
DIFF_CHECK=PASS
PRODUCTION_READY=NO
```

Bloqueadores restantes: validar Docker em ambiente disponível e revisar
manualmente a seleção do primeiro commit. Nenhum commit, push ou deploy foi
executado.

## RELEASE CANDIDATE FINAL

### Validações

- Docker: `docker --version` indisponível; nenhum build/container executado.
- Testes: `npm.cmd test` PASS.
- Audit: `npm.cmd audit --omit=dev` PASS, 0 vulnerabilidades.
- Dependências: `qs@6.16.0` confirmado na árvore.
- Health: `/api/health` HTTP 200; login e dashboard autenticados PASS.
- Git diff e diff staged: PASS após remoção de whitespace não funcional.
- Secrets staged: nenhum valor real identificado; somente templates,
  documentação, `process.env` e testes controlados.

### Staging

Foi feito staging explícito de 109 arquivos seguros, sem `git add .`.
Inclui código `src/`, frontend `public/`, schema/migrations, configuração,
testes, documentação aprovada, Dockerfile, Railway, manifests e `.env.example`.
`database/seed.sql` e `storage/users.json` não estão staged e permanecem
preservados localmente.

### Arquivos excluídos

Ficam bloqueados: `.env`, `scripts/backup.env`, `storage/users.json`,
`database/seed.sql`, backups, logs, `node_modules`, PDFs, dumps, temporários,
tokens, senhas, chaves privadas e credenciais reais.

### Status do release candidate

```text
GITHUB_READY=YES
SECRETS_SAFE=YES
AUDIT=PASS
TESTS=PASS
HEALTH=PASS
DATABASE=PASS
RAILWAY=PASS
GIT_SECURITY=PASS
DOCKER=NOT_EXECUTED
DIFF_CHECK=PASS
STAGING_SAFE=YES
PRODUCTION_READY=NO
READY_FOR_DEPLOY=NO
```

Pendência única: validar Docker em ambiente com Docker disponível. Nenhum
commit, push ou deploy foi executado.

## CORREÇÃO DA FALHA DE CODIFICAÇÃO — PLANEJAR

### Causa encontrada

O teste esperava `NÃO_INICIADA` e a migration PostgreSQL
`database/migrations/0002_create_planejar_phase_tables.sql` ja continha o
literal UTF-8 correto. A corrupcao estava nos bootstraps de teste:
`src/models/db.js` e `src/models/bootstrap-test-db.js` continham literalmente
`NÃƒO_INICIADA`. Portanto, a conversao ocorreu na camada de inicializacao do
 banco em memoria, antes de qualquer serializacao JSON, rota ou header HTTP.

| Camada | Valor esperado | Valor observado | Causa provavel |
| --- | --- | --- | --- |
| Migration PostgreSQL | `NÃO_INICIADA` | `NÃO_INICIADA` | Sem problema identificado |
| Bootstrap pg-mem antes da correcao | `NÃO_INICIADA` | `NÃƒO_INICIADA` | Literal ja corrompido no codigo de seed |
| Bootstrap pg-mem depois da correcao | `NÃO_INICIADA` | `NÃO_INICIADA` | Corrigido |

### Correção aplicada

Foram corrigidas somente quatro ocorrencias literais nos dois bootstraps:

- `src/models/db.js`
- `src/models/bootstrap-test-db.js`

Nenhum teste, schema de producao, migration, rota, controller, API ou
serializacao foi alterado.

### Testes antes e depois

- Antes: `planejar-01-06.test.js` falhava em 1 de 6 por `NÃƒO_INICIADA`.
- Depois: teste direcionado passou 6/6 usando o modo de execucao do projeto:
  `node --test-concurrency=1 test/functional/planejar-01-06.test.js`.
- Testes Planejar relacionados: `planejar-07-09`, `planejar-10`,
  `planejar-11` e `planejar-12` passaram.
- Suíte completa `npm.cmd test`: PASS, codigo 0.

### Regressoes e impacto

`npm.cmd audit --omit=dev`: 0 vulnerabilidades. A arvore continua em
`qs@6.16.0`. `git diff --check`: PASS. `/api/health`: HTTP 200.
O impacto funcional fica limitado a restaurar o status inicial UTF-8 correto
no bootstrap de testes; os valores de status, API, banco e frontend nao foram
alterados.

## VALIDAÇÃO FINAL DE PUBLICAÇÃO

Data: 2026-09-08.

### Alteracoes realizadas

- Removido `storage/users.json` do indice Git, sem apagar o arquivo local.
- Corrigidos somente os quatro pontos de whitespace apontados por
  `git diff --check`.
- Nenhuma funcionalidade, dependencia, banco, commit ou publicacao foi alterada.

### Resultados

- Git: `storage/users.json` nao aparece em `git ls-files`; a retirada
  intencional permanece staged. `.env` e arquivos equivalentes estao ignorados.
- Secrets: nenhum valor foi exibido ou encontrado na busca sanitizada.
  Marcadores em templates, documentacao, codigo e testes foram classificados
  como Template/Codigo/DEV ONLY.
- Seed: `database/seed.sql` e DEV ONLY e nao deve ser executado em producao.
- Docker: `DOCKER=NOT_EXECUTED`; motivo: Docker indisponivel no ambiente.
- Railway: PASS por revisao estatica de comando, porta, healthcheck e ambiente.
- `git diff --check`: PASS.
- Dependencias: `qs 6.16.0`, audit com 0 vulnerabilidades.
- Testes: FAIL por divergencia de codificacao no valor `NÃO_INICIADA`.
- Health: HTTP 200; login e dashboard autenticados PASS.

### ARQUIVOS RECOMENDADOS PARA O PRIMEIRO COMMIT

- `src/` e `public/` aprovados apos revisao funcional.
- `database/schema.sql`, `database/migrations/` e `src/database/migrator.js`.
- `package.json`, `package-lock.json`, `Dockerfile` e `railway.json`.
- `test/`, `README.md`, `SECURITY.md`, `DEPLOYMENT.md` e `.env.example`.
- Scripts operacionais sem secrets, apos revisao individual.

### ARQUIVOS QUE NAO DEVEM ENTRAR NO COMMIT

- `.env`, `.env.*`, `scripts/backup.env`: secrets/configuracao local.
- `storage/users.json`: legado/teste; removido do indice e preservado localmente.
- `storage/backups/`, `storage/logs/`, `node_modules/`, `validation/`: dados,
  dependencias ou artefatos operacionais.
- PDFs, dumps SQL, logs, temporarios e relatorios gerados: artefatos locais.
- `database/seed.sql`: DEV ONLY; requer revisao/separacao antes de publicacao.
- Qualquer senha, token, chave privada ou credencial real: bloqueador.

### Arquivos bloqueados e pendencias

- `database/seed.sql` continua bloqueado para uso/publicacao produtiva ate
  separar ou revisar as credenciais de teste.
- Build Docker nao validado por ausencia do comando `docker`.
- O working tree contem muitas alteracoes historicas e nao relacionadas;
  a selecao do primeiro commit deve ser manual.
- O teste Planejar permanece bloqueado pela divergencia de codificacao; nenhuma
  logica funcional foi alterada para mascarar a falha.

## DEPLOY FINAL

Data da validacao final: 2026-09-08

- Docker: `NOT_EXECUTED`; o comando `docker` nao esta disponivel neste ambiente.
- Staging: validado com selecao explicita; nenhuma credencial ou segredo real foi
  identificado. As remocoes de `database/seed.sql` e `storage/users.json` estao
  preservadas no staging para impedir sua publicacao, mantendo os arquivos locais.
- Testes: `npm.cmd test` PASS, 20 testes aprovados e 0 falhas.
- Audit: `npm.cmd audit --omit=dev` PASS, 0 vulnerabilidades.
- Health local: HTTP 200 em `/api/health`.
- Banco, Railway, Git Security e Diff Check: PASS conforme validacoes anteriores.
- Commit, push e deploy: nao executados; aguardam autorizacao explicita e Docker
  validado em ambiente compatível.

Status final desta etapa:

```text
GITHUB_READY=YES
SECRETS_SAFE=YES
AUDIT=PASS
TESTS=PASS
HEALTH=PASS
DATABASE=PASS
RAILWAY=PASS
GIT_SECURITY=PASS
DOCKER=NOT_EXECUTED
DIFF_CHECK=PASS
STAGING_SAFE=YES
PRODUCTION_READY=NO
READY_FOR_DEPLOY=NO
DEPLOY_STATUS=NOT_EXECUTED
```

## DEPLOY VIA RAILWAY

Data da preparacao Railway: 2026-09-08

- Docker local: indisponivel e nao validado; nenhuma instalacao foi tentada.
- Build Railway: configurado para usar o `Dockerfile` existente.
- Start: `npm start`, com `process.env.PORT` e fallback local apenas para
  desenvolvimento.
- Healthcheck: `/api/health`; validacao local sem Docker retornou HTTP 200.
- Banco: producao aceita `DATABASE_URL` ou o conjunto `DATABASE_*`.
- Migrations: `npm run migrate` executa `database/schema.sql` quando necessario
  e os arquivos de `database/migrations/`.
- Seed: `database/seed.sql` e DEV ONLY, usado apenas no bootstrap de testes; nao
  e chamado pelo migrator nem pelo start da aplicacao.
- Ambiente: Railway deve fornecer `NODE_ENV=production`, `DATABASE_URL`,
  `JWT_SECRET` e `CORS_ORIGINS` fora do Git.
- Git: 111 arquivos staged, sem arquivos proibidos ou secrets reais; seed e
  armazenamento local permanecem fora do conteudo publicado.
- Commit, push e deploy: nao executados; aguardam autorizacao explicita.

```text
DOCKER_LOCAL=NOT_AVAILABLE
DOCKER_LOCAL_VALIDATION=NOT_EXECUTED
CODE_READY=YES
RAILWAY_READY=YES
READY_FOR_COMMIT=YES
READY_FOR_PUSH=NO
READY_FOR_DEPLOY=NO
COMMIT=NOT_EXECUTED
PUSH=NOT_EXECUTED
DEPLOY=NOT_EXECUTED
```

## DOCKER RELEASE VALIDATION

Data do diagnostico: 2026-09-08

- `docker --version`: indisponivel; Docker CLI nao esta no PATH.
- Docker Desktop, `docker.exe`, Podman, nerdctl e containerd nao foram
  localizados nos caminhos padrao ou no PATH.
- Nenhum servico ou processo Docker disponivel para inicializacao.
- WSL esta presente, mas nao ha distribuicao Linux utilizavel registrada.
- A verificacao dos recursos opcionais do Windows requer elevacao.
- `winget` esta presente, mas a consulta ao catalogo Microsoft Store exigiu
  aceite interativo de termos; nenhuma instalacao foi iniciada.
- A sessao atual nao possui privilegios administrativos.
- Nenhum download, instalacao, alteracao de configuracao, reset ou limpeza de
  volumes/imagens foi executado.
- `CONTAINER_RUNTIME=NONE`, `DOCKER_BUILD=NOT_EXECUTED`,
  `CONTAINER_START=NOT_EXECUTED`, `CONTAINER_HEALTH=NOT_EXECUTED`.

Bloqueio operacional: instalar o Docker Desktop pela fonte oficial da Docker,
com permissao administrativa, ou executar a validacao em outra maquina/CI que
ja possua Docker Engine ativo. Depois, repetir `docker --version`,
`docker build --no-cache -t smp-pci-release-candidate .`, iniciar o container e
validar `/api/health` com HTTP 200.

## FINAL RELEASE CANDIDATE

```text
DOCKER_INSTALLED=NO
DOCKER_DAEMON=NOT_AVAILABLE
DOCKER_VERSION=NOT_AVAILABLE
CONTAINER_RUNTIME=NONE
DOCKER_BUILD=NOT_EXECUTED
CONTAINER_START=NOT_EXECUTED
CONTAINER_HEALTH=NOT_EXECUTED
TESTS=PASS
AUDIT=PASS
HEALTH=PASS
DATABASE=PASS
RAILWAY=PASS
GIT_SECURITY=PASS
SECRETS_SAFE=YES
DIFF_CHECK=PASS
STAGING_SAFE=YES
GITHUB_READY=YES
PRODUCTION_READY=NO
READY_FOR_DEPLOY=NO
COMMIT=NOT_EXECUTED
PUSH=NOT_EXECUTED
DEPLOY=NOT_EXECUTED
```
