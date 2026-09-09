# Relatorio final da Sprint 2.3

Data: 2026-08-27

## Status

**BLOQUEADA** para aceite final. A camada estratégica inicial está implementada e consulta PostgreSQL com autenticação/RBAC/escopo, mas `npm test` terminou com `Exit Code: 1`. A migração completa dos dados BPM legados permanece uma etapa posterior.

## Entregas

- `database/migrations/0013_strategy_notifications.sql`: referência, data de leitura, índices e trigger de `PROCESS_CREATED`.
- `src/routes/dashboard.js`: summary, visão NGE e visão por unidade.
- `src/routes/notifications.js`: lista, contador e marcar como lida.
- `src/routes/strategicReports.js`: resumo de processos, desempenho por unidade e desempenho de atividades.
- `src/services/notificationService.js`: persistência e leitura de notificações.
- `public/js/api/bpmApi.js`: chamadas estratégicas.
- `public/js/dashboard.js`: dashboard API com polling de 30 segundos.
- `public/js/app.js`: sincronização do sino com API e fallback local.
- Documentação em `docs/DASHBOARD_CURRENT_STATE.md`, `docs/DASHBOARD_API.md` e `docs/NOTIFICATIONS.md`.

## Segurança

- Dashboard NGE exige `DASHBOARD_GLOBAL`.
- Dashboard unitário e relatórios usam `getUserScope` no backend.
- Notificações são sempre filtradas pelo usuário autenticado.
- Marcação de leitura exige UUID e propriedade da notificação.
- Consultas usam parâmetros PostgreSQL.

## Testes

- Testes estratégicos (`dashboard`, `notifications` e `reports`): **5 aprovados, 0 falhas**.
- `npm test`: **falhou, Exit Code: 1**. O bootstrap canônico usa UUID para `users`, enquanto testes/rotas legadas consultam `usuarios` com IDs inteiros; isso provoca erro de conversão UUID para integer no fluxo legado. Os avisos de DDL não são a causa funcional principal.
- Diagnósticos do VS Code: sem erros nos arquivos JavaScript alterados.
- O bootstrap agora registra `gen_random_uuid`, aplica migrations individualmente e inclui `login_attempts`.

## Pendências para Sprint 2.4

1. Migrar e reconciliar dados legados com o agregado BPM canônico.
2. Emitir todos os eventos de atribuição, aprovação, checklist e prazo.
3. Completar exportação estratégica com cabeçalho/rodapé institucional.
4. Remover fallback local após aceite operacional e reconciliação.
5. Substituir token em localStorage por cookie HttpOnly, se compatível com a política de implantação.

## Critérios ainda não comprovados

- `npm test` não passa.
- O isolamento estratégico foi validado nos testes focados, mas a suíte completa é interrompida pelo conflito entre os modelos UUID e legado inteiro.
- `dashboard.js` e `app.js` ainda mantêm cache/fallback em `localStorage`; a API é a fonte principal, mas o requisito de remoção total não foi atendido.

## Correção necessária

Escolher e aplicar uma estratégia única de IDs no ambiente integrado: adaptar os testes/rotas legadas ao modelo canônico UUID ou manter um seed legado separado para os testes legados. Depois, executar novamente `npm test` e confirmar `EXIT=0` antes de alterar o status para **CONCLUÍDA**.

## Sprint 2.3.1

- Adicionados `src/adapters/userAdapter.js`, `src/adapters/processAdapter.js` e `src/adapters/unitAdapter.js`.
- O middleware canônico preserva `req.user.id` como UUID e resolve `legacyUserId`/`legacySectorId` por e-mail.
- A rota legada de processos passou a usar `legacyUserId`, evitando enviar UUID para `usuarios.id`.
- A compatibilidade de planejar, indicadores, anexos e consumidores legados restantes ainda não foi concluída.
- Status da 2.3.1: **BLOQUEADA**; não há evidência de `npm test` com `EXIT=0`.
