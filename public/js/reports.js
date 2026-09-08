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
            button.addEventListener('click', async (event) => {
                event.preventDefault();
                const action = event.currentTarget.dataset.reportAction;
                const currentButton = event.currentTarget;
                const originalText = currentButton.textContent;
                
                try {
                    // Desabilitar botão durante o processo para PDF
                    if (action.includes('pdf')) {
                        currentButton.disabled = true;
                        currentButton.textContent = '⏳ Gerando...';
                    }
                    
                    switch (action) {
                        case 'export-processos':
                            await this.exportProcessesReport();
                            break;
                        case 'export-indicadores':
                            await this.exportIndicatorsReport();
                            break;
                        case 'export-historico':
                            await this.exportHistoryReport();
                            break;
                        case 'export-processos-pdf':
                            await this.exportProcessesReportPDF();
                            break;
                        case 'export-indicadores-pdf':
                            await this.exportIndicatorsReportPDF();
                            break;
                        case 'export-historico-pdf':
                            await this.exportHistoryReportPDF();
                            break;
                    }
                } catch (error) {
                    console.error('Erro no handler de export:', error);
                } finally {
                    // Restaurar estado do botão
                    if (action.includes('pdf')) {
                        currentButton.disabled = false;
                        currentButton.textContent = originalText;
                    }
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
     * Exportar relatório de processos em PDF
     */
    static async exportProcessesReportPDF(filtros = {}) {
        try {
            if (!filtros || Object.keys(filtros).length === 0) {
                const card = document.querySelector('#relatorios .report-card');
                const inputs = card.querySelectorAll('.report-filters input, .report-filters select');
                const arr = Array.from(inputs);
                if (arr.length >= 2 && arr[0].type === 'date' && arr[0].value) {
                    filtros.data_inicio = arr[0].value;
                    if (arr[1] && arr[1].type === 'date' && arr[1].value) {
                        filtros.data_fim = arr[1].value;
                    }
                }
                const select = card.querySelector('.report-filters select');
                if (select && select.value && select.value !== 'Todos os setores') {
                    filtros.setor_id = select.value;
                }
            }

            const params = new URLSearchParams(filtros);
            const url = `/api/reports/processos/pdf?${params}`;
            await this.downloadPDF(url, 'relatorio_processos.pdf');
        } catch (error) {
            console.error('Erro ao exportar PDF de processos:', error);
            alert('Não foi possível exportar o relatório de processos em PDF.');
        }
    }

    /**
     * Exportar relatório de indicadores em PDF
     */
    static async exportIndicatorsReportPDF(filtros = {}) {
        try {
            const card = document.querySelectorAll('#relatorios .report-card')[1];
            const inputs = card.querySelectorAll('.report-filters input, .report-filters select');
            const arr = Array.from(inputs);
            
            if (arr.length >= 1) {
                const select = arr.find(el => el.tagName === 'SELECT');
                if (select && select.value && select.value !== 'Todos os setores') {
                    filtros.setor_id = select.value;
                }
                
                const dates = arr.filter(el => el.type === 'date');
                if (dates[0] && dates[0].value) {
                    filtros.data_inicio = dates[0].value;
                }
                if (dates[1] && dates[1].value) {
                    filtros.data_fim = dates[1].value;
                }
            }

            const params = new URLSearchParams(filtros);
            const url = `/api/reports/indicadores/pdf?${params}`;
            await this.downloadPDF(url, 'relatorio_indicadores.pdf');
        } catch (error) {
            console.error('Erro ao exportar PDF de indicadores:', error);
            alert('Não foi possível exportar o relatório de indicadores em PDF.');
        }
    }

    /**
     * Exportar histórico em PDF
     */
    static async exportHistoryReportPDF(filtros = {}) {
        try {
            const card = document.querySelectorAll('#relatorios .report-card')[2];
            const inputs = card.querySelectorAll('.report-filters input');
            const arr = Array.from(inputs);
            
            if (arr.length >= 1 && arr[0].value) {
                filtros.data_inicio = arr[0].value;
            }
            if (arr.length >= 2 && arr[1].value) {
                filtros.data_fim = arr[1].value;
            }

            const params = new URLSearchParams(filtros);
            const url = `/api/reports/logs/pdf?${params}`;
            await this.downloadPDF(url, 'relatorio_auditoria.pdf');
        } catch (error) {
            console.error('Erro ao exportar PDF de auditoria:', error);
            alert('Não foi possível exportar o relatório de auditoria em PDF.');
        }
    }

    /**
     * Download de arquivo PDF
     */
    static async downloadPDF(url, filename) {
        try {
            const token = localStorage.getItem('smp_token');
            if (!token) {
                alert('Sessão expirada. Por favor, faça login novamente.');
                return;
            }

            // Fazer requisição com Authorization header
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error(`Erro HTTP: ${response.status}`);
            }

            // Obter o blob do PDF
            const blob = await response.blob();

            const disposition = response.headers.get('Content-Disposition') || '';
            const filenameMatch = disposition.match(/filename="?([^";]+)"?/i);
            const downloadFilename = filenameMatch ? filenameMatch[1] : filename;

            // Criar um link temporário e fazer o download
            const blobUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = downloadFilename;
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            // Liberar a memória
            window.URL.revokeObjectURL(blobUrl);
        } catch (error) {
            console.error('Erro ao fazer download do PDF:', error);
            alert(`Erro ao fazer download do PDF: ${error.message}`);
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
