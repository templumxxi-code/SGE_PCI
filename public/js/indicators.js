// ============================================================================
// SMP PCI - Gerenciamento de Indicadores
// ============================================================================

class IndicatorManager {
    static INDICATOR_FILTERS_KEY = 'sge_pci_indicator_filters';
    static SELECTED_PROCESS_KEY = 'sge_pci_selected_indicators_process';
    static SELECTED_INDICATOR_KEY = 'sge_pci_selected_indicator';
    static selectedIndicatorId = null;
    static filters = {
        search: '',
        processId: '',
        origin: '',
        status: '',
        responsible: ''
    };
    static indicators = [];
    static _eventsRegistered = false;

    static async loadIndicators() {
        this.registerIndicatorEvents();
        this.loadSavedFilters();

        const apiIndicators = await this.fetchApiIndicators();
        const localIndicators = this.getStoredLocalIndicators();
        const mergedIndicators = this.mergeIndicators(apiIndicators, localIndicators);

        this.indicators = this.normalizeIndicators(mergedIndicators);
        this.applyProcessSelectionFromStorage();
        this.buildFilterOptions();
        this.renderIndicatorList();

        if (this.selectedIndicatorId) {
            this.renderIndicatorDetail(this.selectedIndicatorId);
        }
    }

    static async fetchApiIndicators() {
        const perfil = window.app?.currentUser?.perfil;
        let url = '/indicators';

        if (perfil === 'SETOR') {
            const setorId = window.app.currentUser.setor_id;
            url = `/indicators/setor/${setorId}`;
        }

        try {
            const response = await api.get(url);
            return Array.isArray(response) ? response : [];
        } catch (err) {
            console.warn('API indicadores indisponível, usando indicadores locais se existirem.', err);
            return [];
        }
    }

    static getStoredLocalIndicators() {
        try {
            const raw = localStorage.getItem('sge_pci_indicators');
            const localIndicators = raw ? JSON.parse(raw) : [];
            return Array.isArray(localIndicators) ? localIndicators : [];
        } catch (err) {
            console.warn('Erro ao ler indicadores locais', err);
            return [];
        }
    }

    static mergeIndicators(apiIndicators, localIndicators) {
        const mergedMap = new Map();

        const getKey = (item) => {
            if (item?.id) return `id:${item.id}`;
            const name = item?.name || item?.nome || '';
            const processId = item?.processId || item?.processoId || item?.processo_id || '';
            return `name:${name}|process:${processId}`;
        };

        const add = (item, source) => {
            const key = getKey(item);
            const existing = mergedMap.get(key);
            if (!existing || source === 'local') {
                mergedMap.set(key, { ...existing, ...item });
            }
        };

        (apiIndicators || []).forEach(item => add(item, 'api'));
        (localIndicators || []).forEach(item => add(item, 'local'));

        return Array.from(mergedMap.values());
    }

    static normalizeIndicators(indicadores) {
        return (indicadores || []).map((indicador, index) => {
            const processId = parseInt(indicador.processId || indicador.processoId || indicador.processo_id || 0, 10) || null;
            const process = processId ? this.getProcessById(processId) : null;
            const sourceActivityCode = String(indicador.sourceActivityCode || indicador.activityCode || indicador.origem || indicador.origem || '').trim();
            const origin = String(indicador.origem || indicador.sourceActivityCode || indicador.phaseName || indicador.origin || '').trim();
            const status = String(indicador.status || indicador.implementationStatus || indicador.estado || '').trim();
            const processName = indicador.processName || indicador.processoNome || indicador.processo_nome || process?.nome || process?.name || '';

            return {
                id: indicador.id ?? `local-${index}-${processId || '0'}`,
                name: indicador.name || indicador.nome || indicador.indicador || 'Indicador sem nome',
                description: indicador.description || indicador.descricao || indicador.observations || indicador.obs || '',
                currentValue: indicador.valor_atual ?? indicador.currentValue ?? indicador.current ?? 0,
                targetValue: indicador.valor_meta ?? indicador.targetValue ?? indicador.meta ?? '',
                unit: indicador.unidade_medida || indicador.unidade || indicador.unit || '',
                deadline: indicador.prazo || indicador.deadline || indicador.referenceDate || '',
                responsible: indicador.responsavel || indicador.responsible || indicador.owner || '',
                status: status || 'Ativo',
                sourceActivityCode: sourceActivityCode,
                origin: origin || sourceActivityCode || 'PLAN_E',
                processId: processId,
                processName: processName || '',
                phaseName: indicador.phaseName || this.mapSourceCodeToPhase(sourceActivityCode),
                createdAt: indicador.criadoEm || indicador.createdAt || indicador.created_at || '',
                updatedAt: indicador.atualizadoEm || indicador.updatedAt || indicador.updated_at || '',
                raw: indicador
            };
        }).filter(i => !!i.name);
    }

