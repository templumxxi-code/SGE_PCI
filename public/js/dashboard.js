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

    static getNgeDashboardProcesses() {
        const processes = typeof ProcessManager !== 'undefined' ? ProcessManager.getStoredProcesses?.() : [];
        return Array.isArray(processes) ? processes : [];
    }

    static getDashboardContext(currentUser = null) {
        const user = window.AccessControl?.normalizeUser?.(currentUser || window.app?.currentUser || {}) || currentUser || {};
        const profile = String(user.accessProfileKey || user.perfil || '').toUpperCase();
        const unitName = this.getOrganizationUnitName(user);
        if (profile === 'NGE_ADMIN' || profile === 'NGE') return { scopeType: 'NGE', scopeId: null, scopeName: 'Polícia Científica do Rio Grande do Norte', dashboardTitle: 'Dashboard Institucional', dashboardSubtitle: 'Acompanhamento dos processos da Polícia Científica do Rio Grande do Norte' };
        const contexts = {
            DIRETOR_INSTITUTO: ['Dashboard do Instituto', `Acompanhamento dos processos do Instituto ${unitName}`, 'INSTITUTO'],
            SUBCOORDENADOR_INSTITUTO: ['Dashboard do Instituto', `Acompanhamento dos processos do Instituto ${unitName}`, 'INSTITUTO'],
            SUBCOORDENADOR_REGIONAL: ['Dashboard da Regional', `Acompanhamento dos processos da Regional ${unitName}`, 'REGIONAL'],
            ASSESSOR: ['Dashboard da Assessoria', `Acompanhamento dos processos da ${unitName}`, 'ASSESSORIA'],
            SUBCOORDENADOR_FINANCEIRA: ['Dashboard da Assessoria', `Acompanhamento dos processos da ${unitName}`, 'ASSESSORIA'],
            SUBCOORDENADOR_ADMINISTRATIVA: ['Dashboard da Assessoria', `Acompanhamento dos processos da ${unitName}`, 'ASSESSORIA'],
            CHEFE_NUCLEO: ['Dashboard do Núcleo', `Acompanhamento dos processos do Núcleo ${unitName}`, 'NUCLEO'],
            CHEFE_SETOR: ['Dashboard do Setor', `Acompanhamento dos processos do Setor ${unitName}`, 'SETOR'],
            OPERACIONAL: ['Dashboard do Setor', `Acompanhamento dos processos do Setor ${unitName}`, 'SETOR']
        };
        const [dashboardTitle, dashboardSubtitle, scopeType] = contexts[profile] || contexts.OPERACIONAL;
        return { scopeType, scopeId: user.organizationUnitId || user.unitId || user.sectorId || null, scopeName: unitName, dashboardTitle, dashboardSubtitle };
    }

    static getOrganizationUnitName(user) {
        const explicit = user?.unitName || user?.organizationUnitName || user?.orgUnitName || user?.instituto_nome || user?.regional_nome || user?.assessoria_nome || user?.nucleo_nome || user?.setor_nome;
        if (explicit) return explicit;
        const organization = window.AccessControl?.getStoredOrganizationData?.() || {};
        const profile = String(user?.accessProfileKey || user?.perfil || '').toUpperCase();
        const collection = profile.includes('INSTITUTO') || profile === 'DIRETOR_INSTITUTO' ? organization.institutes : profile.includes('REGIONAL') ? organization.regionais : profile.includes('ASSESSOR') || profile.includes('FINANCEIRA') || profile.includes('ADMINISTRATIVA') ? organization.assessorias : profile === 'CHEFE_NUCLEO' ? organization.nuclei : organization.sectors;
        const id = user?.organizationUnitId || user?.unitId || user?.instituteId || user?.regionalId || user?.advisoryId || user?.nucleusId || user?.sectorId;
        return collection?.find(item => String(item.id) === String(id))?.name || 'escopo atual';
    }

    static getDashboardScope(currentUser = null) {
        if (window.AccessControl?.getDashboardScope) return window.AccessControl.getDashboardScope(currentUser || window.app?.currentUser || {});
        const user = currentUser || window.app?.currentUser || {};
        return { unrestricted: String(user.perfil || '').toUpperCase() === 'NGE_ADMIN', organizationType: user.organizationType, organizationUnitId: user.organizationUnitId, instituteId: user.instituteId, regionalId: user.regionalId, advisoryId: user.advisoryId, nucleusId: user.nucleusId, sectorId: user.sectorId };
    }

    static getDashboardVisibleProcesses(currentUser = null, processes = null) {
        const source = Array.isArray(processes) ? processes : this.getNgeDashboardProcesses();
        if (window.AccessControl?.getVisibleProcesses) return window.AccessControl.getVisibleProcesses(currentUser || window.app?.currentUser || {}, source);
        return source;
    }

    static getDashboardFilteredProcesses(currentUser = null, filters = {}, processes = null) {
        const source = Array.isArray(processes) ? processes : this.getDashboardVisibleProcesses(currentUser);
        let filteredSource = source;
        if (window.AccessControl?.getDashboardFilteredProcesses) {
            const accessFilters = { ...filters, status: filters.status || undefined };
            filteredSource = window.AccessControl.getDashboardFilteredProcesses(source, currentUser || window.app?.currentUser || {}, accessFilters);
        }
        return this.getNgeDashboardFilteredProcesses(filteredSource, filters);
    }

    static getNgeDashboardFilteredProcesses(processes, filters = {}) {
        const value = (processo, keys) => keys.map(key => processo?.[key]).find(item => item !== undefined && item !== null && item !== '');
        return (Array.isArray(processes) ? processes : []).filter((processo) => {
            const unitType = value(processo, ['tipo_unidade', 'unitType', 'unidade_tipo']);
            const unitId = value(processo, ['unidade_id', 'unitId', 'organizationUnitId', 'organization_unit_id', 'instituteId', 'instituto_id', 'regionalId', 'regional_id', 'advisoryId', 'advisory_id', 'setor_id']);
            const nucleusId = value(processo, ['nucleo_id', 'nucleusId']);
            const sectorId = value(processo, ['setor_id', 'sectorId', 'sector_id']);
            const responsibleId = value(processo, ['responsavel_id', 'responsibleId']);
            const phase = this.getProcessCurrentPhase(processo);
            const status = value(processo, ['status', 'status_processo', 'status_fase']);
            const matches = (filter, current) => !filter || String(filter).toLowerCase() === String(current ?? '').toLowerCase();
            return matches(filters.unitType, unitType) && matches(filters.unitId, unitId) &&
                matches(filters.nucleusId, nucleusId) && matches(filters.sectorId, sectorId) &&
                matches(filters.responsibleId, responsibleId) && matches(filters.processId, processo.id) &&
                matches(filters.phase, phase) && matches(filters.status, status);
        });
    }

    static getProcessCurrentPhase(processo) {
        const phase = processo?.status_fase || processo?.currentPhase || processo?.current_phase;
        if (this.getPhaseLabels().includes(phase)) return phase;
        const phases = Array.isArray(processo?.phases) ? processo.phases : [];
        const active = phases.find(item => item?.isCurrent || item?.active);
        return active?.name || phase || 'Planejar';
    }

    static getChecklistStats(processo, phaseName = null) {
        let total = 0;
        let completed = 0;
        const phases = Array.isArray(processo?.phases) ? processo.phases : [];
        phases.filter(phase => !phaseName || phase.name === phaseName).forEach(phase => {
            (phase.activities || []).forEach(activity => (Array.isArray(activity.checklist) ? activity.checklist : []).forEach(item => {
                total += 1;
                if (item?.concluido === true) completed += 1;
            }));
        });
        return { total, completed, pending: total - completed };
    }

    static getActivityStats(processes) {
        return (processes || []).reduce((result, processo) => {
            (processo.phases || []).forEach(phase => (phase.activities || []).forEach(activity => {
                const checklist = Array.isArray(activity.checklist) ? activity.checklist : [];
                if (!checklist.length) return;
                result.total += 1;
                if (checklist.every(item => item?.concluido === true)) result.completed += 1;
            }));
            return result;
        }, { total: 0, completed: 0, pending: 0 });
    }

    static getProcessIndicators(processes) {
        const processIds = new Set((processes || []).map(processo => String(processo.id)));
        const local = (() => { try { return JSON.parse(localStorage.getItem('sge_pci_indicators') || '[]'); } catch (_) { return []; } })();
        const embedded = [];
        (processes || []).forEach(processo => (processo.phases || []).forEach(phase => (phase.activities || []).forEach(activity => {
            (activity.content?.indicators || []).forEach(indicator => embedded.push({ ...indicator, processId: processo.id, processName: processo.nome, phaseName: phase.name, sourceActivityCode: activity.code }));
        })));
        const map = new Map();
        [...local.filter(indicator => processIds.has(String(indicator.processId ?? indicator.processoId ?? indicator.processo_id))), ...embedded].forEach(indicator => map.set(String(indicator.id || `${indicator.name}-${indicator.processId}`), indicator));
        return [...map.values()].filter(indicator => indicator.active !== false);
    }

    static getTemporalEvolution(processes) {
        const entries = [];
        (processes || []).forEach(processo => {
            const histories = [processo.progressHistory, processo.progress_history, processo.snapshots].filter(Array.isArray).flat();
            (processo.phases || []).forEach(phase => (phase.activities || []).forEach(activity => {
                histories.push(...(Array.isArray(activity.history) ? activity.history : []));
            }));
            histories.forEach(item => {
                const value = Number(item.conformity ?? item.conformidade ?? item.percentual_conclusao ?? item.progress ?? item.averageConformity);
                const date = item.date || item.updatedAt || item.createdAt || item.data;
                if (date && Number.isFinite(value) && value >= 0 && value <= 100) entries.push({ date: new Date(date), value });
            });
        });
        const grouped = new Map();
        entries.filter(item => !Number.isNaN(item.date.valueOf())).forEach(item => {
            const key = `${item.date.getFullYear()}-${String(item.date.getMonth() + 1).padStart(2, '0')}`;
            const current = grouped.get(key) || { total: 0, count: 0 };
            current.total += item.value;
            current.count += 1;
            grouped.set(key, current);
        });
        return [...grouped.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([periodo, item]) => ({ periodo, averageConformity: Math.round(item.total / item.count) }));
    }

    static calculateTargetStatus(indicator) {
        const target = Number(indicator.targetValue ?? indicator.valor_meta ?? indicator.meta);
        const current = Number(indicator.currentValue ?? indicator.valor_atual ?? indicator.current ?? indicator.resultado_atual);
        if (!Number.isFinite(target) || !Number.isFinite(current) || indicator.currentValue === '' && indicator.valor_atual === undefined) return 'Sem medição';
        return current >= target ? 'Meta atingida' : 'Meta não atingida';
    }

    static getCountermeasures(processes) {
        const result = [];
        (processes || []).forEach(processo => (processo.phases || []).forEach(phase => (phase.activities || []).forEach(activity => {
            (activity.content?.contraMedidas || []).filter(item => item.active !== false).forEach(item => result.push({ ...item, processId: processo.id, processName: processo.nome, phaseName: phase.name, activityCode: activity.code }));
        })));
        return result;
    }

    static calculateNgeDashboardMetrics(processes) {
        const phases = this.getPhaseLabels();
        const phaseMetrics = phases.map(name => {
            const stats = (processes || []).reduce((total, processo) => {
                const current = this.getChecklistStats(processo, name);
                return { total: total.total + current.total, completed: total.completed + current.completed, pending: total.pending + current.pending, processes: total.processes + (current.total ? 1 : 0) };
            }, { total: 0, completed: 0, pending: 0, processes: 0 });
            return { name, ...stats, conformity: stats.total ? Math.round(stats.completed / stats.total * 100) : 0 };
        });
        const checklist = (processes || []).reduce((total, processo) => { const current = this.getChecklistStats(processo); return { total: total.total + current.total, completed: total.completed + current.completed, pending: total.pending + current.pending }; }, { total: 0, completed: 0, pending: 0 });
        const activities = this.getActivityStats(processes);
        activities.pending = Math.max(0, activities.total - activities.completed);
        const indicators = this.getProcessIndicators(processes).map(indicator => ({ ...indicator, targetStatus: this.calculateTargetStatus(indicator) }));
        const countermeasures = this.getCountermeasures(processes);
        const today = new Date();
        const countermeasuresPending = countermeasures.filter(item => !['Concluída', 'Cancelada'].includes(item.status));
        const countermeasuresOverdue = countermeasuresPending.filter(item => item.deadline && new Date(item.deadline) < today);
        const attention = (processes || []).map(processo => {
            const reasons = [];
            const deadline = processo.prazo && new Date(processo.prazo);
            if (deadline && !Number.isNaN(deadline.valueOf()) && deadline < today) reasons.push({ text: 'Prazo vencido', severity: 'Crítico' });
            if (['DEVOLVIDO_PARA_CORRECAO', 'Devolvido para correção'].includes(processo.currentApprovalStatus)) reasons.push({ text: 'Processo devolvido para correção', severity: 'Atenção' });
            const relatedIndicators = indicators.filter(item => String(item.processId) === String(processo.id));
            if (relatedIndicators.some(item => item.targetStatus === 'Meta não atingida')) reasons.push({ text: 'Indicador fora da meta', severity: 'Crítico' });
            if (countermeasures.some(item => String(item.processId) === String(processo.id) && !['Concluída', 'Cancelada'].includes(item.status))) reasons.push({ text: 'Contramedida pendente', severity: 'Atenção' });
            if (processo.currentApprovalStatus && !['RASCUNHO', 'HOMOLOGADO'].includes(String(processo.currentApprovalStatus).toUpperCase())) reasons.push({ text: 'Aprovação pendente', severity: 'Atenção' });
            return reasons.length ? { processo, reasons, severity: reasons.some(item => item.severity === 'Crítico') ? 'Crítico' : 'Atenção' } : null;
        }).filter(Boolean);
        const active = (processes || []).filter(item => !['INATIVO', 'ARQUIVADO', 'Inativo', 'Arquivado'].includes(item.status) && String(item.currentApprovalStatus || '').toUpperCase() !== 'ARQUIVADO').length;
        const distribution = phases.map(name => ({ name, count: (processes || []).filter(item => this.getProcessCurrentPhase(item) === name).length }));
        return { processes, checklist, activities, phaseMetrics, distribution, indicators, countermeasures, attention, active, temporal: this.getTemporalEvolution(processes) };
    }

    static buildDashboardFromLocalProcesses(processes, user = null, filters = {}) {
        const currentUser = user || window.app?.currentUser || {};
        const allProcesses = Array.isArray(processes) ? processes : [];
        const filtered = this.getDashboardFilteredProcesses(currentUser, filters, allProcesses);
        const metrics = this.calculateNgeDashboardMetrics(filtered);
        const porStatus = {};
        metrics.distribution.forEach(item => { porStatus[item.name] = item.count; });
        return { ...metrics, processos: { total: filtered.length, porStatus, porFaseConformidade: Object.fromEntries(metrics.phaseMetrics.map(item => [item.name, item.conformity])), atencao: metrics.attention.map(item => item.processo) }, indicadores: { conformidadeMedia: metrics.checklist.total ? Math.round(metrics.checklist.completed / metrics.checklist.total * 100) : 0 }, atividades: { total: metrics.activities.total, concluidas: metrics.activities.completed, pendentes: metrics.activities.pending, atrasadas: metrics.attention.filter(item => item.reasons.some(reason => reason.text === 'Prazo vencido')).length }, progresso: { porStatus: {} }, evolucao: { temporal: [] }, dataGeracao: new Date().toISOString(), currentUser };
    }

    static async loadNGEDashboard() {
        try {
            const context = this.getDashboardContext(window.app?.currentUser);
            const title = document.getElementById('dashboard-nge-title');
            const subtitle = document.getElementById('dashboard-nge-subtitle');
            if (title) title.textContent = context.dashboardTitle;
            if (subtitle) subtitle.textContent = context.dashboardSubtitle;
            const localProcesses = this.getNgeDashboardProcesses();
            if (Array.isArray(localProcesses)) {
                const dadosLocais = this.buildDashboardFromLocalProcesses(localProcesses, window.app?.currentUser, this.dashboardFilters || {});
                this.updateNgeDashboard(dadosLocais);
                this.renderConformanceChart(dadosLocais);
                this.renderDistributionChart(dadosLocais);
                this.renderTemporalEvolutionChart(dadosLocais, 'chart-evolucao-temporal-nge', 'empty-evolucao-temporal');
                this.populateAttentionTable(dadosLocais);
                return;
            }

            const dados = await api.get('/reports/dashboard');
            this.updateNgeDashboard(dados);
            this.renderConformanceChart(dados);
            this.renderDistributionChart(dados);
            this.renderTemporalEvolutionChart(dados, 'chart-evolucao-temporal-nge', 'empty-evolucao-temporal');
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
            const context = this.getDashboardContext(currentUser);
            const title = document.getElementById('dashboard-setor-title');
            const subtitle = document.getElementById('dashboard-setor-subtitle');
            if (title) title.textContent = context.dashboardTitle;
            if (subtitle) subtitle.textContent = context.dashboardSubtitle;
            const localProcesses = this.getNgeDashboardProcesses();
            const dadosLocais = this.buildDashboardFromLocalProcesses(localProcesses, currentUser, this.dashboardScopedFilters || {});
            this.renderScopedDashboardFilters(currentUser, dadosLocais.processes || []);
            this.updateSetorDashboard(dadosLocais);
            this.renderSetorProgressChart(dadosLocais);
            this.renderTemporalEvolutionChart(dadosLocais, 'chart-evolucao-temporal', 'empty-evolucao-temporal-setor');
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
            processosContainer.textContent = this.formatNumber(dados.active ?? dados.processos.total);
        }
        if (conformidadeContainer) {
            conformidadeContainer.textContent = this.formatPercent(dados.indicadores.conformidadeMedia);
        }
        if (atividadesContainer) {
            atividadesContainer.textContent = this.formatNumber(dados.atividades.total);
        }
        if (alertasContainer) {
            alertasContainer.textContent = this.formatNumber((dados.attention || []).filter(item => item.severity === 'Crítico').length);
        }
        const detail = (selector, text) => { const element = document.querySelector(selector); if (element) element.textContent = text; };
        const homologados = (dados.processes || []).filter(item => String(item.currentApprovalStatus || '').toUpperCase() === 'HOMOLOGADO').length;
        const execution = Math.max(0, (dados.active || 0) - homologados);
        detail('[data-metric-detail="processos-ativos"]', `Processos em execução: ${execution} • Homologados: ${homologados}`);
        detail('[data-metric-detail="conformidade"]', `${this.formatNumber(dados.checklist.completed)} de ${this.formatNumber(dados.checklist.total)} checklists concluídos`);
        detail('[data-metric-detail="atividades-total-nge"]', `Concluídas: ${this.formatNumber(dados.atividades.concluidas)} • Pendentes: ${this.formatNumber(dados.atividades.pendentes)}`);
        this.renderPhaseSummaries(dados);
        this.renderStrategicIndicators(dados);
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
        const detail = (selector, text) => { const element = document.querySelector(selector); if (element) element.textContent = text; };
        detail('[data-metric-detail="processos-setor"]', 'Processos no escopo atual');
        detail('[data-metric-detail="conformidade-setor"]', `${this.formatNumber(dados.checklist.completed)} de ${this.formatNumber(dados.checklist.total)} checklists concluídos`);
        detail('[data-metric-detail="atividades-concluidas-setor"]', 'Atividades com checklist concluído');
        detail('[data-metric-detail="atividades-pendentes-setor"]', 'Aguardando conclusão');
        this.renderPhaseSummaries({ ...dados, indicadores: dados.indicadores || { conformidadeMedia: 0 } });
        this.renderScopedIndicators(dados);
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
        if (!ctx) return;

        const empty = document.getElementById('empty-conformidade-fases');
        if (empty) empty.hidden = (dados.phaseMetrics || []).every(item => item.total === 0);
        if (typeof Chart === 'undefined') {
            ctx.hidden = true;
            const container = ctx.parentElement;
            const existing = container?.querySelector('.dashboard-bars');
            if (existing) existing.remove();
            if (container && !empty?.hidden) {
                const bars = document.createElement('div');
                bars.className = 'dashboard-bars';
                bars.innerHTML = (dados.phaseMetrics || []).map(item => `<div class="dashboard-bar-row" title="${this.escapeHtml(`${item.name}: ${item.conformity}%. Concluídos: ${item.completed}. Pendentes: ${item.pending}. Processos considerados: ${item.processes}`)}"><span>${this.escapeHtml(item.name)}</span><div class="dashboard-bar-track"><i style="width:${item.conformity}%"></i></div><strong>${item.conformity}%</strong></div>`).join('');
                container.insertBefore(bars, empty || null);
            }
            return;
        }
        ctx.hidden = false;

        if (this.chartInstances['conformidade']) {
            this.chartInstances['conformidade'].destroy();
        }

        this.chartInstances['conformidade'] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: this.getPhaseLabels(),
                datasets: [{
                    label: 'Conformidade (%)',
                    data: (dados.phaseMetrics || []).map(item => item.conformity),
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
                indexAxis: 'y',
                maintainAspectRatio: false,
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: (context) => `${context.label}: ${context.parsed}%`
                        }
                    },
                    legend: { display: false }
                }
                ,scales: { x: { beginAtZero: true, max: 100, ticks: { callback: value => `${value}%` } } }
            }
        });
    }

    static renderDistributionChart(dados) {
        const ctx = document.getElementById('chart-distribuicao-fases');
        if (!ctx) return;

        const empty = document.getElementById('empty-distribuicao-fases');
        if (empty) empty.hidden = (dados.distribution || []).every(item => item.count === 0);
        if (typeof Chart === 'undefined') {
            ctx.hidden = true;
            const container = ctx.parentElement;
            const existing = container?.querySelector('.dashboard-bars');
            if (existing) existing.remove();
            if (container && !empty?.hidden) {
                const total = (dados.distribution || []).reduce((sum, item) => sum + item.count, 0);
                const bars = document.createElement('div');
                bars.className = 'dashboard-bars';
                bars.innerHTML = (dados.distribution || []).map(item => `<div class="dashboard-bar-row" title="${this.escapeHtml(`${item.name}: ${item.count} processos`)}"><span>${this.escapeHtml(item.name)}</span><div class="dashboard-bar-track"><i style="width:${total ? item.count / total * 100 : 0}%"></i></div><strong>${item.count} (${total ? Math.round(item.count / total * 100) : 0}%)</strong></div>`).join('');
                container.insertBefore(bars, empty || null);
            }
            return;
        }
        ctx.hidden = false;

        if (this.chartInstances['distribuicao']) {
            this.chartInstances['distribuicao'].destroy();
        }

        this.chartInstances['distribuicao'] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: this.getPhaseLabels(),
                datasets: [{
                    label: 'Número de Processos',
                    data: (dados.distribution || []).map(item => item.count),
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
        if (!ctx) return;

        const empty = document.getElementById('empty-progresso-setor');
        if (empty) empty.hidden = !(dados.processes || []).length;
        if (typeof Chart === 'undefined') {
            ctx.hidden = true;
            const container = ctx.parentElement;
            container?.querySelector('.dashboard-bars')?.remove();
            if (container && (dados.processes || []).length) {
                const bars = document.createElement('div');
                bars.className = 'dashboard-bars';
                bars.innerHTML = (dados.phaseMetrics || []).map(item => `<div class="dashboard-bar-row" title="${this.escapeHtml(`${item.name}: ${item.conformity}%. ${item.completed} de ${item.total} checklists concluídos`)}"><span>${this.escapeHtml(item.name)}</span><div class="dashboard-bar-track"><i style="width:${item.conformity}%"></i></div><strong>${item.conformity}%</strong></div>`).join('');
                container.insertBefore(bars, empty || null);
            }
            return;
        }
        ctx.hidden = false;

        if (this.chartInstances['progresso-setor']) {
            this.chartInstances['progresso-setor'].destroy();
        }

        const progress = dados.phaseMetrics || [];

        this.chartInstances['progresso-setor'] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: progress.map(item => item.name),
                datasets: [{
                    label: 'Conformidade (%)',
                    data: progress.map(item => item.conformity),
                    backgroundColor: 'rgba(0, 61, 153, 1)'
                }]
            },
            options: {
                responsive: true,
                indexAxis: 'y',
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: { label: (context) => `${context.label}: ${context.parsed.x}%` }
                    }
                }
            }
        });
    }

    static renderTemporalEvolutionChart(dados, canvasId = 'chart-evolucao-temporal', emptyId = 'empty-evolucao-temporal-setor') {
        const ctx = document.getElementById(canvasId);
        const empty = document.getElementById(emptyId);
        if (!ctx) return;
        const series = (dados.evolucao && Array.isArray(dados.evolucao.temporal)) ? dados.evolucao.temporal : [];
        if (!series.length) {
            ctx.hidden = true;
            if (empty) empty.hidden = false;
            return;
        }
        if (empty) empty.hidden = true;
        if (typeof Chart === 'undefined') {
            ctx.hidden = true;
            const container = ctx.parentElement;
            container?.querySelector('.dashboard-bars')?.remove();
            const bars = document.createElement('div');
            bars.className = 'dashboard-bars';
            bars.innerHTML = series.map(item => `<div class="dashboard-bar-row"><span>${this.escapeHtml(item.periodo)}</span><div class="dashboard-bar-track"><i style="width:${item.averageConformity}%"></i></div><strong>${item.averageConformity}%</strong></div>`).join('');
            container?.insertBefore(bars, empty || null);
            return;
        }
        ctx.hidden = false;

        if (this.chartInstances['evolucao']) {
            this.chartInstances['evolucao'].destroy();
        }

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

        const attention = Array.isArray(dados.attention) ? dados.attention : [];
        if (!attention.length) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center text-muted">Nenhum processo com atenção no momento.</td>
                </tr>
            `;
            return;
        }

        const escape = this.escapeHtml;
        tbody.innerHTML = attention.map(({ processo, reasons, severity }) => {
            const stats = this.getChecklistStats(processo);
            const responsible = processo.responsavel_nome || processo.responsavel || 'Não informado';
            return `
                <tr>
                    <td>${escape(processo.nome || 'Não informado')}</td>
                    <td>${escape(processo.unidade_nome || processo.setor_nome || 'Não informado')}</td>
                    <td>${escape(this.getProcessCurrentPhase(processo))}</td>
                    <td>${escape(reasons.map(item => item.text).join(', '))}</td>
                    <td><span class="attention-severity severity-${severity === 'Crítico' ? 'critical' : 'warning'}">${severity}</span></td>
                    <td>${this.formatPercent(stats.total ? stats.completed / stats.total * 100 : 0)}</td>
                    <td>${escape(responsible)} / ${escape(processo.status_fase || 'Não informado')}</td>
                    <td><button class="btn btn-sm btn-secondary" type="button" data-action="open-attention-process" data-process-id="${processo.id}">Abrir</button></td>
                </tr>
            `;
        }).join('');
    }

    static escapeHtml(value) { return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char])); }

    static renderPhaseSummaries(dados) {
        const phaseMetrics = dados.phaseMetrics || [];
        const best = phaseMetrics.slice().sort((a, b) => b.conformity - a.conformity)[0];
        const pending = phaseMetrics.slice().sort((a, b) => b.pending - a.pending)[0];
        const summary = document.getElementById('phase-compliance-summary');
        if (summary) summary.innerHTML = `<span>Média geral: <strong>${this.formatPercent(dados.indicadores.conformidadeMedia)}</strong></span><span>Maior conformidade: <strong>${best ? `${best.name} (${best.conformity}%)` : '-'}</strong></span><span>Mais pendências: <strong>${pending ? `${pending.name} (${pending.pending})` : '-'}</strong></span><span>Total concluído: <strong>${dados.checklist.completed}</strong></span>`;
        const distribution = document.getElementById('phase-distribution-summary');
        if (distribution) distribution.innerHTML = `<span>Em execução: <strong>${Math.max(0, (dados.active || 0) - (dados.processes || []).filter(item => String(item.currentApprovalStatus || '').toUpperCase() === 'HOMOLOGADO').length)}</strong></span><span>Em Monitorar: <strong>${(dados.distribution || []).find(item => item.name === 'Monitorar')?.count || 0}</strong></span><span>Ciclos BPM concluídos: <strong>${(dados.processes || []).filter(item => String(item.status_fase || '').toLowerCase().includes('conclu')).length}</strong></span>`;
    }

    static renderStrategicIndicators(dados) {
        const indicators = dados.indicators || [];
        const counters = this.getCountermeasures(dados.processes || []);
        const summary = document.getElementById('strategic-indicator-summary');
        if (summary) summary.innerHTML = `<span>Total: <strong>${indicators.length}</strong></span><span>Meta atingida: <strong>${indicators.filter(item => item.targetStatus === 'Meta atingida').length}</strong></span><span>Meta não atingida: <strong>${indicators.filter(item => item.targetStatus === 'Meta não atingida').length}</strong></span><span>Sem medição: <strong>${indicators.filter(item => item.targetStatus === 'Sem medição').length}</strong></span><span>Contramedidas pendentes: <strong>${counters.filter(item => !['Concluída', 'Cancelada'].includes(item.status)).length}</strong></span><span>Contramedidas vencidas: <strong>${counters.filter(item => item.deadline && new Date(item.deadline) < new Date() && !['Concluída', 'Cancelada'].includes(item.status)).length}</strong></span>`;
        const tbody = document.getElementById('table-indicadores-estrategicos');
        const empty = document.getElementById('empty-indicadores-estrategicos');
        if (empty) empty.hidden = indicators.length > 0;
        if (!tbody) return;
        tbody.innerHTML = indicators.map(indicator => `<tr><td>${this.escapeHtml(indicator.name || indicator.nome)}</td><td>${this.escapeHtml(indicator.processName || '')}</td><td>${this.escapeHtml(indicator.targetValue ?? indicator.valor_meta ?? '-')}</td><td>${this.escapeHtml(indicator.currentValue ?? indicator.valor_atual ?? '-')}</td><td>${this.escapeHtml(indicator.targetStatus)}</td><td>${this.escapeHtml(indicator.responsible || indicator.responsavel || '-')}</td><td>${this.escapeHtml(indicator.updatedAt || indicator.updated_at || indicator.referenceDate || '-')}</td><td><button type="button" class="btn btn-sm btn-secondary" data-action="open-dashboard-indicator" data-indicator-id="${indicator.id}" data-process-id="${indicator.processId}">Ver indicador</button></td></tr>`).join('');
    }

    static renderScopedDashboardFilters(user, processes) {
        const container = document.getElementById('scoped-dashboard-filters');
        if (!container) return;
        const profile = String(window.AccessControl?.normalizeUser?.(user)?.accessProfileKey || user?.perfil || '').toUpperCase();
        const fields = profile === 'CHEFE_SETOR' || profile === 'OPERACIONAL'
            ? ['processId', 'phase', 'status']
            : profile === 'CHEFE_NUCLEO'
                ? ['sectorId', 'responsibleId', 'processId', 'phase', 'status']
                : ['nucleusId', 'sectorId', 'responsibleId', 'processId', 'phase', 'status'];
        const labels = { nucleusId: 'Núcleo', sectorId: 'Setor', responsibleId: 'Responsável', processId: 'Processo', phase: 'Fase BPM', status: 'Status' };
        const values = (field) => {
            const items = processes.map(item => {
                const value = field === 'nucleusId' ? item.nucleusId ?? item.nucleo_id : field === 'sectorId' ? item.sectorId ?? item.setor_id : field === 'responsibleId' ? item.responsibleId ?? item.responsavel_id : field === 'processId' ? item.id : field === 'phase' ? this.getProcessCurrentPhase(item) : item.currentApprovalStatus || item.status || item.status_fase;
                const label = field === 'processId' ? item.nome || `Processo ${item.id}` : field === 'nucleusId' ? item.nucleo_nome || value : field === 'sectorId' ? item.setor_nome || value : field === 'responsibleId' ? item.responsavel_nome || item.responsavel || value : value;
                return { value, label };
            });
            return [...new Map(items.filter(item => item.value !== undefined && item.value !== null && item.value !== '').map(item => [String(item.value), item.label])).entries()].sort((a, b) => String(a[1]).localeCompare(String(b[1]), 'pt-BR'));
        };
        container.innerHTML = fields.map(field => `<select data-scoped-filter="${field}" aria-label="${labels[field]}"><option value="">Todos: ${labels[field]}</option>${values(field).map(([value, label]) => `<option value="${this.escapeHtml(value)}">${this.escapeHtml(label)}</option>`).join('')}</select>`).join('') + '<button type="button" class="btn btn-secondary" data-action="clear-scoped-filters">Limpar filtros</button>';
        container.querySelectorAll('select').forEach(select => { select.value = this.dashboardScopedFilters?.[select.dataset.scopedFilter] || ''; });
    }

    static renderScopedIndicators(dados) {
        const indicators = dados.indicators || [];
        const element = document.getElementById('scoped-dashboard-filters');
        if (element) element.setAttribute('data-indicator-count', String(indicators.length));
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
        const dashboard = DashboardManager;
        dashboard.dashboardFilters = {};
        const filterContainer = document.getElementById('nge-dashboard-filters');
        const refreshFilterOptions = () => {
            const processes = dashboard.getNgeDashboardProcesses();
            const options = (selector, values, emptyLabel, preserveOrder = false) => {
                const element = filterContainer?.querySelector(selector);
                if (!element) return;
                const current = element.value;
                const entries = [...new Map(values.filter(item => item.value !== undefined && item.value !== '').map(item => [String(item.value), item.label])).entries()];
                if (!preserveOrder) entries.sort((a, b) => a[1].localeCompare(b[1], 'pt-BR'));
                element.innerHTML = `<option value="">${emptyLabel}</option>` + entries.map(([value, label]) => `<option value="${dashboard.escapeHtml(value)}">${dashboard.escapeHtml(label)}</option>`).join('');
                element.value = [...element.options].some(option => option.value === current) ? current : '';
            };
            const selected = dashboard.getNgeDashboardFilteredProcesses(processes, dashboard.dashboardFilters);
            const organization = window.AccessControl?.getStoredOrganizationData?.() || {};
            const institutionalUnits = (organization.regionais || []).map(item => ({ value: item.id, label: item.name }));
            options('[data-nge-filter="unitId"]', institutionalUnits.length ? institutionalUnits : selected.map(item => ({ value: item.unidade_id ?? item.unitId ?? item.regionalId ?? item.regional_id, label: item.unidade_nome || item.regional_nome || 'Unidade não informada' })), 'Todas as unidades', true);
            options('[data-nge-filter="nucleusId"]', selected.map(item => ({ value: item.nucleo_id ?? item.nucleusId, label: item.nucleo_nome || 'Núcleo não informado' })), 'Todos os núcleos');
            options('[data-nge-filter="sectorId"]', selected.map(item => ({ value: item.setor_id ?? item.sectorId, label: item.setor_nome || 'Setor não informado' })), 'Todos os setores');
            options('[data-nge-filter="responsibleId"]', selected.map(item => ({ value: item.responsavel_id ?? item.responsibleId, label: item.responsavel_nome || item.responsavel || 'Responsável não informado' })), 'Todos os responsáveis');
            options('[data-nge-filter="processId"]', selected.map(item => ({ value: item.id, label: item.nome || `Processo ${item.id}` })), 'Todos os processos');
            options('[data-nge-filter="status"]', selected.map(item => ({ value: item.status || item.status_processo || item.status_fase, label: item.status || item.status_processo || item.status_fase })), 'Todos os status');
        };
        refreshFilterOptions();
        const refreshDashboard = () => { refreshFilterOptions(); dashboard.loadNGEDashboard(); };
        filterContainer?.addEventListener('change', (event) => {
            const filter = event.target.closest('[data-nge-filter]');
            if (!filter) return;
            const name = filter.dataset.ngeFilter;
            dashboard.dashboardFilters[name] = filter.value;
            if (name === 'unitType' || name === 'unitId' || name === 'nucleusId') {
                if (name === 'unitType') dashboard.dashboardFilters.unitId = dashboard.dashboardFilters.nucleusId = dashboard.dashboardFilters.sectorId = '';
                if (name === 'unitId') dashboard.dashboardFilters.nucleusId = dashboard.dashboardFilters.sectorId = '';
                if (name === 'nucleusId') dashboard.dashboardFilters.sectorId = '';
            }
            refreshDashboard();
        });
        document.getElementById('scoped-dashboard-filters')?.addEventListener('change', (event) => {
            const filter = event.target.closest('[data-scoped-filter]');
            if (!filter) return;
            dashboard.dashboardScopedFilters = dashboard.dashboardScopedFilters || {};
            dashboard.dashboardScopedFilters[filter.dataset.scopedFilter] = filter.value;
            dashboard.loadSetorDashboard();
        });
        document.getElementById('nge-clear-filters')?.addEventListener('click', () => {
            dashboard.dashboardFilters = {};
            filterContainer?.querySelectorAll('select').forEach(select => { select.value = ''; });
            refreshDashboard();
        });
        document.addEventListener('click', (event) => {
            const action = event.target.closest('[data-action]');
            if (!action) return;
            if (action.dataset.action === 'filter-critical-attention') {
                dashboard.dashboardFilters.attentionSeverity = 'Crítico';
                const attention = dashboard.calculateNgeDashboardMetrics(dashboard.getNgeDashboardFilteredProcesses(dashboard.getNgeDashboardProcesses(), dashboard.dashboardFilters));
                dashboard.populateAttentionTable({ attention: attention.attention.filter(item => item.severity === 'Crítico') });
            }
            if (action.dataset.action === 'open-attention-process') {
                const processId = Number(action.dataset.processId);
                const process = dashboard.getNgeDashboardProcesses().find(item => String(item.id) === String(processId));
                if (process && typeof ProcessManager !== 'undefined') {
                    ProcessManager.myProcessesState.selectedProcessId = process.id;
                    ProcessManager.myProcessesState.expandedProcessId = process.id;
                    const phase = dashboard.getProcessCurrentPhase(process);
                    ProcessManager.myProcessesState.selectedPhaseCode = phase;
                    ProcessManager.setStoredSelection({ processoId: process.id, phaseName: phase, activityCode: null });
                    document.querySelector('[data-tab="meus-processos"]')?.click();
                }
            }
            if (action.dataset.action === 'open-dashboard-indicator' && typeof ProcessManager !== 'undefined') {
                ProcessManager.openIndicatorsTab(Number(action.dataset.processId));
                if (typeof IndicatorManager !== 'undefined') setTimeout(() => IndicatorManager.selectIndicator(action.dataset.indicatorId), 0);
            }
            if (action.dataset.action === 'clear-scoped-filters') {
                dashboard.dashboardScopedFilters = {};
                dashboard.loadSetorDashboard();
            }
        });

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
