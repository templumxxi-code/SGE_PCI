// ============================================================================
// SMP PCI - Gerenciamento de Relatórios
// ============================================================================

class ReportManager {
    /**
     * Carregar relatórios
     */
    static async loadReports() {
        try {
            this.attachExportHandlers();
        } catch (error) {
            console.error('Erro ao carregar relatórios:', error);
        }
    }

    static attachExportHandlers() {
        document.querySelectorAll('[data-report-action]').forEach(button => {
            button.addEventListener('click', (event) => {
                const action = event.currentTarget.dataset.reportAction;
                switch (action) {
                    case 'export-processos':
                        this.exportProcessesReport();
                        break;
                    case 'export-indicadores':
                        this.exportIndicatorsReport();
                        break;
                    case 'export-historico':
                        this.exportHistoryReport();
                        break;
                }
            });
        });
    }

    /**
     * Exportar relatório de processos
     */
    static async exportProcessesReport(filtros = {}) {
        try {
            // Se não foram passados filtros, ler inputs da UI
            if (!filtros || Object.keys(filtros).length === 0) {
                const inputs = document.querySelectorAll('#relatorios .report-filters input, #relatorios .report-filters select');
                const arr = Array.from(inputs);
                if (arr.length >= 2 && arr[0].type === 'date' && arr[0].value) {
                    filtros.data_inicio = arr[0].value;
                    if (arr[1] && arr[1].type === 'date' && arr[1].value) {
                        filtros.data_fim = arr[1].value;
                    }
                }
                const select = document.querySelector('#relatorios .report-filters select');
                if (select && select.value && select.value !== 'Todos os setores') {
                    filtros.setor_id = select.value;
                }
            }

            const params = new URLSearchParams(filtros);
            const response = await api.get(`/reports/processos?${params}`);
            this.exportarCSVReport(response.dados, 'relatorio_processos.csv');
        } catch (error) {
            console.error('Erro ao exportar relatório:', error);
            alert('Não foi possível exportar o relatório de processos.');
        }
    }

    static async exportHistoryReport() {
        try {
            const resp = await api.get('/reports/logs');
            const logs = resp.logs || [];
            if (!logs.length) {
                alert('Nenhum log disponível para exportação.');
                return;
            }
            const formatted = logs.map(l => ({ id: l.id, usuario_id: l.usuario_id, acao: l.acao, tabela: l.tabela_afetada, registro: l.id_registro, criado_em: l.criado_em }));
            this.exportarCSVReport(formatted, 'historico_logs.csv');
        } catch (error) {
            console.error('Erro ao exportar histórico:', error);
            alert('Não foi possível exportar o histórico.');
        }
    }

    /**
     * Exportar relatório de indicadores
     */
    static async exportIndicatorsReport(filtros = {}) {
        try {
            const params = new URLSearchParams(filtros);
            const response = await api.get(`/reports/indicadores?${params}`);
            this.exportarCSVReport(response.dados, 'relatorio_indicadores.csv');
        } catch (error) {
            console.error('Erro ao exportar relatório:', error);
            alert('Não foi possível exportar o relatório de indicadores.');
        }
    }

    /**
     * Gerar relatório em PDF
     */
    static generatePDFReport(dados) {
        console.log('Gerando PDF:', dados);
        // Aqui seria implementada a geração de PDF com uma biblioteca como jsPDF ou html2pdf
    }

    /**
     * Gerar relatório em CSV
     */
    static exportarCSVReport(dados, nomeArquivo) {
        if (!dados || dados.length === 0) {
            alert('Não há dados para exportar.');
            return;
        }

        exportarCSV(dados, nomeArquivo);
        alert(`Relatório salvo como ${nomeArquivo}`);
    }

    /**
     * Imprimir relatório
     */
    static printReport() {
        window.print();
    }
}

// Setup dos botões de export
// As exportações são vinculadas em loadReports() por meio de data-report-action