    static applyProcessSelectionFromStorage() {
        try {
            const raw = localStorage.getItem(this.SELECTED_PROCESS_KEY);
            if (!raw) return;
            const parsed = JSON.parse(raw);
            if (parsed?.processId) {
                this.filters.processId = String(parsed.processId);
            }
        } catch (_) {
            // ignore
        }
    }

    static getSavedFilters() {
        try {
            return JSON.parse(localStorage.getItem(this.INDICATOR_FILTERS_KEY)) || {};
        } catch (_) {
            return {};
        }
    }

    static saveFilters() {
        localStorage.setItem(this.INDICATOR_FILTERS_KEY, JSON.stringify(this.filters));
    }

    static loadSavedFilters() {
        const saved = this.getSavedFilters();
        if (saved.search) this.filters.search = saved.search;
        if (saved.processId) this.filters.processId = saved.processId;
        if (saved.origin) this.filters.origin = saved.origin;
        if (saved.status) this.filters.status = saved.status;
        if (saved.responsible) this.filters.responsible = saved.responsible;

        const selectedIndicator = localStorage.getItem(this.SELECTED_INDICATOR_KEY);
        if (selectedIndicator) {
            this.selectedIndicatorId = selectedIndicator;
        }
    }

    static buildFilterOptions() {
        const processFilter = document.getElementById('indicator-process-filter');
        const originFilter = document.getElementById('indicator-source-filter');
        const statusFilter = document.getElementById('indicator-status-filter');
        const responsibleFilter = document.getElementById('indicator-responsible-filter');
        const searchInput = document.getElementById('indicator-search');

        const processes = new Map();
        const origins = new Set();
        const statuses = new Set();
        const responsaveis = new Set();

        this.indicators.forEach(ind => {
            if (ind.processId && ind.processName) {
                processes.set(String(ind.processId), ind.processName);
            }
            if (ind.origin) origins.add(ind.origin);
            if (ind.status) statuses.add(ind.status);
            if (ind.responsible) responsaveis.add(ind.responsible);
        });

        if (processFilter) {
            processFilter.innerHTML = ['<option value="">Todos os processos</option>',
                ...Array.from(processes.entries()).sort((a, b) => a[1].localeCompare(b[1], 'pt-BR')).map(([id, name]) => `<option value="${id}">${name}</option>`) 
            ].join('');
            processFilter.value = this.filters.processId || '';
        }

        if (originFilter) {
            originFilter.innerHTML = ['<option value="">Todas as origens</option>',
                ...Array.from(origins).sort().map(value => `<option value="${value}">${this.getIndicatorOriginLabel(value)}</option>`)
            ].join('');
            originFilter.value = this.filters.origin || '';
        }

        if (statusFilter) {
            statusFilter.innerHTML = ['<option value="">Todos os status</option>',
                ...Array.from(statuses).sort().map(value => `<option value="${value}">${value}</option>`)
            ].join('');
            statusFilter.value = this.filters.status || '';
        }

        if (responsibleFilter) {
            responsibleFilter.innerHTML = ['<option value="">Todos os responsáveis</option>',
                ...Array.from(responsaveis).sort().map(value => `<option value="${value}">${value}</option>`)
            ].join('');
            responsibleFilter.value = this.filters.responsible || '';
        }

        if (searchInput) {
            searchInput.value = this.filters.search || '';
        }
    }

