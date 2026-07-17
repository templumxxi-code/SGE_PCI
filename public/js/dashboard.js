// ============================================================================
// SMP PCI - Gerenciamento de Dashboard
// ============================================================================

class DashboardManager {
    static chartInstances = {};

    /**
     * Carregar dashboard NGE (administrador)
     */
    static async loadNGEDashboard() {
        try {
            // Obter dados dos relatórios
            const dados = await api.get('/reports/dashboard');

            // Atualizar métricas
            this.updateMetrics(dados);

            // Criar gráficos
            this.createConformanceChart();
            this.createDistributionChart();
        } catch (error) {
            console.error('Erro ao carregar dashboard NGE:', error);
        }
    }

    /**
     * Carregar dashboard do setor
     */
    static async loadSetorDashboard() {
        try {
            const setorId = window.app.currentUser.setor_id;
            const dados = await api.get(`/reports/dashboard?setor_id=${setorId}`);

            this.updateSetorMetrics(dados);
            this.createSetorProgressChart();
            this.createTemporalEvolutionChart();
        } catch (error) {
            console.error('Erro ao carregar dashboard do setor:', error);
        }
    }

    /**
     * Atualizar métricas do dashboard NGE
     */
    static updateMetrics(dados) {
        const processosContainer = document.querySelector('[data-metric="processos-ativos"]');
        const conformidadeContainer = document.querySelector('[data-metric="conformidade"]');

        if (processosContainer) {
            processosContainer.textContent = dados.processos.total || 0;
        }

        if (conformidadeContainer) {
            conformidadeContainer.textContent = dados.indicadores.conformidadeMedia + '%' || '0%';
        }
    }

    /**
     * Atualizar métricas do setor
     */
    static updateSetorMetrics(dados) {
        const processosContainer = document.querySelector('[data-metric="processos-setor"]');
        const conformidadeContainer = document.querySelector('[data-metric="conformidade-setor"]');
        const atividadesContainer = document.querySelector('[data-metric="atividades-pendentes-setor"]');
        const atrasosContainer = document.querySelector('[data-metric="tarefas-atraso-setor"]');

        if (processosContainer) {
            processosContainer.textContent = dados.processos.total || 0;
        }
        if (conformidadeContainer) {
            conformidadeContainer.textContent = `${dados.indicadores.conformidadeMedia || 0}%`;
        }
        if (atividadesContainer) {
            atividadesContainer.textContent = `${Math.max(0, (dados.processos.total || 0) * 5)} tarefas`;
        }
        if (atrasosContainer) {
            atrasosContainer.textContent = `${Math.max(0, Math.round((dados.processos.total || 0) * 0.1))} atrasos`;
        }
    }

    /**
     * Criar gráfico de conformidade por fase
     */
    static createConformanceChart() {
        const ctx = document.getElementById('chart-conformidade-fases');
        if (!ctx) return;

        // Destruir gráfico anterior se existir
        if (this.chartInstances['conformidade']) {
            this.chartInstances['conformidade'].destroy();
        }

        this.chartInstances['conformidade'] = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Planejar', 'Analisar', 'Desenhar', 'Implementar', 'Monitorar'],
                datasets: [{
                    label: 'Conformidade (%)',
                    data: [100, 95, 88, 75, 60],
                    backgroundColor: [
                        'rgba(0, 26, 77, 1)',
                        'rgba(0, 61, 153, 1)',
                        'rgba(255, 193, 7, 1)',
                        'rgba(40, 167, 69, 1)',
                        'rgba(23, 162, 184, 1)'
                    ],
                    borderColor: '#ffffff',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    /**
     * Criar gráfico de distribuição de fases
     */
    static createDistributionChart() {
        const ctx = document.getElementById('chart-distribuicao-fases');
        if (!ctx) return;

        if (this.chartInstances['distribuicao']) {
            this.chartInstances['distribuicao'].destroy();
        }

        this.chartInstances['distribuicao'] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Planejar', 'Analisar', 'Desenhar', 'Implementar', 'Monitorar'],
                datasets: [{
                    label: 'Número de Processos',
                    data: [152, 89, 45, 22, 8],
                    backgroundColor: [
                        'rgba(0, 26, 77, 1)',
                        'rgba(0, 61, 153, 1)',
                        'rgba(255, 193, 7, 1)',
                        'rgba(40, 167, 69, 1)',
                        'rgba(23, 162, 184, 1)'
                    ]
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: true
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    /**
     * Criar gráfico de progresso do setor
     */
    static createSetorProgressChart() {
        const ctx = document.getElementById('chart-progresso-setor');
        if (!ctx) return;

        if (this.chartInstances['progresso-setor']) {
            this.chartInstances['progresso-setor'].destroy();
        }

        this.chartInstances['progresso-setor'] = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: ['Concluído', 'Em Andamento', 'Pendente'],
                datasets: [{
                    label: 'Progresso (%)',
                    data: [30, 50, 20],
                    backgroundColor: [
                        'rgba(40, 167, 69, 1)',
                        'rgba(255, 193, 7, 1)',
                        'rgba(220, 53, 69, 1)'
                    ]
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    /**
     * Criar gráfico de evolução temporal
     */
    static createTemporalEvolutionChart() {
        const ctx = document.getElementById('chart-evolucao-temporal');
        if (!ctx) return;

        if (this.chartInstances['evolucao']) {
            this.chartInstances['evolucao'].destroy();
        }

        this.chartInstances['evolucao'] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Semana 1', 'Semana 2', 'Semana 3', 'Semana 4', 'Semana 5', 'Semana 6'],
                datasets: [{
                    label: 'Conformidade (%)',
                    data: [75, 78, 82, 85, 87, 89],
                    borderColor: 'rgba(0, 61, 153, 1)',
                    backgroundColor: 'rgba(0, 61, 153, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: true
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100
                    }
                }
            }
        });
    }
}
