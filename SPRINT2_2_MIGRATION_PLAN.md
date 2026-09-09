# Plano de migracao Sprint 2.2

## Ordem aprovada

1. Congelar exportacao das fontes locais e criar backup.
2. Consolidar schema BPM alvo e catalogos de fases/requisitos.
3. Criar repositories PostgreSQL com transacoes e escopo.
4. Criar APIs de processos, fases, atividades, checklist, equipe e anexos.
5. Migrar processos e gerar fases/atividades por codigo estavel.
6. Migrar checklist e recalcular percentuais exclusivamente no banco.
7. Migrar membros, responsabilidades e anexos com validacao.
8. Comparar contagens, chaves e amostras com a origem.
9. Trocar frontend para API sem alterar layout.
10. Desativar escritas e leituras institucionais no localStorage.

## Gates de aceite

- Nenhum processo sem criador/unidade/fase.
- Nenhuma atividade sem fase/codigo.
- Nenhum checklist sem atividade.
- Nenhum membro sem usuario valido.
- Nenhum anexo sem processo e metadados validos.
- Contagem e amostras reconciliadas.
- Testes de escopo e persistencia aprovados.
- Rollback exercitado em banco de teste.

## Fora desta Sprint 2.2.0

Criacao de tabelas, migration de dados e alteracao de frontend. Esta entrega apenas audita e prepara a migracao.