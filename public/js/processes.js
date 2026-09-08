// ============================================================================
// SMP PCI - Gerenciamento de Processos
// ============================================================================

class ProcessManager {
    static editingId = null;
    static editingMemberId = null;
    // Estado central para a aba Meus Processos
    static myProcessesState = {
        expandedProcessId: null,
        expandedPhases: {}, // key: `${processId}:${phaseName}` -> true/false
        selectedProcessId: null,
        selectedPhaseCode: null,
        selectedActivityCode: null,
        mobileDetailVisible: false
    };
    static selectedIndicatorsProcessId = null;
    static availableSetores = [];

    static getAvailableSetoresForSelection() {
        const org = window.AccessControl?.getStoredOrganizationData?.() || { institutes: [], regionais: [], subcoordenações: [], assessorias: [], nuclei: [], sectors: [] };
        const sectors = Array.isArray(org.sectors) ? org.sectors : [];
        return sectors.map((sector) => ({ id: sector.id, nome: sector.nome || sector.name || 'Setor sem nome' }));
    }

    static getSetorDisplayName(setorId) {
        const sector = this.getAvailableSetoresForSelection().find((item) => String(item.id) === String(setorId));
        return sector?.nome || 'Não definido';
    }

    static availableMacroprocessos = [
        { id: 1, nome: 'Investigação' },
        { id: 2, nome: 'Perícia Técnica' },
        { id: 3, nome: 'Laudo e Relatórios' },
        { id: 4, nome: 'Controle de Qualidade' }
    ];

    static availableResponsaveis = [
        { id: 1, nome: 'Admin NGE' },
        { id: 2, nome: 'Técnico Setor 1' },
        { id: 3, nome: 'Técnico Setor 2' }
    ];

    static BPM_ACTIVITY_SEQUENCE = [
        {
            phaseCode: 'PLANEJAR',
            phaseName: 'Planejar',
            activities: ['PLAN_A', 'PLAN_B', 'PLAN_C', 'PLAN_D', 'PLAN_E', 'PLAN_G']
        },
        {
            phaseCode: 'ANALISAR',
            phaseName: 'Analisar',
            activities: ['ANAL_A', 'ANAL_B', 'ANAL_C', 'ANAL_D', 'ANAL_E']
        },
        {
            phaseCode: 'DESENHAR',
            phaseName: 'Desenhar',
            activities: ['DES_A', 'DES_B', 'DES_C', 'DES_D', 'DES_E', 'DES_F', 'DES_G']
        },
        {
            phaseCode: 'IMPLEMENTAR',
            phaseName: 'Implementar',
            activities: ['IMPL_A', 'IMPL_B']
        },
        {
            phaseCode: 'MONITORAR',
            phaseName: 'Monitorar',
            activities: ['MON_A', 'MON_B', 'MON_C', 'MON_D']
        }
    ];

    static ACTIVITY_DISPLAY_TITLES = {
        PLAN_A: 'A) Definir equipe de melhoria',
        PLAN_B: 'B) Estabelecer objetivo do Projeto de Melhoria',
        PLAN_C: 'C) Solicitar documentação existente do processo',
        PLAN_D: 'D) Diagrama de Escopo e Interface — DEIP',
        PLAN_E: 'E) Elaborar Plano de Projeto com todas as informações adquiridas (Referente à etapa E e F do Manual)',
        PLAN_G: 'G) Aprovar Plano do Projeto de Melhoria',
        ANAL_A: 'a) Analisar documentação do processo',
        ANAL_B: 'b) Desenhar fluxo AS IS do processo',
        ANAL_C: 'c) Levantar Desconexões ou oportunidades de melhoria, identificadas no DEIP e fluxo do processo',
        ANAL_D: 'd) Priorizar desconexões ou oportunidades de melhoria e analisar as melhorias, priorização de causas e geração de ideias (ESSA ETAPA É REFERENTE ÀS ETAPAS “D” e “E” DO MANUAL',
        ANAL_E: 'e) Levantar indicadores atuais dos processos.',
        DES_A: 'a) Redefinir escopo do processo',
        DES_B: 'b) Modelagem do processo otimizado: fluxo TO BE',
        DES_C: 'c) Tarefas Críticas do fluxo identificadas',
        DES_D: 'd) Levantamento de riscos das Tarefas Críticas',
        DES_E: 'e) Definir Indicadores do processo',
        DES_F: 'f) Documentação Descritiva do Processo (Guia do Processo)',
        DES_G: 'g) Elaborar plano de implementação (ESSA ETAPA É REFERENTE AS ETAPAS G E H DO MANUAL)',
        IMPL_A: 'a) Acompanhamento da execução das ações por meio das reuniões da sistemática de acompanhamento',
        IMPL_B: 'b) Acompanhamento da implantação dos indicadores do processo e identificação de contramedidas caso o não atingimento das metas escalonadas dos indicadores dos processos',
        MON_A: 'a) Acompanhar a gestão do dia a dia do processo',
        MON_B: 'b) Acompanhar os resultados dos indicadores do processo',
        MON_C: 'c) Identificar oportunidades de melhorias',
        MON_D: 'd) Repassar periodicamente as informações de monitoramento às instâncias de governança de processos estabelecidas no órgão.'
    };

    static ACTIVITY_CHECKLIST_TEXT = {
        ANAL_A: 'Atividade concluída',
        ANAL_B: 'Fluxograma AS-IS elaborado',
        ANAL_C: 'Brainstorming conduzido',
        ANAL_D: 'Brainstorming concluído e informações registradas',
        ANAL_E: 'Indicadores atuais levantados',
        DES_A: 'Atividade concluída',
        DES_B: 'Atividade concluída',
        DES_C: 'Tarefas Críticas do fluxo identificadas',
        DES_D: 'Levantamento de riscos das Tarefas Críticas concluído',
        DES_E: 'Indicadores do processo definidos',
        DES_F: 'Documentação Descritiva do Processo concluída',
        DES_G: 'Plano de implementação elaborado',
        IMPL_A: 'Relatório de Acompanhamento anexado',
        IMPL_B: 'Implantação dos indicadores acompanhada',
        MON_A: 'Gestão do dia a dia do processo acompanhada',
        MON_B: 'Resultados dos indicadores acompanhados',
        MON_C: 'Oportunidades de melhoria identificadas',
        MON_D: 'Relatório Situacional inserido'
    };

    static PLANEJAR_REQUIREMENT_CATALOG = {
        PLAN_A: [
            { id: 'participant-name', label: 'Nome' },
            { id: 'participant-registration', label: 'Matrícula' },
            { id: 'participant-responsibilities', label: 'Responsabilidades' },
            { id: 'participant-sector', label: 'Setor' },
            { id: 'participant-assignments', label: 'Seleção de fase ou atividade' },
            { id: 'participant-active', label: 'Participante ativo' },
            { id: 'checklist', label: 'Checklist da atividade' }
        ],
        PLAN_B: [
            { id: 'objective', label: 'Objetivo do Projeto de Melhoria' },
            { id: 'strengths', label: 'Forças' },
            { id: 'weaknesses', label: 'Fraquezas' },
            { id: 'opportunities', label: 'Oportunidades' },
            { id: 'threats', label: 'Ameaças' },
            { id: 'cronograma', label: 'Anexo III — Cronograma' },
            { id: 'checklist', label: 'Checklist da atividade' }
        ],
        PLAN_C: [
            { id: 'documentacao', label: 'Documentação Existente' },
            { id: 'checklist', label: 'Checklist da atividade' }
        ],
        PLAN_D: [
            { id: 'deip', label: 'DEIP - Diagrama de Escopo e Interface' },
            { id: 'checklist', label: 'Checklist da atividade' }
        ],
        PLAN_E: [
            { id: 'objetivoEstrategico', label: 'Objetivo Estratégico' },
            { id: 'iniciativaEstr', label: 'Iniciativa Estratégica' },
            { id: 'anexoII', label: 'Anexo II' }
        ],
        PLAN_G: [
            { id: 'ata', label: 'Ata de Validação' },
            { id: 'checklist', label: 'Checklist de aprovação' }
        ]
    };

    // Requisitos da fase Desenhar
    static DESENHAR_REQUIREMENT_CATALOG = {
        DES_A: { requiredAttachments: ['Anexo I (Redesenhado)'], requiredFields: [] },
        DES_B: { requiredAttachments: ['Fluxo TO BE'], requiredFields: ['Principais mudanças'] },
        DES_C: { requireAllEditable: true },
        DES_D: { requiredAttachments: ['Anexo IV'] },
        DES_E: { requiredFields: ['Anotações adicionais'] },
        DES_F: { requiredAttachments: ['Anexo VI'] },
        DES_G: { requiredAttachments: ['Anexo VII', 'Anexo VIII'] }
    };

    // Requisitos da fase Implementar
    static IMPLEMENTAR_REQUIREMENT_CATALOG = {
        IMPL_A: {},
        IMPL_B: {}
    };

    // Requisitos da fase Monitorar
    static MONITORAR_REQUIREMENT_CATALOG = {
        MON_A: {},
        MON_B: {},
        MON_C: {},
        MON_D: { requiredAttachments: ['Relatório Situacional'], requiredFields: ['Número do Processo SEI'] }
    };

    static ANALISAR_REQUIREMENT_CATALOG = {
        ANAL_A: {
            criticalInfo: {
                label: 'Informações críticas',
                requirementKey: 'criticalInfo',
                fieldSelector: '#detail-critical-info',
                sectionKey: 'criticalInfo'
            }
        },
        ANAL_B: {
            fluxogramaAsIs: {
                label: 'Fluxograma AS-IS',
                requirementKey: 'fluxogramaAsIs',
                attachmentType: 'FLUXOGRAMA_AS_IS',
                attachmentLabel: 'Fluxograma AS-IS'
            }
        },
        ANAL_C: {
            anexoIv: {
                label: 'Anexo IV',
                requirementKey: 'anexoIv',
                attachmentType: 'ANEXO_IV_DESCONEXOES',
                attachmentLabel: 'Anexo IV'
            },
            disconnections: {
                label: 'Desconexões',
                requirementKey: 'disconnections',
                fieldSelector: '#detail-disconnections',
                sectionKey: 'disconnections'
            },
            opportunities: {
                label: 'Oportunidades',
                requirementKey: 'opportunities',
                fieldSelector: '#detail-opportunities',
                sectionKey: 'opportunities'
            },
            brainstorming: {
                label: 'Brainstorming',
                requirementKey: 'brainstorming',
                fieldSelector: '#detail-brainstorm-notes',
                sectionKey: 'brainstorming'
            }
        },
        ANAL_D: {
            anexoIv: {
                label: 'Anexo IV',
                requirementKey: 'anexoIv',
                attachmentType: 'ANEXO_IV_PRIORIZACAO',
                attachmentLabel: 'Anexo IV'
            }
        },
        ANAL_E: {}
    };

    static editingIndicatorId = null;
    static editingContraMedidaId = null;

    /**
     * Carregar lista de processos
     */
    static LOCALSTORAGE_DATA_VERSION = '2';
    static LOCALSTORAGE_VERSION_KEY = 'sge_pci_frontend_version';
    static LOCALSTORAGE_PROCESSES_KEY = 'sge_pci_processos';
    static LOCALSTORAGE_ACTIVITY_SELECTION_KEY = 'sge_pci_selected_activity';
    static PLANEJAR_AB_SWAP_KEY = 'sge_pci_planejar_ab_content_swap_v1';
    static SEARCH_INPUT_ID = 'process-search';
    static FILTER_SELECT_ID = 'process-phase-filter';
    static BPM_DATA_SOURCE = String(window.BPM_DATA_SOURCE || 'API').toUpperCase();
    static apiProcesses = null;

    static async loadProcesses() {
        this.ensureLocalStorageVersion();
        this.registerProcessTabEvents();
        this.initializeCreateProcessForm();

        let processes;
        if (this.BPM_DATA_SOURCE === 'API' && window.bpmApi) {
            try {
                const apiProcesses = await window.bpmApi.getProcesses();
                const hydratedProcesses = await Promise.all(apiProcesses.map(async (processo) => {
                    try { return await window.bpmApi.getProcessById(processo.id); }
                    catch (_) { return processo; }
                }));
                processes = hydratedProcesses.map((processo) => this.normalizeApiProcess(processo));
                this.apiProcesses = processes;
            } catch (error) {
                console.error('Falha ao carregar processos pela API:', error);
                processes = this.getStoredProcesses().map((processo) => this.normalizeProcessBpmStructure(processo));
            }
        } else {
            processes = this.getStoredProcesses().map((processo) => this.normalizeProcessBpmStructure(processo));
        }
        // If there's a stored selection, hydrate myProcessesState
        const sel = this.getStoredSelection();
        if (sel) {
            this.myProcessesState.selectedProcessId = sel.processoId;
            this.myProcessesState.selectedPhaseCode = sel.phaseName || sel.phaseName;
            this.myProcessesState.selectedActivityCode = sel.activityCode || sel.activityCode;
            this.myProcessesState.expandedProcessId = sel.processoId;
            this.myProcessesState.expandedPhases[`${sel.processoId}:${sel.phaseName}`] = true;
        }

        this.renderProcesses(processes);
        this.renderSelectedActivityFromStorage();
    }

    static normalizeApiProcess(processo) {
        return {
            ...processo,
            id: processo.id,
            nome: processo.name || processo.nome,
            observacoes: processo.description || processo.observacoes || '',
            status_fase: processo.current_phase || processo.status_fase || 'PLAN',
            percentual_conclusao: Number(processo.progress_percent || processo.percentual_conclusao || 0),
            responsavel_id: processo.responsible_user_id || processo.responsavel_id || null,
            setor_id: processo.organizational_unit_id || processo.setor_id || null,
            createdByUserId: processo.created_by || processo.createdByUserId || null,
            phases: (Array.isArray(processo.phases) ? processo.phases : []).map((phase) => ({
                ...phase,
                name: phase.phase_name || phase.name,
                percentual: Number(phase.progress_percent || phase.progress || 0),
                activities: (Array.isArray(phase.activities) ? phase.activities : []).map((activity) => ({
                    ...activity,
                    code: activity.activity_code || activity.codigo || activity.code,
                    title: activity.title || activity.titulo,
                    descricao: activity.description || activity.descricao || '',
                    checklist: (Array.isArray(activity.checklist) ? activity.checklist : []).map((item) => ({
                        ...item,
                        itemId: item.id || item.itemId,
                        texto: item.description || item.descricao || item.texto,
                        concluido: Boolean(item.completed ?? item.concluido),
                        concluidoEm: item.completed_at || item.concluidoEm
                    }))
                }))
            }))
        };
    }

    static ensureLocalStorageVersion() {
        const storedVersion = localStorage.getItem(this.LOCALSTORAGE_VERSION_KEY);
        if (storedVersion !== this.LOCALSTORAGE_DATA_VERSION) {
            this.clearLegacyProcessStorage();
            localStorage.setItem(this.LOCALSTORAGE_VERSION_KEY, this.LOCALSTORAGE_DATA_VERSION);
        }

        if (!localStorage.getItem(this.LOCALSTORAGE_PROCESSES_KEY)) {
            localStorage.setItem(this.LOCALSTORAGE_PROCESSES_KEY, JSON.stringify([]));
        }

        this.migratePlanejarABContentSwap();
    }

    static migratePlanejarABContentSwap() {
        if (localStorage.getItem(this.PLANEJAR_AB_SWAP_KEY) === 'true') return;

        const processes = this.getStoredProcesses();
        processes.forEach(processo => {
            const phase = processo.phases?.find(item => item.name === 'Planejar');
            const activityA = phase?.activities?.find(item => item.code === 'PLAN_A');
            const activityB = phase?.activities?.find(item => item.code === 'PLAN_B');
            if (!activityA || !activityB) return;

            const payloadA = JSON.parse(JSON.stringify(activityA));
            const payloadB = JSON.parse(JSON.stringify(activityB));
            const copyPayload = (target, source) => {
                Object.keys(target).forEach(key => {
                    if (key !== 'code' && key !== 'title') delete target[key];
                });
                Object.entries(source).forEach(([key, value]) => {
                    if (key !== 'code' && key !== 'title') target[key] = value;
                });
            };

            copyPayload(activityA, payloadB);
            copyPayload(activityB, payloadA);
        });

        processes.forEach(processo => {
            (processo.teamMembers || []).forEach(member => {
                if (Array.isArray(member.assignedActivities)) {
                    member.assignedActivities = member.assignedActivities.map(code => {
                        if (code === 'PLAN_A') return 'PLAN_B';
                        if (code === 'PLAN_B') return 'PLAN_A';
                        return code;
                    });
                }
            });
        });

        this.setStoredProcesses(processes);
        localStorage.setItem(this.PLANEJAR_AB_SWAP_KEY, 'true');
    }

    static clearLegacyProcessStorage() {
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (!key) continue;

            if (key === this.LOCALSTORAGE_PROCESSES_KEY
                || key === this.LOCALSTORAGE_ACTIVITY_SELECTION_KEY
                || key.startsWith('phase-')
                || key.startsWith('processos-')
                || key.startsWith('processo-')) {
                keysToRemove.push(key);
            }
        }

