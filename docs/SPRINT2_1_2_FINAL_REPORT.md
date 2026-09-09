# Relatorio final da Sprint 2.1.2

Data: 2026-08-25

## Status

**BLOQUEADA**

O controle canonico por lotacao, a integridade basica da hierarquia e a listagem de usuarios com UUID foram implementados. O isolamento completo de dados institucionais nao pode ser declarado concluido porque o modulo Processos e seus indicadores/anexos ainda usam tabelas legadas com `setor_id` numerico. A migracao BPM foi explicitamente excluida desta Sprint.

## Alteracoes

- `database/migrations/0009_hierarchical_scope.sql`: unicidade de unidade por nome, tipo e pai; impedimento de auto-pai.
- `src/middleware/scopeAccess.js`: escopo recursivo de lotacao, descendentes e auditoria de negacao.
- `src/repositories/userRepository.js`: busca de usuarios por unidades UUID.
- `src/routes/users.js`: listagem e consulta canonicas com UUID e escopo.
- `docs/ACCESS_CONTROL.md`: regras, hierarquia e limites.

## Tabelas e regras

- `users.organizational_unit_id` vincula usuario a lotacao.
- `organizational_units_v2.parent_id` representa a hierarquia.
- `roles`, `permissions`, `user_roles` e `roles_permissions` sustentam RBAC.
- `audit_logs` registra `DATA_ACCESS_DENIED`.

## Validacoes

- Migration `0009`: executada com sucesso.
- Migration `0010`: aplicada para impedir duplicidade tambem entre unidades raiz (`parent_id` nulo).
- Sintaxe do middleware, repositorio e rota: aprovada.
- Login PostgreSQL: `200`.
- `/api/users` autorizado: `200`.
- Resposta administrativa retorna UUID e nao retorna hash de senha.
- Health check continua `200 connected` nas validacoes anteriores.

## Pendencias

1. Migrar processos, atividades, indicadores e anexos para o modelo UUID/canonico.
2. Aplicar `checkScopeAccess` aos controllers de cada recurso.
3. Criar testes de setor A contra setor B, chefe de nucleo contra descendentes e diretor contra outro instituto.
4. Registrar tambem `DATA_ACCESS_GRANTED` quando o acesso for explicitamente avaliado.
5. Corrigir rotas legadas numericas sem alterar regras BPM.

## Justificativa do bloqueio

O escopo hierarquico foi fechado para o recurso canonico de usuarios. Processos, indicadores, relatorios e anexos continuam no modelo legado numerico; aplicar um filtro UUID nesses controllers sem migrar o BPM produziria consultas inconsistentes. A proxima acao e migrar esses recursos na Sprint 2.2 e entao reutilizar `checkScopeAccess` neles.