    static applyFilters(indicators) {
        const visibleIndicators = window.AccessControl?.filterVisibleIndicators?.(window.app?.currentUser, indicators) || indicators;

        return (visibleIndicators || []).filter(ind => {
            const search = String(this.filters.search || '').trim().toLowerCase();
            const matchesSearch = !search || [ind.name, ind.processName, ind.responsible, ind.description]
                .some(field => String(field || '').toLowerCase().includes(search));
            const matchesProcess = !this.filters.processId || String(ind.processId) === String(this.filters.processId);
            const matchesOrigin = !this.filters.origin || String(ind.origin) === String(this.filters.origin);
            const matchesStatus = !this.filters.status || String(ind.status) === String(this.filters.status);
            const matchesResponsible = !this.filters.responsible || String(ind.responsible) === String(this.filters.responsible);
            return matchesSearch && matchesProcess && matchesOrigin && matchesStatus && matchesResponsible;
        });
    }

    static renderIndicatorList() {
        const container = document.getElementById('indicator-list');
        const detailContainer = document.getElementById('indicator-detail-panel');
        if (!container) return;

        const filtered = this.applyFilters(this.indicators);

        if (!filtered.length) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-chart-line"></i>
                    <h3>Nenhum indicador encontrado</h3>
                    <p>Altere os filtros ou cadastre indicadores nos processos para visualizar resultados.</p>
                </div>
            `;
            if (detailContainer) {
                detailContainer.innerHTML = `
                    <div class="empty-detail">
                        <h3>Selecione um indicador para visualizar detalhes.</h3>
                        <p>Use filtros e buscas para encontrar o indicador desejado.</p>
                    </div>
                `;
            }
            return;
        }

        const listHtml = filtered.map(indicador => {
            const percentual = indicador.targetValue && Number(indicador.targetValue) > 0
                ? Math.min((Number(indicador.currentValue || 0) / Number(indicador.targetValue)) * 100, 100)
                : 0;
            const statusClass = percentual >= 85 ? 'success' : percentual >= 70 ? 'warning' : 'danger';
            const selectedClass = String(this.selectedIndicatorId) === String(indicador.id) ? 'selected' : '';

            return `
                <div class="indicator-card ${selectedClass}" data-indicator-id="${indicador.id}" data-action="select-indicator">
                    <div class="indicator-header">
                        <div>
                            <div class="indicator-name">${indicador.name}</div>
                            <div class="indicator-type">${this.getIndicatorOriginLabel(indicador.origin)}</div>
                        </div>
                        <div class="badge badge-${statusClass}">${percentual.toFixed(0)}%</div>
                    </div>
                    <div class="indicator-card-meta">
                        <span>${indicador.processName || 'Processo não identificado'}</span>
                        <span>${indicador.responsible || 'Sem responsável'}</span>
                        <span>${indicador.unit || 'Sem unidade'}</span>
                    </div>
                    <div class="indicator-values">
                        <div class="indicator-value">
                            <div class="indicator-value-label">Meta</div>
                            <div class="indicator-value-number">${indicador.targetValue || '-'}</div>
                        </div>
                        <div class="indicator-value">
                            <div class="indicator-value-label">Atual</div>
                            <div class="indicator-value-number">${indicador.currentValue || '-'}</div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = listHtml;

        const activeIndicatorExists = filtered.some(ind => String(ind.id) === String(this.selectedIndicatorId));
        if (!activeIndicatorExists && filtered.length > 0) {
            this.selectIndicator(filtered[0].id);
            return;
        }

        if (this.selectedIndicatorId) {
            this.renderIndicatorDetail(this.selectedIndicatorId);
        }
    }