        keysToRemove.forEach(key => localStorage.removeItem(key));
    }

    static getStoredProcesses() {
        if (this.BPM_DATA_SOURCE === 'API' && Array.isArray(this.apiProcesses)) {
            return this.apiProcesses;
        }
        try {
            return JSON.parse(localStorage.getItem(this.LOCALSTORAGE_PROCESSES_KEY)) || [];
        } catch (error) {
            return [];
        }
    }

    static setStoredProcesses(processes) {
        if (this.BPM_DATA_SOURCE === 'API') {
            this.apiProcesses = processes;
            return;
        }
        localStorage.setItem(this.LOCALSTORAGE_PROCESSES_KEY, JSON.stringify(processes));
    }

    static getStoredSelection() {
        const raw = localStorage.getItem(this.LOCALSTORAGE_ACTIVITY_SELECTION_KEY);
        if (!raw) return null;
        try {
            return JSON.parse(raw);
        } catch {
            return null;
        }
    }

    static setStoredSelection(selection) {
        localStorage.setItem(this.LOCALSTORAGE_ACTIVITY_SELECTION_KEY, JSON.stringify(selection));
    }

    static clearStoredSelection() {
        localStorage.removeItem(this.LOCALSTORAGE_ACTIVITY_SELECTION_KEY);
    }

    static getActivityDisplayTitle(activity) {
        if (!activity) return '';
        return this.ACTIVITY_DISPLAY_TITLES[activity.code] || activity.title || '';
    }

    static getBpmActivitySequence() {
        return this.BPM_ACTIVITY_SEQUENCE.map((phase) => ({ ...phase, activities: [...phase.activities] }));
    }

    static getPhaseCodeFromName(phaseName) {
        const match = this.getBpmActivitySequence().find((phase) => phase.phaseName === phaseName);
        return match?.phaseCode || phaseName;
    }

    static getCurrentActivityPosition(phaseCode, activityCode) {
        const sequence = this.getBpmActivitySequence();
        const normalizedPhaseCode = sequence.find((phase) => phase.phaseCode === phaseCode || phase.phaseName === phaseCode)?.phaseCode || phaseCode;
        const phaseIndex = sequence.findIndex((phase) => phase.phaseCode === normalizedPhaseCode);
        if (phaseIndex === -1) return null;
        const activityIndex = sequence[phaseIndex].activities.indexOf(activityCode);
        if (activityIndex === -1) return null;
        return {
            phaseIndex,
            activityIndex,
            phaseCode: sequence[phaseIndex].phaseCode,
            phaseName: sequence[phaseIndex].phaseName,
            activityCode
        };
    }

    static getNextBpmActivity(phaseCode, activityCode) {
        const sequence = this.getBpmActivitySequence();
        const normalizedPhaseCode = sequence.find((phase) => phase.phaseCode === phaseCode || phase.phaseName === phaseCode)?.phaseCode || phaseCode;
        const phaseIndex = sequence.findIndex((phase) => phase.phaseCode === normalizedPhaseCode);
        if (phaseIndex === -1) return null;
        const activityIndex = sequence[phaseIndex].activities.indexOf(activityCode);
        if (activityIndex === -1) return null;

        const currentPhase = sequence[phaseIndex];
        const nextActivityCode = currentPhase.activities[activityIndex + 1];
        if (nextActivityCode) {
            return {
                phaseCode: currentPhase.phaseCode,
                phaseName: currentPhase.phaseName,
                activityCode: nextActivityCode,
                activityTitle: this.ACTIVITY_DISPLAY_TITLES[nextActivityCode] || nextActivityCode,
                isNewPhase: false,
                isLastActivity: false
            };
        }

        const nextPhase = sequence[phaseIndex + 1];
        if (!nextPhase) {
            return null;
        }

        const firstActivityCode = nextPhase.activities[0];
        return {
            phaseCode: nextPhase.phaseCode,
            phaseName: nextPhase.phaseName,
            activityCode: firstActivityCode,
            activityTitle: this.ACTIVITY_DISPLAY_TITLES[firstActivityCode] || firstActivityCode,
            isNewPhase: true,
            isLastActivity: false
        };
    }

    static isLastBpmActivity(phaseCode, activityCode) {
        return this.getCurrentActivityPosition(phaseCode, activityCode)?.phaseCode === 'MONITORAR' && activityCode === 'MON_D';
    }

    static async advanceToNextActivity(processoId, phaseCode, activityCode) {
        const processes = this.getStoredProcesses();
        const processo = processes.find((p) => p.id === processoId);
        if (!processo) return false;

        const currentPhaseName = this.getBpmActivitySequence().find((phase) => phase.phaseCode === phaseCode)?.phaseName || phaseCode;
        const currentActivity = this.getProcessActivity(processo, currentPhaseName, activityCode);
        if (!currentActivity) return false;

        const saved = await this.saveActivity(processoId, currentPhaseName, activityCode);
        if (!saved) return false;

        // Before submitting, if we are in Desenhar and attempting to advance to Implementar,
        // validate the whole Desenhar phase and block advance if phase validation fails.
        if (currentPhaseName === 'Desenhar') {
            const phaseValidation = this.validateDesenharPhase(processo);
            if (!phaseValidation.valid) {
                // open the first failing activity and render its errors
                const firstFail = phaseValidation.missingByActivity[0];
                if (firstFail) {
                    // ensure Desenhar expanded and select activity
                    this.myProcessesState.expandedPhases[`${processo.id}:Desenhar`] = true;
                    this.setStoredSelection({ processoId: processo.id, phaseName: 'Desenhar', activityCode: firstFail.activityCode });
                    this.setStoredProcesses(processes);
                    this.recalculateAndRender(processoId);
                    this.selectActivity(processoId, 'Desenhar', firstFail.activityCode);
                    // render errors for that activity
                    this.renderDesenharRequirementErrors(firstFail.missingRequirements);
                }
                notificar('Não foi possível prosseguir para a fase Implementar.', 'warning');
                return false;
            }
        }

        if (currentPhaseName === 'Implementar') {
            const phaseValidation = this.validateImplementarPhase(processo);
            if (!phaseValidation.valid) {
                const firstFail = phaseValidation.missingByActivity[0];
                if (firstFail) {
                    this.myProcessesState.expandedPhases[`${processo.id}:Implementar`] = true;
                    this.setStoredSelection({ processoId: processo.id, phaseName: 'Implementar', activityCode: firstFail.activityCode });
                    this.setStoredProcesses(processes);
                    this.recalculateAndRender(processoId);
                    this.selectActivity(processoId, 'Implementar', firstFail.activityCode);
                    this.renderImplementarRequirementErrors(firstFail.missingRequirements);
                }
                notificar('Não foi possível prosseguir para a fase Monitorar.', 'warning');
                return false;
            }
        }

        const submitted = await this.submitActivity(processoId, currentPhaseName, activityCode);
        if (!submitted) return false;

        const next = this.getNextBpmActivity(phaseCode, activityCode);
        if (!next) {
            // If there is no next activity, we're attempting to complete the BPM cycle.
            // Validate Monitorar phase before allowing completion.
            const monitorValidation = this.validateMonitorarPhase(processo);
            if (!monitorValidation.valid) {
                const firstFail = monitorValidation.missingByActivity[0];
                if (firstFail) {
                    this.myProcessesState.expandedPhases[`${processo.id}:Monitorar`] = true;
                    this.setStoredSelection({ processoId: processo.id, phaseName: 'Monitorar', activityCode: firstFail.activityCode });
                    this.setStoredProcesses(processes);
                    this.recalculateAndRender(processoId);
                    this.selectActivity(processoId, 'Monitorar', firstFail.activityCode);
                    this.renderMonitorarRequirementErrors(firstFail.missingRequirements);
                }
                notificar('Não foi possível concluir o ciclo BPM.', 'warning');
                return false;
            }

            return await this.completeBpmCycle(processoId);
        }

        const nextPhaseName = next.phaseName;
        const nextActivityCode = next.activityCode;
        const nextPhase = processo.phases.find((phase) => phase.name === nextPhaseName);
        if (!nextPhase) return false;

        currentActivity.concluida = true;
        currentActivity.concluidoEm = new Date().toISOString();
        currentActivity.status = 'concluida';

        this.addActivityHistoryEntry(
            processo,
            currentPhaseName,
            activityCode,
            'Atividade concluída',
            `Atividade '${this.getActivityDisplayTitle(currentActivity)}' concluída. Processo avançado para '${next.activityTitle}'.`
        );

        const targetSelection = { processoId, phaseName: nextPhaseName, activityCode: nextActivityCode };
        this.myProcessesState.expandedProcessId = processoId;
        this.myProcessesState.expandedPhases[`${processoId}:${currentPhaseName}`] = true;
        this.myProcessesState.expandedPhases[`${processoId}:${nextPhaseName}`] = true;
        nextPhase.isExpanded = true;
        this.setStoredSelection(targetSelection);
        this.setStoredProcesses(processes);
        this.recalculateAndRender(processoId);
        this.selectActivity(processoId, nextPhaseName, nextActivityCode);

        const detailPanel = document.getElementById('process-detail-panel');
        if (detailPanel) detailPanel.scrollTop = 0;

        return true;
    }

    static async completeBpmCycle(processoId) {
        const processes = this.getStoredProcesses();
        const processo = processes.find((p) => p.id === processoId);
        if (!processo) return false;

        processo.cicloConcluido = true;
        processo.status_fase = 'Ciclo BPM concluído';
        processo.concluidoEm = new Date().toISOString();
        processo.percentual_conclusao = 100;

        this.addActivityHistoryEntry(
            processo,
            'Monitorar',
            'MON_D',
            'Ciclo BPM concluído',
            'Ciclo BPM concluído.'
        );

        this.setStoredProcesses(processes);
        this.recalculateAndRender(processoId);
        notificar('Ciclo BPM concluído com sucesso.', 'success');
        return true;
    }

    static renderActivityNavigationFooter(processo, phaseName, activityCode) {
        const phaseCode = this.getPhaseCodeFromName(phaseName);
        const next = this.getNextBpmActivity(phaseCode, activityCode);
        const isLast = this.isLastBpmActivity(phaseCode, activityCode);
        const nextActivityTitle = next?.activityTitle || '';
        const buttonLabel = 'Avançar Atividade';
        const ariaLabel = isLast
            ? 'Concluir a última atividade e encerrar o ciclo BPM'
            : `Concluir esta atividade e avançar para ${nextActivityTitle}`;

        return `
            <div class="activity-navigation-footer">
                <button
                    type="button"
                    class="btn btn-primary activity-advance-button"
                    data-action="advance-activity"
                    data-process-id="${processo.id}"
                    data-processo-id="${processo.id}"
                    data-phase-code="${phaseCode}"
                    data-phase="${phaseName}"
                    data-activity-code="${activityCode}"
                    data-activity="${activityCode}"
                    aria-label="${ariaLabel}"
                >
                    ${buttonLabel}
                </button>
            </div>
        `;
    }

    static getProcessActivity(processo, phaseName, activityCode) {
        if (!processo) return null;
        const phase = processo.phases.find((f) => f.name === phaseName);
        if (!phase) return null;
        return phase.activities.find((a) => a.code === activityCode) || null;
    }

    static ensureActivityData(processo, phaseName, activityCode) {
        const activity = this.getProcessActivity(processo, phaseName, activityCode);
        if (!activity) return null;
        activity.content = activity.content || {};
        activity.attachments = activity.attachments || [];
        activity.history = activity.history || [];
        activity.checklist = activity.checklist || [];
        return activity;
    }

    static addActivityHistoryEntry(processo, phaseName, activityCode, action, summary) {
        const processes = this.getStoredProcesses();
        const existingProcess = processes.find(p => p.id === processo.id) || processo;
        const activity = this.ensureActivityData(existingProcess, phaseName, activityCode);
        if (!activity) return;
        const now = new Date().toISOString();
        const user = window.app?.currentUser?.nome || 'Usuário';
        activity.history.push({
            id: Date.now() + Math.floor(Math.random() * 1000),
            action,
            user,
            date: now,
            activityTitle: activity.title || this.getActivityDisplayTitle(activity),
            summary: summary || '',
        });
        this.setStoredProcesses(processes);
    }

    static renderActivityHistorySection(processoId, phaseName, activityCode) {
        const processes = this.getStoredProcesses();
        const processo = processes.find((p) => p.id === processoId);
        if (!processo) return '';
        const activity = this.getProcessActivity(processo, phaseName, activityCode);
        if (!activity) return '';
        const history = (activity.history || []).slice().reverse();
        if (!history.length) {
            return `
                <div class="activity-section">
                    <h4>Histórico</h4>
                    <div class="history-item">Nenhum histórico disponível.</div>
                </div>
            `;
        }
        return `
            <div class="activity-section">
                <h4>Histórico</h4>
                <div class="history-list">
                    ${history.map(entry => `
                        <div class="history-item">
                            <div><strong>${entry.action}</strong> — ${entry.summary}</div>
                            <div class="small text-muted">${entry.user} • ${formatarDataHora(entry.date)}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    static renderSituationalReportSection(processoId, phaseName, activityCode) {
        const processes = this.getStoredProcesses();
        const processo = processes.find((p) => p.id === processoId);
        if (!processo) return '';
        const activity = this.getProcessActivity(processo, phaseName, activityCode);
        if (!activity) return '';

        const attachments = (activity.attachments || []).filter((a) => a.label === 'Relatório Situacional' && !a.removed);
        const allAttachments = (activity.attachments || []).filter((a) => a.label === 'Relatório Situacional');
        const currentAttachment = attachments.find((a) => a.current === true) || attachments[attachments.length - 1] || null;
        const seiProcessNumber = String(activity.content?.seiProcessNumber || '').trim();

        const attachmentRows = attachments.length ? attachments.map((file) => `
            <div class="attachment-row ${file.current ? 'attachment-current' : ''}">
                <div class="attachment-meta">
                    <strong>${file.name}</strong>
                    <div>${file.type || 'N/A'} • ${file.size || '-'} • ${formatarData(file.uploadedAt)} • Versão ${file.version || '1'}</div>
                    <div><strong>Número SEI:</strong> ${file.seiProcessNumber || seiProcessNumber || 'Não informado'}</div>
                    <div><strong>Descrição:</strong> ${file.description || 'Sem descrição'}</div>
                    <div><strong>Responsável:</strong> ${file.createdBy || 'Usuário'}</div>
                    <div><strong>Status:</strong> ${file.status || 'Ativo'}</div>
                </div>
                <div class="attachment-actions">
                    ${!file.current ? `<button type="button" class="btn btn-link" data-action="mark-current-attachment" data-processo-id="${processoId}" data-phase="${phaseName}" data-phase-code="${phaseName}" data-activity="${activityCode}" data-activity-code="${activityCode}" data-attachment-id="${file.id}">Marcar atual</button>` : ''}
                    <button type="button" class="btn btn-link text-danger" data-action="remove-attachment" data-processo-id="${processoId}" data-phase="${phaseName}" data-phase-code="${phaseName}" data-activity="${activityCode}" data-activity-code="${activityCode}" data-attachment-id="${file.id}">Remover</button>
                </div>
            </div>
        `).join('') : '<p class="text-muted">Nenhum relatório situacional cadastrado.</p>';

        const historyRows = allAttachments.length ? allAttachments.map((file, idx) => `
            <div class="attachment-history-item">
                <strong>Versão ${file.version || idx + 1}</strong> • ${file.name} • ${file.seiProcessNumber || seiProcessNumber || '-'} • ${file.description || 'Sem descrição'} • ${formatarDataHora(file.uploadedAt)}
                ${file.removed ? '<span class="text-danger">(Removido)</span>' : ''}
            </div>
        `).join('') : '<p class="text-muted">Nenhuma versão registrada.</p>';

        return `
            <div class="activity-section">
                <h4>Relatório Situacional</h4>
                <div class="activity-section field-required" data-requirement-key="seiProcessNumber" aria-required="true" data-required="true">
                    <label for="monitor-sei-process-number-${processoId}-${activityCode}">Número do Processo SEI</label>
                    <input id="monitor-sei-process-number-${processoId}-${activityCode}" name="seiProcessNumber" type="text" maxlength="50" autocomplete="off" placeholder="Digite o número do processo no SEI" value="${seiProcessNumber}" required />
                    <div class="small text-muted">Use números, pontos, barras, hífens e espaços.</div>
                    <div class="field-help" id="monitor-sei-process-number-error-${processoId}-${activityCode}"></div>
                </div>
                <div class="file-upload-row">
                    <div class="activity-section">
                        <label for="detail-situational-file-${processoId}-${activityCode}">Arquivo do Relatório Situacional</label>
                        <input type="file" id="detail-situational-file-${processoId}-${activityCode}" />
                        <div class="field-help" id="detail-situational-file-error-${processoId}-${activityCode}"></div>
                    </div>
                    <div class="activity-section">
                        <label for="detail-situational-description-${processoId}-${activityCode}">Descrição do arquivo</label>
                        <input type="text" id="detail-situational-description-${processoId}-${activityCode}" placeholder="Descrição" value="${currentAttachment?.description || ''}" />
                    </div>
                    <div class="activity-section">
                        <label for="detail-situational-version-${processoId}-${activityCode}">Versão</label>
                        <input type="text" id="detail-situational-version-${processoId}-${activityCode}" placeholder="Versão" value="${currentAttachment?.version || ''}" />
                        <div class="field-help" id="detail-situational-version-error-${processoId}-${activityCode}"></div>
                    </div>
                    <div class="activity-section">
                        <button type="button" class="btn btn-primary btn-small" data-action="save-situational-report" data-processo-id="${processoId}" data-process-id="${processoId}" data-phase="${phaseName}" data-phase-code="${phaseName}" data-activity="${activityCode}" data-activity-code="${activityCode}">Salvar</button>
                    </div>
                </div>
                <div class="activity-section">
                    ${attachmentRows}
                </div>
                <div class="activity-section">
                    <h5>Histórico de versões</h5>
                    ${historyRows}
                </div>
            </div>
        `;
    }

    static renderActivityAttachmentsSection(processoId, phaseName, activityCode, attachmentLabel) {
        const processes = this.getStoredProcesses();
        const processo = processes.find((p) => p.id === processoId);
        if (!processo) return '';
        const activity = this.getProcessActivity(processo, phaseName, activityCode);
        if (!activity) return '';
        const attachments = (activity.attachments || []).filter(a => a.label === attachmentLabel && !a.removed);
        const allAttachments = (activity.attachments || []).filter(a => a.label === attachmentLabel);
        const currentAttachment = attachments.find(a => a.isCurrent) || attachments[attachments.length - 1] || null;

        const requiredAttachment = this.isPlanejarRequirementRequired(activityCode, {
            'Anexo III — Cronograma': 'cronograma',
            'Documentação Existente': 'documentacao',
            'DEIP - Diagrama de Escopo e Interface': 'deip',
            'Anexo II': 'anexoII',
            'Ata de Validação': 'ata'
        }[attachmentLabel] || '') || (this.getAnalisarActivityRules(activityCode) && Object.values(this.getAnalisarActivityRules(activityCode)).some(rule => rule.attachmentLabel === attachmentLabel)) || (this.getDesenharActivityRules(activityCode) && (this.getDesenharActivityRules(activityCode).requiredAttachments || []).includes(attachmentLabel)) || (this.getImplementarActivityRules(activityCode) && (this.getImplementarActivityRules(activityCode).requiredAttachments || []).includes(attachmentLabel)) || (this.getMonitorarActivityRules(activityCode) && (this.getMonitorarActivityRules(activityCode).requiredAttachments || []).includes(attachmentLabel));

        const requirementKey = {
            'Fluxograma AS-IS': 'fluxogramaAsIs',
            'Anexo IV': activityCode === 'ANAL_C' ? 'anexoIv' : 'anexoIv',
            'Anexo I (Redesenhado)': 'anexoI',
            'Anexo I': 'anexoI',
            'Fluxo TO BE': 'fluxoToBe',
            'Anexo VI': 'anexoVI',
            'Anexo VII': 'anexoVII',
            'Anexo VIII': 'anexoVIII',
            'Relatório de Acompanhamento': 'relatorioAcompanhamento',
            'Relatório Situacional': 'relatorioSituacional'
        }[attachmentLabel] || 'attachment';

        const attachmentRows = attachments.length ? attachments.map((file) => `
            <div class="attachment-row ${file.isCurrent ? 'attachment-current' : ''}">
                <div class="attachment-meta">
                    <strong>${file.name}</strong>
                    <div>${file.type || 'N/A'} • ${file.size || '-'} • ${formatarData(file.uploadedAt)} ${file.version ? `• Versão ${file.version}` : ''}</div>
                    <div>${file.description || 'Sem descrição'}</div>
                    <div>${file.status || 'Ativo'}</div>
                </div>
                <div class="attachment-actions">
                    ${!file.isCurrent ? `<button type="button" class="btn btn-link" data-action="mark-current-attachment" data-processo-id="${processoId}" data-phase="${phaseName}" data-phase-code="${phaseName}" data-activity="${activityCode}" data-activity-code="${activityCode}" data-attachment-id="${file.id}">Marcar atual</button>` : ''}
                    <button type="button" class="btn btn-link text-danger" data-action="remove-attachment" data-processo-id="${processoId}" data-phase="${phaseName}" data-phase-code="${phaseName}" data-activity="${activityCode}" data-activity-code="${activityCode}" data-attachment-id="${file.id}">Remover</button>
                </div>
            </div>
        `).join('') : '<p class="text-muted">Nenhum anexo disponível.</p>';

        const allVersions = allAttachments.length ? allAttachments.map((file, idx) => `
            <div class="attachment-history-item">
                <strong>Versão ${file.version || idx + 1}</strong> • ${file.name} • ${file.type || 'N/A'} • ${formatarDataHora(file.uploadedAt)}
                ${file.removed ? '<span class="text-danger">(Removido)</span>' : ''}
            </div>
        `).join('') : '<p class="text-muted">Nenhuma versão registrada.</p>';

        const titleClass = requiredAttachment ? 'required-section-title' : '';
        const sectionClass = requiredAttachment ? 'required-section' : 'attachment-section';
        const sectionRequiredAttribute = requiredAttachment ? 'aria-required="true" data-required="true"' : '';

        // Caption for specific attachment labels
        const attachmentCaption = attachmentLabel === 'Anexo VIII' ? `<div class="attachment-caption">PROCEDIMENTO OPERACIONAL PADRÃO</div>` : '';

        return `
            <div class="activity-section ${sectionClass}" data-requirement-key="${requirementKey}" ${sectionRequiredAttribute}>
                ${attachmentCaption}
                <h4 class="${titleClass}">${attachmentLabel}</h4>
                <div class="file-upload-row">
                    <input type="file" id="detail-upload-file-${activityCode}" ${requiredAttachment ? 'required aria-required="true" data-required="true"' : ''} />
                    <input type="text" id="detail-attachment-description-${activityCode}" placeholder="Descrição do arquivo" ${requiredAttachment ? 'aria-required="true" data-required="true"' : ''} />
                    <input type="text" id="detail-attachment-version-${activityCode}" placeholder="Versão" ${requiredAttachment ? 'required aria-required="true" data-required="true"' : ''} />
                    <button type="button" class="btn btn-primary btn-small" data-action="upload-file" data-processo-id="${processoId}" data-process-id="${processoId}" data-phase="${phaseName}" data-phase-code="${phaseName}" data-activity="${activityCode}" data-activity-code="${activityCode}" data-attachment-label="${attachmentLabel}">Anexar</button>
                </div>
                <div class="activity-section">
                    ${attachmentRows}
                </div>
                <div class="activity-section">
                    <h5>Histórico de versões</h5>
                    ${allVersions}
                </div>
            </div>
        `;
    }

    static getDesenharIndicators(processo) {
        const activity = this.getProcessActivity(processo, 'Desenhar', 'DES_E');
        return (activity?.content?.indicators || []).filter(i => i.active !== false);
    }

    static renderImplementationIndicatorsSection(processo, phaseName, activityCode) {
        const indicators = this.getDesenharIndicators(processo);
        if (!indicators.length) {
            return `
                <div class="activity-section">
                    <p class="text-muted">Nenhum indicador foi definido na fase Desenhar.</p>
                </div>
            `;
        }

        return `
            <div class="implementation-indicators-list">
                ${indicators.map((indicator) => `
                    <div class="indicator-card">
                        <div class="indicator-card-header">
                            <strong>${indicator.name || indicator.nome || 'Indicador sem nome'}</strong>
                        </div>
                        <div class="indicator-details">
                            <div><strong>Descrição:</strong> ${indicator.description || indicator.descricao || '-'}</div>
                            <div><strong>Unidade:</strong> ${indicator.unit || indicator.unidade_medida || '-'}</div>
                            <div><strong>Linha de base:</strong> ${indicator.baseline || indicator.valor_atual || '-'}</div>
                            <div><strong>Meta:</strong> ${indicator.targetValue || indicator.valor_meta || '-'}</div>
                            <div><strong>Periodicidade:</strong> ${indicator.periodicity || indicator.periodicidade || '-'}</div>
                            <div><strong>Responsável:</strong> ${indicator.responsible || indicator.responsavel || '-'}</div>
                            <div><strong>Status:</strong> ${indicator.status || 'Não informado'}</div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    static renderImplementationFollowUpSection(processo, phaseName, activityCode) {
        const indicators = this.getDesenharIndicators(processo);
        const activity = this.getProcessActivity(processo, phaseName, activityCode);
        const records = activity?.content?.implementationRecords || [];

        if (!indicators.length) {
            return `
                <div class="activity-section">
                    <p class="text-muted">Nenhum indicador foi definido na fase Desenhar.</p>
                </div>
            `;
        }

        return `
            <div class="implementation-followup-list">
                ${indicators.map((indicator) => {
                    const record = records.find(r => String(r.indicatorId) === String(indicator.id)) || {};
                    const needsContra = record.targetReached === 'Não';
                    return `
                        <div class="implementation-indicator-row ${needsContra ? 'implementation-alert' : ''}">
                            <div class="implementation-indicator-header">
                                <strong>${indicator.name || indicator.nome || 'Indicador sem nome'}</strong>
                                ${needsContra ? '<span class="badge badge-warning">Contra Medida recomendada</span>' : ''}
                            </div>
                            <div class="form-row">
                                <label>Status da implantação</label>
                                <select id="impl-status-${processo.id}-${activityCode}-${indicator.id}">
                                    <option value="">Selecione</option>
                                    <option value="Não iniciada" ${record.implementationStatus === 'Não iniciada' ? 'selected' : ''}>Não iniciada</option>
                                    <option value="Em implantação" ${record.implementationStatus === 'Em implantação' ? 'selected' : ''}>Em implantação</option>
                                    <option value="Implantada" ${record.implementationStatus === 'Implantada' ? 'selected' : ''}>Implantada</option>
                                    <option value="Suspensa" ${record.implementationStatus === 'Suspensa' ? 'selected' : ''}>Suspensa</option>
                                </select>
                            </div>
                            <div class="form-row">
                                <label>Resultado atual</label>
                                <input type="text" id="impl-current-${processo.id}-${activityCode}-${indicator.id}" value="${record.currentResult || ''}" placeholder="Resultado atual" />
                                <label>Data da medição</label>
                                <input type="date" id="impl-date-${processo.id}-${activityCode}-${indicator.id}" value="${record.measurementDate || ''}" />
                            </div>
                            <div class="form-row">
                                <label>Percentual de implantação</label>
                                <input type="number" min="0" max="100" id="impl-percent-${processo.id}-${activityCode}-${indicator.id}" value="${record.implementationPercentage != null ? record.implementationPercentage : ''}" placeholder="0-100" />
                                <label>Meta atingida</label>
                                <select id="impl-target-${processo.id}-${activityCode}-${indicator.id}">
                                    <option value="">Selecione</option>
                                    <option value="Sim" ${record.targetReached === 'Sim' ? 'selected' : ''}>Sim</option>
                                    <option value="Não" ${record.targetReached === 'Não' ? 'selected' : ''}>Não</option>
                                    <option value="Não avaliada" ${record.targetReached === 'Não avaliada' ? 'selected' : ''}>Não avaliada</option>
                                </select>
                            </div>
                            <div class="form-row">
                                <label>Observações</label>
                                <textarea id="impl-observations-${processo.id}-${activityCode}-${indicator.id}" rows="2" placeholder="Observações">${record.observations || ''}</textarea>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    static renderContraMedidasSection(processo, phaseName, activityCode) {
        const indicators = this.getDesenharIndicators(processo);
        const activity = this.getProcessActivity(processo, phaseName, activityCode);
        const contraMedidas = (activity?.content?.contraMedidas || []).filter(cm => cm.active !== false);
        const editingId = this.editingContraMedidaId;
        const editing = contraMedidas.find(cm => String(cm.id) === String(editingId));
        const selectedIndicatorId = editing?.indicatorId || '';

        return `
            <div class="contra-medidas-section">
                <div class="activity-section">
                    <h5>${editing ? 'Editar Contra Medida' : 'Adicionar Contra Medida'}</h5>
                    <div class="form-row">
                        <label>Indicador relacionado</label>
                        <select id="contra-indicator-${processo.id}-${activityCode}">
                            <option value="">Selecione um indicador</option>
                            ${indicators.map(ind => `<option value="${ind.id}" ${String(ind.id) === String(selectedIndicatorId) ? 'selected' : ''}>${ind.name || ind.nome || 'Indicador'}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-row">
                        <label>Identificação da Contra Medida</label>
                        <input type="text" id="contra-title-${processo.id}-${activityCode}" placeholder="Título da contra medida" value="${editing?.title || ''}" />
                    </div>
                    <div class="form-row">
                        <label>Motivo do não atingimento</label>
                        <textarea id="contra-reason-${processo.id}-${activityCode}" rows="2" placeholder="Motivo">${editing?.reason || ''}</textarea>
                    </div>
                    <div class="form-row">
                        <label>Ação proposta</label>
                        <textarea id="contra-action-${processo.id}-${activityCode}" rows="2" placeholder="Ação proposta">${editing?.proposedAction || ''}</textarea>
                    </div>
                    <div class="form-row">
                        <label>Responsável</label>
                        <input type="text" id="contra-responsible-${processo.id}-${activityCode}" placeholder="Responsável" value="${editing?.responsible || ''}" />
                        <label>Prazo</label>
                        <input type="date" id="contra-deadline-${processo.id}-${activityCode}" value="${editing?.deadline || ''}" />
                    </div>
                    <div class="form-row">
                        <label>Status</label>
                        <select id="contra-status-${processo.id}-${activityCode}">
                            <option value="Pendente" ${editing?.status === 'Pendente' ? 'selected' : ''}>Pendente</option>
                            <option value="Em andamento" ${editing?.status === 'Em andamento' ? 'selected' : ''}>Em andamento</option>
                            <option value="Concluída" ${editing?.status === 'Concluída' ? 'selected' : ''}>Concluída</option>
                            <option value="Cancelada" ${editing?.status === 'Cancelada' ? 'selected' : ''}>Cancelada</option>
                        </select>
                    </div>
                    <div class="form-row">
                        <label>Observações</label>
                        <textarea id="contra-observations-${processo.id}-${activityCode}" rows="2" placeholder="Observações">${editing?.observations || ''}</textarea>
                    </div>
                    <div class="form-row">
                        <button type="button" class="btn btn-primary btn-small" data-action="contra-medida-save" data-processo-id="${processo.id}" data-phase="${phaseName}" data-phase-code="${phaseName}" data-activity="${activityCode}" data-activity-code="${activityCode}">${editing ? 'Salvar edição' : 'Adicionar contra medida'}</button>
                        ${editing ? `<button type="button" class="btn btn-secondary btn-small" data-action="contra-medida-cancel" data-processo-id="${processo.id}" data-phase="${phaseName}" data-phase-code="${phaseName}" data-activity="${activityCode}" data-activity-code="${activityCode}">Cancelar</button>` : ''}
                    </div>
                </div>
                <div class="activity-section">
                    <h5>Contra Medidas cadastradas</h5>
                    ${contraMedidas.length ? contraMedidas.map(cm => `
                        <div class="contra-medida-item ${cm.status === 'Pendente' ? 'contra-pendente' : cm.status === 'Em andamento' ? 'contra-andamento' : cm.status === 'Concluída' ? 'contra-concluida' : 'contra-cancelada'}">
                            <div class="contra-medida-header">
                                <strong>${cm.title}</strong>
                                <span class="badge badge-${cm.status === 'Pendente' ? 'warning' : cm.status === 'Em andamento' ? 'info' : cm.status === 'Concluída' ? 'success' : 'danger'}">${cm.status}</span>
                            </div>
                            <div><strong>Indicador:</strong> ${this.getDesenharIndicators(processo).find(i => String(i.id) === String(cm.indicatorId))?.name || '-'}</div>
                            <div><strong>Motivo:</strong> ${cm.reason || '-'}</div>
                            <div><strong>Ação proposta:</strong> ${cm.proposedAction || '-'}</div>
                            <div><strong>Responsável:</strong> ${cm.responsible || '-'}</div>
                            <div><strong>Prazo:</strong> ${cm.deadline || '-'}</div>
                            <div><strong>Observações:</strong> ${cm.observations || '-'}</div>
                            <div class="form-row">
                                <button type="button" class="btn btn-link" data-action="contra-medida-edit" data-processo-id="${processo.id}" data-phase="${phaseName}" data-phase-code="${phaseName}" data-activity="${activityCode}" data-activity-code="${activityCode}" data-contramedida-id="${cm.id}">Editar</button>
                                <button type="button" class="btn btn-link text-danger" data-action="contra-medida-remove" data-processo-id="${processo.id}" data-phase="${phaseName}" data-phase-code="${phaseName}" data-activity="${activityCode}" data-activity-code="${activityCode}" data-contramedida-id="${cm.id}">Remover</button>
                            </div>
                        </div>
                    `).join('') : '<p class="text-muted">Nenhuma contra medida registrada.</p>'}
                </div>
            </div>
        `;
    }

    static renderImplementationChecklistSection(processoId, phaseName, activityCode) {
        const processes = this.getStoredProcesses();
        const processo = processes.find(p => p.id === processoId);
        if (!processo) return '';
        const phase = processo.phases.find(f => f.name === phaseName);
        if (!phase) return '';
        const activity = phase.activities.find(a => a.code === activityCode);
        if (!activity) return '';
        activity.checklist = activity.checklist || [];

        const indicators = this.getDesenharIndicators(processo);
        const hasNotReached = (activity.content?.implementationRecords || []).some(r => r.targetReached === 'Não');

        if (!activity.checklist.length) {
            activity.checklist.push({ itemId: `${Date.now()}-1`, texto: 'Implantação dos indicadores acompanhada', concluido: false, observacao: '', responsavel: '', concluidoEm: null, atualizadoEm: null });
            activity.checklist.push({ itemId: `${Date.now()}-2`, texto: 'Contra Medidas registradas quando necessárias', concluido: false, observacao: '', responsavel: '', concluidoEm: null, atualizadoEm: null });
            this.setStoredProcesses(processes);
        }

        const itemsHtml = activity.checklist.map((item, index) => {
            const isSecond = index === 1;
            const aplicavel = !isSecond || hasNotReached;
            const label = isSecond && !aplicavel ? `${item.texto} (Não aplicável)` : item.texto;
            const checked = item.concluido ? 'checked' : '';
            return `
                <div class="checklist-item ${!aplicavel ? 'not-applicable' : ''}" data-item-id="${item.itemId}">
                    <label>
                        <input type="checkbox" data-action="activity-toggle-item" data-processo-id="${processoId}" data-activity="${activityCode}" data-item-id="${item.itemId}" ${checked} ${!aplicavel ? 'disabled' : ''} />
                        ${label}
                    </label>
                    <div class="checklist-meta">
                        <input type="text" placeholder="Responsável" data-action="activity-save-responsible" data-processo-id="${processoId}" data-activity="${activityCode}" data-item-id="${item.itemId}" value="${item.responsavel || ''}" />
                        <input type="text" placeholder="Observação" data-action="activity-save-observation" data-processo-id="${processoId}" data-activity="${activityCode}" data-item-id="${item.itemId}" value="${item.observacao || ''}" />
                        <span class="small text-muted">${item.concluido && item.concluidoEm ? new Date(item.concluidoEm).toLocaleString() : ''}${item.atualizadoEm ? ` • Atualizado em ${new Date(item.atualizadoEm).toLocaleString()}` : ''}</span>
                    </div>
                </div>
            `;
        }).join('');

        const progress = this.calculateActivityProgress(processoId, phaseName, activityCode);

        return `
            <div class="activity-section activity-checklist">
                <h4>Checklist</h4>
                <div class="activity-progress">Progresso da atividade: ${progress}%</div>
                <div class="checklist-list">
                    ${itemsHtml}
                </div>
            </div>
        `;
    }

    static saveContraMedida(processoId, phaseName, activityCode) {
        const indicatorEl = document.getElementById(`contra-indicator-${processoId}-${activityCode}`);
        const titleEl = document.getElementById(`contra-title-${processoId}-${activityCode}`);
        const reasonEl = document.getElementById(`contra-reason-${processoId}-${activityCode}`);
        const actionEl = document.getElementById(`contra-action-${processoId}-${activityCode}`);
        const responsibleEl = document.getElementById(`contra-responsible-${processoId}-${activityCode}`);
        const deadlineEl = document.getElementById(`contra-deadline-${processoId}-${activityCode}`);
        const statusEl = document.getElementById(`contra-status-${processoId}-${activityCode}`);
        const observationsEl = document.getElementById(`contra-observations-${processoId}-${activityCode}`);

        const indicatorId = indicatorEl?.value;
        const title = titleEl?.value.trim() || '';
        const reason = reasonEl?.value.trim() || '';
        const proposedAction = actionEl?.value.trim() || '';
        const responsible = responsibleEl?.value.trim() || '';
        const deadline = deadlineEl?.value || '';
        const status = statusEl?.value || 'Pendente';
        const observations = observationsEl?.value.trim() || '';

        if (!indicatorId) {
            notificar('Selecione um indicador relacionado.', 'warning');
            return;
        }
        if (!title && !reason && !proposedAction && !responsible && !observations) {
            notificar('Preencha ao menos um campo para salvar a contra medida.', 'warning');
            return;
        }

        const processes = this.getStoredProcesses();
        const processo = processes.find(p => p.id === processoId);
        if (!processo) return;

        const phase = processo.phases.find((f) => f.name === phaseName);
        const activity = phase?.activities.find((a) => a.code === activityCode);
        if (!activity) return;

        activity.content = activity.content || {};
        activity.content.contraMedidas = activity.content.contraMedidas || [];

        const existingIndex = activity.content.contraMedidas.findIndex(cm => String(cm.id) === String(this.editingContraMedidaId));
        const now = new Date().toISOString();
        const contra = {
            id: existingIndex >= 0 ? activity.content.contraMedidas[existingIndex].id : Date.now(),
            processId: processoId,
            indicatorId: parseInt(indicatorId, 10),
            activityCode,
            title,
            reason,
            proposedAction,
            responsible,
            deadline,
            status,
            observations,
            active: true,
            createdAt: existingIndex >= 0 ? activity.content.contraMedidas[existingIndex].createdAt : now,
            updatedAt: now
        };

        const duplicate = activity.content.contraMedidas.find(cm => cm.active !== false && cm.indicatorId === contra.indicatorId && cm.title === contra.title && cm.id !== contra.id);
        if (duplicate) {
            notificar('Contra Medida semelhante já existe para este indicador.', 'warning');
            return;
        }

        if (existingIndex >= 0) {
            activity.content.contraMedidas[existingIndex] = contra;
            this.addActivityHistoryEntry(processo, phaseName, activityCode, 'Contra Medida editada', `Contra Medida '${contra.title}' atualizada para o indicador.`);
        } else {
            activity.content.contraMedidas.push(contra);
            this.addActivityHistoryEntry(processo, phaseName, activityCode, 'Contra Medida adicionada', `Contra Medida '${contra.title}' adicionada ao indicador.`);
        }

        this.editingContraMedidaId = null;
        this.setStoredProcesses(processes);
        this.recalculateAndRender(processoId);
        notificar('Contra Medida salva localmente.', 'success');
    }

    static startEditContraMedida(processoId, phaseName, activityCode, contraMedidaId) {
        this.editingContraMedidaId = contraMedidaId;
        this.renderActivityDetail(processoId, phaseName, activityCode);
    }

    static cancelContraMedidaEdit(processoId, phaseName, activityCode) {
        this.editingContraMedidaId = null;
        this.renderActivityDetail(processoId, phaseName, activityCode);
    }

    static async removeContraMedida(processoId, phaseName, activityCode, contraMedidaId) {
        if (!confirm('Deseja remover esta Contra Medida?')) return;
        const processes = this.getStoredProcesses();
        const processo = processes.find(p => p.id === processoId);
        if (!processo) return;

        const phase = processo.phases.find((f) => f.name === phaseName);
        const activity = phase?.activities.find((a) => a.code === activityCode);
        if (!activity) return;

        activity.content = activity.content || {};
        activity.content.contraMedidas = (activity.content.contraMedidas || []).map(cm => {
            if (String(cm.id) === String(contraMedidaId)) {
                return { ...cm, active: false, updatedAt: new Date().toISOString() };
            }
            return cm;
        });

        this.addActivityHistoryEntry(processo, phaseName, activityCode, 'Contra Medida removida', `Contra Medida removida da atividade.`);
        this.setStoredProcesses(processes);
        this.recalculateAndRender(processoId);
        notificar('Contra Medida removida localmente.', 'success');
    }

    static saveImplementationRecords(processoId, phaseName, activityCode) {
        const processes = this.getStoredProcesses();
        const processo = processes.find(p => p.id === processoId);
        if (!processo) return;
        const activity = this.getProcessActivity(processo, phaseName, activityCode);
        if (!activity) return;
        const indicators = this.getDesenharIndicators(processo);
        activity.content = activity.content || {};
        activity.content.implementationRecords = activity.content.implementationRecords || [];

        const updatedRecords = indicators.map(indicator => {
            const id = indicator.id;
            const status = document.getElementById(`impl-status-${processoId}-${activityCode}-${id}`)?.value || '';
            const currentResult = document.getElementById(`impl-current-${processoId}-${activityCode}-${id}`)?.value.trim() || '';
            const measurementDate = document.getElementById(`impl-date-${processoId}-${activityCode}-${id}`)?.value || '';
            const implementationPercentageValue = document.getElementById(`impl-percent-${processoId}-${activityCode}-${id}`)?.value;
            const implementationPercentage = implementationPercentageValue !== undefined && implementationPercentageValue !== null && implementationPercentageValue !== '' ? parseInt(implementationPercentageValue, 10) : null;
            const targetReached = document.getElementById(`impl-target-${processoId}-${activityCode}-${id}`)?.value || '';
            const observations = document.getElementById(`impl-observations-${processoId}-${activityCode}-${id}`)?.value.trim() || '';
            const existing = activity.content.implementationRecords.find(r => String(r.indicatorId) === String(id));

            if (!status && !currentResult && !measurementDate && implementationPercentage == null && !targetReached && !observations) {
                return existing || null;
            }

            return {
                id: existing ? existing.id : Date.now() + Math.floor(Math.random() * 1000),
                processId: processoId,
                indicatorId: id,
                activityCode,
                implementationStatus: status,
                currentResult,
                measurementDate,
                implementationPercentage,
                targetReached,
                observations,
                createdAt: existing ? existing.createdAt : new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
        }).filter(Boolean);

        activity.content.implementationRecords = updatedRecords;
        this.setStoredProcesses(processes);
        this.addActivityHistoryEntry(processo, phaseName, activityCode, 'Acompanhamento atualizado', 'Dados de acompanhamento dos indicadores atualizados.');
        this.recalculateAndRender(processoId);
        notificar('Acompanhamento salvo localmente.', 'success');
    }

    static renderActivityIndicatorSection(processoId, phaseName, activityCode) {
        const processes = this.getStoredProcesses();
        const processo = processes.find((p) => p.id === processoId);
        if (!processo) return '';
        const activity = this.getProcessActivity(processo, phaseName, activityCode);
        if (!activity) return '';
        const indicators = (activity.content?.indicators || []).filter(i => i.active !== false);
        const editingId = this.editingIndicatorId || null;
        const editingIndicator = editingId ? indicators.find(i => String(i.id) === String(editingId)) : null;
        const formTitle = editingIndicator ? 'Editar indicador' : 'Cadastrar novo indicador';
        const indicatorFormValues = editingIndicator || {};
        const originLabel = phaseName === 'Desenhar' ? 'Fase Desenhar' : 'Fase Analisar';
        const rows = indicators.length ? indicators.map(ind => `
            <div class="indicator-row" data-indicator-id="${ind.id}">
                <div class="indicator-row-body">
                    <strong>${ind.name}</strong>
                    <div>${ind.description || ''}</div>
                    <div class="small text-muted">Resultado atual: ${ind.currentValue || '-'} • Linha de base: ${ind.baseline || '-'} • Unidade: ${ind.unit || '-'}</div>
                    <div class="small text-muted">Periodicidade: ${ind.periodicity || '-'} • Fonte: ${ind.source || '-'} • Responsável: ${ind.responsible || '-'}</div>
                    <div class="small text-muted">Data de referência: ${ind.referenceDate || '-'} • Origem: ${originLabel}</div>
                </div>
                <div class="indicator-row-actions">
                    <button type="button" class="btn btn-link" data-action="activity-edit-indicator" data-processo-id="${processoId}" data-phase="${phaseName}" data-phase-code="${phaseName}" data-activity="${activityCode}" data-indicator-id="${ind.id}">Editar</button>
                    <button type="button" class="btn btn-link text-danger" data-action="activity-delete-indicator" data-processo-id="${processoId}" data-phase="${phaseName}" data-phase-code="${phaseName}" data-activity="${activityCode}" data-indicator-id="${ind.id}">Remover</button>
                </div>
            </div>
        `).join('') : '<p class="text-muted">Nenhum indicador cadastrado.</p>';
        return `
            <div class="activity-section">
                <div class="activity-section-header">
                    <h4>Indicadores atuais</h4>
                    <button type="button" class="btn btn-link" data-action="open-indicators-tab" data-processo-id="${processoId}" data-activity="${activityCode}">Ver na aba Indicadores</button>
                </div>
                <div class="indicator-form">
                    <h5>${formTitle}</h5>
                    <div class="form-row">
                        <input type="text" id="indicator-name-${processoId}" placeholder="Nome" value="${indicatorFormValues.name || ''}" />
                        <input type="text" id="indicator-unit-${processoId}" placeholder="Unidade de medida" value="${indicatorFormValues.unit || ''}" />
                    </div>
                    <div class="form-row">
                        <textarea id="indicator-description-${processoId}" rows="2" placeholder="Descrição">${indicatorFormValues.description || ''}</textarea>
                    </div>
                    <div class="form-row">
                        <input type="text" id="indicator-current-value-${processoId}" placeholder="Resultado atual" value="${indicatorFormValues.currentValue || ''}" />
                        <input type="text" id="indicator-baseline-${processoId}" placeholder="Linha de base" value="${indicatorFormValues.baseline || ''}" />
                    </div>
                    <div class="form-row">
                        <input type="text" id="indicator-periodicity-${processoId}" placeholder="Periodicidade" value="${indicatorFormValues.periodicity || ''}" />
                        <input type="text" id="indicator-source-${processoId}" placeholder="Fonte" value="${indicatorFormValues.source || ''}" />
                    </div>
                    <div class="form-row">
                        <input type="text" id="indicator-responsible-${processoId}" placeholder="Responsável" value="${indicatorFormValues.responsible || ''}" />
                        <input type="date" id="indicator-reference-date-${processoId}" value="${indicatorFormValues.referenceDate || ''}" />
                    </div>
                    <div class="form-row">
                        <textarea id="indicator-observations-${processoId}" rows="2" placeholder="Observações">${indicatorFormValues.observations || ''}</textarea>
                    </div>
                    <div class="form-row">
                        <button type="button" class="btn btn-primary btn-small" data-action="activity-save-indicator" data-processo-id="${processoId}" data-phase="${phaseName}" data-phase-code="${phaseName}" data-activity="${activityCode}">${editingIndicator ? 'Salvar edição' : 'Adicionar indicador'}</button>
                        ${editingIndicator ? `<button type="button" class="btn btn-secondary btn-small" data-action="activity-cancel-indicator" data-processo-id="${processoId}" data-phase="${phaseName}" data-phase-code="${phaseName}" data-activity="${activityCode}">Cancelar</button>` : ''}
                    </div>
                </div>
                <div class="indicator-list">
                    ${rows}
                </div>
            </div>
        `;
    }

    static getFilterValues() {
        const searchEl = document.getElementById(this.SEARCH_INPUT_ID);
        const phaseEl = document.getElementById(this.FILTER_SELECT_ID);

        return {
            search: searchEl?.value.trim().toLowerCase() || '',
            phase: phaseEl?.value || ''
        };
    }

    static filterProcesses(processes) {
        const { search, phase } = this.getFilterValues();
        const visibleProcesses = window.AccessControl?.getVisibleProcesses?.(window.app?.currentUser, processes) || processes;

        return visibleProcesses.filter((processo) => {
            const matchesSearch = !search || [processo.nome, processo.setor_nome, processo.responsavel_nome]
                .some(field => String(field || '').toLowerCase().includes(search));

            const matchesPhase = !phase || processo.phases.some(ph => ph.name === phase);
            return matchesSearch && matchesPhase;
        });
    }

    static renderProcesses(processes) {
        const container = document.getElementById('processes-list');
        const detailPanel = document.getElementById('process-detail-panel');
        if (!container || !detailPanel) return;

        // Preserve scroll position
        const previousScrollTop = container.scrollTop || 0;

        const filtered = this.filterProcesses(processes);

        if (!filtered || filtered.length === 0) {
            container.innerHTML = `
                <div class="empty-state empty-processes-state">
                    <i class="fas fa-inbox"></i>
                    <h3>Nenhum processo cadastrado.</h3>
                    <p>Crie um novo processo para começar o ciclo BPM.</p>
                    <button type="button" class="btn btn-primary" data-action="open-new-process">Novo Processo</button>
                </div>
            `;

            detailPanel.innerHTML = `
                <div class="empty-detail">
                    <h3>Selecione uma atividade para visualizar e editar seu conteúdo.</h3>
                </div>
            `;

            this.setupProcessListHandlers();
            return;
        }

        // Normalize expansion/selection from central state to avoid losing UI state
        const selected = this.getStoredSelection();
        const isProcessSelectedGlobal = selected?.processoId;

        container.innerHTML = filtered.map((processo) => {
            // derive expansion from central state (if set) or from processo.isExpanded
            const isExpanded = (this.myProcessesState.expandedProcessId === processo.id) || processo.isExpanded;
            processo.isExpanded = !!isExpanded;
            const isProcessSelected = (this.myProcessesState.selectedProcessId === processo.id) || (selected?.processoId === processo.id);
            return `
                <div class="process-item ${processo.isExpanded ? 'expanded' : ''} ${isProcessSelected ? 'selected' : ''}" data-id="${processo.id}" data-process-id="${processo.id}">
                    <div class="process-summary" data-action="toggle-process" data-id="${processo.id}" data-process-id="${processo.id}" aria-expanded="${processo.isExpanded ? 'true' : 'false'}">
                        <div class="process-summary-top">
                            <div>
                                <strong>${processo.nome}</strong>
                                <div class="process-meta-inline">
                                    <span>${processo.setor_nome}</span>
                                    <span>${processo.responsavel_nome}</span>
                                </div>
                            </div>
                            <div class="process-summary-status">
                                    <button type="button" class="btn-icon process-delete-button" data-action="delete-process" data-process-id="${processo.id}" aria-label="Excluir processo ${processo.nome}" title="Excluir processo">
                                        <i class="fas fa-trash" aria-hidden="true"></i>
                                    </button>
                                    <span class="badge badge-${this.getStatusBadgeClass(processo.status_fase)}">${processo.status_fase}</span>
                                    <span class="process-arrow process-summary-icon" aria-hidden="true">${processo.isExpanded ? '<i class="fas fa-chevron-down"></i>' : '<i class="fas fa-chevron-right"></i>'}</span>
                                </div>
                        </div>
                        <div class="process-summary-bottom">
                            <div class="process-progress">
                                <div class="progress-bar">
                                    <div class="progress-fill" style="width: ${processo.percentual_conclusao}%"></div>
                                </div>
                                <span>${processo.percentual_conclusao}%</span>
                            </div>
                            <div class="process-due-date">Prazo: ${processo.prazo || 'Não definido'}</div>
                        </div>
                    </div>
                    <div class="process-phases ${processo.isExpanded ? 'expanded' : ''}">
                                ${processo.phases.map((fase) => {
                                    const phaseKey = `${processo.id}:${fase.name}`;
                                    const phaseSelected = (this.myProcessesState.selectedProcessId === processo.id && this.myProcessesState.selectedPhaseCode === fase.name) || (isProcessSelected && selected?.phaseName === fase.name);
                                    // derive fase expansion from central state or stored phase
                                    const faseIsExpanded = this.myProcessesState.expandedPhases[phaseKey] ?? fase.isExpanded;
                                    fase.isExpanded = !!faseIsExpanded;
                            return `
                                        <div class="phase-item ${fase.isExpanded ? 'expanded' : ''}" data-processo-id="${processo.id}" data-process-id="${processo.id}" data-phase="${fase.name}" data-phase-code="${fase.name}">
                                            <button type="button" class="phase-header" data-action="toggle-phase" data-processo-id="${processo.id}" data-process-id="${processo.id}" data-phase="${fase.name}" data-phase-code="${fase.name}" aria-expanded="${fase.isExpanded ? 'true' : 'false'}">
                                                <span>${fase.name}</span>
                                                <span>${fase.activities.length || 0} atividades</span>
                                                <span class="phase-arrow" aria-hidden="true">${fase.isExpanded ? '<i class="fas fa-chevron-down"></i>' : '<i class="fas fa-chevron-right"></i>'}</span>
                                            </button>
                                            <ul class="activity-list" style="display: ${fase.isExpanded ? 'block' : 'none'};">
                                        ${fase.activities.length > 0 ? fase.activities.map((atividade) => `
                                            <li class="activity-item ${phaseSelected && selected?.activityCode === atividade.code ? 'selected' : ''}" data-action="select-activity" data-processo-id="${processo.id}" data-process-id="${processo.id}" data-phase="${fase.name}" data-phase-code="${fase.name}" data-activity="${atividade.code}" data-activity-code="${atividade.code}">
                                                <button type="button" class="activity-button">${this.getActivityDisplayTitle(atividade)}</button>
                                            </li>
                                        `).join('') : `
                                            <li class="activity-empty">Conteúdo institucional aguardando definição.</li>
                                        `}
                                    </ul>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
        }).join('');

        // Restore scroll position after DOM update
        requestAnimationFrame(() => {
            if (container && previousScrollTop > 0) {
                container.scrollTop = previousScrollTop;
            }
        });

        this.setupProcessListHandlers();
    }

    static setupProcessListHandlers() {
        const container = document.getElementById('meus-processos');
        if (!container) return;

        container.removeEventListener('click', this._boundProcessListClickHandler);

        this._boundProcessListClickHandler = (event) => {
            const target = event.target.closest('[data-action]');
            if (!target) return;

            const action = target.dataset.action;
            const rawProcessId = target.dataset.processId || target.dataset.processoId || target.dataset.id;
            const processId = rawProcessId ? parseInt(rawProcessId, 10) : null;
            const phaseCode = target.dataset.phaseCode || target.dataset.phase || target.dataset.phaseName;
            const activityCode = target.dataset.activityCode || target.dataset.activity || target.dataset.activityCode;

            switch (action) {
                case 'delete-process':
                    if (processId) this.confirmDeleteProcess(processId);
                    break;
                case 'toggle-process':
                    if (processId) this.toggleProcess(processId);
                    break;
                case 'toggle-phase':
                    if (processId && phaseCode) this.togglePhase(processId, phaseCode);
                    break;
                case 'select-activity':
                    if (processId && phaseCode && activityCode) this.selectActivity(processId, phaseCode, activityCode);
                    break;
                case 'open-new-process':
                    this.openNewProcessTab();
                    break;
                case 'back-to-processes':
                    this.scrollToProcessList();
                    break;
                default:
                    break;
            }
        };

        container.addEventListener('click', this._boundProcessListClickHandler);
    }

    static registerProcessTabEvents() {
        if (this._processTabEventsRegistered) return;
        this._processTabEventsRegistered = true;

        const searchInput = document.getElementById(this.SEARCH_INPUT_ID);
        const phaseFilter = document.getElementById(this.FILTER_SELECT_ID);
        const refresh = () => this.renderProcesses(this.getStoredProcesses());

        if (searchInput) searchInput.addEventListener('input', refresh);
        if (phaseFilter) phaseFilter.addEventListener('change', refresh);
    }

    static renderSelectedActivityFromStorage() {
        const selection = this.getStoredSelection();
        if (!selection) return;
        this.renderActivityDetail(selection.processoId, selection.phaseName, selection.activityCode);
    }

    static toggleProcess(processoId) {
        // Maintain single expanded process via central state
        const processes = this.getStoredProcesses();
        const clicked = processes.find((p) => p.id === processoId);
        if (!clicked) return;

        const willExpand = this.myProcessesState.expandedProcessId !== processoId;
        // set central expandedProcessId
        this.myProcessesState.expandedProcessId = willExpand ? processoId : null;

        // Update stored processes isExpanded flags consistently
        processes.forEach((processo) => {
            processo.isExpanded = (this.myProcessesState.expandedProcessId === processo.id);
        });

        this.setStoredProcesses(processes);
        this.renderProcesses(processes);
    }

    static togglePhase(processoId, phaseName) {
        const processes = this.getStoredProcesses();
        const processo = processes.find((p) => p.id === processoId);
        if (!processo) return;

        const phase = processo.phases.find((f) => f.name === phaseName);
        if (!phase) return;

        const key = `${processoId}:${phaseName}`;
        const willExpand = !this.myProcessesState.expandedPhases[key];
        // toggle central state
        this.myProcessesState.expandedPhases[key] = willExpand;

        // ensure process is expanded when a phase is opened
        if (willExpand) this.myProcessesState.expandedProcessId = processoId;

        // sync to processes data model
        processo.phases.forEach((f) => {
            const k = `${processoId}:${f.name}`;
            f.isExpanded = !!this.myProcessesState.expandedPhases[k];
        });

        // If the phase has no activities, render a placeholder in the detail panel
        if (willExpand && (!phase.activities || phase.activities.length === 0)) {
            const selection = { processoId, phaseName, activityCode: null };
            this.setStoredSelection(selection);
            this.renderProcesses(processes);
            this.renderActivityDetail(processoId, phaseName, null);
            this.setStoredProcesses(processes);
            return;
        }

        this.setStoredProcesses(processes);
        this.renderProcesses(processes);
    }

    static selectActivity(processoId, phaseName, activityCode) {
        // update central UI state
        this.myProcessesState.selectedProcessId = processoId;
        this.myProcessesState.selectedPhaseCode = phaseName;
        this.myProcessesState.selectedActivityCode = activityCode;
        this.myProcessesState.expandedProcessId = processoId;
        this.myProcessesState.expandedPhases[`${processoId}:${phaseName}`] = true;

        const selection = { processoId, phaseName, activityCode };
        this.setStoredSelection(selection);
        this.renderProcesses(this.getStoredProcesses());
        this.renderActivityDetail(processoId, phaseName, activityCode);
    }

    static renderActivityDetail(processoId, phaseName, activityCode) {
        const detailPanel = document.getElementById('process-detail-panel');
        if (!detailPanel) return;

        const processo = this.getStoredProcesses().find((p) => p.id === processoId);
        if (!processo) {
            detailPanel.innerHTML = `
                <div class="empty-detail">
                    <h3>Selecione uma atividade para visualizar e editar seu conteúdo.</h3>
                </div>
            `;
            return;
        }

        const phase = processo.phases.find((f) => f.name === phaseName);
        // If no activityCode provided, render institutional placeholder
        if (!activityCode) {
            detailPanel.innerHTML = `
            <div class="detail-header">
                <div>
                    <h3>${processo.nome}</h3>
                    <p class="detail-meta">Fase: ${phaseName} • Atividade: —</p>
                </div>
                <button type="button" class="btn btn-secondary btn-small" data-action="back-to-processes" aria-controls="processes-list">Voltar aos processos</button>
            </div>
            <div class="detail-summary">
                <div><strong>Status:</strong> ${processo.status_fase}</div>
                <div><strong>Progresso:</strong> ${processo.percentual_conclusao}%</div>
                <div><strong>Prazo:</strong> ${processo.prazo || 'Não definido'}</div>
                <div><strong>Responsável:</strong> ${processo.responsavel_nome || 'Não definido'}</div>
            </div>
            <div class="detail-content">
                <div class="activity-panel-content">
                    <p>Conteúdo institucional aguardando definição.</p>
                </div>
            </div>
            `;
            this.setupProcessDetailHandlers(detailPanel);
            return;
        }

        const activity = phase?.activities.find((a) => a.code === activityCode);
        const activityTitle = this.getActivityDisplayTitle(activity) || 'Atividade não encontrada';

        detailPanel.classList.add('my-processes-detail');
        detailPanel.innerHTML = `
            <div class="detail-header">
                <div>
                    <h3>${processo.nome}</h3>
                    <p class="detail-meta">Fase: ${phaseName} • Atividade: ${activityTitle}</p>
                </div>
                <button type="button" class="btn btn-secondary btn-small" data-action="back-to-processes" aria-controls="processes-list">Voltar aos processos</button>
            </div>
            <div class="detail-content">
                ${this.renderActivityContent(processo, phaseName, activityCode)}
            </div>
            <div class="detail-actions">
                <button type="button" class="btn btn-secondary" data-action="save-activity" data-processo-id="${processoId}" data-process-id="${processoId}" data-phase="${phaseName}" data-phase-code="${phaseName}" data-activity="${activityCode}" data-activity-code="${activityCode}">Salvar</button>
                <button type="button" class="btn btn-primary" data-action="submit-activity" data-processo-id="${processoId}" data-process-id="${processoId}" data-phase="${phaseName}" data-phase-code="${phaseName}" data-activity="${activityCode}" data-activity-code="${activityCode}">Submeter</button>
            </div>
            ${this.renderActivityHistorySection(processoId, phaseName, activityCode)}
            ${this.renderActivityNavigationFooter(processo, phaseName, activityCode)}
        `;

        this.setupProcessDetailHandlers(detailPanel);
    }

    static renderActivityContent(processo, phaseName, activityCode) {
        const phase = processo.phases.find((f) => f.name === phaseName);
        const activity = phase?.activities.find((a) => a.code === activityCode);
        const savedContent = activity?.content || {};
        const attachments = activity?.attachments || [];

        if (!activity) {
            return `<div class="activity-panel-content"><p>Atividade não encontrada.</p></div>`;
        }

        // ensure checklist exists
        this.ensureActivityChecklist(processo, phaseName, activityCode);

        let html = '';

        if (phaseName === 'Planejar') {
            const legendHtml = this.isPlanejarRequirementRequired(activityCode, 'objective') || this.isPlanejarRequirementRequired(activityCode, 'anexoII') || this.isPlanejarRequirementRequired(activityCode, 'cronograma') || this.isPlanejarRequirementRequired(activityCode, 'documentacao') || this.isPlanejarRequirementRequired(activityCode, 'deip') || this.isPlanejarRequirementRequired(activityCode, 'participant-name') || this.isPlanejarRequirementRequired(activityCode, 'ata') ? '<div class="required-fields-legend">* Campo obrigatório para prosseguimento.</div>' : '';
            if (activityCode === 'PLAN_B') {
                html = `
                    <div class="activity-panel-content">
                        ${legendHtml}
                        <div class="form-group field-required" data-requirement-key="objective">
                            <label for="detail-objective">Objetivo do Projeto de Melhoria</label>
                            <textarea id="detail-objective" name="objective" rows="4" placeholder="Descreva o objetivo..." required aria-required="true" data-required="true">${savedContent.objective || ''}</textarea>
                        </div>
                        <div class="form-group field-required" data-requirement-key="strengths">
                            <label for="detail-swot-strengths">Forças</label>
                            <textarea id="detail-swot-strengths" name="strengths" placeholder="Forças" required aria-required="true" data-required="true">${savedContent.strengths || ''}</textarea>
                        </div>
                        <div class="form-group field-required" data-requirement-key="weaknesses">
                            <label for="detail-swot-weaknesses">Fraquezas</label>
                            <textarea id="detail-swot-weaknesses" name="weaknesses" placeholder="Fraquezas" required aria-required="true" data-required="true">${savedContent.weaknesses || ''}</textarea>
                        </div>
                        <div class="form-group field-required" data-requirement-key="opportunities">
                            <label for="detail-swot-opportunities">Oportunidades</label>
                            <textarea id="detail-swot-opportunities" name="opportunities" placeholder="Oportunidades" required aria-required="true" data-required="true">${savedContent.opportunities || ''}</textarea>
                        </div>
                        <div class="form-group field-required" data-requirement-key="threats">
                            <label for="detail-swot-threats">Ameaças</label>
                            <textarea id="detail-swot-threats" name="threats" placeholder="Ameaças" required aria-required="true" data-required="true">${savedContent.threats || ''}</textarea>
                        </div>
                        <div class="activity-section required-section" data-requirement-key="cronograma" aria-required="true" data-required="true">
                            ${this.renderActivityAttachmentsSection(processo.id, phaseName, activityCode, 'Anexo III — Cronograma')}
                        </div>
                    </div>
                `;
            } else if (activityCode === 'PLAN_A') {
                const members = processo.teamMembers || [];
                const sectorsOptions = this.getAvailableSetoresForSelection().map(s => `<option value="${s.id}">${s.nome}</option>`).join('');
                html = `
                    <div class="activity-panel-content">
                        <div class="team-list">
                            <table class="table table-sm">
                                <thead><tr><th>Nome</th><th>Matrícula</th><th>Setor</th><th>Responsabilidade</th><th>Ações</th></tr></thead>
                                <tbody>
                                    ${members.length ? members.map(member => `
                                        <tr data-member-id="${member.id}">
                                            <td>${member.name}</td>
                                            <td>${member.registration}</td>
                                            <td>${member.sectorName || 'N/D'}</td>
                                            <td>${this.renderMemberResponsibilities(member)}</td>
                                            <td>
                                                <button type="button" class="btn btn-link" data-action="participant-edit" data-processo-id="${processo.id}" data-member-id="${member.id}">Editar</button>
                                                <button type="button" class="btn btn-link text-danger" data-action="participant-remove" data-processo-id="${processo.id}" data-member-id="${member.id}">Remover</button>
                                            </td>
                                        </tr>
                                    `).join('') : `<tr><td colspan="5" class="text-muted">Nenhum membro cadastrado.</td></tr>`}
                                </tbody>
                            </table>
                        </div>
                        <div class="activity-section team-form required-section" data-requirement-key="participant-assignments" aria-required="true" data-required="true">
                            <h4>Adicionar / Editar Participante</h4>
                            <div class="form-row">
                                <div class="field-required" data-requirement-key="participant-name">
                                    <input type="text" id="participant-name-${processo.id}" placeholder="Nome" required aria-required="true" data-required="true" />
                                </div>
                                <div class="field-required" data-requirement-key="participant-registration">
                                    <input type="text" id="participant-registration-${processo.id}" placeholder="Matrícula" required aria-required="true" data-required="true" />
                                </div>
                                <div class="field-required" data-requirement-key="participant-sector">
                                    <select id="participant-sector-${processo.id}" required aria-required="true" data-required="true">
                                        <option value="">Selecione o setor</option>
                                        ${sectorsOptions}
                                    </select>
                                </div>

                            </div>
                            <div class="form-row">
                                <label class="required-section-title">Fases (segurar Ctrl para múltipla)</label>
                                <select id="participant-phases-${processo.id}" multiple size="5" aria-required="true" data-required="true">
                                    ${processo.phases.map(f => `<option value="${f.name}">${f.name}</option>`).join('')}
                                </select>
                                <label class="required-section-title">Atividades (segurar Ctrl para múltipla)</label>
                                <select id="participant-activities-${processo.id}" multiple size="8" aria-required="true" data-required="true">
                                    ${processo.phases.flatMap(f => f.activities.map(a => `<option value="${a.code}">${f.name} — ${a.title}</option>`)).join('')}
                                </select>
                            </div>
                            <div class="form-row">
                                <button type="button" class="btn btn-primary" data-action="participant-add" data-processo-id="${processo.id}">Adicionar participante</button>
                                <button type="button" class="btn btn-secondary" data-action="participant-save" data-processo-id="${processo.id}">Salvar</button>
                                <button type="button" class="btn btn-link" data-action="participant-cancel" data-processo-id="${processo.id}">Cancelar</button>
                            </div>
                        </div>
                    </div>
                `;
            } else if (activityCode === 'PLAN_E') {
                const plan = savedContent || {};
                html = `
                    <div class="activity-panel-content">
                        ${legendHtml}
                        <h3>E) Elaborar Plano de Projeto com todas as informações adquiridas (Referente à etapa E e F do Manual)</h3>
                        <div class="form-group field-required" data-requirement-key="objetivoEstrategico">
                            <label for="planE-objetivo-estrategico-${processo.id}">Objetivo Estratégico</label>
                            <textarea id="planE-objetivo-estrategico-${processo.id}" name="objetivoEstrategico" rows="3" required aria-required="true" data-required="true">${plan.objetivoEstrategico || ''}</textarea>
                        </div>
                        <div class="form-group field-required" data-requirement-key="iniciativaEstr">
                            <label for="planE-iniciativa-estrategica-${processo.id}">Iniciativa Estratégica</label>
                            <textarea id="planE-iniciativa-estrategica-${processo.id}" name="iniciativaEstr" rows="3" required aria-required="true" data-required="true">${plan.iniciativaEstr || ''}</textarea>
                        </div>
                        <div class="form-group" data-requirement-key="premissas">
                            <label for="planE-premissas-${processo.id}">Premissas</label>
                            <textarea id="planE-premissas-${processo.id}" name="premissas" rows="3" aria-required="false">${(plan.premissas || []).join('\n') || ''}</textarea>
                        </div>
                        <div class="form-group" data-requirement-key="restricoes">
                            <label for="planE-restricoes-${processo.id}">Restrições</label>
                            <textarea id="planE-restricoes-${processo.id}" name="restricoes" rows="3" aria-required="false">${(plan.restricoes || []).join('\n') || ''}</textarea>
                        </div>
                        <div class="activity-section required-section" data-requirement-key="anexoII" aria-required="true" data-required="true">
                            ${this.renderActivityAttachmentsSection(processo.id, phaseName, activityCode, 'Anexo II')}
                        </div>
                        <div class="form-row">
                            <button type="button" class="btn btn-secondary" data-action="save-activity" data-processo-id="${processo.id}" data-process-id="${processo.id}" data-phase="${phaseName}" data-phase-code="${phaseName}" data-activity="${activityCode}" data-activity-code="${activityCode}">Salvar rascunho</button>
                        </div>
                    </div>
                `;
            } else {
                const label = {
                    PLAN_C: 'Documentação Existente',
                    PLAN_D: 'DEIP - Diagrama de Escopo e Interface',
                    PLAN_E: 'E) Elaborar Plano de Projeto com todas as informações adquiridas (Referente à etapa E e F do Manual)',
                    PLAN_G: 'Aprovação e Ata'
                }[activityCode] || activity.title;

                html = `
                    <div class="activity-panel-content">
                        ${legendHtml}
                        <div>
                            <p>${label}</p>
                        </div>
                        <div class="file-upload-row">
                            <input type="file" id="detail-upload-file" ${this.isPlanejarRequirementRequired(activityCode, 'documentacao') || this.isPlanejarRequirementRequired(activityCode, 'deip') ? 'required aria-required="true"' : ''} />
                            <button type="button" class="btn btn-primary btn-small" data-action="upload-file" data-processo-id="${processo.id}" data-process-id="${processo.id}" data-phase="${phaseName}" data-phase-code="${phaseName}" data-activity="${activityCode}" data-activity-code="${activityCode}">Enviar Anexo</button>
                        </div>
                        <div class="activity-section" id="detail-attachments-list">
                            ${attachments.length ? attachments.map((file) => `<div>${file.name}</div>`).join('') : '<p class="text-muted">Nenhum anexo disponível.</p>'}
                        </div>
                        ${activityCode === 'PLAN_G' ? '<div class="activity-section" id="detail-approval-checklist"><p>Checklist de aprovação não disponível.</p></div>' : ''}
                    </div>
                `;
            }
        } else if (phaseName === 'Analisar') {
            const legendHtml = this.hasAnalisarRequiredItems(activityCode) ? '<div class="required-fields-legend">* Campo obrigatório para prosseguimento.</div>' : '';
            if (activityCode === 'ANAL_A') {
                html = `
                    <div class="activity-panel-content">
                        ${legendHtml}
                        <div class="form-group field-required" data-requirement-key="criticalInfo">
                            <label for="detail-critical-info">Informações críticas</label>
                            <textarea id="detail-critical-info" rows="6" placeholder="Registre as informações críticas do processo..." required aria-required="true" data-required="true">${savedContent.criticalInfo || ''}</textarea>
                        </div>
                        <div class="activity-section">
                            <h4>Observações</h4>
                            <textarea id="detail-observations" rows="4" placeholder="Adicione observações...">${savedContent.observations || ''}</textarea>
                        </div>
                    </div>
                `;
            } else if (activityCode === 'ANAL_B') {
                html = `
                    <div class="activity-panel-content">
                        ${legendHtml}
                        <div class="activity-section">
                            <h4>Fluxograma AS-IS</h4>
                            ${this.renderActivityAttachmentsSection(processo.id, phaseName, activityCode, 'Fluxograma AS-IS')}
                        </div>
                        <div class="activity-section">
                            <h4>Descrição</h4>
                            <textarea id="detail-flow-description" rows="4" placeholder="Descreva o fluxo AS-IS do processo...">${savedContent.description || ''}</textarea>
                        </div>
                        <div class="activity-section">
                            <h4>Versão</h4>
                            <input type="text" id="detail-flow-version" placeholder="Versão atual" value="${savedContent.version || ''}" />
                        </div>
                    </div>
                `;
            } else if (activityCode === 'ANAL_C') {
                html = `
                    <div class="activity-panel-content">
                        ${legendHtml}
                        <div class="form-group field-required" data-requirement-key="disconnections">
                            <label for="detail-disconnections">Desconexões identificadas</label>
                            <textarea id="detail-disconnections" rows="4" placeholder="Liste as desconexões identificadas..." required aria-required="true" data-required="true">${savedContent.disconnections || ''}</textarea>
                        </div>
                        <div class="form-group field-required" data-requirement-key="opportunities">
                            <label for="detail-opportunities">Oportunidades de melhoria</label>
                            <textarea id="detail-opportunities" rows="4" placeholder="Liste oportunidades de melhoria..." required aria-required="true" data-required="true">${savedContent.opportunities || ''}</textarea>
                        </div>
                        <div class="activity-section">
                            <h4>Informações obtidas do DEIP</h4>
                            <textarea id="detail-deip-info" rows="4" placeholder="Registre as informações obtidas do DEIP...">${savedContent.deipInfo || ''}</textarea>
                        </div>
                        <div class="activity-section">
                            <h4>Informações obtidas do fluxo do processo</h4>
                            <textarea id="detail-flow-info" rows="4" placeholder="Registre as informações obtidas do fluxo do processo...">${savedContent.flowInfo || ''}</textarea>
                        </div>
                        <div class="form-group field-required" data-requirement-key="brainstorming">
                            <label for="detail-brainstorm-notes">Brainstorming</label>
                            <textarea id="detail-brainstorm-notes" rows="3" placeholder="Observações preliminares..." required aria-required="true" data-required="true">${savedContent.brainstormNotes || ''}</textarea>
                        </div>
                        <div class="activity-section">
                            <label for="detail-brainstorm-participants">Participantes</label>
                            <input type="text" id="detail-brainstorm-participants" placeholder="Participantes" value="${savedContent.brainstormParticipants || ''}" />
                        </div>
                        <div class="activity-section">
                            <label for="detail-brainstorm-date">Data</label>
                            <input type="date" id="detail-brainstorm-date" value="${savedContent.brainstormDate || ''}" />
                        </div>
                        <div class="activity-section">
                            <label for="detail-brainstorm-result">Resultado resumido</label>
                            <textarea id="detail-brainstorm-result" rows="3" placeholder="Resultado resumido...">${savedContent.brainstormResult || ''}</textarea>
                        </div>
                        <div class="activity-section">
                            <h4>Anexo IV</h4>
                            ${this.renderActivityAttachmentsSection(processo.id, phaseName, activityCode, 'Anexo IV')}
                        </div>
                    </div>
                `;
            } else if (activityCode === 'ANAL_D') {
                html = `
                    <div class="activity-panel-content">
                        ${legendHtml}
                        <div class="activity-section">
                            <h4>Priorização das desconexões</h4>
                            <textarea id="detail-priority-disconnections" rows="3" placeholder="Descreva a priorização das desconexões...">${savedContent.priorityDisconnections || ''}</textarea>
                        </div>
                        <div class="activity-section">
                            <h4>Priorização das oportunidades de melhoria</h4>
                            <textarea id="detail-priority-opportunities" rows="3" placeholder="Descreva a priorização das oportunidades de melhoria...">${savedContent.priorityOpportunities || ''}</textarea>
                        </div>
                        <div class="activity-section">
                            <h4>Análise das melhorias</h4>
                            <textarea id="detail-improvement-analysis" rows="3" placeholder="Descreva a análise das melhorias...">${savedContent.improvementAnalysis || ''}</textarea>
                        </div>
                        <div class="activity-section">
                            <h4>Causas identificadas</h4>
                            <textarea id="detail-causes-identified" rows="3" placeholder="Registre as causas identificadas...">${savedContent.causesIdentified || ''}</textarea>
                        </div>
                        <div class="activity-section">
                            <h4>Priorização das causas</h4>
                            <textarea id="detail-causes-priority" rows="3" placeholder="Registre a priorização das causas...">${savedContent.causesPriority || ''}</textarea>
                        </div>
                        <div class="activity-section">
                            <h4>Geração de ideias</h4>
                            <textarea id="detail-ideas" rows="3" placeholder="Registre ideias geradas...">${savedContent.ideas || ''}</textarea>
                        </div>
                        <div class="activity-section">
                            <h4>Informações do Brainstorming</h4>
                            <textarea id="detail-brainstorm-info" rows="4" placeholder="Registre detalhadamente as informações da atividade...">${savedContent.brainstormInfo || ''}</textarea>
                        </div>
                        <div class="activity-section">
                            <h4>Anexo IV</h4>
                            ${this.renderActivityAttachmentsSection(processo.id, phaseName, activityCode, 'Anexo IV')}
                        </div>
                    </div>
                `;
            } else if (activityCode === 'ANAL_E') {
                html = `
                    <div class="activity-panel-content">
                        <div class="activity-section">
                            <h4>Indicadores atuais</h4>
                            ${this.renderActivityIndicatorSection(processo.id, phaseName, activityCode)}
                        </div>
                        <div class="activity-section">
                            <h4>Anexo V</h4>
                            ${this.renderActivityAttachmentsSection(processo.id, phaseName, activityCode, 'Anexo V')}
                        </div>
                    </div>
                `;
            } else {
                html = `
                    <div class="activity-panel-content">
                        <p>Conteúdo institucional aguardando definição.</p>
                    </div>
                `;
            }
        } else if (phaseName === 'Desenhar') {
            switch (activityCode) {
                case 'DES_A':
                    html = `
                        <div class="activity-panel-content">
                            <div class="activity-section">
                                <h4>Redefinir escopo do processo</h4>
                                ${this.renderActivityAttachmentsSection(processo.id, phaseName, activityCode, 'Anexo I (Redesenhado)')}
                            </div>
                            <div class="activity-section">
                                <label>Escopo proposto</label>
                                <textarea id="detail-scope-description-${processo.id}-${activityCode}" rows="4" placeholder="Descreva a redefinição do escopo do processo...">${savedContent.scopeDescription || ''}</textarea>
                            </div>
                            <div class="activity-section">
                                <label>Pontos de fronteira</label>
                                <textarea id="detail-scope-boundaries-${processo.id}-${activityCode}" rows="3" placeholder="Liste os limites, entradas e saídas do processo...">${savedContent.scopeBoundaries || ''}</textarea>
                            </div>
                            <div class="activity-section">
                                <label>Versão</label>
                                <input type="text" id="detail-scope-version-${processo.id}-${activityCode}" placeholder="Versão atual" value="${savedContent.version || ''}" />
                            </div>
                        </div>
                    `;
                    break;
                case 'DES_B':
                    html = `
                        <div class="activity-panel-content">
                            <div class="activity-section">
                                <h4>Modelagem do processo otimizado</h4>
                                ${this.renderActivityAttachmentsSection(processo.id, phaseName, activityCode, 'Fluxo TO BE')}
                            </div>
                            <div class="activity-section">
                                <label>Descrição do fluxo TO BE</label>
                                <textarea id="detail-tobe-description-${processo.id}-${activityCode}" rows="4" placeholder="Descreva o fluxo TO BE otimizado...">${savedContent.tobeDescription || ''}</textarea>
                            </div>
                                        <div class="activity-section field-required" data-requirement-key="tobeChanges">
                                            <label>Principais mudanças</label>
                                            <textarea id="detail-tobe-changes-${processo.id}-${activityCode}" rows="3" placeholder="Liste as principais mudanças no processo...">${savedContent.tobeChanges || ''}</textarea>
                                        </div>
                            <div class="activity-section">
                                <label>Versão</label>
                                <input type="text" id="detail-tobe-version-${processo.id}-${activityCode}" placeholder="Versão atual" value="${savedContent.version || ''}" />
                            </div>
                        </div>
                    `;
                    break;
                case 'DES_C':
                    html = `
                        <div class="activity-panel-content">
                            <div class="activity-section field-required" data-requirement-key="criticalTasks">
                                <h4>Tarefas Críticas do fluxo</h4>
                                <label>Identificação das tarefas críticas</label>
                                <textarea id="detail-critical-tasks-${processo.id}-${activityCode}" rows="4" placeholder="Descreva as tarefas críticas identificadas...">${savedContent.criticalTasks || ''}</textarea>
                            </div>
                            <div class="activity-section field-required" data-requirement-key="criticalityCriteria">
                                <label>Critérios de criticidade</label>
                                <textarea id="detail-criticality-criteria-${processo.id}-${activityCode}" rows="3" placeholder="Registre os critérios utilizados para identificar tarefas críticas...">${savedContent.criticalityCriteria || ''}</textarea>
                            </div>
                        </div>
                    `;
                    break;
                case 'DES_D':
                    html = `
                        <div class="activity-panel-content">
                            <div class="activity-section">
                                <h4>Levantamento de riscos das tarefas críticas</h4>
                                ${this.renderActivityAttachmentsSection(processo.id, phaseName, activityCode, 'Anexo IV (Riscos do Processo)')}
                            </div>
                            <div class="activity-section">
                                <label>Descrição dos riscos</label>
                                <textarea id="detail-risk-description-${processo.id}-${activityCode}" rows="4" placeholder="Descreva os riscos identificados nas tarefas críticas...">${savedContent.riskDescription || ''}</textarea>
                            </div>
                            <div class="activity-section">
                                <label>Impacto esperado</label>
                                <textarea id="detail-risk-impact-${processo.id}-${activityCode}" rows="3" placeholder="Descreva o impacto esperado caso o risco ocorra...">${savedContent.riskImpact || ''}</textarea>
                            </div>
                            <div class="activity-section">
                                <label>Ações de mitigação</label>
                                <textarea id="detail-risk-mitigation-${processo.id}-${activityCode}" rows="3" placeholder="Liste ações de mitigação e controle...">${savedContent.riskMitigation || ''}</textarea>
                            </div>
                        </div>
                    `;
                    break;
                case 'DES_E':
                    html = `
                        <div class="activity-panel-content">
                            <div class="activity-section">
                                <p>Defina os indicadores do processo e mantenha o histórico integrado na aba Indicadores.</p>
                            </div>
                            <div class="activity-section field-required" data-requirement-key="notes">
                                <label>Anotações adicionais</label>
                                <textarea id="detail-indicator-notes-${processo.id}-${activityCode}" rows="3" placeholder="Observações sobre os indicadores...">${savedContent.notes || ''}</textarea>
                            </div>
                            <div class="activity-section field-required" data-requirement-key="indicators">
                                ${this.renderActivityIndicatorSection(processo.id, phaseName, activityCode)}
                            </div>
                        </div>
                    `;
                    break;
                case 'DES_F':
                    html = `
                        <div class="activity-panel-content">
                            <div class="activity-section">
                                <h4>Documentação descritiva do processo</h4>
                                ${this.renderActivityAttachmentsSection(processo.id, phaseName, activityCode, 'Anexo VI')}
                            </div>
                            <div class="activity-section">
                                <label>Legenda</label>
                                <p class="requirement-legend">* Campo obrigatório para prosseguimento.</p>
                            </div>
                            <div class="activity-section">
                                <label>Resumo da documentação</label>
                                <textarea id="detail-documentation-summary-${processo.id}-${activityCode}" rows="4" placeholder="Descreva a documentação do processo...">${savedContent.documentationSummary || ''}</textarea>
                            </div>
                            <div class="activity-section">
                                <label>Responsável pela documentação</label>
                                <input type="text" id="detail-documentation-owner-${processo.id}-${activityCode}" placeholder="Responsável" value="${savedContent.documentationOwner || ''}" />
                            </div>
                            <div class="activity-section">
                                <div style="display: flex; gap: 10px; margin-top: 20px;">
                                    <button type="button" class="btn btn-primary" data-action="generate-pop" data-processo-id="${processo.id}" data-processo-nome="${processo.nome}">
                                        📄 Gerar POP
                                    </button>
                                    <small style="color: #7F8C8D; font-size: 12px; line-height: 2.4;">
                                        Clique para gerar automaticamente o Procedimento Operacional Padrão em PDF com todos os dados coletados até esta fase.
                                    </small>
                                </div>
                            </div>
                        </div>
                    `;
                    break;
                case 'DES_G':
                    html = `
                        <div class="activity-panel-content">
                            <div class="activity-section">
                                <h4>Elaboração do Plano de Implementação</h4>
                                <label>Resumo do Plano de Implementação</label>
                                <textarea id="detail-implementation-summary-${processo.id}-${activityCode}" rows="4" placeholder="Descreva o Plano de Implantação...">${savedContent.implementationSummary || ''}</textarea>
                            </div>
                            <div class="activity-section">
                                <label>Marcos do plano</label>
                                <textarea id="detail-implementation-milestones-${processo.id}-${activityCode}" rows="3" placeholder="Liste os marcos e etapas principais...">${savedContent.implementationMilestones || ''}</textarea>
                            </div>
                            <div class="activity-section">
                                <label>Responsável pela implantação</label>
                                <input type="text" id="detail-implementation-responsible-${processo.id}-${activityCode}" placeholder="Responsável" value="${savedContent.implementationResponsible || ''}" />
                            </div>

                            <div class="activity-section">
                                <h4>Plano de Implementação</h4>
                                ${this.renderActivityAttachmentsSection(processo.id, phaseName, activityCode, 'Anexo VII')}
                                ${this.renderActivityAttachmentsSection(processo.id, phaseName, activityCode, 'Anexo VIII')}
                            </div>
                            <div class="activity-section">
                                <label>Público-alvo</label>
                                <textarea id="detail-training-audience-${processo.id}-${activityCode}" rows="3" placeholder="Descreva o público-alvo da capacitação...">${savedContent.trainingAudience || ''}</textarea>
                            </div>
                            <div class="activity-section">
                                <label>Módulos / temas</label>
                                <textarea id="detail-training-modules-${processo.id}-${activityCode}" rows="3" placeholder="Liste os temas ou módulos de capacitação...">${savedContent.trainingModules || ''}</textarea>
                            </div>
                            <div class="activity-section">
                                <label>Cronograma</label>
                                <input type="text" id="detail-training-schedule-${processo.id}-${activityCode}" placeholder="Cronograma estimado" value="${savedContent.trainingSchedule || ''}" />
                            </div>
                        </div>
                    `;
                    break;
                default:
                    html = `
                        <div class="activity-panel-content">
                            <p>Conteúdo institucional aguardando definição.</p>
                        </div>
                    `;
                    break;
            }
        } else if (phaseName === 'Implementar') {
            switch (activityCode) {
                case 'IMPL_A':
                    html = `
                        <div class="activity-panel-content">
                            <div class="activity-section">
                                <h4>Relatório de Acompanhamento</h4>
                                ${this.renderActivityAttachmentsSection(processo.id, phaseName, activityCode, 'Relatório de Acompanhamento')}
                            </div>
                            <div class="activity-section">
                                <h4>Responsabilidade</h4>
                                ${this.renderActivityResponsibilitySection(processo, phaseName, activityCode)}
                            </div>
                            <div class="activity-section">
                                <h4>Checklist</h4>
                                ${this.renderActivityChecklist(processo.id, phaseName, activityCode)}
                            </div>
                            <div class="activity-section">
                                <h4>Histórico</h4>
                                ${this.renderActivityHistorySection(processo.id, phaseName, activityCode)}
                            </div>
                            <div class="activity-section">
                                <h4>Progresso</h4>
                                <div class="activity-progress">${this.calculateActivityProgress(processo.id, phaseName, activityCode)}%</div>
                            </div>
                        </div>
                    `;
                    break;
                case 'IMPL_B':
                    html = `
                        <div class="activity-panel-content">
                            <div class="activity-section">
                                <h4>Indicadores do processo</h4>
                                ${this.renderImplementationIndicatorsSection(processo, phaseName, activityCode)}
                            </div>
                            <div class="activity-section">
                                <h4>Acompanhamento da implantação</h4>
                                ${this.renderImplementationFollowUpSection(processo, phaseName, activityCode)}
                            </div>
                            <div class="activity-section">
                                <h4>Contra Medidas</h4>
                                ${this.renderContraMedidasSection(processo, phaseName, activityCode)}
                            </div>
                            <div class="activity-section">
                                <h4>Responsabilidade</h4>
                                ${this.renderActivityResponsibilitySection(processo, phaseName, activityCode)}
                            </div>
                            <div class="activity-section">
                                <h4>Checklist</h4>
                                ${this.renderImplementationChecklistSection(processo.id, phaseName, activityCode)}
                            </div>
                            <div class="activity-section">
                                <h4>Histórico</h4>
                                ${this.renderActivityHistorySection(processo.id, phaseName, activityCode)}
                            </div>
                            <div class="activity-section">
                                <h4>Progresso</h4>
                                <div class="activity-progress">${this.calculateActivityProgress(processo.id, phaseName, activityCode)}%</div>
                            </div>
                        </div>
                    `;
                    break;
                default:
                    html = `
                        <div class="activity-panel-content">
                            <p>Conteúdo institucional aguardando definição.</p>
                        </div>
                    `;
                    break;
            }
        } else if (phaseName === 'Monitorar') {
            const sectionHeader = (title) => `
                <div class="activity-section">
                    <h4>${title}</h4>
                </div>
            `;

            if (activityCode === 'MON_A' || activityCode === 'MON_B') {
                html = `
                    <div class="activity-panel-content">
                        <div class="activity-section activity-section-header">
                            <h4>${activityCode === 'MON_A' ? 'Indicadores do Processo' : 'Resultados dos Indicadores do Processo'}</h4>
                            <button type="button" class="btn btn-link" data-action="open-indicators-tab" data-processo-id="${processo.id}" data-activity="${activityCode}">Ver Indicadores do Processo</button>
                        </div>
                        ${this.renderActivityResponsibilitySection(processo, phaseName, activityCode)}
                        ${this.renderActivityChecklist(processo.id, phaseName, activityCode)}
                        ${this.renderActivityHistorySection(processo.id, phaseName, activityCode)}
                        <div class="activity-section">
                            <h4>Progresso</h4>
                            <div class="activity-progress">${this.calculateActivityProgress(processo.id, phaseName, activityCode)}%</div>
                        </div>
                    </div>
                `;
            } else if (activityCode === 'MON_C') {
                html = `
                    <div class="activity-panel-content">
                        <div class="activity-section">
                            <h4>Oportunidades de melhoria</h4>
                            <textarea id="detail-monitorar-opportunities" rows="6" placeholder="Registre as oportunidades de melhoria...">${savedContent.opportunities || ''}</textarea>
                        </div>
                        ${this.renderActivityResponsibilitySection(processo, phaseName, activityCode)}
                        ${this.renderActivityChecklist(processo.id, phaseName, activityCode)}
                        ${this.renderActivityHistorySection(processo.id, phaseName, activityCode)}
                        <div class="activity-section">
                            <h4>Progresso</h4>
                            <div class="activity-progress">${this.calculateActivityProgress(processo.id, phaseName, activityCode)}%</div>
                        </div>
                    </div>
                `;
            } else if (activityCode === 'MON_D') {
                html = `
                    <div class="activity-panel-content">
                        ${this.renderSituationalReportSection(processo.id, phaseName, activityCode)}
                        ${this.renderActivityResponsibilitySection(processo, phaseName, activityCode)}
                        ${this.renderActivityChecklist(processo.id, phaseName, activityCode)}
                        ${this.renderActivityHistorySection(processo.id, phaseName, activityCode)}
                        <div class="activity-section">
                            <h4>Progresso</h4>
                            <div class="activity-progress">${this.calculateActivityProgress(processo.id, phaseName, activityCode)}%</div>
                        </div>
                    </div>
                `;
            } else {
                html = `
                    <div class="activity-panel-content">
                        <p>Conteúdo institucional aguardando definição.</p>
                    </div>
                `;
            }
        } else {
            html = `
                <div class="activity-panel-content">
                    <p>Conteúdo institucional aguardando definição.</p>
                </div>
            `;
        }

        if (phaseName !== 'Implementar' && phaseName !== 'Monitorar') {
            // Append responsibility section derived from PLAN_B
            html += `
                <div class="activity-responsibility" id="activity-responsibles-${processo.id}-${phaseName}-${activityCode}">
                    ${this.renderActivityResponsibilitySection(processo, phaseName, activityCode)}
                </div>
            `;

            // Append checklist
            html += this.renderActivityChecklist(processo.id, phaseName, activityCode);
        }

        return html;
    }

    static renderActivityChecklist(processoId, phaseName, activityCode) {
        const processes = this.getStoredProcesses();
        const processo = processes.find(p => p.id === processoId);
        if (!processo) return '';
        const phase = processo.phases.find(f => f.name === phaseName);
        if (!phase) return '';
        const activity = phase.activities.find(a => a.code === activityCode);
        if (!activity) return '';

        // ensure checklist exists and contains at least one item
        activity.checklist = activity.checklist || [];
        if (!activity.checklist.length) {
            const now = Date.now();
            const checklistText = this.ACTIVITY_CHECKLIST_TEXT[activityCode] || (activityCode === 'PLAN_G' ? 'Aprovação do Plano do Projeto de Melhoria concluída' : 'Atividade concluída');
            activity.checklist.push({ itemId: now, texto: checklistText, concluido: false, observacao: '', completedByMemberId: null, completedByName: '', completedBySector: '', concluidoEm: null, atualizadoEm: null });
            this.setStoredProcesses(processes);
        }

        const requiredChecklist = this.isPlanejarRequirementRequired(activityCode, 'checklist');
        const listClass = requiredChecklist ? 'required-checklist-wrap' : '';
        const responsibles = this.getActivityResponsibles(processo, phaseName, activityCode);
        const hasResponsibles = responsibles.length > 0;

        const itemsHtml = activity.checklist.map(item => `
            <div class="checklist-item" data-item-id="${item.itemId}">
                <label class="${requiredChecklist ? 'required-checklist-label' : ''}" ${requiredChecklist ? 'aria-required="true"' : ''}>
                    <input type="checkbox" data-action="activity-toggle-item" data-processo-id="${processoId}" data-phase-name="${phaseName}" data-activity="${activityCode}" data-item-id="${item.itemId}" ${item.concluido ? 'checked' : ''} />
                    ${item.texto}
                </label>
                <div class="checklist-meta">
                    ${item.concluido ? `
                        <div class="checklist-responsible">
                            <strong>Realizado por:</strong> ${item.completedByName || 'Não informado'}
                            ${item.completedBySector ? `<span class="text-muted">(${item.completedBySector})</span>` : ''}
                        </div>
                    ` : ''}
                    ${item.observacao ? `
                        <div class="checklist-observation">
                            <strong>Observação:</strong> ${item.observacao}
                        </div>
                    ` : ''}
                    <div class="checklist-inputs">
                        <textarea placeholder="Observação" data-action="activity-save-observation" data-processo-id="${processoId}" data-activity="${activityCode}" data-item-id="${item.itemId}" style="margin-top: 8px;">${item.observacao || ''}</textarea>
                    </div>
                    <span class="small text-muted">${item.concluido && item.concluidoEm ? new Date(item.concluidoEm).toLocaleString() : ''}${item.atualizadoEm ? ` • Atualizado em ${new Date(item.atualizadoEm).toLocaleString()}` : ''}</span>
                </div>
            </div>
        `).join('');

        // calculate activity progress and display
        const progress = this.calculateActivityProgress(processoId, phaseName, activityCode);

        const noResponsiblesMsg = !hasResponsibles ? `<p class="text-warning">⚠️ Nenhum responsável foi atribuído a esta atividade. Configure na atividade "Definir equipe de melhoria".</p>` : '';

        return `
            <div class="activity-section activity-checklist ${listClass}" ${requiredChecklist ? 'aria-required="true"' : ''}>
                <h4>Checklist</h4>
                <div class="activity-progress">Progresso da atividade: ${progress}%</div>
                ${noResponsiblesMsg}
                <div class="checklist-list">
                    ${itemsHtml}
                </div>
            </div>
        `;
    }

    static async toggleChecklistItemLocal(processoId, phaseName, activityCode, itemId, checked) {
        if (this.BPM_DATA_SOURCE === 'API' && window.bpmApi && /^[0-9a-f-]{36}$/i.test(String(itemId))) {
            try {
                await window.bpmApi.completeChecklistItem(itemId, checked);
                await this.loadProcesses();
            } catch (error) {
                console.error('Falha ao atualizar checklist pela API:', error);
                notificar(error.message || 'Não foi possível atualizar o checklist.', 'danger');
            }
            return;
        }
        const processes = this.getStoredProcesses();
        const processo = processes.find(p => p.id === processoId);
        if (!processo) return;
        
        const phase = processo.phases.find(ph => ph.name === phaseName);
        if (!phase) return;
        
        const activity = phase.activities.find(a => a.code === activityCode);
        if (!activity) return;
        
        activity.checklist = activity.checklist || [];
        const item = activity.checklist.find(i => String(i.itemId) === String(itemId));
        if (!item) return;

        if (checked) {
            // User is marking the item as complete
            // Get responsibles and show selection dialog
            const responsibles = this.getActivityResponsibles(processo, phaseName, activityCode);
            if (responsibles.length === 0) {
                alert('Nenhum responsável foi atribuído a esta atividade. Configure na atividade "Definir equipe de melhoria".');
                // Don't mark as complete without responsible
                return;
            }
            
            // Show dialog to select responsible
            this.showResponsibleSelectionDialog(processoId, phaseName, activityCode, itemId, responsibles, item);
        } else {
            // User is unmarking the item
            item.concluido = false;
            item.concluidoEm = null;
            item.completedByMemberId = null;
            item.completedByName = '';
            item.completedBySector = '';
            this.setStoredProcesses(processes);
            this.recalculateAndRender(processoId);
        }
    }

    static showResponsibleSelectionDialog(processoId, phaseName, activityCode, itemId, responsibles, item) {
        // Create a modal dialog
        const dialogId = `responsible-selector-${itemId}`;
        const existingDialog = document.getElementById(dialogId);
        if (existingDialog) existingDialog.remove();

        const buttonsHtml = responsibles.map(r => `
            <button type="button" class="btn btn-outline-primary responsible-option" data-member-id="${r.id}" data-member-name="${r.name}" data-member-sector="${r.sectorName || ''}">
                <strong>${r.name}</strong><br/>
                <small>${r.sectorName || r.registration || ''}</small>
            </button>
        `).join('');

        const dialogHtml = `
            <div id="${dialogId}" style="
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 9999;
            ">
                <div style="
                    background: white;
                    padding: 24px;
                    border-radius: 8px;
                    max-width: 500px;
                    width: 90%;
                    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                ">
                    <h3>Quem concluiu este item?</h3>
                    <p>${item.texto}</p>
                    <div style="display: grid; gap: 12px; margin: 24px 0;">
                        ${buttonsHtml}
                    </div>
                    <button type="button" class="btn btn-secondary" data-action="cancel-responsible-selection" data-item-id="${itemId}" style="width: 100%; margin-top: 16px;">
                        Cancelar
                    </button>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', dialogHtml);
        const dialog = document.getElementById(dialogId);

        // Handle clicks on responsible buttons
        dialog.querySelectorAll('.responsible-option').forEach(btn => {
            btn.addEventListener('click', () => {
                const memberId = btn.dataset.memberId;
                const memberName = btn.dataset.memberName;
                const memberSector = btn.dataset.memberSector;
                this.confirmResponsibleSelection(processoId, phaseName, activityCode, itemId, memberId, memberName, memberSector);
                dialog.remove();
            });
        });

        // Handle cancel
        dialog.querySelector('[data-action="cancel-responsible-selection"]').addEventListener('click', () => {
            dialog.remove();
        });
    }

    static confirmResponsibleSelection(processoId, phaseName, activityCode, itemId, memberId, memberName, memberSector) {
        const processes = this.getStoredProcesses();
        const processo = processes.find(p => p.id === processoId);
        if (!processo) return;

        const phase = processo.phases.find(ph => ph.name === phaseName);
        if (!phase) return;

        const activity = phase.activities.find(a => a.code === activityCode);
        if (!activity) return;

        activity.checklist = activity.checklist || [];
        const item = activity.checklist.find(i => String(i.itemId) === String(itemId));
        if (!item) return;

        item.concluido = true;
        item.concluidoEm = new Date().toISOString();
        item.completedByMemberId = memberId;
        item.completedByName = memberName;
        item.completedBySector = memberSector;
        item.atualizadoEm = new Date().toISOString();

        this.setStoredProcesses(processes);
        this.recalculateAndRender(processoId);
    }

    static saveChecklistField(processoId, activityCode, itemId, field, value) {
        const processes = this.getStoredProcesses();
        const processo = processes.find(p => p.id === processoId);
        if (!processo) return;
        processo.phases.forEach(phase => {
            const activity = phase.activities.find(a => a.code === activityCode);
            if (!activity) return;
            activity.checklist = activity.checklist || [];
            const item = activity.checklist.find(i => String(i.itemId) === String(itemId));
            if (!item) return;
            if (field === 'observacao') item.observacao = value;
            if (field === 'responsavel') item.responsavel = value;
        });
        this.setStoredProcesses(processes);
    }

    static getAnalisarActivityRules(activityCode) {
        return this.ANALISAR_REQUIREMENT_CATALOG[activityCode] || {};
    }

    static hasAnalisarRequiredItems(activityCode) {
        return Object.keys(this.getAnalisarActivityRules(activityCode)).length > 0;
    }

    static getAnalisarActivityMissingRequirements(processo, activityCode) {
        if (!processo || !processo.phases) return [];
        const phase = processo.phases.find((f) => f.name === 'Analisar');
        const activity = phase?.activities.find((a) => a.code === activityCode);
        if (!activity) return [];

        const content = activity.content || {};
        const missing = [];

        switch (activityCode) {
            case 'ANAL_A':
                if (!String(content.criticalInfo || '').trim()) missing.push('Informações críticas');
                break;
            case 'ANAL_B':
                if (!this.hasValidRequiredAttachment(processo, 'Analisar', activityCode, 'Fluxograma AS-IS', 'FLUXOGRAMA_AS_IS')) missing.push('Fluxograma AS-IS');
                break;
            case 'ANAL_C':
                if (!this.hasValidRequiredAttachment(processo, 'Analisar', activityCode, 'Anexo IV', 'ANEXO_IV_DESCONEXOES')) missing.push('Anexo IV');
                if (!String(content.disconnections || '').trim()) missing.push('Desconexões');
                if (!String(content.opportunities || '').trim()) missing.push('Oportunidades');
                if (!String(content.brainstormNotes || '').trim()) missing.push('Brainstorming');
                break;
            case 'ANAL_D':
                if (!this.hasValidRequiredAttachment(processo, 'Analisar', activityCode, 'Anexo IV', 'ANEXO_IV_PRIORIZACAO')) missing.push('Anexo IV');
                break;
            case 'ANAL_E':
                break;
            default:
                break;
        }

        return missing;
    }

    static validateAnalisarActivity(processo, activityCode) {
        const missingRequirements = this.getAnalisarActivityMissingRequirements(processo, activityCode);
        const displayTitle = this.ACTIVITY_DISPLAY_TITLES[activityCode] || activityCode;
        return {
            valid: missingRequirements.length === 0,
            activityCode,
            activityTitle: displayTitle,
            missingRequirements
        };
    }

    static validateAnalisarPhase(processo) {
        const phase = processo?.phases?.find((f) => f.name === 'Analisar');
        if (!phase) {
            return { valid: true, missingByActivity: [] };
        }

        const missingByActivity = phase.activities
            .map((activity) => {
                const result = this.validateAnalisarActivity(processo, activity.code);
                if (result.valid) return null;
                return {
                    activityCode: activity.code,
                    activityTitle: activity.title || this.ACTIVITY_DISPLAY_TITLES[activity.code] || activity.code,
                    missingRequirements: result.missingRequirements
                };
            })
            .filter(Boolean);

        return {
            valid: missingByActivity.length === 0,
            missingByActivity
        };
    }

    static canAdvanceToDesenhar(processo) {
        return this.validateAnalisarPhase(processo).valid;
    }

    static renderAnalisarRequirementErrors(errors) {
        const detailPanel = document.getElementById('process-detail-panel');
        if (!detailPanel) return;

        const mapping = {
            'Informações críticas': 'criticalInfo',
            'Fluxograma AS-IS': 'fluxogramaAsIs',
            'Anexo IV': 'anexoIv',
            'Desconexões': 'disconnections',
            'Oportunidades': 'opportunities',
            'Brainstorming': 'brainstorming'
        };

        detailPanel.querySelectorAll('.is-invalid, .required-field-error').forEach((node) => {
            node.classList.remove('is-invalid');
            if (node.classList.contains('required-field-error')) node.remove();
        });

        errors.forEach((errorLabel) => {
            const requirementKey = mapping[errorLabel];
            if (!requirementKey) return;
            const wrapper = detailPanel.querySelector(`[data-requirement-key="${requirementKey}"]`);
            if (!wrapper) return;
            wrapper.classList.add('is-invalid');
            const control = wrapper.querySelector('input, textarea, select, .required-checklist-label, .required-section-title') || wrapper;
            if (control && typeof control.setAttribute === 'function') {
                control.setAttribute('aria-invalid', 'true');
            }
            if (!wrapper.querySelector('.required-field-error')) {
                const span = document.createElement('span');
                span.className = 'required-field-error';
                span.textContent = `Preencha o item obrigatório: ${errorLabel}.`;
                wrapper.appendChild(span);
            }
        });

        const firstInvalid = detailPanel.querySelector('.is-invalid [data-requirement-key]') || detailPanel.querySelector('.is-invalid');
        if (firstInvalid) {
            const focusTarget = firstInvalid.querySelector('input, textarea, select') || firstInvalid;
            if (focusTarget && typeof focusTarget.focus === 'function') {
                focusTarget.focus();
            }
        }
    }

    static renderDesenharRequirementErrors(errors) {
        const detailPanel = document.getElementById('process-detail-panel');
        if (!detailPanel) return;

        const mapping = {
            'Anexo I': 'anexoI',
            'Fluxo TO BE': 'fluxoToBe',
            'Principais mudanças': 'tobeChanges',
            'Identificação das tarefas críticas': 'criticalTasks',
            'Critérios de criticidade': 'criticalityCriteria',
            'Anotações adicionais': 'notes',
            'Indicadores do processo': 'indicators',
            'Anexo IV': 'anexoIv',
            'Anexo VI': 'anexoVI',
            'Anexo VII': 'anexoVII',
            'Anexo VIII': 'anexoVIII',
            'Checklist da atividade': 'checklist'
        };

        detailPanel.querySelectorAll('.is-invalid, .required-field-error').forEach((node) => {
            node.classList.remove('is-invalid');
            if (node.classList.contains('required-field-error')) node.remove();
        });

        errors.forEach((errorLabel) => {
            const requirementKey = mapping[errorLabel] || errorLabel;
            const wrapper = detailPanel.querySelector(`[data-requirement-key="${requirementKey}"]`) || detailPanel.querySelector('.activity-section');
            if (!wrapper) return;
            wrapper.classList.add('is-invalid');
            const control = wrapper.querySelector('input, textarea, select') || wrapper;
            if (control && typeof control.setAttribute === 'function') control.setAttribute('aria-invalid', 'true');
            if (!wrapper.querySelector('.required-field-error')) {
                const span = document.createElement('span');
                span.className = 'required-field-error';
                span.textContent = `Preencha o item obrigatório: ${errorLabel}.`;
                wrapper.appendChild(span);
            }
        });

        const firstInvalid = detailPanel.querySelector('.is-invalid [data-requirement-key]') || detailPanel.querySelector('.is-invalid');
        if (firstInvalid) {
            const focusTarget = firstInvalid.querySelector('input, textarea, select') || firstInvalid;
            if (focusTarget && typeof focusTarget.focus === 'function') focusTarget.focus();
        }
    }

    static renderImplementarRequirementErrors(errors) {
        const detailPanel = document.getElementById('process-detail-panel');
        if (!detailPanel) return;
        const mapping = {
            'Relatório de Acompanhamento': 'relatorioAcompanhamento'
        };
        detailPanel.querySelectorAll('.is-invalid, .required-field-error').forEach((node) => {
            node.classList.remove('is-invalid');
            if (node.classList.contains('required-field-error')) node.remove();
        });
        errors.forEach((errorLabel) => {
            const requirementKey = mapping[errorLabel] || errorLabel;
            const wrapper = detailPanel.querySelector(`[data-requirement-key="${requirementKey}"]`) || detailPanel.querySelector('.activity-section');
            if (!wrapper) return;
            wrapper.classList.add('is-invalid');
            const control = wrapper.querySelector('input, textarea, select') || wrapper;
            if (control && typeof control.setAttribute === 'function') control.setAttribute('aria-invalid', 'true');
            if (!wrapper.querySelector('.required-field-error')) {
                const span = document.createElement('span');
                span.className = 'required-field-error';
                span.textContent = `Preencha o item obrigatório: ${errorLabel}.`;
                wrapper.appendChild(span);
            }
        });
        const firstInvalid = detailPanel.querySelector('.is-invalid [data-requirement-key]') || detailPanel.querySelector('.is-invalid');
        if (firstInvalid) {
            const focusTarget = firstInvalid.querySelector('input, textarea, select') || firstInvalid;
            if (focusTarget && typeof focusTarget.focus === 'function') focusTarget.focus();
        }
    }

    static renderMonitorarRequirementErrors(errors) {
        const detailPanel = document.getElementById('process-detail-panel');
        if (!detailPanel) return;
        const mapping = {
            'Número do Processo SEI': 'seiProcessNumber',
            'Relatório Situacional': 'relatorioSituacional'
        };
        detailPanel.querySelectorAll('.is-invalid, .required-field-error').forEach((node) => {
            node.classList.remove('is-invalid');
            if (node.classList.contains('required-field-error')) node.remove();
        });
        errors.forEach((errorLabel) => {
            const requirementKey = mapping[errorLabel] || errorLabel;
            const wrapper = detailPanel.querySelector(`[data-requirement-key="${requirementKey}"]`) || detailPanel.querySelector('.activity-section');
            if (!wrapper) return;
            wrapper.classList.add('is-invalid');
            const control = wrapper.querySelector('input, textarea, select') || wrapper;
            if (control && typeof control.setAttribute === 'function') control.setAttribute('aria-invalid', 'true');
            if (!wrapper.querySelector('.required-field-error')) {
                const span = document.createElement('span');
                span.className = 'required-field-error';
                span.textContent = `Preencha o item obrigatório: ${errorLabel}.`;
                wrapper.appendChild(span);
            }
        });
        const firstInvalid = detailPanel.querySelector('.is-invalid [data-requirement-key]') || detailPanel.querySelector('.is-invalid');
        if (firstInvalid) {
            const focusTarget = firstInvalid.querySelector('input, textarea, select') || firstInvalid;
            if (focusTarget && typeof focusTarget.focus === 'function') focusTarget.focus();
        }
    }

    static isPlanejarRequirementRequired(activityCode, requirementKey) {
        return Boolean((this.PLANEJAR_REQUIREMENT_CATALOG[activityCode] || []).some(item => item.id === requirementKey));
    }

    static getPlanejarRequiredFieldAttributes(activityCode, requirementKey) {
        const required = this.isPlanejarRequirementRequired(activityCode, requirementKey);
        return {
            required,
            ariaRequired: required ? 'true' : 'false',
            dataRequired: required ? 'true' : 'false',
            className: required ? 'field-required' : ''
        };
    }

    static getPlanejarRequiredFieldClass(activityCode, requirementKey) {
        return this.isPlanejarRequirementRequired(activityCode, requirementKey) ? 'field-required' : '';
    }

    static clearPlanejarRequirementError(target, activityCode, requirementKey) {
        const detailPanel = target?.closest('.my-processes-detail') || document.getElementById('process-detail-panel');
        if (!detailPanel) return;
        const fieldWrapper = detailPanel.querySelector(`[data-requirement-key="${requirementKey}"]`);
        if (fieldWrapper) {
            fieldWrapper.classList.remove('is-invalid');
            const relevantControl = fieldWrapper.querySelector('input, textarea, select, .required-checklist-label, .required-section-title');
            if (relevantControl) relevantControl.removeAttribute('aria-invalid');
            const errorNode = fieldWrapper.querySelector('.required-field-error');
            if (errorNode) errorNode.remove();
        }
    }

    static applyPlanejarRequirementErrors(processoId, phaseName, activityCode, missingLabels) {
        const detailPanel = document.getElementById('process-detail-panel');
        if (!detailPanel) return;

        missingLabels.forEach((label) => {
            const key = {
                'Objetivo do Projeto de Melhoria': 'objective',
                'Forças': 'strengths',
                'Fraquezas': 'weaknesses',
                'Oportunidades': 'opportunities',
                'Ameaças': 'threats',
                'Anexo III — Cronograma': 'cronograma',
                'Checklist da atividade': 'checklist',
                'Participante ativo': 'participant-active',
                'Documentação Existente': 'documentacao',
                'DEIP - Diagrama de Escopo e Interface': 'deip',
                'Objetivo Estratégico': 'objetivoEstrategico',
                'Iniciativa Estratégica': 'iniciativaEstr',
                'Anexo II': 'anexoII',
                'Ata de Validação': 'ata'
            }[label];

            if (!key) return;
            const wrapper = detailPanel.querySelector(`[data-requirement-key="${key}"]`);
            if (!wrapper) return;
            wrapper.classList.add('is-invalid');
            const control = wrapper.querySelector('input, textarea, select, .required-checklist-label, .required-section-title');
            if (control) control.setAttribute('aria-invalid', 'true');
            if (!wrapper.querySelector('.required-field-error')) {
                const span = document.createElement('span');
                span.className = 'required-field-error';
                span.textContent = `Preencha o item obrigatório: ${label}.`;
                wrapper.appendChild(span);
            }
        });

        const firstInvalid = detailPanel.querySelector('.is-invalid [data-requirement-key]') || detailPanel.querySelector('.is-invalid');
        if (firstInvalid) {
            const focusTarget = firstInvalid.querySelector('input, textarea, select') || firstInvalid;
            if (focusTarget && typeof focusTarget.focus === 'function') {
                focusTarget.focus();
            }
        }
    }

    static hasValidRequiredAttachment(processo, phaseName, activityCode, attachmentLabel, attachmentType) {
        const phase = processo?.phases?.find(f => f.name === phaseName);
        const activity = phase?.activities?.find(a => a.code === activityCode);
        const attachments = (activity?.attachments || []).filter((a) => {
            const matchesLabel = a.label === attachmentLabel;
            const matchesType = !attachmentType || a.attachmentType === attachmentType;
            return matchesLabel && matchesType && a.active !== false && !a.removed;
        });
        if (!attachments.length) return false;
        const current = attachments.find(a => a.current === true) || attachments[attachments.length - 1];
        if (!current?.name || !String(current.name).trim()) return false;
        if (current.version !== undefined && current.version !== null && !String(current.version).trim()) return false;
        return true;
    }

    static getPlanejarActivityMissingRequirements(processo, phaseName, activityCode) {
        if (!processo || phaseName !== 'Planejar') return [];

        const phase = processo.phases.find(f => f.name === phaseName);
        const activity = phase?.activities.find(a => a.code === activityCode);
        if (!activity) return [];

        const content = activity.content || {};
        const attachments = activity.attachments || [];
        const checklist = activity.checklist || [];
        const missing = [];

        switch (activityCode) {
            case 'PLAN_B':
                if (!String(content.objective || '').trim()) missing.push('Objetivo do Projeto de Melhoria');
                if (!String(content.strengths || '').trim()) missing.push('Forças');
                if (!String(content.weaknesses || '').trim()) missing.push('Fraquezas');
                if (!String(content.opportunities || '').trim()) missing.push('Oportunidades');
                if (!String(content.threats || '').trim()) missing.push('Ameaças');
                if (!this.hasValidRequiredAttachment(processo, phaseName, activityCode, 'Anexo III — Cronograma')) missing.push('Anexo III — Cronograma');
                if (!checklist.some(i => i.concluido)) missing.push('Checklist da atividade');
                break;
            case 'PLAN_A':
                if (!this.getActivityResponsibles(processo, phaseName, activityCode).length) missing.push('Participante ativo');
                if (!checklist.some(i => i.concluido)) missing.push('Checklist da atividade');
                break;
            case 'PLAN_C':
                if (!this.hasValidRequiredAttachment(processo, phaseName, activityCode, 'Documentação Existente')) missing.push('Documentação Existente');
                if (!checklist.some(i => i.concluido)) missing.push('Checklist da atividade');
                break;
            case 'PLAN_D':
                if (!this.hasValidRequiredAttachment(processo, phaseName, activityCode, 'DEIP - Diagrama de Escopo e Interface')) missing.push('DEIP - Diagrama de Escopo e Interface');
                if (!checklist.some(i => i.concluido)) missing.push('Checklist da atividade');
                break;
            case 'PLAN_E':
                if (!String(content.objetivoEstrategico || '').trim()) missing.push('Objetivo Estratégico');
                if (!String(content.iniciativaEstr || '').trim()) missing.push('Iniciativa Estratégica');
                if (!this.hasValidRequiredAttachment(processo, phaseName, activityCode, 'Anexo II')) missing.push('Anexo II');
                break;
            case 'PLAN_G':
                if (!this.hasValidRequiredAttachment(processo, phaseName, activityCode, 'Ata de Validação')) missing.push('Ata de Validação');
                if (!checklist.some(i => i.concluido)) missing.push('Checklist de aprovação');
                break;
            default:
                break;
        }

        return missing;
    }

    /* Desenhar: regras e validação */
    static getDesenharActivityRules(activityCode) {
        return this.DESENHAR_REQUIREMENT_CATALOG[activityCode] || {};
    }

    static getDesenharActivityMissingRequirements(processo, activityCode) {
        if (!processo) return [];
        const phase = processo.phases.find(f => f.name === 'Desenhar');
        const activity = phase?.activities.find(a => a.code === activityCode);
        if (!activity) return [];

        const missing = [];
        const rules = this.getDesenharActivityRules(activityCode) || {};
        const content = activity.content || {};
        const attachments = activity.attachments || [];
        const checklist = activity.checklist || [];

        // required attachments
        (rules.requiredAttachments || []).forEach(label => {
            if (!this.hasValidRequiredAttachment(processo, 'Desenhar', activityCode, label)) {
                // present user-friendly label
                const userLabel = label.replace(' (Redesenhado)', '');
                missing.push(userLabel);
            }
        });

        // required fields
        (rules.requiredFields || []).forEach(fieldLabel => {
            switch (fieldLabel) {
                case 'Principais mudanças':
                    if (!String(content.tobeChanges || '').trim()) missing.push('Principais mudanças');
                    break;
                case 'Anotações adicionais':
                    if (!String(content.notes || '').trim()) missing.push('Anotações adicionais');
                    break;
                default:
                    if (!String(content[fieldLabel] || '').trim()) missing.push(fieldLabel);
                    break;
            }
        });

        if (activityCode === 'DES_E') {
            const indicators = (activity.content?.indicators || []).filter(i => i.active !== false);
            if (!indicators.length) missing.push('Indicadores do processo');
        }

        // requireAllEditable: all editable content, checklist items and attachments present must be filled/complete
        if (rules.requireAllEditable) {
            // content fields
            const fieldLabelsByKey = {
                DES_C: {
                    criticalTasks: 'Identificação das tarefas críticas',
                    criticalityCriteria: 'Critérios de criticidade'
                }
            };
            Object.keys(content || {}).forEach(k => {
                const v = content[k];
                const userLabel = (fieldLabelsByKey[activityCode] && fieldLabelsByKey[activityCode][k]) || k;
                if (v === null || v === undefined) missing.push(userLabel);
                if (typeof v === 'string' && !String(v).trim()) missing.push(userLabel);
            });
            // checklist: if exists, require all items concluded
            if (Array.isArray(checklist) && checklist.length) {
                const notDone = checklist.filter(i => !i.concluido);
                if (notDone.length) missing.push('Checklist da atividade');
            }
            // attachments: if there are attachments expected in schema, require at least one valid
            if (Array.isArray(attachments) && attachments.length) {
                // ensure at least one non-removed attachment exists
                const hasValid = attachments.some(a => a.active !== false && !a.removed && a.name && String(a.name).trim());
                if (!hasValid) missing.push('Anexos pendentes');
            }
        }

        return Array.from(new Set(missing));
    }

    static validateDesenharActivity(processo, activityCode) {
        const missingRequirements = this.getDesenharActivityMissingRequirements(processo, activityCode);
        const displayTitle = this.ACTIVITY_DISPLAY_TITLES[activityCode] || activityCode;
        return {
            valid: missingRequirements.length === 0,
            activityCode,
            activityTitle: displayTitle,
            missingRequirements
        };
    }

    static validateDesenharPhase(processo) {
        const phase = processo?.phases?.find((f) => f.name === 'Desenhar');
        if (!phase) return { valid: true, missingByActivity: [] };

        const missingByActivity = phase.activities.map(activity => {
            const result = this.validateDesenharActivity(processo, activity.code);
            if (result.valid) return null;
            return {
                activityCode: activity.code,
                activityTitle: activity.title || this.ACTIVITY_DISPLAY_TITLES[activity.code] || activity.code,
                missingRequirements: result.missingRequirements
            };
        }).filter(Boolean);

        return { valid: missingByActivity.length === 0, missingByActivity };
    }

    static canAdvanceToImplementar(processo) {
        return this.validateDesenharPhase(processo).valid;
    }

    /* Implementar: regras e validação */
    static getImplementarActivityRules(activityCode) {
        return this.IMPLEMENTAR_REQUIREMENT_CATALOG[activityCode] || {};
    }

    static getImplementarActivityMissingRequirements(processo, activityCode) {
        if (!processo || !activityCode) return [];
        const phase = processo.phases.find(f => f.name === 'Implementar');
        const activity = phase?.activities.find(a => a.code === activityCode);
        if (!activity) return [];

        const missing = [];
        const rules = this.getImplementarActivityRules(activityCode) || {};

        // IMPL_A: require Relatório de Acompanhamento
        return missing;
    }

    static validateImplementarActivity(processo, activityCode) {
        const missingRequirements = this.getImplementarActivityMissingRequirements(processo, activityCode);
        return { valid: missingRequirements.length === 0, activityCode, missingRequirements };
    }

    static validateImplementarPhase(processo) {
        const phase = processo?.phases?.find((f) => f.name === 'Implementar');
        if (!phase) return { valid: true, missingByActivity: [] };
        const missingByActivity = phase.activities.map(activity => {
            const result = this.validateImplementarActivity(processo, activity.code);
            if (result.valid) return null;
            return {
                activityCode: activity.code,
                activityTitle: activity.title || this.ACTIVITY_DISPLAY_TITLES[activity.code] || activity.code,
                missingRequirements: result.missingRequirements
            };
        }).filter(Boolean);
        return { valid: missingByActivity.length === 0, missingByActivity };
    }

    static canAdvanceToMonitorar(processo) {
        return this.validateImplementarPhase(processo).valid;
    }

    /* Monitorar: regras e validação */
    static getMonitorarActivityRules(activityCode) {
        return this.MONITORAR_REQUIREMENT_CATALOG[activityCode] || {};
    }

    static getMonitorarActivityMissingRequirements(processo, activityCode) {
        if (!processo || !activityCode) return [];
        const phase = processo.phases.find(f => f.name === 'Monitorar');
        const activity = phase?.activities.find(a => a.code === activityCode);
        if (!activity) return [];

        const missing = [];

        if (activityCode === 'MON_D') {
            // SEI number
            const sei = String(activity.content?.seiProcessNumber || '').trim();
            if (!sei) missing.push('Número do Processo SEI');
            // Relatório Situacional
            if (!this.hasValidRequiredAttachment(processo, 'Monitorar', activityCode, 'Relatório Situacional')) missing.push('Relatório Situacional');
        }

        return missing;
    }

    static validateMonitorarActivity(processo, activityCode) {
        const missingRequirements = this.getMonitorarActivityMissingRequirements(processo, activityCode);
        return { valid: missingRequirements.length === 0, activityCode, missingRequirements };
    }

    static validateMonitorarPhase(processo) {
        const phase = processo?.phases?.find((f) => f.name === 'Monitorar');
        if (!phase) return { valid: true, missingByActivity: [] };
        const missingByActivity = phase.activities.map(activity => {
            const result = this.validateMonitorarActivity(processo, activity.code);
            if (result.valid) return null;
            return {
                activityCode: activity.code,
                activityTitle: activity.title || this.ACTIVITY_DISPLAY_TITLES[activity.code] || activity.code,
                missingRequirements: result.missingRequirements
            };
        }).filter(Boolean);
        return { valid: missingByActivity.length === 0, missingByActivity };
    }

    static canCompleteBpmCycle(processo) {
        return this.validateMonitorarPhase(processo).valid;
    }

    static getPlanejarActivityRequirementCount(activityCode) {
        return (this.PLANEJAR_REQUIREMENT_CATALOG[activityCode] || []).length;
    }

    static getChecklistStatusValue(item) {
        const status = String(item?.status ?? '').trim().toLowerCase();
        const normalized = status.replace(/[^a-z]/g, '');
        return item?.concluido === true || normalized === 'concluido' || normalized === 'concluida' || normalized === 'concluido' || normalized === 'completed' || normalized === 'finalizado';
    }

    static getActivityChecklistMetrics(activity) {
        const checklist = Array.isArray(activity?.checklist) ? activity.checklist : [];
        const total = checklist.length;
        const completed = checklist.filter((item) => this.getChecklistStatusValue(item)).length;
        return {
            total,
            completed,
            pending: Math.max(0, total - completed),
            percent: total ? Math.round((completed / total) * 100) : 0
        };
    }

    static getProcessChecklistMetrics(processo, phaseName = null) {
        if (!processo || !Array.isArray(processo.phases)) {
            return { total: 0, completed: 0, pending: 0, percent: 0 };
        }

        const phases = phaseName ? processo.phases.filter((phase) => phase?.name === phaseName) : processo.phases;
        const result = phases.reduce((acc, phase) => {
            (phase?.activities || []).forEach((activity) => {
                const stats = this.getActivityChecklistMetrics(activity);
                acc.total += stats.total;
                acc.completed += stats.completed;
                acc.pending += stats.pending;
            });
            return acc;
        }, { total: 0, completed: 0, pending: 0 });

        result.percent = result.total ? Math.round((result.completed / result.total) * 100) : 0;
        return result;
    }

    static calculateActivityProgress(processoId, phaseName, activityCode) {
        const processes = this.getStoredProcesses();
        const processo = processes.find(p => p.id === processoId);
        if (!processo) return 0;
        const phase = processo.phases.find(f => f.name === phaseName);
        if (!phase) return 0;
        const activity = phase.activities.find(a => a.code === activityCode);
        if (!activity) return 0;

        if (phaseName === 'Planejar') {
            const requiredCount = this.getPlanejarActivityRequirementCount(activityCode);
            const missing = this.getPlanejarActivityMissingRequirements(processo, phaseName, activityCode);
            if (!requiredCount) return 0;
            const completed = Math.max(0, requiredCount - missing.length);
            return Math.round((completed / requiredCount) * 100);
        }

        // Para Planejar, o progresso é baseado nos requisitos obrigatórios da atividade
        // Para outras fases, o progresso é baseado APENAS nos itens de checklist
        if (phaseName === 'Planejar') {
            const requiredCount = this.getPlanejarActivityRequirementCount(activityCode);
            const missing = this.getPlanejarActivityMissingRequirements(processo, phaseName, activityCode);
            if (!requiredCount) return 0;
            const completed = Math.max(0, requiredCount - missing.length);
            return Math.round((completed / requiredCount) * 100);
        }

        const metrics = this.getActivityChecklistMetrics(activity);
        return metrics.total ? metrics.percent : 0;
    }

    static calculatePhaseProgress(processoId, phaseName) {
        const processes = this.getStoredProcesses();
        const processo = processes.find(p => p.id === processoId);
        if (!processo) return 0;
        const phase = processo.phases.find(f => f.name === phaseName);
        if (!phase || !phase.activities || phase.activities.length === 0) return 0;
        return this.getProcessChecklistMetrics(processo, phaseName).percent;
    }

    static calculateProcessProgress(processoId) {
        const processes = this.getStoredProcesses();
        const processo = processes.find(p => p.id === processoId);
        if (!processo) return 0;
        const phasesWithActivities = processo.phases.filter(p => p.activities && p.activities.length > 0);
        if (!phasesWithActivities.length) return 0;
        return this.getProcessChecklistMetrics(processo).percent;
    }

    static recalculateAndRender(processoId) {
        const processes = this.getStoredProcesses();
        const processo = processes.find(p => p.id === processoId);
        if (!processo) return;
        // update phase and process progress
        processo.phases.forEach(phase => {
            phase.percentual = this.calculatePhaseProgress(processoId, phase.name);
        });
        processo.percentual_conclusao = this.calculateProcessProgress(processoId);
        this.setStoredProcesses(processes);
        this.renderProcesses(processes);
        // If a detail is open for this process, re-render it
        const sel = this.getStoredSelection();
        if (sel && sel.processoId === processoId) this.renderActivityDetail(sel.processoId, sel.phaseName, sel.activityCode);
    }

    static renderActivityResponsibilitySection(processo, phaseName, activityCode) {
        const responsibles = this.getActivityResponsibles(processo, phaseName, activityCode);

        if (!responsibles.length) {
            return `<div class="activity-section"><p class="text-muted">Nenhum responsável atribuído a esta atividade.</p></div>`;
        }

        return `
            <div class="activity-section responsibles-list">
                <h4>Responsabilidade</h4>
                <ul>
                    ${responsibles.map(r => `<li data-resp-id="${r.id}"><strong>${r.name}</strong> ${r.registration ? `(${r.registration})` : ''} — ${r.sectorName || ''} <div class="small text-muted">${r.responsibilities || ''}</div></li>`).join('')}
                </ul>
            </div>
        `;
    }

    static openNewProcessTab() {
        const tabButton = document.querySelector('[data-tab="novo-processo"]');
        if (tabButton) tabButton.click();
    }

    static scrollToProcessList() {
        const processSection = document.getElementById('processes-list');
        if (processSection) {
            processSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    static getNextProcessId() {
        // Usar max ID dos processos existentes + 1
        if (!this.allProcesses || this.allProcesses.length === 0) {
            return Math.floor(Math.random() * 100) + 1000; // Começar de 1000+ para evitar conflitos
        }
        const maxId = Math.max(...this.allProcesses.map(p => parseInt(p.id, 10)));
        return maxId + 1;
    }

    static getResponsavelName(responsavelId) {
        return this.availableResponsaveis.find((item) => item.id === responsavelId)?.nome || 'Não definido';
    }

    static getMacroprocessoName(macroprocessoId) {
        if (typeof macroprocessoId === 'string' && macroprocessoId.trim()) return macroprocessoId.trim();
        return this.availableMacroprocessos.find((item) => item.id === macroprocessoId)?.nome || 'Não definido';
    }

    /**
     * Gerar Procedimento Operacional Padrão (POP) em PDF
     */
    static async generatePOP(processoId, processoNome) {
        try {
            console.log(`[POP] Iniciando geração de POP para processo ${processoId}`);
            
            // Obter token
            const token = localStorage.getItem('smp_token');
            if (!token) {
                alert('Sessão expirada. Por favor, faça login novamente.');
                return;
            }

            // Mostrar indicador visual
            const button = event.target.closest('button');
            const originalText = button.textContent;
            button.disabled = true;
            button.textContent = '⏳ Gerando POP...';

            try {
                // Criar objeto básico do processo para envio
                const processo = {
                    id: processoId,
                    nome: processoNome,
                    setor_id: null,
                    setor_nome: 'Não definido',
                    macroprocesso_id: 1,
                    macroprocesso_nome: 'Investigação',
                    status_fase: 'Desenhar',
                    percentual_conclusao: 0,
                    responsavel_nome: 'Não definido',
                    criado_em: new Date().toISOString()
                };

                // Fazer requisição POST para gerar POP
                const response = await fetch(`/api/processes/${processoId}/pop`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ processo: processo })
                });

                if (!response.ok) {
                    throw new Error(`Erro HTTP: ${response.status}`);
                }

                // Obter o PDF como blob
                const blob = await response.blob();

                // Criar link de download
                const blobUrl = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = blobUrl;
                link.download = `POP_${processoNome.replace(/\s+/g, '_')}_${new Date().getTime()}.pdf`;
                link.style.display = 'none';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

                // Liberar memória
                window.URL.revokeObjectURL(blobUrl);

                console.log('[POP] POP gerado e baixado com sucesso');
                alert('Procedimento Operacional Padrão gerado com sucesso!');
            } finally {
                // Restaurar estado do botão
                button.disabled = false;
                button.textContent = originalText;
            }
        } catch (error) {
            console.error('[POP] Erro ao gerar POP:', error);
            alert(`Erro ao gerar POP: ${error.message}`);
        }
    }

    static getBpmPhaseTemplates() {
        const phaseTemplate = (name, activities) => ({
            name,
            isExpanded: name === 'Planejar',
            activities
        });

        return [
            phaseTemplate('Planejar', [
                { code: 'PLAN_A', title: 'A) Definir equipe de melhoria', content: {}, attachments: [], team: [] },
                { code: 'PLAN_B', title: 'B) Estabelecer objetivo do Projeto de Melhoria', content: {}, attachments: [], team: [] },
                { code: 'PLAN_C', title: 'C) Solicitar documentação existente do processo', content: {}, attachments: [] },
                { code: 'PLAN_D', title: 'D) Diagrama de Escopo e Interface — DEIP', content: {}, attachments: [] },
                { code: 'PLAN_E', title: 'E) Elaborar Plano de Projeto com todas as informações adquiridas (Referente à etapa E e F do Manual)', content: {}, attachments: [] },
                { code: 'PLAN_G', title: 'G) Aprovar Plano do Projeto de Melhoria', content: {}, attachments: [] }
            ]),
            phaseTemplate('Analisar', [
                { code: 'ANAL_A', title: this.ACTIVITY_DISPLAY_TITLES.ANAL_A, content: {}, attachments: [], history: [], checklist: [] },
                { code: 'ANAL_B', title: this.ACTIVITY_DISPLAY_TITLES.ANAL_B, content: {}, attachments: [], history: [], checklist: [] },
                { code: 'ANAL_C', title: this.ACTIVITY_DISPLAY_TITLES.ANAL_C, content: {}, attachments: [], history: [], checklist: [] },
                { code: 'ANAL_D', title: this.ACTIVITY_DISPLAY_TITLES.ANAL_D, content: {}, attachments: [], history: [], checklist: [] },
                { code: 'ANAL_E', title: this.ACTIVITY_DISPLAY_TITLES.ANAL_E, content: { indicators: [] }, attachments: [], history: [], checklist: [] }
            ]),
            phaseTemplate('Desenhar', [
                { code: 'DES_A', title: 'a) Redefinir escopo do processo', content: {}, attachments: [], history: [], checklist: [] },
                { code: 'DES_B', title: 'b) Modelagem do processo otimizado: fluxo TO BE', content: {}, attachments: [], history: [], checklist: [] },
                { code: 'DES_C', title: 'c) Tarefas Críticas do fluxo identificadas', content: {}, attachments: [], history: [], checklist: [] },
                { code: 'DES_D', title: 'd) Levantamento de riscos das Tarefas Críticas', content: {}, attachments: [], history: [], checklist: [] },
                { code: 'DES_E', title: 'e) Definir Indicadores do processo', content: { indicators: [] }, attachments: [], history: [], checklist: [] },
                { code: 'DES_F', title: 'f) Documentação Descritiva do Processo (Guia do Processo)', content: {}, attachments: [], history: [], checklist: [] },
                { code: 'DES_G', title: 'g) Elaborar plano de implementação (ESSA ETAPA É REFERENTE AS ETAPAS G E H DO MANUAL)', content: {}, attachments: [], history: [], checklist: [] }
            ]),
            phaseTemplate('Implementar', [
                { code: 'IMPL_A', title: 'a) Acompanhamento da execução das ações por meio das reuniões da sistemática de acompanhamento', content: {}, attachments: [], history: [], checklist: [] },
                { code: 'IMPL_B', title: 'b) Acompanhamento da implantação dos indicadores do processo e identificação de contramedidas caso o não atingimento das metas escalonadas dos indicadores dos processos', content: { implementationRecords: [], contraMedidas: [] }, attachments: [], history: [], checklist: [] }
            ]),
            phaseTemplate('Monitorar', [
                { code: 'MON_A', title: 'a) Acompanhar a gestão do dia a dia do processo', content: {}, attachments: [], history: [], checklist: [] },
                { code: 'MON_B', title: 'b) Acompanhar os resultados dos indicadores do processo', content: {}, attachments: [], history: [], checklist: [] },
                { code: 'MON_C', title: 'c) Identificar oportunidades de melhorias', content: {}, attachments: [], history: [], checklist: [] },
                { code: 'MON_D', title: 'd) Repassar periodicamente as informações de monitoramento às instâncias de governança de processos estabelecidas no órgão.', content: {}, attachments: [], history: [], checklist: [] }
            ])
        ];
    }

    static normalizeProcessBpmStructure(processo) {
        if (!processo || typeof processo !== 'object') return processo;
        if (!Array.isArray(processo.phases)) processo.phases = [];

        // Migration: merge DES_H into DES_G for existing processes
        try {
            this.mergeDesenharActivitiesGAndH(processo);
        } catch (e) {
            console.error('Erro ao migrar atividades DES_H -> DES_G', e);
        }

        const defaultPhases = this.getBpmPhaseTemplates();
        const normalizedPhases = defaultPhases.map((defaultPhase) => {
            const existingPhase = processo.phases.find((phase) => phase.name === defaultPhase.name);
            if (!existingPhase) {
                return { ...defaultPhase };
            }

            const existingActivities = Array.isArray(existingPhase.activities) ? existingPhase.activities : [];
            const mergedActivities = defaultPhase.activities.map((defaultActivity) => {
                const existingActivity = existingActivities.find((act) => act.code === defaultActivity.code);
                if (!existingActivity) {
                    return { ...defaultActivity };
                }

                return {
                    ...defaultActivity,
                    ...existingActivity,
                    title: defaultActivity.title,
                    content: { ...(defaultActivity.content || {}), ...(existingActivity.content || {}) },
                    attachments: Array.isArray(existingActivity.attachments) ? existingActivity.attachments : (defaultActivity.attachments || []),
                    history: Array.isArray(existingActivity.history) ? existingActivity.history : (defaultActivity.history || []),
                    checklist: Array.isArray(existingActivity.checklist) ? existingActivity.checklist : (defaultActivity.checklist || [])
                };
            });

            const extraActivities = existingActivities.filter((act) => !defaultPhase.activities.some((defaultAct) => defaultAct.code === act.code));
            return {
                ...existingPhase,
                name: existingPhase.name,
                isExpanded: existingPhase.isExpanded ?? defaultPhase.isExpanded,
                activities: [...mergedActivities, ...extraActivities]
            };
        });

        const extraPhases = processo.phases.filter((phase) => !defaultPhases.some((defaultPhase) => defaultPhase.name === phase.name));
        processo.phases = [...normalizedPhases, ...extraPhases];
        return processo;
    }

    static createProcessTemplate(data) {
        const processId = this.getNextProcessId();
        const currentUser = window.AccessControl?.normalizeUser?.(window.app?.currentUser) || window.app?.currentUser || {};
        const phases = this.getBpmPhaseTemplates().map((phase) => ({
            ...phase,
            activities: phase.activities.map((activity) => ({ ...activity }))
        }));

        return {
            id: processId,
            createdByUserId: currentUser.id || null,
            createdByUserName: currentUser.nome || currentUser.name || '',
            nome: data.nome,
            setor_id: data.setor_id,
            setor_nome: this.getSetorDisplayName(data.setor_id),
            responsavel_id: data.responsavel_id,
            responsavel_nome: data.responsavel_id ? this.getResponsavelName(data.responsavel_id) : 'Não definido',
            macroprocesso_id: data.macroprocesso_id || null,
            macroprocesso_nome: data.macroprocesso_nome || this.getMacroprocessoName(data.macroprocesso_id),
            status_fase: 'Planejar',
            percentual_conclusao: 0,
            prazo: 'Não definido',
            observacoes: data.observacoes || '',
            isExpanded: true,
            phases
        };
    }

    // Migração: unifica DES_H em DES_G preservando dados e histórico
    static mergeDesenharActivitiesGAndH(processo) {
        if (!processo || !Array.isArray(processo.phases)) return;
        const desenhar = processo.phases.find(p => p.name === 'Desenhar');
        if (!desenhar || !Array.isArray(desenhar.activities)) return;

        const idxG = desenhar.activities.findIndex(a => a.code === 'DES_G');
        const idxH = desenhar.activities.findIndex(a => a.code === 'DES_H');
        if (idxH === -1) return; // nada a migrar

        const activityG = idxG >= 0 ? desenhar.activities[idxG] : null;
        const activityH = desenhar.activities[idxH];

        // If DES_G missing, adopt DES_H as DES_G
        if (!activityG && activityH) {
            activityH.code = 'DES_G';
            activityH.title = this.ACTIVITY_DISPLAY_TITLES.DES_G || activityH.title;
            // remove original DES_H position by replacing
            desenhar.activities.splice(idxH, 1, activityH);
            return;
        }

        if (!activityG || !activityH) return;

        // Merge content
        activityG.content = { ...(activityG.content || {}), ...(activityH.content || {}) };

        // Merge attachments: keep separate by label
        activityG.attachments = activityG.attachments || [];
        (activityH.attachments || []).forEach(att => {
            // Avoid duplicate ids
            const exists = activityG.attachments.find(a => a.id === att.id);
            if (!exists) activityG.attachments.push(att);
        });

        // Merge checklist: consolidate into single checklist
        activityG.checklist = activityG.checklist || [];
        const checklistH = Array.isArray(activityH.checklist) ? activityH.checklist : [];
        // If any checklist from H is completed, mark G as completed
        const anyCompleted = checklistH.some(i => i.concluido) || activityG.checklist.some(i => i.concluido);
        // Preserve most recent responsible/observation
        const combined = [...activityG.checklist, ...checklistH];
        // Normalize to a single item if there are multiple
        if (combined.length > 0) {
            const latest = combined.reduce((a, b) => {
                const ta = a.concluidoEm || a.atualizadoEm || 0;
                const tb = b.concluidoEm || b.atualizadoEm || 0;
                return (new Date(ta) > new Date(tb)) ? a : b;
            });
            activityG.checklist = [{ itemId: latest.itemId || `${Date.now()}-g`, texto: this.ACTIVITY_CHECKLIST_TEXT.DES_G || 'Plano de implementação elaborado', concluido: !!anyCompleted, observacao: latest.observacao || '', completedByMemberId: latest.completedByMemberId || null, completedByName: latest.completedByName || '', completedBySector: latest.completedBySector || '', concluidoEm: anyCompleted ? (latest.concluidoEm || latest.atualizadoEm || new Date().toISOString()) : null, atualizadoEm: new Date().toISOString() }];
        } else {
            // leave as is
            activityG.checklist = activityG.checklist || [];
        }

        // Merge history chronologically
        activityG.history = activityG.history || [];
        const historyH = Array.isArray(activityH.history) ? activityH.history : [];
        const mergedHistory = [...activityG.history, ...historyH];
        mergedHistory.sort((a, b) => new Date(a.date) - new Date(b.date));
        activityG.history = mergedHistory;

        // Add migration record
        activityG.history.push({ id: Date.now() + Math.floor(Math.random() * 1000), action: 'Migração', user: 'Sistema', date: new Date().toISOString(), activityTitle: activityG.title, summary: 'Atividades do Plano de Implementação e do Plano de Capacitação unificadas.' });

        // Update teamMembers assignedActivities: replace DES_H -> DES_G and deduplicate
        processo.teamMembers = processo.teamMembers || [];
        processo.teamMembers.forEach(member => {
            if (!member) return;
            member.assignedActivities = Array.isArray(member.assignedActivities) ? member.assignedActivities.map(a => a === 'DES_H' ? 'DES_G' : a) : [];
            // dedupe
            member.assignedActivities = Array.from(new Set(member.assignedActivities));
        });

        // Remove DES_H from active activities and store legacy
        const legacy = processo.legacyMergedActivities || {};
        legacy.DES_H = activityH;
        processo.legacyMergedActivities = legacy;

        desenhar.activities = desenhar.activities.filter(a => a.code !== 'DES_H');
    }

    static async createProcess(data) {
        if (this.BPM_DATA_SOURCE === 'API' && window.bpmApi) {
            const created = await window.bpmApi.createProcess({
                name: data.nome,
                description: data.observacoes || '',
                organizational_unit_id: data.organizational_unit_id || data.setor_id,
                responsible_user_id: data.responsavel_id || null
            });
            await this.loadProcesses();
            return created;
        }
        const processes = this.getStoredProcesses();
        const newProcess = this.createProcessTemplate(data);
        processes.unshift(newProcess);
        this.setStoredProcesses(processes);
        this.setStoredSelection({ processoId: newProcess.id, phaseName: 'Planejar', activityCode: 'PLAN_A' });
        this.renderProcesses(processes);
        this.renderActivityDetail(newProcess.id, 'Planejar', 'PLAN_A');
        return newProcess;
    }

    static async updateProcess(processoId, data) {
        const processes = this.getStoredProcesses();
        const processo = processes.find((p) => p.id === processoId);
        if (!processo) throw new Error('Processo não encontrado');

        processo.nome = data.nome;
        processo.setor_id = data.setor_id;
        processo.setor_nome = this.getSetorDisplayName(data.setor_id) || processo.setor_nome;
        processo.macroprocesso_id = data.macroprocesso_id || null;
        processo.macroprocesso_nome = data.macroprocesso_nome || this.getMacroprocessoName(data.macroprocesso_id);
        processo.responsavel_id = data.responsavel_id;
        processo.responsavel_nome = data.responsavel_id ? this.getResponsavelName(data.responsavel_id) : processo.responsavel_nome;
        processo.observacoes = data.observacoes || processo.observacoes;
        this.setStoredProcesses(processes);
        this.renderProcesses(processes);
        return processo;
    }

    static async deleteProcess(processoId) {
        const processes = this.getStoredProcesses().filter((p) => String(p.id) !== String(processoId));
        this.setStoredProcesses(processes);
        this.clearStoredSelection();
        this.renderProcesses(processes);
    }

    static canDeleteProcess(processo) {
        const user = window.AccessControl?.normalizeUser?.(window.app?.currentUser) || window.app?.currentUser || {};
        const profile = String(user.perfil || user.accessProfileKey || '').toUpperCase();
        return profile === 'NGE' || profile === 'NGE_ADMIN' || String(processo?.createdByUserId || '') === String(user.id || '');
    }

    static async confirmDeleteProcess(processoId) {
        const processo = this.getStoredProcesses().find((item) => String(item.id) === String(processoId));
        if (!processo || !this.canDeleteProcess(processo)) {
            notificar('Você só pode remover processos inseridos por você.', 'warning');
            return;
        }

        const confirmed = window.confirm(`Deseja remover o processo "${processo.nome}"? Esta ação não pode ser desfeita.`);
        if (!confirmed) return;
        await this.deleteProcess(processoId);
        notificar('Processo removido com sucesso.', 'success');
    }

    static async saveActivity(processoId, phaseName, activityCode) {
        const processes = this.getStoredProcesses();
        const processo = processes.find((p) => p.id === processoId);
        if (!processo) return false;

        const phase = processo.phases.find((f) => f.name === phaseName);
        const activity = phase?.activities.find((a) => a.code === activityCode);
        if (!activity) return false;

        const checklist = Array.isArray(activity.checklist) ? activity.checklist : [];
        activity.concluida = checklist.length > 0 ? checklist.every((item) => item.concluido) : Boolean(activity.concluida);
        activity.status = activity.concluida ? 'concluida' : 'em_andamento';
        activity.updatedAt = new Date().toISOString();

        if (phaseName === 'Planejar' && activityCode === 'PLAN_B') {
            const objective = document.getElementById('detail-objective')?.value.trim() || '';
            activity.content = {
                objective,
                strengths: document.getElementById('detail-swot-strengths')?.value.trim() || '',
                weaknesses: document.getElementById('detail-swot-weaknesses')?.value.trim() || '',
                opportunities: document.getElementById('detail-swot-opportunities')?.value.trim() || '',
                threats: document.getElementById('detail-swot-threats')?.value.trim() || ''
            };
        } else if (phaseName === 'Planejar' && activityCode === 'PLAN_A') {
            activity.content = { savedAt: new Date().toISOString() };
        } else if (phaseName === 'Planejar' && activityCode === 'PLAN_E') {
            const objetivo = document.getElementById(`planE-objetivo-estrategico-${processoId}`)?.value.trim() || '';
            const iniciativa = document.getElementById(`planE-iniciativa-estrategica-${processoId}`)?.value.trim() || '';

            const premissas = (document.getElementById(`planE-premissas-${processoId}`)?.value || '').split('\n').map(s => s.trim()).filter(Boolean);
            const restricoes = (document.getElementById(`planE-restricoes-${processoId}`)?.value || '').split('\n').map(s => s.trim()).filter(Boolean);

            const meta = {
                name: document.getElementById(`planE-meta-name-${processoId}`)?.value.trim() || '',
                description: document.getElementById(`planE-meta-desc-${processoId}`)?.value.trim() || '',
                targetValue: document.getElementById(`planE-meta-target-${processoId}`)?.value.trim() || '',
                unit: document.getElementById(`planE-meta-unit-${processoId}`)?.value.trim() || '',
                deadline: document.getElementById(`planE-meta-deadline-${processoId}`)?.value || '',
                responsible: document.getElementById(`planE-meta-resp-${processoId}`)?.value.trim() || ''
            };

            activity.content = {
                objetivoEstrategico: objetivo,
                iniciativaEstr: iniciativa,
                premissas,
                restricoes,
                meta
            };
            // Nota: A criação de indicadores a partir de Meta do Processo foi removida
            // Indicadores continuam sendo criados em Analisar e Desenhar
        } else if (phaseName === 'Analisar') {
            const content = activity.content || {};
            switch (activityCode) {
                case 'ANAL_A':
                    content.criticalInfo = document.getElementById('detail-critical-info')?.value.trim() || '';
                    content.observations = document.getElementById('detail-observations')?.value.trim() || '';
                    break;
                case 'ANAL_B':
                    content.description = document.getElementById('detail-flow-description')?.value.trim() || '';
                    content.version = document.getElementById('detail-flow-version')?.value.trim() || '';
                    break;
                case 'ANAL_C':
                    content.disconnections = document.getElementById('detail-disconnections')?.value.trim() || '';
                    content.opportunities = document.getElementById('detail-opportunities')?.value.trim() || '';
                    content.deipInfo = document.getElementById('detail-deip-info')?.value.trim() || '';
                    content.flowInfo = document.getElementById('detail-flow-info')?.value.trim() || '';
                    content.brainstormNotes = document.getElementById('detail-brainstorm-notes')?.value.trim() || '';
                    content.brainstormParticipants = document.getElementById('detail-brainstorm-participants')?.value.trim() || '';
                    content.brainstormDate = document.getElementById('detail-brainstorm-date')?.value || '';
                    content.brainstormResult = document.getElementById('detail-brainstorm-result')?.value.trim() || '';
                    break;
                case 'ANAL_D':
                    content.priorityDisconnections = document.getElementById('detail-priority-disconnections')?.value.trim() || '';
                    content.priorityOpportunities = document.getElementById('detail-priority-opportunities')?.value.trim() || '';
                    content.improvementAnalysis = document.getElementById('detail-improvement-analysis')?.value.trim() || '';
                    content.causesIdentified = document.getElementById('detail-causes-identified')?.value.trim() || '';
                    content.causesPriority = document.getElementById('detail-causes-priority')?.value.trim() || '';
                    content.ideas = document.getElementById('detail-ideas')?.value.trim() || '';
                    content.brainstormInfo = document.getElementById('detail-brainstorm-info')?.value.trim() || '';
                    break;
                case 'ANAL_E':
                    // Indicator section saved independently via dedicated handler.
                    break;
                default:
                    break;
            }
            activity.content = content;
        } else if (phaseName === 'Desenhar') {
            const content = { ...(activity.content || {}) };
            switch (activityCode) {
                case 'DES_A':
                    content.scopeDescription = document.getElementById(`detail-scope-description-${processoId}-${activityCode}`)?.value.trim() || '';
                    content.scopeBoundaries = document.getElementById(`detail-scope-boundaries-${processoId}-${activityCode}`)?.value.trim() || '';
                    content.version = document.getElementById(`detail-scope-version-${processoId}-${activityCode}`)?.value.trim() || '';
                    break;
                case 'DES_B':
                    content.tobeDescription = document.getElementById(`detail-tobe-description-${processoId}-${activityCode}`)?.value.trim() || '';
                    content.tobeChanges = document.getElementById(`detail-tobe-changes-${processoId}-${activityCode}`)?.value.trim() || '';
                    content.version = document.getElementById(`detail-tobe-version-${processoId}-${activityCode}`)?.value.trim() || '';
                    break;
                case 'DES_C':
                    content.criticalTasks = document.getElementById(`detail-critical-tasks-${processoId}-${activityCode}`)?.value.trim() || '';
                    content.criticalityCriteria = document.getElementById(`detail-criticality-criteria-${processoId}-${activityCode}`)?.value.trim() || '';
                    break;
                case 'DES_D':
                    content.riskDescription = document.getElementById(`detail-risk-description-${processoId}-${activityCode}`)?.value.trim() || '';
                    content.riskImpact = document.getElementById(`detail-risk-impact-${processoId}-${activityCode}`)?.value.trim() || '';
                    content.riskMitigation = document.getElementById(`detail-risk-mitigation-${processoId}-${activityCode}`)?.value.trim() || '';
                    break;
                case 'DES_E':
                    content.notes = document.getElementById(`detail-indicator-notes-${processoId}-${activityCode}`)?.value.trim() || '';
                    break;
                case 'DES_F':
                    content.documentationSummary = document.getElementById(`detail-documentation-summary-${processoId}-${activityCode}`)?.value.trim() || '';
                    content.documentationOwner = document.getElementById(`detail-documentation-owner-${processoId}-${activityCode}`)?.value.trim() || '';
                    break;
                case 'DES_G':
                    content.implementationSummary = document.getElementById(`detail-implementation-summary-${processoId}-${activityCode}`)?.value.trim() || '';
                    content.implementationMilestones = document.getElementById(`detail-implementation-milestones-${processoId}-${activityCode}`)?.value.trim() || '';
                    content.implementationResponsible = document.getElementById(`detail-implementation-responsible-${processoId}-${activityCode}`)?.value.trim() || '';
                    // Training fields (migrated from DES_H)
                    content.trainingAudience = document.getElementById(`detail-training-audience-${processoId}-${activityCode}`)?.value.trim() || '';
                    content.trainingModules = document.getElementById(`detail-training-modules-${processoId}-${activityCode}`)?.value.trim() || '';
                    content.trainingSchedule = document.getElementById(`detail-training-schedule-${processoId}-${activityCode}`)?.value.trim() || '';
                    break;
                default:
                    content.notes = document.getElementById('detail-generic-note')?.value.trim() || '';
                    break;
            }
            activity.content = content;
        } else if (phaseName === 'Implementar') {
            const content = activity.content || {};
            if (activityCode === 'IMPL_A') {
                content.lastSavedAt = new Date().toISOString();
                activity.content = content;
                this.addActivityHistoryEntry(processo, phaseName, activityCode, 'Atividade salva', 'Relatório de Acompanhamento salvo na fase Implementar.');
            }

            if (activityCode === 'IMPL_B') {
                content.implementationRecords = content.implementationRecords || [];
                content.contraMedidas = content.contraMedidas || [];
                const indicators = this.getDesenharIndicators(processo);
                const records = indicators.map(indicator => {
                    const indicatorId = indicator.id;
                    const implementationStatus = document.getElementById(`impl-status-${processoId}-${activityCode}-${indicatorId}`)?.value || '';
                    const currentResult = document.getElementById(`impl-current-${processoId}-${activityCode}-${indicatorId}`)?.value.trim() || '';
                    const measurementDate = document.getElementById(`impl-date-${processoId}-${activityCode}-${indicatorId}`)?.value || '';
                    const implementationPercentageValue = document.getElementById(`impl-percent-${processoId}-${activityCode}-${indicatorId}`)?.value;
                    const implementationPercentage = implementationPercentageValue !== undefined && implementationPercentageValue !== null && implementationPercentageValue !== '' ? parseInt(implementationPercentageValue, 10) : null;
                    const targetReached = document.getElementById(`impl-target-${processoId}-${activityCode}-${indicatorId}`)?.value || '';
                    const observations = document.getElementById(`impl-observations-${processoId}-${activityCode}-${indicatorId}`)?.value.trim() || '';
                    const existing = (content.implementationRecords || []).find(r => String(r.indicatorId) === String(indicatorId));

                    if (!implementationStatus && !currentResult && !measurementDate && implementationPercentage == null && !targetReached && !observations) {
                        return existing || null;
                    }

                    return {
                        id: existing ? existing.id : Date.now() + Math.floor(Math.random() * 1000),
                        processId: processoId,
                        indicatorId,
                        activityCode,
                        implementationStatus,
                        currentResult,
                        measurementDate,
                        implementationPercentage,
                        targetReached,
                        observations,
                        createdAt: existing ? existing.createdAt : new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    };
                }).filter(Boolean);

                content.implementationRecords = records;
                activity.content = content;
                this.addActivityHistoryEntry(processo, phaseName, activityCode, 'Acompanhamento salvo', 'Dados de acompanhamento da implantação dos indicadores salvos.');
            }
        } else if (phaseName === 'Monitorar') {
            const content = activity.content || {};
            if (activityCode === 'MON_C') {
                content.opportunities = document.getElementById('detail-monitorar-opportunities')?.value.trim() || '';
                this.addActivityHistoryEntry(processo, phaseName, activityCode, 'Oportunidades salvas', 'Oportunidades de melhoria registradas na fase Monitorar.');
            }
            activity.content = content;
        }

        processo.percentual_conclusao = this.calculateProcessProgress(processoId);
        this.setStoredProcesses(processes);
        this.recalculateAndRender(processoId);

        if (typeof window !== 'undefined' && window.DashboardManager) {
            if (typeof window.DashboardManager.loadSetorDashboard === 'function') {
                window.DashboardManager.loadSetorDashboard();
            }
            if (typeof window.DashboardManager.loadNGEDashboard === 'function') {
                window.DashboardManager.loadNGEDashboard();
            }
        }
        if (typeof window !== 'undefined' && window.BPMDetailsModule?.updateOnUserChange) {
            window.BPMDetailsModule.updateOnUserChange();
        }

        notificar('Atividade salva com sucesso.', 'success');
        return true;
    }

    static async submitActivity(processoId, phaseName, activityCode) {
        // Save first (always allowed)
        await this.saveActivity(processoId, phaseName, activityCode);

        const processes = this.getStoredProcesses();
        const processo = processes.find((p) => p.id === processoId);
        const phase = processo?.phases.find((f) => f.name === phaseName);
        const activity = phase?.activities.find((a) => a.code === activityCode);
        if (!processo || !activity) return false;

        if (phaseName === 'Planejar') {
            const missing = this.getPlanejarActivityMissingRequirements(processo, phaseName, activityCode);
            if (missing.length) {
                const activityTitle = activity.title || this.getActivityDisplayTitle(activity) || activityCode;
                const joinedMissing = missing.join(', ');
                this.applyPlanejarRequirementErrors(processoId, phaseName, activityCode, missing);
                notificar(`Não foi possível submeter ${activityTitle}. Faltando: ${joinedMissing}.`, 'warning');
                return false;
            }
        }

        if (phaseName === 'Analisar') {
            const validation = this.validateAnalisarActivity(processo, activityCode);
            if (!validation.valid) {
                this.renderAnalisarRequirementErrors(validation.missingRequirements);
                notificar('Existem itens obrigatórios pendentes para o prosseguimento do processo.', 'warning');
                return false;
            }
        }

        if (phaseName === 'Implementar') {
            const validation = this.validateImplementarActivity(processo, activityCode);
            if (!validation.valid) {
                this.renderImplementarRequirementErrors(validation.missingRequirements);
                notificar('Existem itens obrigatórios pendentes para o prosseguimento do processo.', 'warning');
                return false;
            }
        }

        if (phaseName === 'Monitorar') {
            const validation = this.validateMonitorarActivity(processo, activityCode);
            if (!validation.valid) {
                this.renderMonitorarRequirementErrors(validation.missingRequirements);
                notificar('Existem itens obrigatórios pendentes para o prosseguimento do processo.', 'warning');
                return false;
            }
        }

        if (phaseName === 'Desenhar') {
            const validation = this.validateDesenharActivity(processo, activityCode);
            if (!validation.valid) {
                this.renderDesenharRequirementErrors(validation.missingRequirements);
                notificar('Existem itens obrigatórios pendentes para o prosseguimento do processo.', 'warning');
                return false;
            }
        }

        activity.concluida = true;
        activity.status = 'concluida';
        activity.concluidoEm = new Date().toISOString();
        activity.updatedAt = new Date().toISOString();
        processo.percentual_conclusao = this.calculateProcessProgress(processoId);
        processo.status_fase = processo.percentual_conclusao >= 100 ? 'Ciclo BPM concluído' : processo.status_fase;

        this.setStoredProcesses(processes);
        this.recalculateAndRender(processoId);

        if (typeof window !== 'undefined' && window.DashboardManager) {
            if (typeof window.DashboardManager.loadSetorDashboard === 'function') {
                window.DashboardManager.loadSetorDashboard();
            }
            if (typeof window.DashboardManager.loadNGEDashboard === 'function') {
                window.DashboardManager.loadNGEDashboard();
            }
        }
        if (typeof window !== 'undefined' && window.BPMDetailsModule?.updateOnUserChange) {
            window.BPMDetailsModule.updateOnUserChange();
        }

        notificar('Atividade submetida com sucesso.', 'success');
        return true;
    }

    static async saveSituationalReport(processoId, phaseName, activityCode) {
        const processes = this.getStoredProcesses();
        const processo = processes.find((p) => p.id === processoId);
        if (!processo) return;

        const phase = processo.phases.find((f) => f.name === phaseName);
        const activity = phase?.activities.find((a) => a.code === activityCode);
        if (!activity) return;

        const seiInput = document.getElementById(`monitor-sei-process-number-${processoId}-${activityCode}`);
        const fileInput = document.getElementById(`detail-situational-file-${processoId}-${activityCode}`);
        const descriptionInput = document.getElementById(`detail-situational-description-${processoId}-${activityCode}`);
        const versionInput = document.getElementById(`detail-situational-version-${processoId}-${activityCode}`);
        const saveButton = document.querySelector(`[data-action="save-situational-report"][data-processo-id="${processoId}"][data-activity-code="${activityCode}"]`);

        const setError = (elementId, message) => {
            const element = document.getElementById(elementId);
            if (element) {
                element.textContent = message;
                element.classList.add('text-danger');
            }
        };

        const clearErrors = () => {
            ['monitor-sei-process-number-error', 'detail-situational-file-error', 'detail-situational-version-error'].forEach((prefix) => {
                const element = document.getElementById(`${prefix}-${processoId}-${activityCode}`);
                if (element) {
                    element.textContent = '';
                    element.classList.remove('text-danger');
                }
            });
        };

        clearErrors();

        const seiProcessNumber = seiInput?.value.trim() || '';
        const description = descriptionInput?.value.trim() || '';
        const version = versionInput?.value.trim() || '';
        const hasFile = Boolean(fileInput?.files?.length);

        if (!seiProcessNumber || !/^[0-9./\-\s]+$/.test(seiProcessNumber)) {
            setError(`monitor-sei-process-number-error-${processoId}-${activityCode}`, 'Informe o número do processo no SEI.');
            seiInput?.focus();
            return;
        }

        if (!hasFile) {
            setError(`detail-situational-file-error-${processoId}-${activityCode}`, 'Selecione um arquivo para o relatório situacional.');
            fileInput?.focus();
            return;
        }

        if (!version) {
            setError(`detail-situational-version-error-${processoId}-${activityCode}`, 'Informe a versão do relatório.');
            versionInput?.focus();
            return;
        }

        if (saveButton) {
            saveButton.disabled = true;
            saveButton.textContent = 'Salvando...';
        }

        try {
            const file = fileInput.files[0];
            const supportedExtensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ods', 'png', 'jpeg', 'jpg'];
            const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
            if (!supportedExtensions.includes(fileExtension)) {
                setError(`detail-situational-file-error-${processoId}-${activityCode}`, 'Formato não permitido. Use PDF, DOC, DOCX, XLS, XLSX, ODS, PNG ou JPEG.');
                return;
            }

            activity.attachments = activity.attachments || [];
            const attachment = {
                id: Date.now() + Math.floor(Math.random() * 1000),
                attachmentType: 'RELATORIO_SITUACIONAL',
                label: 'Relatório Situacional',
                name: file.name,
                mimeType: file.type || 'application/octet-stream',
                type: file.type || (file.name.includes('.') ? file.name.split('.').pop().toUpperCase() : 'N/A'),
                size: file.size,
                uploadedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                description,
                version,
                seiProcessNumber,
                status: 'Ativo',
                current: true,
                active: true,
                createdBy: window.app?.currentUser?.nome || 'Usuário',
                removed: false
            };

            const duplicate = activity.attachments.find((item) => item.label === attachment.label && item.name === attachment.name && item.version === attachment.version && item.size === attachment.size && item.mimeType === attachment.mimeType && item.active !== false);
            if (duplicate) {
                setError(`detail-situational-file-error-${processoId}-${activityCode}`, 'Este relatório já foi registrado com essa versão.');
                return;
            }

            activity.attachments.forEach((item) => {
                if (item.label === attachment.label) {
                    item.current = false;
                }
            });

            activity.attachments.push(attachment);
            activity.content = {
                ...(activity.content || {}),
                seiProcessNumber,
                lastSavedAt: new Date().toISOString()
            };

            this.addActivityHistoryEntry(processo, phaseName, activityCode, 'Relatório situacional salvo', `Número SEI ${seiProcessNumber} e relatório ${attachment.name} registrados.`);
            this.setStoredProcesses(processes);
            const scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
            this.recalculateAndRender(processoId);
            requestAnimationFrame(() => window.scrollTo(0, scrollTop));
            notificar('Relatório situacional salvo com sucesso.', 'success');
        } finally {
            if (saveButton) {
                saveButton.disabled = false;
                saveButton.textContent = 'Salvar';
            }
        }
    }

    static async uploadFile(processoId, phaseName, activityCode) {
        const uploadInput = document.getElementById(`detail-upload-file-${activityCode}`) || document.getElementById('detail-upload-file');
        if (!uploadInput || !uploadInput.files || uploadInput.files.length === 0) {
            notificar('Selecione um arquivo para envio.', 'warning');
            return;
        }

        const attachmentLabel = document.querySelector(`[data-action="upload-file"][data-processo-id="${processoId}"][data-activity="${activityCode}"]`)?.dataset.attachmentLabel || '';
        const description = document.getElementById(`detail-attachment-description-${activityCode}`)?.value.trim() || '';
        const version = document.getElementById(`detail-attachment-version-${activityCode}`)?.value.trim() || '';
        const file = uploadInput.files[0];
        const processes = this.getStoredProcesses();
        const processo = processes.find((p) => p.id === processoId);
        if (!processo) return;
        const supportedExtensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ods', 'png', 'jpeg', 'jpg'];
        const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
        if ((attachmentLabel === 'Anexo III — Cronograma' || attachmentLabel === 'Relatório de Acompanhamento') && !supportedExtensions.includes(fileExtension)) {
            notificar(`Formato não permitido para ${attachmentLabel}. Use PDF, DOC, DOCX, XLS, XLSX, ODS, PNG ou JPEG.`, 'warning');
            return;
        }

        const phase = processo.phases.find((f) => f.name === phaseName);
        const activity = phase?.activities.find((a) => a.code === activityCode);
        if (!activity) return;

        activity.attachments = activity.attachments || [];
        const attachment = {
            id: Date.now() + Math.floor(Math.random() * 1000),
            attachmentType: attachmentLabel === 'Anexo III — Cronograma' ? 'ANEXO_III_CRONOGRAMA' : attachmentLabel.replace(/\s+/g, '_').toUpperCase(),
            label: attachmentLabel || 'Anexo',
            name: file.name,
            mimeType: file.type || 'application/octet-stream',
            type: file.type || (file.name.includes('.') ? file.name.split('.').pop().toUpperCase() : 'N/A'),
            size: file.size,
            uploadedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            description,
            version: version || `${(activity.attachments || []).filter(a => a.label === attachmentLabel).length + 1}`,
            status: 'Ativo',
            current: true,
            active: true,
            createdBy: window.app?.currentUser?.nome || 'Usuário',
            removed: false
        };

        const duplicate = activity.attachments.find(item => item.label === attachment.label && item.name === attachment.name && item.version === attachment.version && item.size === attachment.size && item.mimeType === attachment.mimeType && item.active !== false);
        if (duplicate) {
            notificar('Anexo já registrado. Use uma nova versão ou altere a descrição.', 'warning');
            return;
        }

        activity.attachments.forEach(item => {
            if (item.label === attachment.label) {
                item.current = false;
            }
        });

        activity.attachments.push(attachment);
        this.addActivityHistoryEntry(processo, phaseName, activityCode, 'Arquivo anexado', `Arquivo '${attachment.name}' adicionado${attachment.label ? ` como ${attachment.label}` : ''}`);
        this.setStoredProcesses(processes);
        this.recalculateAndRender(processoId);
        notificar('Arquivo registrado localmente.', 'success');
    }

    static async addTeamMember(processoId, phaseName, activityCode) {
        const name = document.getElementById('detail-team-name')?.value.trim();
        const registration = document.getElementById('detail-team-registration')?.value.trim();
        const responsibilities = document.getElementById('detail-team-responsibilities')?.value.trim();

        if (!name) {
            notificar('Informe o nome do membro.', 'warning');
            return;
        }

        const processes = this.getStoredProcesses();
        const processo = processes.find((p) => p.id === processoId);
        if (!processo) return;

        const phase = processo.phases.find((f) => f.name === phaseName);
        const activity = phase?.activities.find((a) => a.code === activityCode);
        if (!activity) return;

        activity.team = activity.team || [];
        activity.team.push({ name, registration, responsibilities });
        this.setStoredProcesses(processes);
        this.renderActivityDetail(processoId, phaseName, activityCode);
        notificar('Membro adicionado à equipe.', 'success');
    }

    static async handleParticipantAddFromDetail(processoId, phaseName, activityCode) {
        // Add new participant (non-edit)
        const nameEl = document.getElementById(`participant-name-${processoId}`);
        const registrationEl = document.getElementById(`participant-registration-${processoId}`);
        const sectorEl = document.getElementById(`participant-sector-${processoId}`);
        const phasesSelect = document.getElementById(`participant-phases-${processoId}`);
        const activitiesSelect = document.getElementById(`participant-activities-${processoId}`);

        const name = nameEl?.value.trim();
        const registration = registrationEl?.value.trim();
        const sector = sectorEl?.value || '';

        if (!name) { notificar('Informe o nome do participante.', 'warning'); return; }
        if (!sector) { notificar('Informe o setor (obrigatório).', 'warning'); sectorEl?.focus(); return; }

        const selectedPhases = phasesSelect ? Array.from(phasesSelect.selectedOptions).map(o => o.value) : [];
        const selectedActivities = activitiesSelect ? Array.from(activitiesSelect.selectedOptions).map(o => o.value) : [];
        
        if (selectedPhases.length === 0 && selectedActivities.length === 0) {
            notificar('Selecione pelo menos uma fase ou atividade para o participante.', 'warning');
            return;
        }

        const processes = this.getStoredProcesses();
        const processo = processes.find((p) => p.id === processoId);
        if (!processo) return;

        processo.teamMembers = processo.teamMembers || [];

        // prevent duplicate by registration (if provided) or name+sector
        const duplicate = processo.teamMembers.find(m => (registration && m.registration === registration) || (!registration && m.name === name && m.sectorId === sector));
        if (duplicate) { notificar('Participante já cadastrado neste processo.', 'warning'); return; }

        const now = new Date().toISOString();
        const member = {
            id: Date.now(),
            name,
            registration: registration || '',
            sectorId: sector,
            sectorName: this.getSetorDisplayName(sector),
            assignedPhases: selectedPhases,
            assignedActivities: selectedActivities,
            ativo: true,
            criadoEm: now,
            atualizadoEm: now
        };

        processo.teamMembers.push(member);
        this.setStoredProcesses(processes);
        this.renderProcesses(processes);
        this.renderActivityDetail(processoId, phaseName, activityCode);
        notificar('Participante adicionado.', 'success');
        // clear form
        nameEl && (nameEl.value = '');
        registrationEl && (registrationEl.value = '');
        sectorEl && (sectorEl.value = '');
    }

    // Generate member responsibilities automatically from assigned activities/phases
    static getMemberAssignedResponsibilities(member) {
        if (!member) return [];
        
        const responsibilities = new Set();
        const assignedActivities = new Set(Array.isArray(member.assignedActivities) ? member.assignedActivities : []);
        const assignedPhases = new Set(Array.isArray(member.assignedPhases) ? member.assignedPhases : []);
        
        // For each assigned phase, add all activities in that phase
        assignedPhases.forEach(phaseName => {
            Object.entries(this.ACTIVITY_DISPLAY_TITLES).forEach(([code, title]) => {
                // Determine phase from code (first 4 chars: PLAN, ANAL, DES, IMPL, MON)
                const phasePrefix = code.substring(0, 4).toLowerCase();
                let phase = '';
                if (phasePrefix === 'plan') phase = 'Planejar';
                else if (phasePrefix === 'anal') phase = 'Analisar';
                else if (phasePrefix === 'des' || phasePrefix === 'dese') phase = 'Desenhar';
                else if (phasePrefix === 'impl') phase = 'Implementar';
                else if (phasePrefix === 'mon') phase = 'Monitorar';
                
                if (phase.toLowerCase() === String(phaseName).toLowerCase()) {
                    responsibilities.add(title);
                }
            });
        });
        
        // For each assigned activity, add its title
        assignedActivities.forEach(activityCode => {
            const title = this.ACTIVITY_DISPLAY_TITLES[activityCode];
            if (title) {
                responsibilities.add(title);
            }
        });
        
        return responsibilities.size > 0 ? Array.from(responsibilities) : [];
    }
    
    // Render responsibilities for table display (with HTML formatting)
    static renderMemberResponsibilities(member) {
        const responsibilities = this.getMemberAssignedResponsibilities(member);
        if (responsibilities.length === 0) {
            return '<em class="text-muted">Nenhuma atividade atribuída</em>';
        }
        return `<ul class="team-member-responsibilities">${responsibilities.map(r => `<li>${r}</li>`).join('')}</ul>`;
    }

    // Compute responsibles dynamically from processo.teamMembers
    static getActivityResponsibles(processo, phaseName, activityCode) {
        if (!processo) return [];
        const members = processo.teamMembers || [];
        const responsibles = [];

        members.forEach(member => {
            if (!member || member.ativo === false) return;

            const byActivity = (member.assignedActivities || []).some(a => String(a) === String(activityCode));
            const byPhase = (member.assignedPhases || []).some(p => String(p).toLowerCase() === String(phaseName).toLowerCase());

            if (byActivity || byPhase) {
                responsibles.push({
                    id: member.id,
                    name: member.name,
                    registration: member.registration || '',
                    sectorId: member.sectorId || '',
                    sectorName: member.sectorName || '',
                    responsibilities: member.responsibilities || ''
                });
            }
        });

        // remove duplicates by id
        const unique = [];
        responsibles.forEach(r => { if (!unique.find(u => u.id === r.id)) unique.push(r); });
        return unique;
    }

    static async removeParticipant(processoId, memberId, phaseName, activityCode) {
        const processes = this.getStoredProcesses();
        const processo = processes.find(p => p.id === processoId);
        if (!processo) return;

        processo.teamMembers = (processo.teamMembers || []).filter(m => m.id !== memberId);
        this.setStoredProcesses(processes);
        this.renderProcesses(processes);
        this.renderActivityDetail(processoId, phaseName, activityCode);
        notificar('Participante removido.', 'success');
    }

    static startEditParticipant(processoId, memberId, phaseName, activityCode) {
        const processes = this.getStoredProcesses();
        const processo = processes.find(p => p.id === processoId);
        if (!processo) return;
        const member = (processo.teamMembers || []).find(m => m.id === memberId);
        if (!member) return;

        this.editingMemberId = memberId;
        const nameEl = document.getElementById(`participant-name-${processoId}`);
        const registrationEl = document.getElementById(`participant-registration-${processoId}`);
        const sectorEl = document.getElementById(`participant-sector-${processoId}`);
        const phasesSelect = document.getElementById(`participant-phases-${processoId}`);
        const activitiesSelect = document.getElementById(`participant-activities-${processoId}`);

        nameEl && (nameEl.value = member.name || '');
        registrationEl && (registrationEl.value = member.registration || '');
        sectorEl && (sectorEl.value = member.sectorId || '');

        if (phasesSelect) {
            Array.from(phasesSelect.options).forEach(opt => { opt.selected = (member.assignedPhases || []).includes(opt.value); });
        }
        if (activitiesSelect) {
            Array.from(activitiesSelect.options).forEach(opt => { opt.selected = (member.assignedActivities || []).includes(opt.value); });
        }
    }

    static cancelParticipantEdit(processoId, phaseName, activityCode) {
        this.editingMemberId = null;
        const nameEl = document.getElementById(`participant-name-${processoId}`);
        const registrationEl = document.getElementById(`participant-registration-${processoId}`);
        const sectorEl = document.getElementById(`participant-sector-${processoId}`);
        const phasesSelect = document.getElementById(`participant-phases-${processoId}`);
        const activitiesSelect = document.getElementById(`participant-activities-${processoId}`);

        nameEl && (nameEl.value = '');
        registrationEl && (registrationEl.value = '');
        sectorEl && (sectorEl.value = '');
        if (phasesSelect) Array.from(phasesSelect.options).forEach(o => o.selected = false);
        if (activitiesSelect) Array.from(activitiesSelect.options).forEach(o => o.selected = false);
        this.renderActivityDetail(processoId, phaseName, activityCode);
    }

    static async handleParticipantSaveFromDetail(processoId, phaseName, activityCode) {
        // Save edited participant
        const processes = this.getStoredProcesses();
        const processo = processes.find(p => p.id === processoId);
        if (!processo) return;

        const id = this.editingMemberId;
        if (!id) {
            // fallback to add
            return await this.handleParticipantAddFromDetail(processoId, phaseName, activityCode);
        }

        const nameEl = document.getElementById(`participant-name-${processoId}`);
        const registrationEl = document.getElementById(`participant-registration-${processoId}`);
        const sectorEl = document.getElementById(`participant-sector-${processoId}`);
        const phasesSelect = document.getElementById(`participant-phases-${processoId}`);
        const activitiesSelect = document.getElementById(`participant-activities-${processoId}`);

        const name = nameEl?.value.trim();
        const registration = registrationEl?.value.trim();
        const sector = sectorEl?.value || '';

        if (!name) { notificar('Informe o nome do participante.', 'warning'); return; }
        if (!sector) { notificar('Informe o setor (obrigatório).', 'warning'); sectorEl?.focus(); return; }

        const selectedPhases = phasesSelect ? Array.from(phasesSelect.selectedOptions).map(o => o.value) : [];
        const selectedActivities = activitiesSelect ? Array.from(activitiesSelect.selectedOptions).map(o => o.value) : [];
        
        if (selectedPhases.length === 0 && selectedActivities.length === 0) {
            notificar('Selecione pelo menos uma fase ou atividade para o participante.', 'warning');
            return;
        }

        // prevent duplication (other than itself)
        const duplicate = (processo.teamMembers || []).find(m => m.id !== id && ((registration && m.registration === registration) || (!registration && m.name === name && m.sectorId === sector)));
        if (duplicate) { notificar('Outro participante com mesma identificação já existe.', 'warning'); return; }

        const member = (processo.teamMembers || []).find(m => m.id === id);
        if (!member) return;

        member.name = name;
        member.registration = registration || '';
        member.sectorId = sector;
        member.sectorName = this.getSetorDisplayName(sector);
        member.assignedPhases = selectedPhases;
        member.assignedActivities = selectedActivities;
        member.ativo = true;
        member.atualizadoEm = new Date().toISOString();

        this.editingMemberId = null;
        this.setStoredProcesses(processes);
        this.renderProcesses(processes);
        this.renderActivityDetail(processoId, phaseName, activityCode);
        notificar('Participante atualizado.', 'success');
    }

    static ensureActivityChecklist(processo, phaseName, activityCode) {
        if (!processo) return;
        const phase = processo.phases.find((f) => f.name === phaseName);
        if (!phase) return;
        const activity = phase.activities.find((a) => a.code === activityCode);
        if (!activity) return;
        activity.checklist = activity.checklist || [];
    }

    // Indicators stored locally for integration with Plan E meta
    static INDICATORS_LOCAL_KEY = 'sge_pci_indicators';

    static getStoredIndicators() {
        try {
            return JSON.parse(localStorage.getItem(this.INDICATORS_LOCAL_KEY)) || [];
        } catch (e) {
            return [];
        }
    }

    static setStoredIndicators(indicators) {
        localStorage.setItem(this.INDICATORS_LOCAL_KEY, JSON.stringify(indicators || []));
    }

    static upsertIndicatorFromPlanE(processoId, activityCode, meta) {
        try {
            const indicators = this.getStoredIndicators();
            const process = this.getStoredProcesses().find(p => p.id === processoId) || {};
            const keyName = `${meta.name || meta.nome || 'Meta'} - ${processoId}`;
            const existing = indicators.find(i => (i.processId === processoId && (i.sourceActivityCode === 'PLAN_E' || i.origem === 'PLAN_E')) || i.name === keyName || i.nome === keyName);
            const now = new Date().toISOString();
            const indicator = {
                id: existing ? existing.id : Date.now(),
                processId: processoId,
                processName: process.nome || process.name || '',
                sourceActivityCode: 'PLAN_E',
                origem: 'PLAN_E',
                name: keyName,
                nome: keyName,
                descricao: meta.description || meta.desc || '',
                valor_meta: meta.targetValue || meta.valor_meta || '',
                unidade_medida: meta.unit || meta.unidade || '',
                prazo: meta.deadline || meta.prazo || '',
                responsavel: meta.responsible || meta.responsavel || '',
                valor_atual: existing ? existing.valor_atual || 0 : 0,
                status: existing ? existing.status || 'ativo' : 'ativo',
                criadoEm: existing ? existing.criadoEm : now,
                atualizadoEm: now
            };

            if (existing) {
                const idx = indicators.findIndex(i => i.id === existing.id);
                indicators[idx] = indicator;
            } else {
                indicators.push(indicator);
            }

            this.setStoredIndicators(indicators);
            // Attempt to refresh indicators UI if manager available
            if (window.IndicatorManager && typeof window.IndicatorManager.loadIndicators === 'function') {
                window.IndicatorManager.loadIndicators();
            }
        } catch (error) {
            console.warn('Não foi possível upsertar indicador localmente', error);
        }
    }

    static async viewProcessModal(processoId) {
        console.log('viewProcessModal não é usado no novo layout de Meus Processos', processoId);
    }

    static setupProcessDetailHandlers(detailEl) {

        detailEl.removeEventListener('click', this._boundProcessDetailClickHandler);
        detailEl.removeEventListener('change', this._boundProcessDetailChangeHandler);

        this._boundProcessDetailClickHandler = async (event) => {
            const button = event.target.closest('[data-action]');
            if (!button) return;

            const action = button.dataset.action;
            const rawProcessId = button.dataset.processoId || button.dataset.processId || button.dataset.id;
            const processoId = rawProcessId || null;
            const code = button.dataset.code;
            const tipo = button.dataset.tipo;
            const phaseCode = button.dataset.phaseCode || button.dataset.phase || button.dataset.phaseName;
            const activityCode = button.dataset.activityCode || button.dataset.activity || button.dataset.activityCode;

            switch (action) {
                case 'open-activity':
                    event.preventDefault();
                    await this.openActivity(processoId, code);
                    break;
                case 'activity-save-objective':
                    await this.saveActivityObjective(processoId);
                    break;
                case 'activity-add-team-member':
                    // Backwards-compatible trigger
                    await this.handleParticipantAddFromDetail(processoId, phaseCode, activityCode);
                    break;
                case 'participant-add':
                    await this.handleParticipantAddFromDetail(processoId, phaseCode, activityCode);
                    break;
                case 'participant-save':
                    await this.handleParticipantSaveFromDetail(processoId, phaseCode, activityCode);
                    break;
                case 'participant-edit':
                    {
                        const memberId = parseInt(button.dataset.memberId, 10);
                        if (memberId) this.startEditParticipant(processoId, memberId, phaseCode, activityCode);
                    }
                    break;
                case 'participant-cancel':
                    this.cancelParticipantEdit(processoId, phaseCode, activityCode);
                    break;
                case 'participant-remove':
                    {
                        const memberId = parseInt(button.dataset.memberId, 10);
                        if (memberId) await this.removeParticipant(processoId, memberId, phaseCode, activityCode);
                    }
                    break;
                case 'activity-upload-file':
                    // action used in detailed activity lists that include a `code` and `tipo`
                    if (processoId && code) await this.uploadActivityFile(processoId, code, tipo);
                    break;
                case 'upload-file':
                    // simpler local upload button inside detail panel (uses phase/activity)
                    if (processoId && phaseCode && activityCode) await this.uploadFile(processoId, phaseCode, activityCode);
                    break;
                case 'save-situational-report':
                    if (processoId && phaseCode && activityCode) await this.saveSituationalReport(processoId, phaseCode, activityCode);
                    break;
                case 'save-activity':
                    if (processoId && phaseCode && activityCode) await this.saveActivity(processoId, phaseCode, activityCode);
                    break;
                case 'submit-activity':
                    if (processoId && phaseCode && activityCode) await this.submitActivity(processoId, phaseCode, activityCode);
                    break;
                case 'advance-activity':
                    if (processoId && phaseCode && activityCode) {
                        const button = event.target.closest('[data-action="advance-activity"]');
                        if (button) {
                            button.disabled = true;
                            button.setAttribute('aria-busy', 'true');
                        }
                        try {
                            await this.advanceToNextActivity(processoId, phaseCode, activityCode);
                        } finally {
                            if (button) {
                                button.disabled = false;
                                button.removeAttribute('aria-busy');
                            }
                        }
                    }
                    break;
                case 'activity-save-indicator':
                    if (processoId && phaseCode && activityCode) await this.saveActivityIndicator(processoId, phaseCode, activityCode);
                    break;
                case 'activity-edit-indicator':
                    {
                        const indicatorId = parseInt(button.dataset.indicatorId, 10);
                        if (processoId && phaseCode && activityCode && indicatorId) this.startEditActivityIndicator(processoId, phaseCode, activityCode, indicatorId);
                    }
                    break;
                case 'activity-delete-indicator':
                    {
                        const indicatorId = parseInt(button.dataset.indicatorId, 10);
                        if (processoId && phaseCode && activityCode && indicatorId) await this.deleteActivityIndicator(processoId, phaseCode, activityCode, indicatorId);
                    }
                    break;
                case 'activity-cancel-indicator':
                    if (processoId && phaseCode && activityCode) this.cancelIndicatorEdit(processoId, phaseCode, activityCode);
                    break;
                case 'open-indicators-tab':
                    this.openIndicatorsTab(processoId);
                    break;
                case 'mark-current-attachment':
                    {
                        const attachmentId = parseInt(button.dataset.attachmentId, 10);
                        if (processoId && phaseCode && activityCode && attachmentId) this.markCurrentAttachment(processoId, phaseCode, activityCode, attachmentId);
                    }
                    break;
                case 'remove-attachment':
                    {
                        const attachmentId = parseInt(button.dataset.attachmentId, 10);
                        if (processoId && phaseCode && activityCode && attachmentId) await this.removeLocalAttachment(processoId, phaseCode, activityCode, attachmentId);
                    }
                    break;
                case 'contra-medida-save':
                    if (processoId && phaseCode && activityCode) this.saveContraMedida(processoId, phaseCode, activityCode);
                    break;
                case 'contra-medida-edit':
                    {
                        const contraMedidaId = button.dataset.contramedidaId;
                        if (processoId && phaseCode && activityCode && contraMedidaId) this.startEditContraMedida(processoId, phaseCode, activityCode, contraMedidaId);
                    }
                    break;
                case 'contra-medida-cancel':
                    if (processoId && phaseCode && activityCode) this.cancelContraMedidaEdit(processoId, phaseCode, activityCode);
                    break;
                case 'contra-medida-remove':
                    {
                        const contraMedidaId = button.dataset.contramedidaId;
                        if (processoId && phaseCode && activityCode && contraMedidaId) await this.removeContraMedida(processoId, phaseCode, activityCode, contraMedidaId);
                    }
                    break;
                case 'activity-refresh-files':
                    await this.renderActivityFileList(processoId, code, tipo);
                    break;
                case 'activity-delete-file':
                    await this.deleteProcessAttachment(processoId, parseInt(button.dataset.attachmentId, 10), event);
                    break;
                case 'generate-pop':
                    {
                        const processoId = parseInt(button.dataset.processoId, 10);
                        const processoNome = button.dataset.processoNome || 'POP';
                        if (processoId) await this.generatePOP(processoId, processoNome);
                    }
                    break;
                default:
                    break;
            }
        };

        this._boundProcessDetailChangeHandler = async (event) => {
            const input = event.target.closest('[data-action]');
            if (!input) return;

            const action = input.dataset.action;
            const rawProcessId = input.dataset.processoId || input.dataset.processId || input.dataset.id;
            const processoId = rawProcessId || null;
            const itemId = input.dataset.itemId;
            const activityCode = input.dataset.activity || input.dataset.activityCode;
            const phaseName = input.dataset.phaseName;

            if (action === 'activity-toggle-item') {
                const checked = event.target.checked;
                await this.toggleChecklistItemLocal(processoId, phaseName, activityCode, itemId, checked);
                const target = event.target.closest('.checklist-item');
                if (target) {
                    const wrapper = target.closest('.activity-checklist');
                    wrapper?.classList.remove('is-invalid');
                    wrapper?.querySelectorAll('.required-field-error').forEach(el => el.remove());
                }
                return;
            }

            if (action === 'activity-save-observation') {
                const value = event.target.value;
                this.saveChecklistField(processoId, activityCode, itemId, 'observacao', value);
                return;
            }
        };

        this._boundProcessDetailInputHandler = (event) => {
            const target = event.target;
            if (!target) return;
            const key = target.closest('[data-requirement-key]')?.dataset.requirementKey;
            if (!key) return;
            this.clearPlanejarRequirementError(target, null, key);
        };

        detailEl.addEventListener('click', this._boundProcessDetailClickHandler);
        detailEl.addEventListener('change', this._boundProcessDetailChangeHandler);
        detailEl.addEventListener('input', this._boundProcessDetailInputHandler);
        detailEl.addEventListener('change', this._boundProcessDetailInputHandler);
    }

    static async addActivity(processoId, fase) {
        const descricao = prompt(`Descreva a nova atividade para a fase ${fase}:`);
        if (!descricao) return;
        try {
            const newAct = await api.post(`/processes/${processoId}/activities`, { fase, descricao });
            alert('Atividade criada com sucesso.');

            // Perguntar sobre anexos
            if (confirm('Deseja adicionar anexos a esta atividade agora?')) {
                const files = prompt('Informe nomes ou URLs dos arquivos separados por vírgula (ex: prova.pdf, imagem.png, http://...):');
                if (files) {
                    const items = files.split(',').map(s => s.trim()).filter(Boolean);
                    for (const item of items) {
                        const filename = item.split('/').pop();
                        const url = item.startsWith('http') ? item : null;
                        try {
                            await api.post(`/processes/${processoId}/activities/${newAct.id}/attachments`, { filename, url });
                        } catch (err) {
                            console.warn('Não foi possível adicionar anexo:', item, err);
                        }
                    }
                    alert('Anexos adicionados (quando possível).');
                }
            }

            this.loadProcesses();
        } catch (error) {
            console.error('Erro ao criar atividade:', error);
            alert('Não foi possível criar a atividade.');
        }
    }

    static async toggleChecklistItem(processoId, activityId, itemId, currentValue) {
        try {
            await api.put(`/processes/${processoId}/activities/${activityId}/checklist/${itemId}`, { concluido: !currentValue });
            this.loadProcesses();
        } catch (error) {
            console.error('Erro ao atualizar checklist:', error);
            alert('Não foi possível atualizar o item do checklist.');
        }
    }

    static showAddAttachmentForm(processoId, activityId) {
        const filename = prompt('Nome do arquivo ou URL:');
        if (!filename) return;

        const isUrl = filename.startsWith('http');
        const url = isUrl ? filename : null;
        const name = isUrl ? filename.split('/').pop() : filename;

        this.addAttachment(processoId, activityId, name, url);
    }

    static async addAttachment(processoId, activityId, filename, url) {
        try {
            await api.post(`/processes/${processoId}/activities/${activityId}/attachments`, { filename, url });
            alert('Anexo adicionado com sucesso!');
            this.loadProcesses();
        } catch (error) {
            console.error('Erro ao adicionar anexo:', error);
            alert('Não foi possível adicionar o anexo.');
        }
    }

    static async deleteAttachment(processoId, activityId, attachmentId, event) {
        event.stopPropagation();
        if (!confirm('Tem certeza que deseja remover este anexo?')) return;

        try {
            await api.delete(`/processes/${processoId}/activities/${activityId}/attachments/${attachmentId}`);
            alert('Anexo removido com sucesso!');
            this.loadProcesses();
        } catch (error) {
            console.error('Erro ao remover anexo:', error);
            alert('Não foi possível remover o anexo.');
        }
    }

    static async fetchPlanejarProcessData(processoId) {
        try {
            return await api.get(`/planejar/processo/${processoId}`);
        } catch (error) {
            console.warn('Não foi possível carregar dados de Planejar', error);
            return null;
        }
    }

    static async fetchPlanejarTeam(processoId) {
        try {
            return await api.get(`/planejar/equipe/${processoId}`);
        } catch (error) {
            console.warn('Não foi possível carregar equipe Planejar', error);
            return [];
        }
    }

    static async fetchPlanejarChecklist(processoId) {
        try {
            return await api.get(`/planejar/checklist/${processoId}`);
        } catch (error) {
            console.warn('Não foi possível carregar checklist de aprovação', error);
            return [];
        }
    }

    static async renderActivityFileList(processoId, code, tipo) {
        const container = document.getElementById(`activity-files-${processoId}-${code}`);
        if (!container) return;

        try {
            const response = await api.get(`/planejar/${processoId}/${tipo}`);
            const attachments = response.attachments || [];

            container.innerHTML = attachments.length
                ? attachments.map((a, index) => `
                    <div class="attachment-item">
                        <a href="/api/planejar/${processoId}/anexo/${a.id}/download" target="_blank">${a.nome_arquivo || a.filename}</a>
                        <span class="attachment-meta">Versão ${attachments.length - index} • ${a.data_envio ? new Date(a.data_envio).toLocaleString('pt-BR') : ''}</span>
                        <button type="button" class="btn-icon btn-delete-attachment" data-action="activity-delete-file" data-processo-id="${processoId}" data-attachment-id="${a.id}" title="Excluir arquivo">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                `).join('')
                : '<div class="text-muted">Nenhum arquivo enviado</div>';
        } catch (error) {
            container.innerHTML = '<div class="text-muted">Erro ao carregar anexos</div>';
        }
    }

    static async deleteProcessAttachment(processoId, attachmentId, event) {
        event.stopPropagation();
        if (!confirm('Tem certeza que deseja excluir este arquivo do Anexo III — Cronograma?')) return;

        try {
            await api.delete(`/planejar/${processoId}/anexo/${attachmentId}`);
            notificar('Arquivo excluído com sucesso', 'success');
            await this.renderActivityFileList(processoId, 'PLAN_A', 'cronograma');
        } catch (error) {
            console.error('Erro ao excluir arquivo de cronograma:', error);
            notificar('Erro ao excluir arquivo de cronograma', 'danger');
        }
    }

    static async saveActivityIndicator(processoId, phaseName, activityCode) {
        const name = document.getElementById(`indicator-name-${processoId}`)?.value.trim();
        const description = document.getElementById(`indicator-description-${processoId}`)?.value.trim() || '';
        const currentValue = document.getElementById(`indicator-current-value-${processoId}`)?.value.trim() || '';
        const baseline = document.getElementById(`indicator-baseline-${processoId}`)?.value.trim() || '';
        const unit = document.getElementById(`indicator-unit-${processoId}`)?.value.trim() || '';
        const periodicity = document.getElementById(`indicator-periodicity-${processoId}`)?.value.trim() || '';
        const source = document.getElementById(`indicator-source-${processoId}`)?.value.trim() || '';
        const responsible = document.getElementById(`indicator-responsible-${processoId}`)?.value.trim() || '';
        const referenceDate = document.getElementById(`indicator-reference-date-${processoId}`)?.value || '';
        const observations = document.getElementById(`indicator-observations-${processoId}`)?.value.trim() || '';

        if (!name) {
            notificar('Informe o nome do indicador.', 'warning');
            return;
        }

        const processes = this.getStoredProcesses();
        const processo = processes.find(p => p.id === processoId);
        if (!processo) return;

        const activity = this.getProcessActivity(processo, phaseName, activityCode);
        if (!activity) return;

        activity.content = activity.content || {};
        activity.content.indicators = activity.content.indicators || [];

        const isEditing = !!this.editingIndicatorId;
        const indicatorId = isEditing ? this.editingIndicatorId : Date.now();
        const existingIndex = activity.content.indicators.findIndex(i => String(i.id) === String(indicatorId));
        const indicator = {
            id: indicatorId,
            name,
            description,
            currentValue,
            baseline,
            unit,
            periodicity,
            source,
            responsible,
            referenceDate,
            observations,
            active: true,
            processId: processoId,
            sourceActivityCode: activityCode,
            createdAt: isEditing ? activity.content.indicators[existingIndex]?.createdAt || new Date().toISOString() : new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        if (existingIndex >= 0) {
            activity.content.indicators[existingIndex] = indicator;
        } else {
            activity.content.indicators.push(indicator);
        }

        const localIndicators = this.getStoredIndicators();
        const storedIndex = localIndicators.findIndex(i => String(i.id) === String(indicatorId));
        const localIndicator = {
            ...indicator,
            nome: indicator.name,
            descricao: indicator.description,
            valor_atual: indicator.currentValue,
            valor_meta: indicator.baseline,
            unidade_medida: indicator.unit,
            prazo: indicator.referenceDate,
            responsavel: indicator.responsible,
            origem: activityCode,
            sourceActivityCode: activityCode,
            phaseName
        };

        if (storedIndex >= 0) {
            localIndicators[storedIndex] = localIndicator;
        } else {
            localIndicators.push(localIndicator);
        }

        this.setStoredIndicators(localIndicators);
        this.editingIndicatorId = null;

        if (phaseName === 'Analisar' && activityCode === 'ANAL_E') {
            const desActivity = this.getProcessActivity(processo, 'Desenhar', 'DES_E');
            if (desActivity) {
                desActivity.content = desActivity.content || {};
                desActivity.content.indicators = desActivity.content.indicators || [];
                const desIndex = desActivity.content.indicators.findIndex(i => String(i.id) === String(indicator.id));
                const indicatorClone = { ...indicator };
                if (desIndex >= 0) {
                    desActivity.content.indicators[desIndex] = indicatorClone;
                } else {
                    desActivity.content.indicators.push(indicatorClone);
                }
            }
        }

        this.setStoredProcesses(processes);

        if (window.IndicatorManager && typeof window.IndicatorManager.loadIndicators === 'function') {
            window.IndicatorManager.loadIndicators();
        }

        this.renderActivityDetail(processoId, phaseName, activityCode);
        notificar('Indicador salvo localmente.', 'success');
    }

    static startEditActivityIndicator(processoId, phaseName, activityCode, indicatorId) {
        const processes = this.getStoredProcesses();
        const processo = processes.find(p => p.id === processoId);
        if (!processo) return;

        const activity = this.getProcessActivity(processo, phaseName, activityCode);
        const indicator = activity?.content?.indicators?.find(i => String(i.id) === String(indicatorId));
        if (!indicator) return;

        this.editingIndicatorId = indicator.id;
        this.renderActivityDetail(processoId, phaseName, activityCode);
    }

    static cancelIndicatorEdit(processoId, phaseName, activityCode) {
        this.editingIndicatorId = null;
        this.renderActivityDetail(processoId, phaseName, activityCode);
    }

    static openIndicatorsTab(processoId = null) {
        if (processoId) {
            const process = this.getStoredProcesses().find((p) => p.id === processoId);
            if (process) {
                this.selectedIndicatorsProcessId = processoId;
                localStorage.setItem('sge_pci_selected_indicators_process', JSON.stringify({ processId: processoId, updatedAt: new Date().toISOString() }));
            }
        }

        const indicatorTabNav = document.querySelector('[data-tab="indicadores"]');
        if (indicatorTabNav) {
            indicatorTabNav.click();
            return;
        }

        if (window.app && typeof window.app.loadTabData === 'function') {
            window.app.loadTabData('indicadores');
        }
    }

    static async deleteActivityIndicator(processoId, phaseName, activityCode, indicatorId) {
        if (!confirm('Deseja remover este indicador localmente?')) return;
        const processes = this.getStoredProcesses();
        const processo = processes.find(p => p.id === processoId);
        if (!processo) return;

        const activity = this.getProcessActivity(processo, phaseName, activityCode);
        if (!activity) return;

        activity.content = activity.content || {};
        activity.content.indicators = (activity.content.indicators || []).filter(i => String(i.id) !== String(indicatorId));

        if (phaseName === 'Analisar' && activityCode === 'ANAL_E') {
            const desActivity = this.getProcessActivity(processo, 'Desenhar', 'DES_E');
            if (desActivity) {
                desActivity.content = desActivity.content || {};
                desActivity.content.indicators = (desActivity.content.indicators || []).filter(i => String(i.id) !== String(indicatorId));
            }
        }

        this.setStoredProcesses(processes);

        const localIndicators = this.getStoredIndicators().filter(i => String(i.id) !== String(indicatorId));
        this.setStoredIndicators(localIndicators);

        if (window.IndicatorManager && typeof window.IndicatorManager.loadIndicators === 'function') {
            window.IndicatorManager.loadIndicators();
        }

        this.renderActivityDetail(processoId, phaseName, activityCode);
        notificar('Indicador removido localmente.', 'success');
    }

    static markCurrentAttachment(processoId, phaseName, activityCode, attachmentId) {
        const processes = this.getStoredProcesses();
        const processo = processes.find(p => p.id === processoId);
        if (!processo) return;

        const phase = processo.phases.find(f => f.name === phaseName);
        const activity = phase?.activities.find(a => a.code === activityCode);
        if (!activity) return;

        activity.attachments = activity.attachments || [];
        const target = activity.attachments.find(a => String(a.id) === String(attachmentId));
        if (!target) return;

        activity.attachments.forEach(a => {
            if (a.label === target.label) a.isCurrent = false;
        });
        target.isCurrent = true;

        this.setStoredProcesses(processes);
        this.renderActivityDetail(processoId, phaseName, activityCode);
        notificar('Versão marcada como atual.', 'success');
    }

    static async removeLocalAttachment(processoId, phaseName, activityCode, attachmentId) {
        if (!confirm('Tem certeza que deseja remover este anexo localmente?')) return;
        const processes = this.getStoredProcesses();
        const processo = processes.find(p => p.id === processoId);
        if (!processo) return;

        const phase = processo.phases.find(f => f.name === phaseName);
        const activity = phase?.activities.find(a => a.code === activityCode);
        if (!activity) return;

        activity.attachments = activity.attachments || [];
        const attachment = activity.attachments.find(a => String(a.id) === String(attachmentId));
        if (!attachment) return;

        attachment.removed = true;
        attachment.status = 'Removido';
        attachment.current = false;
        attachment.active = false;
        attachment.updatedAt = new Date().toISOString();
        this.addActivityHistoryEntry(processo, phaseName, activityCode, 'Arquivo removido', `Arquivo '${attachment.name}' removido do registro.`);
        this.setStoredProcesses(processes);
        this.recalculateAndRender(processoId);
        notificar('Anexo removido localmente.', 'success');
    }

    static async renderActivityTeam(processoId) {
        const rowsContainer = document.getElementById(`activity-team-table-${processoId}`);
        if (!rowsContainer) return;

        const team = await this.fetchPlanejarTeam(processoId);
        rowsContainer.innerHTML = team.length
            ? team.map(member => `
                <tr>
                    <td>${member.nome || 'N/A'}</td>
                    <td>${member.matricula || 'N/A'}</td>
                    <td>${member.responsabilidades || 'N/A'}</td>
                    <td>${member.setor || 'N/D'}</td>
                </tr>
            `).join('')
            : '<tr><td colspan="4" class="text-muted">Nenhum membro cadastrado</td></tr>';
    }

    static async renderApprovalChecklist(processoId) {
        const container = document.getElementById(`activity-approval-checklist-${processoId}`);
        if (!container) return;

        const items = await this.fetchPlanejarChecklist(processoId);
        container.innerHTML = items.length
            ? items.map(item => `
                <label class="approval-checklist-item">
                    <input type="checkbox" data-action="activity-toggle-approval" data-processo-id="${processoId}" data-item-id="${item.id}" ${item.concluido ? 'checked' : ''} />
                    ${item.descricao}
                </label>
            `).join('')
            : '<div class="text-muted">Checklist de aprovação não disponível</div>';
    }

    static getSwotInputValue(processoId, type) {
        const field = document.getElementById(`activity-swot-${type}-${processoId}`);
        return field ? field.value.trim() : '';
    }

    static async saveActivityObjective(processoId) {
        const objectiveEl = document.getElementById(`activity-objetivo-${processoId}`);
        if (!objectiveEl) return;

        const objetivo = objectiveEl.value.trim();
        if (!objetivo) {
            notificar('O objetivo do projeto de melhoria é obrigatório', 'warning');
            objectiveEl.focus();
            return;
        }

        const strengths = this.getSwotInputValue(processoId, 'strengths');
        const weaknesses = this.getSwotInputValue(processoId, 'weaknesses');
        const opportunities = this.getSwotInputValue(processoId, 'opportunities');
        const threats = this.getSwotInputValue(processoId, 'threats');

        const payload = { objetivo };
        if (strengths || weaknesses || opportunities || threats) {
            payload.swot = [
                { tipo: 'FORCA', descricao: strengths },
                { tipo: 'FRAQUEZA', descricao: weaknesses },
                { tipo: 'OPORTUNIDADE', descricao: opportunities },
                { tipo: 'AMEACA', descricao: threats }
            ].filter(item => item.descricao);
        }

        try {
            await api.put(`/planejar/processo/${processoId}`, payload);
            notificar('Objetivo e SWOT salvos com sucesso', 'success');
        } catch (error) {
            console.error('Erro ao salvar objetivo e SWOT:', error);
            notificar('Erro ao salvar objetivo e SWOT', 'danger');
        }
    }

    static async addActivityTeamMember(processoId) {
        const nomeInput = document.getElementById(`activity-team-name-${processoId}`);
        const matriculaInput = document.getElementById(`activity-team-matricula-${processoId}`);
        const responsabilidadesInput = document.getElementById(`activity-team-responsabilidades-${processoId}`);

        if (!nomeInput || !matriculaInput || !responsabilidadesInput) return;

        const membro = {
            nome: nomeInput.value.trim(),
            matricula: matriculaInput.value.trim(),
            responsabilidades: responsabilidadesInput.value.trim()
        };

        if (!membro.nome) {
            notificar('Informe o nome do membro', 'warning');
            return;
        }

        try {
            await api.post(`/planejar/equipe/adicionar/${processoId}`, membro);
            notificar('Membro adicionado à equipe', 'success');
            nomeInput.value = '';
            matriculaInput.value = '';
            responsabilidadesInput.value = '';
            await this.renderActivityTeam(processoId);
        } catch (error) {
            console.error('Erro ao adicionar membro da equipe:', error);
            notificar('Erro ao adicionar membro', 'danger');
        }
    }

    static async uploadActivityFile(processoId, code, tipo) {
        const input = document.getElementById(`activity-file-${processoId}-${code}`);
        if (!input || !input.files || input.files.length === 0) {
            notificar('Selecione um arquivo para envio', 'warning');
            return;
        }

        const fd = new FormData();
        fd.append('file', input.files[0]);

        try {
            await api.fetchWithAuth(`${api.baseUrl}/planejar/${processoId}/${tipo}`, { method: 'POST', body: fd });
            notificar('Arquivo enviado com sucesso', 'success');
            input.value = '';
            await this.renderActivityFileList(processoId, code, tipo);
        } catch (error) {
            console.error('Erro ao enviar arquivo:', error);
            notificar('Erro ao enviar arquivo', 'danger');
        }
    }

    static async toggleApprovalChecklistItem(processoId, itemId, concluido) {
        try {
            await api.put(`/planejar/checklist/${itemId}`, { concluido });
            notificar('Checklist atualizado', 'success');
            await this.renderApprovalChecklist(processoId);
        } catch (error) {
            console.error('Erro ao atualizar checklist:', error);
            notificar('Erro ao atualizar checklist', 'danger');
        }
    }

    static async openActivity(processoId, code) {
        const panel = document.getElementById(`activity-panel-${processoId}-${code}`);
        if (!panel) return;

        if (panel.style.display === 'block') {
            panel.style.display = 'none';
            return;
        }

        const planejarData = await this.fetchPlanejarProcessData(processoId);
        const objetivo = planejarData?.objetivo || '';

        let html = '';

        if (code === 'PLAN_B') {
            const swot = Array.isArray(planejarData?.swot) ? planejarData.swot : [];
            const swotValues = {
                strengths: '',
                weaknesses: '',
                opportunities: '',
                threats: ''
            };

            swot.forEach((item) => {
                if (!item || !item.tipo) return;
                const tipo = String(item.tipo).toUpperCase();
                const value = String(item.texto || item.descricao || '').trim();
                if (tipo.includes('FOR') || tipo.includes('FORCA')) {
                    swotValues.strengths = value;
                } else if (tipo.includes('FRA')) {
                    swotValues.weaknesses = value;
                } else if (tipo.includes('OPO')) {
                    swotValues.opportunities = value;
                } else if (tipo.includes('AME')) {
                    swotValues.threats = value;
                }
            });

            html = `
                <div class="activity-detail">
                    <h4>1. OBJETIVO DO PROJETO DE MELHORIA</h4>
                    <div class="form-group">
                        <label>Objetivo do Projeto de Melhoria</label>
                        <textarea id="activity-objetivo-${processoId}" rows="5" style="width:100%" required>${objetivo}</textarea>
                    </div>
                    <div class="form-group">
                        <label>2. ANÁLISE SWOT</label>
                        <div class="swot-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                            <div>
                                <label>Forças</label>
                                <textarea id="activity-swot-strengths-${processoId}" rows="4" style="width:100%">${swotValues.strengths}</textarea>
                            </div>
                            <div>
                                <label>Fraquezas</label>
                                <textarea id="activity-swot-weaknesses-${processoId}" rows="4" style="width:100%">${swotValues.weaknesses}</textarea>
                            </div>
                            <div>
                                <label>Oportunidades</label>
                                <textarea id="activity-swot-opportunities-${processoId}" rows="4" style="width:100%">${swotValues.opportunities}</textarea>
                            </div>
                            <div>
                                <label>Ameaças</label>
                                <textarea id="activity-swot-threats-${processoId}" rows="4" style="width:100%">${swotValues.threats}</textarea>
                            </div>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>3. CRONOGRAMA</label>
                        <div style="display:flex;gap:8px;align-items:flex-end;flex-wrap:wrap;">
                            <input type="file" id="activity-file-${processoId}-${code}" style="flex:1" />
                            <button type="button" class="btn btn-primary btn-small" data-action="activity-upload-file" data-processo-id="${processoId}" data-code="${code}" data-tipo="cronograma">Enviar Anexo III</button>
                            <button type="button" class="btn btn-secondary btn-small" data-action="activity-refresh-files" data-processo-id="${processoId}" data-code="${code}" data-tipo="cronograma">Atualizar lista</button>
                        </div>
                        <small class="text-muted">Anexo III — Cronograma</small>
                    </div>
                    <div id="activity-files-${processoId}-${code}" class="activity-file-list" style="margin-top:10px"></div>
                    <button type="button" class="btn btn-primary btn-small" data-action="activity-save-objective" data-processo-id="${processoId}" data-code="${code}">Salvar rascunho</button>
                    <div class="activity-note">O objetivo é obrigatório. Dados vinculados ao processo são mantidos ao atualizar a página.</div>
                </div>
            `;
        } else if (code === 'PLAN_A') {
            html = `
                <div class="activity-detail">
                    <table class="table table-sm">
                        <thead>
                            <tr>
                                <th>Nome</th>
                                <th>Matrícula</th>
                                <th>Responsabilidades</th>
                                <th>Setor</th>
                            </tr>
                        </thead>
                        <tbody id="activity-team-table-${processoId}"></tbody>
                    </table>
                    <div class="form-group">
                        <label>Adicionar novo membro</label>
                        <input id="activity-team-name-${processoId}" placeholder="Nome" style="width:100%;margin-bottom:6px" />
                        <input id="activity-team-matricula-${processoId}" placeholder="Matrícula" style="width:100%;margin-bottom:6px" />
                        <textarea id="activity-team-responsabilidades-${processoId}" placeholder="Responsabilidades" rows="2" style="width:100%"></textarea>
                    </div>
                    <button type="button" class="btn btn-primary btn-small" data-action="activity-add-team-member" data-processo-id="${processoId}" data-code="${code}">Adicionar Membro</button>
                </div>
            `;
        } else if (code === 'PLAN_C' || code === 'PLAN_D' || code === 'PLAN_E' || code === 'PLAN_G') {
            const tipo = code === 'PLAN_C' ? 'documentacao' : (code === 'PLAN_D' ? 'deip' : (code === 'PLAN_E' ? 'plano' : 'ata'));
            const titulo = code === 'PLAN_C' ? 'Documentação Existente' : (code === 'PLAN_D' ? 'DEIP - Diagrama de Escopo e Interface' : (code === 'PLAN_E' ? 'E) Elaborar Plano de Projeto com todas as informações adquiridas (Referente à etapa E e F do Manual)' : 'Aprovação e Ata'));
            const descricao = code === 'PLAN_G'
                ? 'Verifique o checklist de aprovação e envie a ata final de validação do NGE.'
                : 'Faça upload do arquivo correspondente e mantenha a documentação atualizada.';

            html = `
                <div class="activity-detail">
                    <div class="form-group">
                        <label>${titulo}</label>
                        <div style="display:flex;gap:8px;align-items:flex-end;flex-wrap:wrap;">
                            <input type="file" id="activity-file-${processoId}-${code}" style="flex:1" />
                            <button type="button" class="btn btn-primary btn-small" data-action="activity-upload-file" data-processo-id="${processoId}" data-code="${code}" data-tipo="${tipo}">Enviar</button>
                            <button type="button" class="btn btn-secondary btn-small" data-action="activity-refresh-files" data-processo-id="${processoId}" data-code="${code}" data-tipo="${tipo}">Atualizar lista</button>
                        </div>
                        <small class="text-muted">${descricao}</small>
                    </div>
                    <div id="activity-files-${processoId}-${code}" class="activity-file-list"></div>
                </div>
            `;

            if (code === 'PLAN_G') {
                html += `
                    <div class="activity-detail" style="margin-top:12px;">
                        <h4>Checklist de aprovação</h4>
                        <div id="activity-approval-checklist-${processoId}"></div>
                    </div>
                `;
            }
        }

        panel.innerHTML = html;
        panel.style.display = 'block';

        if (code === 'PLAN_A') {
            await this.renderActivityTeam(processoId);
        }

        if (code === 'PLAN_B') {
            await this.renderActivityFileList(processoId, code, 'cronograma');
        }

        if (code === 'PLAN_C' || code === 'PLAN_D' || code === 'PLAN_E' || code === 'PLAN_G') {
            const tipo = code === 'PLAN_C' ? 'documentacao' : (code === 'PLAN_D' ? 'deip' : (code === 'PLAN_E' ? 'plano' : 'ata'));
            await this.renderActivityFileList(processoId, code, tipo);
        }

        if (code === 'PLAN_G') {
            await this.renderApprovalChecklist(processoId);
        }
    }


    /**
     * Obter classe de badge por status
     */
    static getStatusBadgeClass(status) {
        const map = {
            'Planejar': 'primary',
            'Analisar': 'info',
            'Desenhar': 'warning',
            'Implementar': 'success',
            'Monitorar': 'info'
        };
        return map[status] || 'primary';
    }

    /**
     * Inicializar opções do formulário de criação de processo
     */
    static initializeCreateProcessForm() {
        this.populateSetorOptions();
        this.populateResponsavelOptions();
    }

    static populateSetorOptions() {
        const setorSelect = document.getElementById('setor-select');
        if (!setorSelect) return;

        const normalizedUser = window.AccessControl?.normalizeUser?.(window.app?.currentUser) || window.app?.currentUser;
        const canSelectUnit = normalizedUser?.perfil !== 'SETOR' && normalizedUser?.perfil !== 'ANALISTA';

        const sectors = this.getAvailableSetoresForSelection();
        setorSelect.innerHTML = sectors.length ? sectors.map(setor => `
            <option value="${setor.id}">${setor.nome}</option>
        `).join('') : '<option value="">Cadastre um setor manualmente</option>';

        if (!canSelectUnit) {
            const currentSectorId = normalizedUser?.unitId || window.app?.currentUser?.setor_id || '';
            setorSelect.innerHTML = currentSectorId ? `
                <option value="${currentSectorId}">Setor do usuário</option>
            ` : '<option value="">Cadastre um setor manualmente</option>';
            setorSelect.value = normalizedUser?.unitId || window.app?.currentUser?.setor_id;
            setorSelect.disabled = !currentSectorId;
        } else {
            setorSelect.disabled = false;
        }
    }

    static populateMacroprocessoOptions() {
        const macroSelect = document.getElementById('macroprocesso-select');
        if (!macroSelect) return;
        macroSelect.value = macroSelect.value || '';
    }

    static populateResponsavelOptions() {
        const responsavelSelect = document.getElementById('responsavel-select');
        if (!responsavelSelect) return;

        responsavelSelect.innerHTML = this.availableResponsaveis.map(responsavel => `
            <option value="${responsavel.id}">${responsavel.nome}</option>
        `).join('');
    }

    /**
     * Mostrar erro
     */
    static showError(message) {
        const container = document.getElementById('processes-list');
        if (container) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>${message}</h3>
                </div>
            `;
        }
    }
}

// Setup do formulário de novo processo
document.addEventListener('DOMContentLoaded', () => {
    const formNovoProcesso = document.getElementById('form-novo-processo');
    if (formNovoProcesso) {
        formNovoProcesso.addEventListener('submit', async (e) => {
            e.preventDefault();

            const normalizedUser = window.AccessControl?.normalizeUser?.(window.app?.currentUser) || window.app?.currentUser;
            const data = {
                nome: document.getElementById('nome-processo').value,
                setor_id: normalizedUser?.perfil === 'SETOR' || normalizedUser?.perfil === 'ANALISTA'
                    ? normalizedUser?.unitId || window.app?.currentUser?.setor_id
                    : parseInt(document.getElementById('setor-select').value),
                macroprocesso_id: null,
                macroprocesso_nome: document.getElementById('macroprocesso-select').value.trim(),
                responsavel_id: document.getElementById('responsavel-select').value || null,
                observacoes: document.getElementById('observacoes-processo').value
            };

            try {
                if (ProcessManager.editingId) {
                    await ProcessManager.updateProcess(ProcessManager.editingId, data);
                    alert('Processo atualizado com sucesso!');
                    ProcessManager.editingId = null;
                    document.getElementById('form-novo-processo').querySelector('button[type=submit]').textContent = '\u{f0c7} Criar Processo';
                } else {
                    await ProcessManager.createProcess(data);
                    alert('Processo criado com sucesso!');
                }

                formNovoProcesso.reset();
                document.querySelector('[data-tab="meus-processos"]').click();
            } catch (error) {
                alert('Erro ao salvar processo: ' + (error.message || error));
            }
        });
    }
});
