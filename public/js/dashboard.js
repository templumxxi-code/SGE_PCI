// ============================================================================
// SMP PCI - Gerenciamento de Dashboard
// ============================================================================

class DashboardManager {
    static chartInstances = {};
    static DEFAULT_PHASE_LABELS = ['Planejar', 'Analisar', 'Desenhar', 'Implementar', 'Monitorar'];

    /**
     * Carregar dashboard NGE (administrador)
     */
    static getCurrentUserSetorId(user = null) {
        const currentUser = user || window.app?.currentUser || {};
        return currentUser.setor_id ?? currentUser.sectorId ?? currentUser.sector_id ?? currentUser.unitId ?? currentUser.organizationUnitId ?? currentUser.setorId ?? null;
    }

    static buildDashboardFromLocalProcesses(processes, user = null) {
        const currentUser = user || window.app?.currentUser || {};
        const perfil = String(currentUser.perfil || '').toUpperCase();
        const setorId = this.getCurrentUserSetorId(currentUser);
        const filtered = Array.isArray(processes) ? processes.filter((processo) => {
            if (perfil === 'NGE' || perfil === 'NGE_ADMIN' || !setorId) {
                return true;
            }
            const processoSetorId = processo?.setor_id ?? processo?.sectorId ?? processo?.sector_id ?? null;
            return processoSetorId != null && Number(processoSetorId) === Number(setorId);
        }) : [];

        const porStatus = {};
        let totalChecklistItens = 0;
        let checklistConcluidos = 0;
        let checklistPendentes = 0;
        let concluidos = 0;
        let emAndamento = 0;
        let pendentes = 0;

        filtered.forEach((processo) => {
            const statusFase = processo?.status_fase || 'Não informado';
            porStatus[statusFase] = (porStatus[statusFase] || 0) + 1;

            const progressValue = Number(processo?.percentual_conclusao || 0);
            if (progressValue >= 100) {
                concluidos += 1;
            } else if (progressValue > 0) {
                emAndamento += 1;
            } else {
                pendentes += 1;
            }

            const phases = Array.isArray(processo?.phases) ? processo.phases : [];
            phases.forEach((phase) => {
                const activities = Array.isArray(phase?.activities) ? phase.activities : [];
                activities.forEach((activity) => {
                    const checklist = Array.isArray(activity?.checklist) ? activity.checklist : [];
                    checklist.forEach((item) => {
                        totalChecklistItens += 1;
                        if (item?.concluido) {
                            checklistConcluidos += 1;
                        } else {
                            checklistPendentes += 1;
                        }
                    });
                });
            });
        });

        return {
            processos: { total: filtered.length, porStatus },
            indicadores: { conformidadeMedia: totalChecklistItens > 0 ? Math.round((checklistConcluidos / totalChecklistItens) * 100) : 0 },
            atividades: { total: totalChecklistItens, concluidas: checklistConcluidos, pendentes: checklistPendentes, atrasadas: 0 },
            progresso: { porStatus: { concluido: concluidos, emAndamento, pendente: pendentes } },
            evolucao: { temporal: [] },
            dataGeracao: new Date().toISOString()
        };
    }

    static async loadNGEDashboard() {
        try {
            const localProcesses = typeof ProcessManager !== 'undefined' ? ProcessManager.getStoredProcesses?.() : [];
            if (Array.isArray(localProcesses) && localProcesses.length) {
                const dadosLocais = this.buildDashboardFromLocalProcesses(localProcesses, window.app?.currentUser);
                this.updateNgeDashboard(dadosLocais);
                this.renderConformanceChart(dadosLocais);
                this.renderDistributionChart(dadosLocais);
                this.populateAttentionTable(dadosLocais);
                return;
            }

            const dados = await api.get('/reports/dashboard');
            this.updateNgeDashboard(dados);
            this.renderConformanceChart(dados);
            this.renderDistributionChart(dados);
            this.populateAttentionTable(dados);
        } catch (error) {
            console.error('Erro ao carregar dashboard NGE:', error);
        }
    }

    /**
     * Carregar dashboard do setor
     */
    static async loadSetorDashboard() {
        try {
            const currentUser = window.app?.currentUser || {};
            const setorId = this.getCurrentUserSetorId(currentUser);
            const localProcesses = typeof ProcessManager !== 'undefined' ? ProcessManager.getStoredProcesses?.() : [];

            if (Array.isArray(localProcesses) && localProcesses.length) {
                const dadosLocais = this.buildDashboardFromLocalProcesses(localProcesses, currentUser);
                this.updateSetorDashboard(dadosLocais);
                this.renderSetorProgressChart(dadosLocais);
                this.renderTemporalEvolutionChart(dadosLocais);
                return;
            }

            if (!setorId) {
                this.updateSetorDashboard({ processos: { total: 0 }, indicadores: { conformidadeMedia: 0 }, atividades: { total: 0, concluidas: 0, pendentes: 0, atrasadas: 0 } });
                return;
            }

            const dados = await api.get(`/reports/dashboard?setor_id=${setorId}`);
            this.updateSetorDashboard(dados);
            this.renderSetorProgressChart(dados);
            this.renderTemporalEvolutionChart(dados);
        } catch (error) {
            console.error('Erro ao carregar dashboard do setor:', error);
        }
    }