    static renderIndicatorDetail(indicatorId) {
        const detailContainer = document.getElementById('indicator-detail-panel');
        if (!detailContainer) return;

        const indicador = this.indicators.find(i => String(i.id) === String(indicatorId));
        if (!indicador) {
            detailContainer.innerHTML = `
                <div class="empty-detail">
                    <h3>Selecione um indicador para visualizar detalhes.</h3>
                    <p>Use os filtros à esquerda ou clique em um cartão para ver mais informações.</p>
                </div>
            `;
            return;
        }

        const sourceProcess = this.getProcessById(indicador.processId);
        const sourceActivityCode = indicador.sourceActivityCode;
        const phaseName = indicador.phaseName || this.mapSourceCodeToPhase(sourceActivityCode);
        const sourceActivity = sourceProcess ? ProcessManager.getProcessActivity(sourceProcess, phaseName, sourceActivityCode) : null;
        const implementationRecords = sourceActivity?.content?.implementationRecords || [];
        const contraMedidas = (sourceActivity?.content?.contraMedidas || []).filter(cm => cm.active !== false && String(cm.indicatorId) === String(indicador.id));
        const history = sourceActivity?.history || [];
        const latestRecord = implementationRecords.slice().sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0))[0] || null;
        const percentual = indicador.targetValue && Number(indicador.targetValue) > 0
            ? Math.min((Number(indicador.currentValue || 0) / Number(indicador.targetValue)) * 100, 100)
            : 0;

        detailContainer.innerHTML = `
            <div class="indicator-detail-card">
                <div class="detail-section detail-header">
                    <div class="detail-title">
                        <h3>${indicador.name}</h3>
                        <div class="detail-badge badge badge-${this.getProgressBadgeClass(percentual)}">${String(indicador.status || 'Ativo')}</div>
                    </div>
                    <div class="detail-actions">
                        <button type="button" class="btn btn-secondary btn-small" data-action="view-source-process" data-indicator-id="${indicador.id}">Abrir processo</button>
                    </div>
                </div>
                <div class="detail-section detail-summary">
                    <div class="detail-row">
                        <div class="detail-item">
                            <span class="detail-item-label">Processo</span>
                            <span class="detail-item-value">${indicador.processName || 'Não informado'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-item-label">Origem</span>
                            <span class="detail-item-value">${this.getIndicatorOriginLabel(indicador.origin)}</span>
                        </div>
                    </div>
                    <div class="detail-row">
                        <div class="detail-item">
                            <span class="detail-item-label">Atividade</span>
                            <span class="detail-item-value">${sourceActivityCode || 'Não informado'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-item-label">Responsável</span>
                            <span class="detail-item-value">${indicador.responsible || 'Não informado'}</span>
                        </div>
                    </div>
                    <div class="detail-row">
                        <div class="detail-item">
                            <span class="detail-item-label">Meta</span>
                            <span class="detail-item-value">${indicador.targetValue || '-'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-item-label">Atual</span>
                            <span class="detail-item-value">${indicador.currentValue || '-'}</span>
                        </div>
                    </div>
                    <div class="detail-row">
                        <div class="detail-item">
                            <span class="detail-item-label">Unidade</span>
                            <span class="detail-item-value">${indicador.unit || '-'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-item-label">Prazo</span>
                            <span class="detail-item-value">${indicador.deadline ? formatarData(indicador.deadline) : '-'}</span>
                        </div>
                    </div>
                    <div class="detail-item detail-description">
                        <span class="detail-item-label">Descrição</span>
                        <span class="detail-item-value">${indicador.description || 'Nenhuma descrição disponível.'}</span>
                    </div>
                </div>
                <div class="detail-section detail-progress-section">
                    <div class="detail-progress-label">Progresso</div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${percentual}%"></div>
                    </div>
                    <div class="detail-progress-meta">${percentual.toFixed(0)}% da meta atingida</div>
                </div>
                <div class="detail-section">
                    <h4>Última medição</h4>
                    ${latestRecord ? `
                        <div class="detail-item">
                            <span class="detail-item-label">Resultado atual</span>
                            <span class="detail-item-value">${latestRecord.currentResult || '-'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-item-label">Status de implantação</span>
                            <span class="detail-item-value">${latestRecord.implementationStatus || '-'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-item-label">Meta atingida</span>
                            <span class="detail-item-value">${latestRecord.targetReached || '-'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-item-label">Data</span>
                            <span class="detail-item-value">${latestRecord.measurementDate ? formatarData(latestRecord.measurementDate) : '-'}</span>
                        </div>
                        <div class="detail-item detail-description">
                            <span class="detail-item-label">Observações</span>
                            <span class="detail-item-value">${latestRecord.observations || 'Nenhuma observação registrada.'}</span>
                        </div>
                    ` : '<p class="text-muted">Nenhum registro de medição disponível para este indicador.</p>'}
                </div>
                <div class="detail-section">
                    <h4>Contra medidas</h4>
                    ${contraMedidas.length ? contraMedidas.map(cm => `
                        <div class="countermeasure-card">
                            <div class="countermeasure-header">
                                <strong>${cm.title || 'Contra medida sem título'}</strong>
                                <span class="badge badge-${cm.status === 'Concluída' ? 'success' : cm.status === 'Em andamento' ? 'info' : cm.status === 'Cancelada' ? 'danger' : 'warning'}">${cm.status || 'Pendente'}</span>
                            </div>
                            <div><strong>Motivo:</strong> ${cm.reason || '-'}</div>
                            <div><strong>Ação proposta:</strong> ${cm.proposedAction || '-'}</div>
                            <div><strong>Responsável:</strong> ${cm.responsible || '-'}</div>
                            <div><strong>Prazo:</strong> ${cm.deadline ? formatarData(cm.deadline) : '-'}</div>
                            <div class="detail-item detail-description"><strong>Observações:</strong> ${cm.observations || '-'}</div>
                        </div>
                    `).join('') : '<p class="text-muted">Nenhuma contra medida vinculada a este indicador.</p>'}
                </div>
                <div class="detail-section">
                    <h4>Histórico da atividade</h4>
                    ${history.length ? history.slice().reverse().map(entry => `
                        <div class="history-item">
                            <div><strong>${entry.action}</strong> — ${entry.summary || ''}</div>
                            <div class="small text-muted">${entry.user || 'Usuário'} • ${formatarDataHora(entry.date)}</div>
                        </div>
                    `).join('') : '<p class="text-muted">Nenhum histórico registrado para a atividade.</p>'}
                </div>
            </div>
        `;
    }

    static renderEmptyDetail() {
        const detailContainer = document.getElementById('indicator-detail-panel');
        if (!detailContainer) return;
        detailContainer.innerHTML = `
            <div class="empty-detail">
                <h3>Selecione um indicador para visualizar detalhes.</h3>
                <p>Use os filtros à esquerda ou clique em um cartão para ver mais informações.</p>
            </div>
        `;
    }

    static selectIndicator(indicatorId) {
        this.selectedIndicatorId = indicatorId;
        localStorage.setItem(this.SELECTED_INDICATOR_KEY, String(indicatorId));
        this.renderIndicatorList();
        this.renderIndicatorDetail(indicatorId);
    }

    static registerIndicatorEvents() {
        if (this._eventsRegistered) return;

        const searchInput = document.getElementById('indicator-search');
        const processFilter = document.getElementById('indicator-process-filter');
        const originFilter = document.getElementById('indicator-source-filter');
        const statusFilter = document.getElementById('indicator-status-filter');
        const responsibleFilter = document.getElementById('indicator-responsible-filter');
        const listContainer = document.getElementById('indicator-list');
        const detailPanel = document.getElementById('indicator-detail-panel');

        const onFilterChange = () => {
            if (searchInput) this.filters.search = searchInput.value || '';
            if (processFilter) this.filters.processId = processFilter.value || '';
            if (originFilter) this.filters.origin = originFilter.value || '';
            if (statusFilter) this.filters.status = statusFilter.value || '';
            if (responsibleFilter) this.filters.responsible = responsibleFilter.value || '';
            this.saveFilters();
            this.renderIndicatorList();
        };

        if (searchInput) searchInput.addEventListener('input', onFilterChange);
        if (processFilter) processFilter.addEventListener('change', onFilterChange);
        if (originFilter) originFilter.addEventListener('change', onFilterChange);
        if (statusFilter) statusFilter.addEventListener('change', onFilterChange);
        if (responsibleFilter) responsibleFilter.addEventListener('change', onFilterChange);

        if (listContainer) {
            listContainer.addEventListener('click', (event) => {
                const card = event.target.closest('.indicator-card');
                if (!card) return;
                const indicatorId = card.dataset.indicatorId;
                if (indicatorId) {
                    this.selectIndicator(indicatorId);
                }
            });
        }

        if (detailPanel) {
            detailPanel.addEventListener('click', (event) => {
                const button = event.target.closest('[data-action="view-source-process"]');
                if (!button) return;
                const indicatorId = button.dataset.indicatorId;
                if (indicatorId) {
                    this.openSourceProcess(indicatorId);
                }
            });
        }

        this._eventsRegistered = true;
    }

    static openSourceProcess(indicatorId) {
        const indicador = this.indicators.find(i => String(i.id) === String(indicatorId));
        if (!indicador) {
            notificar('Indicador não encontrado.', 'warning');
            return;
        }

        if (!indicador.processId) {
            notificar('Processo de origem não identificado.', 'warning');
            return;
        }

        const phaseName = indicador.phaseName || this.mapSourceCodeToPhase(indicador.sourceActivityCode);
        const activityCode = indicador.sourceActivityCode;

        const processTab = document.querySelector('[data-tab="meus-processos"]');
        if (processTab) {
            processTab.click();
        }

        if (typeof ProcessManager?.loadProcesses === 'function') {
            ProcessManager.loadProcesses();
        }

        setTimeout(() => {
            if (typeof ProcessManager?.selectActivity === 'function' && phaseName && activityCode) {
                ProcessManager.selectActivity(indicador.processId, phaseName, activityCode);
            }
        }, 250);
    }

    static getProcessById(processId) {
        if (!processId || typeof ProcessManager?.getStoredProcesses !== 'function') return null;
        const processes = ProcessManager.getStoredProcesses();
        return processes.find(p => Number(p.id) === Number(processId)) || null;
    }

    static mapSourceCodeToPhase(sourceActivityCode) {
        if (!sourceActivityCode) return '';
        if (sourceActivityCode.startsWith('PLAN_')) return 'Planejar';
        if (sourceActivityCode.startsWith('ANAL_')) return 'Analisar';
        if (sourceActivityCode.startsWith('DES_')) return 'Desenhar';
        if (sourceActivityCode.startsWith('IMPL_')) return 'Implementar';
        if (sourceActivityCode.startsWith('MON_')) return 'Monitorar';
        return '';
    }

    static getIndicatorOriginLabel(origin) {
        if (!origin) return 'Sem origem';
        const normalized = String(origin).toUpperCase();
        if (normalized.includes('PLAN')) return 'Plano E';
        if (normalized.includes('ANAL')) return 'Analisar';
        if (normalized.includes('DES')) return 'Desenhar';
        if (normalized.includes('IMPL')) return 'Implementar';
        if (normalized.includes('MON')) return 'Monitorar';
        return origin;
    }

    static getProgressBadgeClass(percentual) {
        if (percentual >= 85) return 'success';
        if (percentual >= 70) return 'warning';
        return 'danger';
    }
}
