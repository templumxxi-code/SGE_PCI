# Auditoria UUID x modelo legado

## Regra

`users.id`, `processes.id` e `organizational_units_v2.id` são UUID e permanecem oficiais na API `/api/bpm`, dashboard, relatórios estratégicos e notificações. As tabelas `usuarios`, `processos` e `setores` usam INTEGER somente nos consumidores legados.

| Arquivo | Modelo atual | Correção |
| --- | --- | --- |
| `src/middleware/auth.js` | UUID canônico em `req.user.id` | Adiciona `legacyUserId` e `legacySectorId` por e-mail |
| `src/routes/processes.js` | Legado INTEGER | Usa `req.user.legacyUserId` |
| `src/routes/planejar.js` | Legado INTEGER | Usa contexto/ID legado nos controllers |
| `src/routes/indicators.js` | Legado INTEGER | Usa `legacyUserId` |
| `src/routes/attachments.js` | Legado INTEGER e `parseInt` | Ainda pendente a migração completa dos IDs de processo/atividade |
| `src/routes/bpm.js` | UUID canônico | Mantido sem adapter legado |
| `src/routes/dashboard.js` | UUID canônico | Mantido sem conversão |
| `src/routes/strategicReports.js` | UUID canônico | Mantido sem conversão |

## Pendências

Planejar possui endpoints restantes que ainda passam `req.user.id` diretamente; anexos convertem parâmetros com `parseInt`; relatórios legados usam o schema inteiro. A suíte completa deve ser executada após a migração desses consumidores.
