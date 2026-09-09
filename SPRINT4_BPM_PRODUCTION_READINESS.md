# RESULTADO SPRINT 4

Data: 2026-09-02
Banco: PostgreSQL real 18.6, `sge_pci`, schema `public`, usuário `sge_app`.
Aplicação: Express.js + `pg`, porta `3000`.

## Implementado

- Endpoint protegido `POST /api/bpm/processes/:processId/phases`.
- Endpoint protegido `POST /api/bpm/phases/:phaseId/activities`.
- Validação de processo, fase, payload, escopo e responsável.
- Persistência do responsável na atividade.
- Persistência de `progress_percent` no update do processo.
- Validação de status antes do SQL para evitar HTTP 500 por constraint.

## Testes executados

| Teste | Resultado |
|---|---|
| Login | PASS, HTTP 200, JWT real retornado |
| Criar processo | PASS, HTTP 201, ID `6a43fd50-f07d-462e-944e-d5d2e8ea24b5` |
| Criar fase | PASS, HTTP 201, ID `a35eff1f-52d0-45f0-824a-c0bbfe5c0f28` |
| Criar atividade | PASS, HTTP 201, ID `bf1378c7-0dc1-4bfc-b3a2-0f657356a81a` |
| Responsável | PASS, UUID persistido na atividade |
| Update | PASS, HTTP 200, `ACTIVE`, progresso `35.00` |
| Dashboard | PASS, HTTP 200 |
| Restart | PASS, health HTTP 200 e registros encontrados novamente |
| Persistência PostgreSQL | PASS, SELECT direto encontrou processo, fase e atividade |
| Integridade global | FAIL, 2 processos sem fase |

## Consultas de confirmação

```sql
SELECT id, name, status, current_phase, progress_percent, responsible_user_id
FROM processes
WHERE id = '6a43fd50-f07d-462e-944e-d5d2e8ea24b5';

SELECT id, process_id, phase_name, order_number, status
FROM process_phases
WHERE id = 'a35eff1f-52d0-45f0-824a-c0bbfe5c0f28';

SELECT id, phase_id, titulo, responsible_user_id, status
FROM process_activities
WHERE id = 'bf1378c7-0dc1-4bfc-b3a2-0f657356a81a';

SELECT COUNT(*) FROM processes p
LEFT JOIN process_phases ph ON ph.process_id = p.id
WHERE ph.id IS NULL;

SELECT COUNT(*) FROM process_activities pa
LEFT JOIN process_phases ph ON pa.phase_id = ph.id
WHERE ph.id IS NULL;
```

Resultados relevantes:

- Processo: `ACTIVE`, `Planejar`, `35.00`, responsável válido.
- Fase encontrada com `process_id` correto.
- Atividade encontrada com `phase_id` correto e responsável válido.
- Após restart: `processes=3`, `process_phases=1`, `process_activities=1`.
- Integridade global: processos sem fase `2`; atividades sem fase `0`.

## Status final

# NO-GO PRODUÇÃO

O fluxo criado nesta Sprint funcionou integralmente pela aplicação e persistiu no PostgreSQL real. A aprovação global permanece bloqueada porque existem 2 processos anteriores sem fase. Esses dados não foram apagados nem alterados automaticamente.

## Bloqueador

- Corrigir, mediante decisão funcional e procedimento controlado, os 2 processos existentes sem fase. Não foi feita correção automática nem inserção manual para mascarar o resultado.
