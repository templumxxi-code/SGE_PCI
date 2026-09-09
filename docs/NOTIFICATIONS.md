# Notificacoes

## API

- `GET /api/notifications`: lista apenas notificacoes do usuario autenticado.
- `GET /api/notifications/unread-count`: retorna contador real.
- `PATCH /api/notifications/:id/read`: marca uma notificacao propria como lida.

## Eventos

A tabela suporta `PROCESS_CREATED`, `PROCESS_ASSIGNED`, `PROCESS_APPROVED`, `PROCESS_RETURNED`, `ACTIVITY_ASSIGNED`, `CHECKLIST_PENDING`, `CHECKLIST_COMPLETED`, `DEADLINE_WARNING` e `PROCESS_COMPLETED`.

A criacao de processo canonico gera `PROCESS_CREATED` para usuarios ativos da unidade. Outros eventos devem ser emitidos pelos controllers correspondentes conforme forem migrados.

## Seguranca

O usuario e derivado do token. O endpoint nunca aceita `user_id` para leitura ou alteracao. UUID, propriedade da notificacao e sessao sao validados no backend.

## Frontend

`NotificationCenter` sincroniza a API a cada 30 segundos e preserva o cache local apenas como fallback de exibicao durante a transicao.
