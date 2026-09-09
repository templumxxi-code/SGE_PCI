# CLEANUP EXECUTION REPORT

Data: 2026-09-03
Escopo: limpeza pré-produção reversível. Nenhum arquivo foi apagado definitivamente. Nenhum código, `package.json`, configuração de aplicação ou banco PostgreSQL foi alterado.

## Arquivos movidos

Destino: `archive_cleanup_20260903/`.

- `validation/` → `archive_cleanup_20260903/validation/` (14 scripts).
- `test-result.log` → `archive_cleanup_20260903/logs/test-result.log`.
- `public/tmp/` → `archive_cleanup_20260903/tmp/` (4 PDFs).
- `test/functional/planejar.test.js.bak` → `archive_cleanup_20260903/tests/planejar.test.js.bak`.
- Conteúdo anterior de `storage/logs/` → `archive_cleanup_20260903/logs/` (14 logs).

`storage/logs/.gitkeep` foi criado/mantido como único conteúdo restante do diretório.

Inventário arquivado:

- 34 arquivos.
- 2.933.004 bytes.

## Arquivos mantidos

- Código da aplicação em `src/`.
- Frontend em `public/`, exceto o diretório temporário `public/tmp/`.
- `package.json` e `package-lock.json`.
- `database/` e migrations.
- `scripts/`, incluindo `backup-database.ps1` e `backup.env`.
- Backups em `storage/backups/`.
- Testes ativos em `test/`, exceto o `.bak` solicitado.
- Documentação e relatórios existentes.
- `storage/logs/.gitkeep`.

## Testes executados

### `npm test`

- Comando: `npm.cmd test`.
- Exit code: `0`.
- Resultado: PASS.

### `npm audit`

- Comando: `npm.cmd audit`.
- Exit code: `1`.
- Resultado: FAIL.
- Encontradas 3 vulnerabilidades moderadas transitivas envolvendo `body-parser`, `qs` e `express`.
- Nenhum `npm audit fix` foi executado.

### Inicialização e health

- Servidor iniciado com `node src/server.js`.
- Porta `3000`: LISTENING.
- `GET /api/health`: HTTP `200`.
- Resposta: `status=ok`, `database=connected`.

### Smoke test de rotas

- `GET /api/health`: `200`, esperado.
- `GET /api/auth/opcoes-login`: `500`, falha encontrada.
- `GET /api/processes` sem autenticação: `401`, esperado.
- `GET /api/bpm/processes` sem autenticação: `401`, esperado.
- `GET /api/dashboard/summary` sem autenticação: `401`, esperado.

## Resultado

# FAIL PARCIAL

A movimentação dos artefatos e o `npm test` passaram. O servidor iniciou e o health respondeu corretamente. Porém, a validação de rotas não passou integralmente e `npm audit` reportou 3 vulnerabilidades moderadas.

Falha funcional observada:

```text
userRepository.findAllUsers(...).filter is not a function
```

Rota afetada: `GET /api/auth/opcoes-login`.

Essa falha não foi corrigida nesta execução, conforme solicitado.

## Rollback disponível

O rollback é reversível porque nada foi apagado. Para restaurar os itens, mover o conteúdo de:

- `archive_cleanup_20260903/validation/` para `validation/`;
- `archive_cleanup_20260903/logs/test-result.log` para `test-result.log`;
- `archive_cleanup_20260903/tmp/` para `public/tmp/`;
- `archive_cleanup_20260903/tests/` para `test/functional/`;
- logs escolhidos de `archive_cleanup_20260903/logs/` para `storage/logs/`.

Depois, remover somente a pasta de arquivo se a restauração for confirmada. Nenhum rollback foi executado.

## Observação final

A limpeza solicitada foi executada sem excluir arquivos definitivamente. O projeto não deve ser considerado pronto para deploy final enquanto a falha de `GET /api/auth/opcoes-login` e as vulnerabilidades do `npm audit` não forem avaliadas.