    static formatNumber(value) {
        return Number(value || 0).toLocaleString('pt-BR');
    }

    static formatPercent(value) {
        return `${Math.round(value || 0)}%`;
    }

    /**
     * Atualizar métricas do dashboard NGE
     */
    static updateNgeDashboard(dados) {
        const processosContainer = document.querySelector('[data-metric="processos-ativos"]');
        const conformidadeContainer = document.querySelector('[data-metric="conformidade"]');
        const atividadesContainer = document.querySelector('[data-metric="atividades-total-nge"]');
        const alertasContainer = document.querySelector('[data-metric="alertas-criticos-nge"]');

        if (processosContainer) {
            processosContainer.textContent = this.formatNumber(dados.processos.total);
        }
        if (conformidadeContainer) {
            conformidadeContainer.textContent = this.formatPercent(dados.indicadores.conformidadeMedia);
        }
        if (atividadesContainer) {
            atividadesContainer.textContent = this.formatNumber(dados.atividades.total);
        }
        if (alertasContainer) {
            alertasContainer.textContent = this.formatNumber(dados.atividades.atrasadas);
        }
    }

    /**
     * Atualizar métricas do setor
     */
    static updateSetorDashboard(dados) {
        const processosContainer = document.querySelector('[data-metric="processos-setor"]');
        const conformidadeContainer = document.querySelector('[data-metric="conformidade-setor"]');
        const concluidaContainer = document.querySelector('[data-metric="atividades-concluidas-setor"]');
        const pendentesContainer = document.querySelector('[data-metric="atividades-pendentes-setor"]');

        const atividadeData = dados.atividades || { total: 0, concluidas: 0, pendentes: 0, atrasadas: 0 };

        if (processosContainer) {
            processosContainer.textContent = this.formatNumber(dados.processos.total);
        }
        if (conformidadeContainer) {
            conformidadeContainer.textContent = this.formatPercent(dados.indicadores.conformidadeMedia);
        }
        if (concluidaContainer) {
            concluidaContainer.textContent = this.formatNumber(atividadeData.concluidas);
        }
        if (pendentesContainer) {
            pendentesContainer.textContent = this.formatNumber(atividadeData.pendentes);
        }
    }

    static getPhaseLabels() {
        return this.DEFAULT_PHASE_LABELS;
    }

    static getPhaseData(dados, propertyName) {
        const source = (dados.processos && dados.processos[propertyName]) || {};
        return this.getPhaseLabels().map((label) => Number(source[label] || 0));
    }

    static getProcessStatusCounts(dados) {
        const source = (dados.processos && dados.processos.porStatus) || {};
        return this.getPhaseLabels().map((label) => Number(source[label] || 0));
    }

