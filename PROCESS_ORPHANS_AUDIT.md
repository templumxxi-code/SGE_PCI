# PROCESS ORPHANS AUDIT

Data: 2026-09-02. Consulta executada no PostgreSQL real `sge_pci`, schema `public`.

```sql
SELECT p.id, p.name, p.created_at, p.status, p.current_phase
FROM processes p
LEFT JOIN process_phases ph ON ph.process_id = p.id
WHERE ph.id IS NULL
ORDER BY p.created_at, p.id;
```

| ID | Nome | Criado | Situação |
|---|---|---|---|
| `00000000-0000-4000-8000-000000000021` | Processo Estratégico A | `2026-09-01T11:47:58.815Z` | `ACTIVE`, `Planejar`, sem fase |
| `00000000-0000-4000-8000-000000000022` | Processo Estratégico B | `2026-09-01T11:47:58.815Z` | `ACTIVE`, `Implementar`, sem fase |

Contagem antes: `2`.

Tratamento escolhido: Opção A. As fases foram criadas pela API autenticada, sem INSERT manual:

- Processo `...0021` → fase `cdf7cfa6-c137-4514-9f36-463f2e2c9a8f`, `Planejar`, ordem `1`.
- Processo `...0022` → fase `5440df83-d783-4561-be98-f170753ee6c9`, `Implementar`, ordem `4`.

Contagem depois: `0` processos sem fase.
