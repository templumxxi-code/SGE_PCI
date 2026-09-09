# Estado atual dos dashboards

- `public/js/dashboard.js` possuia calculos locais a partir de `sge_pci_processos` e `sge_pci_indicators`.
- O caminho local foi removido das rotinas `loadNGEDashboard` e `loadSetorDashboard`; elas consultam a API estratégica.
- O backend legado `/api/reports/dashboard` ainda existe para compatibilidade, mas a nova fonte e `/api/dashboard/nge` e `/api/dashboard/unit`.
- O escopo e calculado no backend por `getUserScope`; parametros de unidade enviados pelo cliente nao ampliam o acesso.
- O dashboard agenda atualizacao por polling a cada 30 segundos.
- Relatorios locais foram identificados em `public/js/reports.js`; a API estrategica adiciona `/api/reports/process-summary`, `/unit-performance` e `/activity-performance`.
- Tema, filtros e selecoes permanecem permitidos no localStorage; dados institucionais nao sao mais fonte principal do dashboard.

## Lacunas

Os dados BPM antigos ainda estao no modelo legado e o dashboard estrategico canonico so contabiliza registros da tabela `processes`. A reconciliacao dos dois modelos deve ocorrer na migracao BPM seguinte. A regra de atraso atual usa `updated_at` por falta de uma coluna de prazo dedicada.