    static renderConformanceChart(dados) {
        const ctx = document.getElementById('chart-conformidade-fases');
        if (!ctx || typeof Chart === 'undefined') return;

        if (this.chartInstances['conformidade']) {
            this.chartInstances['conformidade'].destroy();
        }

        this.chartInstances['conformidade'] = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: this.getPhaseLabels(),
                datasets: [{
                    label: 'Conformidade (%)',
                    data: this.getPhaseData(dados, 'porFaseConformidade'),
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
                    tooltip: {
                        callbacks: {
                            label: (context) => `${context.label}: ${context.parsed}%`
                        }
                    },
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    static renderDistributionChart(dados) {
        const ctx = document.getElementById('chart-distribuicao-fases');
        if (!ctx || typeof Chart === 'undefined') return;

        if (this.chartInstances['distribuicao']) {
            this.chartInstances['distribuicao'].destroy();
        }

        this.chartInstances['distribuicao'] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: this.getPhaseLabels(),
                datasets: [{
                    label: 'Número de Processos',
                    data: this.getProcessStatusCounts(dados),
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
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => `${context.dataset.label}: ${context.parsed.y}`
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            precision: 0
                        }
                    }
                }
            }
        });
    }

    static renderSetorProgressChart(dados) {
        const ctx = document.getElementById('chart-progresso-setor');
        if (!ctx || typeof Chart === 'undefined') return;

        if (this.chartInstances['progresso-setor']) {
            this.chartInstances['progresso-setor'].destroy();
        }

        const progress = (dados.progresso && dados.progresso.porStatus) || {};

        this.chartInstances['progresso-setor'] = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: ['Concluído', 'Em Andamento', 'Pendente'],
                datasets: [{
                    label: 'Progresso',
                    data: [
                        Number(progress.concluido || 0),
                        Number(progress.emAndamento || 0),
                        Number(progress.pendente || 0)
                    ],
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
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => `${context.label}: ${context.parsed}`
                        }
                    }
                }
            }
        });
    }

    static renderTemporalEvolutionChart(dados) {
        const ctx = document.getElementById('chart-evolucao-temporal');
        if (!ctx || typeof Chart === 'undefined') return;

        if (this.chartInstances['evolucao']) {
            this.chartInstances['evolucao'].destroy();
        }

        const series = (dados.evolucao && Array.isArray(dados.evolucao.temporal)) ? dados.evolucao.temporal : [];
        const labels = series.map((item) => item.periodo || '');
        const values = series.map((item) => Number(item.averageConformity || 0));

        this.chartInstances['evolucao'] = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: 'Conformidade (%)',
                    data: values,
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
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => `${context.dataset.label}: ${context.parsed.y}%`
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                            precision: 0
                        }
                    }
                }
            }
        });
    }

    static populateAttentionTable(dados) {
        const tbody = document.getElementById('table-processos-atencao');
        if (!tbody) return;

        const processes = (dados.processos && Array.isArray(dados.processos.atencao)) ? dados.processos.atencao : [];
        if (!processes.length) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center text-muted">Nenhum processo com atenção no momento.</td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = processes.map((processo) => {
            return `
                <tr>
                    <td>${processo.nome || 'Não informado'}</td>
                    <td>${processo.setor_nome || 'Não informado'}</td>
                    <td>${processo.status_fase || 'Não informado'}</td>
                    <td>${this.formatPercent(processo.percentual_conclusao)}</td>
                    <td>${processo.percentual_conclusao < 50 ? 'Atenção' : 'Em acompanhamento'}</td>
                    <td><button class="btn btn-sm btn-secondary" type="button">Ver</button></td>
                </tr>
            `;
        }).join('');
    }
}

// ============================================================================
// Auditoria - carregar e mostrar logs no modal (somente NGE)
// ============================================================================
DashboardManager.loadAuditLogs = async function () {
        try {
            const resp = await api.get('/reports/logs');
            const logs = resp && resp.logs ? resp.logs : (Array.isArray(resp) ? resp : []);
            const tbody = document.getElementById('audit-logs-body');
            if (!tbody) return;

            const users = (window.AccessControl?.getStoredUsers?.() || []);

            if (!logs || !logs.length) {
                tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">Nenhum registro de auditoria encontrado.</td></tr>';
                return;
            }

            const rows = logs.map((log) => {
                const user = users.find(u => Number(u.id) === Number(log.usuario_id));
                const userLabel = user ? (user.nome || user.email || `Usuário #${log.usuario_id}`) : `Usuário #${log.usuario_id}`;
                const date = log.criado_em || log.data_acao || log.data || '';
                const dateStr = date ? new Date(date).toLocaleString('pt-BR') : '';
                const acao = log.acao || log.action || '';
                const tabela = log.tabela_afetada || log.table || '';
                const idRegistro = log.id_registro || log.record_id || '';
                const ip = log.endereco_ip || log.ip || '';
                const ua = String(log.user_agent || log.userAgent || '').replace(/</g, '&lt;').slice(0, 200);

                return `
                    <tr>
                        <td>${dateStr}</td>
                        <td>${userLabel}</td>
                        <td>${acao}</td>
                        <td>${tabela}</td>
                        <td>${idRegistro}</td>
                        <td>${ip}</td>
                        <td style="max-width: 320px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${ua}</td>
                    </tr>
                `;
            }).join('');

            tbody.innerHTML = rows;
        } catch (err) {
            console.error('Erro ao carregar auditoria:', err);
        }
};

// Ligar botões do modal após a árvore DOM estar pronta
document.addEventListener('DOMContentLoaded', () => {
        const btn = document.getElementById('btn-open-audit');
        if (btn) {
            btn.addEventListener('click', async () => {
                const modal = document.getElementById('audit-modal');
                if (modal) modal.style.display = 'flex';
                await DashboardManager.loadAuditLogs();
            });
        }

        document.querySelectorAll('#audit-modal .modal-close').forEach((el) => {
            el.addEventListener('click', () => {
                const modal = document.getElementById('audit-modal');
                if (modal) modal.style.display = 'none';
            });
        });

        // Fechar modal ao clicar fora do conteúdo (compatível com app.js behavior)
        document.getElementById('audit-modal')?.addEventListener('click', (e) => {
            if (e.target && e.target.classList && e.target.classList.contains('modal')) {
                e.target.style.display = 'none';
            }
        });
});
