# BANCO PRODUÇÃO

Data: 2026-09-02
Banco real: PostgreSQL 18.6, `sge_pci`, schema `public`, usuário `sge_app`.
Aplicação: Express.js + `pg`, porta `3000`.

## Integridade

- Processos órfãos antes: `2`.
- Processos órfãos depois: `0`.
- Fases órfãs: `0`.
- Atividades órfãs: `0`.
- Responsáveis inválidos: `0`.

Os dois processos antigos foram tratados pela API autenticada, preservando os dados e criando fases coerentes com `current_phase`.

## Fluxo BPM

- Processo: OK, HTTP `201`, persistido.
- Fase: OK, HTTP `201`, persistida.
- Atividade: OK, HTTP `201`, persistida.
- Responsável: OK, FK válida e persistida.
- Status/update: OK, HTTP `200`, `ACTIVE`, progresso `50.00`.
- Dashboard: OK, HTTP `200`.
- Restart: OK, health `200`, registros encontrados novamente.

IDs do cenário final:

- Processo: `223fbf39-62fa-4395-9890-23c3d6319842`
- Fase: `68fb7e1f-ece7-4abe-9776-c7ee61e23ac3`
- Atividade: `c74bcf22-c344-47cb-be9f-7d53b613020b`

## Banco após validação

- `processes`: `4`
- `process_phases`: `4`
- `process_activities`: `2`

## Backup

- Arquivo: `backup_pre_producao.sql`
- Tamanho: `155793` bytes.
- Backup real: PASS.
- Restore real: FAIL/BLOQUEADO.

A tentativa de restore em banco separado não foi concluída porque:

- a senha disponível para `postgres` não autenticou;
- `sge_app` possui `CREATEDB=false`;
- não foi possível criar o banco isolado de restauração sem credencial/privilégio administrativo.

## Decisão

# NO-GO PRODUÇÃO

A integridade, o fluxo BPM, a persistência, o restart e o backup passaram com evidência real. O critério absoluto ainda não foi atendido porque o restore do backup em banco separado não foi comprovado.

Bloqueador restante: executar o restore com um administrador PostgreSQL autorizado, sem solicitar ou registrar a senha no relatório, e validar tabelas, dados, PKs, FKs, índices, triggers e functions no banco restaurado.

Nenhuma senha, token ou hash foi registrado.
