// ============================================================================
// BPM Details Module - Monitoramento de Fases BPM
// Polícia Científica do Rio Grande do Norte
// ============================================================================

const BPMDetailsModule = (() => {
    const PHASES = ['Planejar', 'Analisar', 'Desenhar', 'Implementar', 'Monitorar'];
    let currentPhase = null;
    let allProcesses = [];
    let currentUser = null;

    /**
     * Inicializar módulo
     */
    const init = () => {
        // Aguardar um pouco para garantir que ProcessManager está pronto
        setTimeout(() => {
            loadProcesses();
            populateSectorFilter();
            setupEventListeners();
        }, 500);
    };

    /**
     * Configurar event listeners
     */
    const setupEventListeners = () => {
        // Botões "Ver Detalhes" do Monitoramento BPM
        document.querySelectorAll('#monitoramento-bpm .bpm-phase .btn-small').forEach((btn, index) => {
            btn.addEventListener('click', () => {
                const phase = PHASES[index];
                showPhaseDetails(phase);
            });
        });

        // Filtros
        const userFilter = document.getElementById('bpm-user-filter');
        const setorFilter = document.getElementById('bpm-setor-filter');
        const statusFilter = document.getElementById('bpm-status-filter');

        if (userFilter) {
            userFilter.addEventListener('input', () => renderPhaseDetails());
        }
        if (setorFilter) {
            setorFilter.addEventListener('change', () => renderPhaseDetails());
        }
        if (statusFilter) {
            statusFilter.addEventListener('change', () => renderPhaseDetails());
        }

        // Botões de fechar modal
        document.querySelectorAll('#bpm-details-modal .modal-close').forEach(btn => {
            btn.addEventListener('click', closeModal);
        });

        // Fechar modal ao clicar fora
        const modal = document.getElementById('bpm-details-modal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target.id === 'bpm-details-modal') {
                    closeModal();
                }
            });
        }
    };

    /**
     * Carregar processos do storage ou API
     */
    const loadProcesses = async () => {
        try {
            currentUser = window.app?.currentUser || window.AccessControl?.getCurrentUser?.() || {};
            
            // Tentar carregar de ProcessManager primeiro
            if (typeof ProcessManager !== 'undefined' && ProcessManager.getStoredProcesses) {
                allProcesses = ProcessManager.getStoredProcesses() || [];
                if (allProcesses.length > 0) {
                    console.log(`[BPM] Carregados ${allProcesses.length} processos do ProcessManager`);
                    return;
                }
            }

            // Fallback: usar dados mockados se disponíveis
            if (window.mockProcesses) {
                allProcesses = window.mockProcesses;
                console.log(`[BPM] Usando ${allProcesses.length} processos mockeados`);
                return;
            }

            // Última tentativa: chamar API
            try {
                const response = await api.get('/processes');
                allProcesses = Array.isArray(response) ? response : response.data || [];
            } catch (apiError) {
                console.log('[BPM] API não disponível, usando dados vazios');
                allProcesses = [];
            }
        } catch (error) {
            console.error('[BPM] Erro ao carregar processos:', error);
            allProcesses = [];
        }
    };

    /**
     * Preencher filtro de setores
     */
    const populateSectorFilter = async () => {
        try {
            const setorFilter = document.getElementById('bpm-setor-filter');
            if (!setorFilter) return;

            // Obter setores únicos dos processos
            const setores = new Set();
            allProcesses.forEach(processo => {
                const setorId = processo.setor_id || processo.sectorId || processo.sector_id;
                if (setorId) {
                    setores.add(String(setorId));
                }
            });

            // Limpar opções existentes (exceto a primeira)
            while (setorFilter.options.length > 1) {
                setorFilter.remove(1);
            }

            // Adicionar opções ao select
            Array.from(setores).sort().forEach(setorId => {
                const option = document.createElement('option');
                option.value = setorId;
                option.textContent = `Setor ${setorId}`;
                setorFilter.appendChild(option);
            });
        } catch (error) {
            console.error('[BPM] Erro ao preencher filtro de setores:', error);
        }
    };

    /**
     * Mostrar detalhes da fase
     */
    const showPhaseDetails = (phase) => {
        currentPhase = phase;
        const modal = document.getElementById('bpm-details-modal');
        const title = document.getElementById('bpm-modal-title');
        const filterBar = document.getElementById('bpm-filters');

        if (!modal) {
            console.error('[BPM] Modal não encontrado');
            return;
        }

        // Atualizar título
        if (title) {
            title.textContent = `Detalhes - Fase: ${phase}`;
        }

        // Mostrar/ocultar filtros baseado no perfil
        const isAdmin = isCurrentUserAdmin();
        if (filterBar) {
            filterBar.style.display = isAdmin ? 'flex' : 'none';
        }

        // Limpar filtros
        const userFilter = document.getElementById('bpm-user-filter');
        const setorFilter = document.getElementById('bpm-setor-filter');
        if (userFilter) userFilter.value = '';
        if (setorFilter) setorFilter.value = '';

        // Renderizar dados
        renderPhaseDetails();

        // Mostrar modal
        modal.style.display = 'flex';
    };

    /**
     * Renderizar detalhes da fase
     */
    const renderPhaseDetails = () => {
        const isAdmin = isCurrentUserAdmin();
        const tbody = document.getElementById('bpm-details-tbody');

        if (!tbody || !currentPhase) return;

        // Filtrar processos pela fase atual
        let filtered = allProcesses.filter(p => {
            const processPhase = p.status_fase || 'Não informado';
            return processPhase === currentPhase;
        });

        // Se não é Admin, filtrar apenas pelo usuário atual
        if (!isAdmin && currentUser?.id) {
            filtered = filtered.filter(p => {
                const responsavelId = p.responsavel_id || p.responsibleId || p.responsible_id;
                return responsavelId === currentUser.id;
            });
        }

        // Aplicar filtros do usuário (se Admin)
        if (isAdmin) {
            const userFilter = document.getElementById('bpm-user-filter')?.value || '';
            const setorFilter = document.getElementById('bpm-setor-filter')?.value || '';

            if (userFilter) {
                filtered = filtered.filter(p => {
                    const responsavelNome = (p.responsavel_nome || p.responsableName || '').toLowerCase();
                    return responsavelNome.includes(userFilter.toLowerCase());
                });
            }

            if (setorFilter) {
                filtered = filtered.filter(p => {
                    const setorId = String(p.setor_id || p.sectorId || p.sector_id || '');
                    return setorId === setorFilter;
                });
            }
        }

        // Renderizar tabela
        if (filtered.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center text-muted">
                        ${isAdmin ? 'Nenhum processo encontrado nesta fase.' : 'Você não possui processos nesta fase.'}
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = filtered.map(processo => {
            const dataInicio = processo.data_inicio 
                ? new Date(processo.data_inicio).toLocaleDateString('pt-BR') 
                : 'N/A';
            const dataFim = processo.data_fim 
                ? new Date(processo.data_fim).toLocaleDateString('pt-BR') 
                : 'N/A';
            const progresso = processo.percentual_conclusao || 0;
            const responsavel = processo.responsavel_nome || processo.responsableName || processo.responsavel_nome || 'N/A';
            const setor = processo.setor_nome || `Setor ${processo.setor_id || processo.sectorId || 'N/A'}`;

            return `
                <tr>
                    <td>${responsavel}</td>
                    <td>${processo.nome || 'N/A'}</td>
                    <td>${setor}</td>
                    <td>${processo.status_fase || 'N/A'}</td>
                    <td>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <div style="flex: 1; min-width: 100px;">
                                <div class="progress-bar" style="width: 100%; height: 24px; background-color: #e0e0e0; border-radius: 12px; overflow: hidden;">
                                    <div class="progress-fill" style="width: ${progresso}%; background: linear-gradient(90deg, #003d99 0%, #ffc107 100%); height: 100%;"></div>
                                </div>
                            </div>
                            <span style="min-width: 45px;">${progresso}%</span>
                        </div>
                    </td>
                    <td>${dataInicio}</td>
                    <td>${dataFim}</td>
                    <td>
                        <span class="badge ${progresso === 100 ? 'badge-success' : progresso > 50 ? 'badge-info' : 'badge-warning'}">
                            ${progresso === 100 ? 'Concluído' : 'Em andamento'}
                        </span>
                    </td>
                </tr>
            `;
        }).join('');
    };

    /**
     * Verificar se o usuário é Admin
     */
    const isCurrentUserAdmin = () => {
        try {
            currentUser = window.app?.currentUser || window.AccessControl?.getCurrentUser?.() || {};
            const perfil = String(currentUser.perfil || '').toUpperCase();
            return perfil === 'NGE' || perfil === 'NGE_ADMIN' || perfil === 'ADMIN';
        } catch (error) {
            console.error('[BPM] Erro ao verificar perfil:', error);
            return false;
        }
    };

    /**
     * Fechar modal
     */
    const closeModal = () => {
        const modal = document.getElementById('bpm-details-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    };

    /**
     * Atualizar dados quando mudar de usuário
     */
    const updateOnUserChange = () => {
        currentUser = window.app?.currentUser || window.AccessControl?.getCurrentUser?.() || {};
        loadProcesses();
    };

    return {
        init,
        showPhaseDetails,
        updateOnUserChange,
        closeModal
    };
})();

// Inicializar quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
    BPMDetailsModule.init();
});
