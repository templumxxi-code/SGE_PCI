# Plano de limpeza dos dados BPM

## Duplicidades

- Consolidar `planejar`, `planejar_projetos`, `planejar_phases`, `planejar_checklists` e variantes de SWOT em um contrato.
- Deduplicar atividades Planejar por processo + codigo.
- Deduplicar unidades e membros por chaves institucionais.

## Inconsistencias

- `Desenhar` versus `Redesenhar`.
- `PLAN_A`/`PLAN_B` invertidos entre telas e backend.
- `name/registration/sectorId` versus `nome/matricula/setor`.
- Tipos de anexo do frontend incompatíveis com `POP/PAP/BPMN/Outro`.
- Percentuais persistidos manualmente versus percentual derivado de checklist.

## Dados que devem sair do frontend

Processos, fases, atividades, checklists, equipe, anexos, aprovacoes, indicadores e notificacoes. LocalStorage deve permanecer somente para tema, filtros e selecoes de interface.

## Sequencia de saneamento

1. Criar backup imutavel do localStorage/exportacao atual.
2. Normalizar nomes, codigos, fases e datas.
3. Resolver conflitos A/B com regra versionada e revisao.
4. Rejeitar registros sem processo, fase ou usuario valido.
5. Importar em transacao com relatorio de rejeicoes.
6. Comparar contagens e amostras antes do corte.
7. Bloquear novas escritas locais e remover fallback apos aceite.