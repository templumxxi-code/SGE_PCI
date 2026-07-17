// ============================================================================
// SMP PCI - Gerenciamento de Processos
// ============================================================================

class ProcessManager {
    static editingId = null;
    static availableSetores = [
        { id: 1, nome: 'Genética' },
        { id: 2, nome: 'Química' },
        { id: 3, nome: 'Documentoscopia' },
        { id: 4, nome: 'Balística' },
        { id: 5, nome: 'Fotografia' }
    ];

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

    /**
     * Carregar lista de processos
     */
    static async loadProcesses() {
        try {
            const queryParams = new URLSearchParams();
            if (window.app?.currentUser?.perfil === 'SETOR') {
                queryParams.set('setor_id', window.app.currentUser.setor_id);
            }

            const queryString = queryParams.toString();
            const processos = await api.get(`/processes${queryString ? `?${queryString}` : ''}`);
            this.renderProcesses(processos);
        } catch (error) {
            console.error('Erro ao carregar processos:', error);
            this.showError('Erro ao carregar processos');
        }
    }

    /**
     * Renderizar lista de processos
     */
    static renderProcesses(processos) {
        const container = document.getElementById('processes-list');
        if (!container) return;

        if (!processos || processos.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-inbox"></i>
                    <h3>Nenhum processo encontrado</h3>
                    <p>Comece criando um novo processo</p>
                </div>
            `;
            return;
        }

        container.innerHTML = processos.map(processo => `
            <div class="process-card">
                <h4>${processo.nome}</h4>
                <div class="process-meta">
                    <div class="process-meta-item">
                        <i class="fas fa-building"></i>
                        <span>${processo.setor_nome}</span>
                    </div>
                    <div class="process-meta-item">
                        <i class="fas fa-cogs"></i>
                        <span>${processo.macroprocesso_nome}</span>
                    </div>
                    <div class="process-meta-item">
                        <i class="fas fa-chart-line"></i>
                        <span class="badge badge-${this.getStatusBadgeClass(processo.status_fase)}">
                            ${processo.status_fase}
                        </span>
                    </div>
                </div>
                <div class="process-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${processo.percentual_conclusao}%"></div>
                    </div>
                    <span>${processo.percentual_conclusao}%</span>
                </div>
                <div class="process-actions">
                    <button class="btn btn-primary btn-small" onclick="ProcessManager.viewProcess(${processo.id})">
                        <i class="fas fa-eye"></i> Ver
                    </button>
                    <button class="btn btn-secondary btn-small" onclick="ProcessManager.editProcess(${processo.id})">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                </div>
                <div class="process-steps">
                    ${['Planejar','Analisar','Desenhar','Implementar','Monitorar'].map(fase => `
                        <div class="process-step" data-fase="${fase}" data-expanded="true">
                            <div class="step-header">
                                <button class="btn btn-link phase-toggle" onclick="ProcessManager.togglePhase(event, ${processo.id}, '${fase}')" title="Expandir/Minimizar">
                                    <i class="fas fa-chevron-down"></i>
                                </button>
                                <strong>${fase}</strong>
                                <button class="btn btn-link btn-small" onclick="ProcessManager.addActivity(${processo.id}, '${fase.replace("'","\\'")}')">+ Atividade</button>
                            </div>
                            <ul class="step-activities">
                                ${ (processo.atividades || []).filter(a => a.fase === fase).map(a => `
                                    <li class="activity-item">
                                        ${a.descricao} <span class="meta">- ${a.responsavel_nome || 'N/D'}</span>
                                        ${(a.attachments && a.attachments.length) ? `
                                            <div class="activity-attachments">
                                                ${a.attachments.map(at => `
                                                    <div class="attachment-item">
                                                        ${at.url ? `<a href="${at.url}" target="_blank" class="attachment">${at.filename}</a>` : `<span class="attachment">${at.filename}</span>`}
                                                        <button class="btn-icon btn-delete-attachment" onclick="ProcessManager.deleteAttachment(${processo.id}, ${a.id}, ${at.id}, event)" title="Remover anexo"><i class="fas fa-times"></i></button>
                                                    </div>
                                                `).join('')}
                                            </div>
                                        ` : ''}
                                        <button class="btn btn-link btn-small" onclick="ProcessManager.showAddAttachmentForm(${processo.id}, ${a.id})">📎 Adicionar anexo</button>
                                        ${(a.checklist && a.checklist.length) ? `
                                            <ul class="activity-checklist">
                                                ${a.checklist.map(item => `
                                                    <li class="checklist-item">
                                                        <label>
                                                            <input type="checkbox" ${item.concluido ? 'checked' : ''} onclick="ProcessManager.toggleChecklistItem(${processo.id}, ${a.id}, ${item.id}, ${item.concluido})" />
                                                            ${item.descricao}
                                                        </label>
                                                    </li>
                                                `).join('')}
                                            </ul>
                                        ` : ''}
                                    </li>
                                `).join('') }
                            </ul>
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('');

        // Restaurar estado das fases do localStorage
        setTimeout(() => this.restorePhaseState(), 100);
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
     * Ver detalhes do processo
     */
    static async viewProcess(processoId) {
        try {
            const processo = await api.get(`/processes/${processoId}`);
            console.log('Processo:', processo);
            // Abrir modal com detalhes
        } catch (error) {
            console.error('Erro ao obter processo:', error);
        }
    }

    /**
     * Editar processo
     */
    static async editProcess(processoId) {
        console.log('Editar processo:', processoId);
    }

    /**
     * Criar novo processo
     */
    static async createProcess(data) {
        try {
            const novoProcesso = await api.post('/processes', data);
            console.log('Processo criado:', novoProcesso);
            this.loadProcesses();
            return novoProcesso;
        } catch (error) {
            console.error('Erro ao criar processo:', error);
            throw error;
        }
    }

    /**
     * Atualizar processo
     */
    static async updateProcess(processoId, data) {
        try {
            const processoAtualizado = await api.put(`/processes/${processoId}`, data);
            this.loadProcesses();
            return processoAtualizado;
        } catch (error) {
            console.error('Erro ao atualizar processo:', error);
            throw error;
        }
    }

    /**
     * Inicializar opções do formulário de criação de processo
     */
    static initializeCreateProcessForm() {
        this.populateSetorOptions();
        this.populateMacroprocessoOptions();
        this.populateResponsavelOptions();
    }

    static populateSetorOptions() {
        const setorSelect = document.getElementById('setor-select');
        if (!setorSelect) return;

        setorSelect.innerHTML = this.availableSetores.map(setor => `
            <option value="${setor.id}">${setor.nome}</option>
        `).join('');

        if (window.app?.currentUser?.perfil === 'SETOR') {
            setorSelect.innerHTML = `
                <option value="${window.app.currentUser.setor_id}">Setor do usuário</option>
            `;
            setorSelect.value = window.app.currentUser.setor_id;
            setorSelect.disabled = true;
        } else {
            setorSelect.disabled = false;
        }
    }

    static populateMacroprocessoOptions() {
        const macroSelect = document.getElementById('macroprocesso-select');
        if (!macroSelect) return;

        macroSelect.innerHTML = this.availableMacroprocessos.map(macro => `
            <option value="${macro.id}">${macro.nome}</option>
        `).join('');
    }

    static populateResponsavelOptions() {
        const responsavelSelect = document.getElementById('responsavel-select');
        if (!responsavelSelect) return;

        responsavelSelect.innerHTML = this.availableResponsaveis.map(responsavel => `
            <option value="${responsavel.id}">${responsavel.nome}</option>
        `).join('');
    }

    /**
     * Exibir detalhes de processo
     */
    static async viewProcess(processoId) {
        try {
            const processo = await api.get(`/processes/${processoId}`);
            const message = `
                Nome: ${processo.nome}\n
                Setor: ${processo.setor_nome || 'N/A'}\n
                Macroprocesso: ${processo.macroprocesso_nome || 'N/A'}\n
                Fase BPM: ${processo.status_fase}\n
                Conclusão: ${processo.percentual_conclusao}%\n
                Responsável: ${processo.responsavel_nome || 'N/A'}\n
                Data de início: ${formatarData(processo.data_inicio)}\n
                Progresso: ${processo.percentual_conclusao}%\n
                Observações: ${processo.observacoes || 'Nenhuma'}
            `;
            abrirModal('Detalhes do Processo', message);
        } catch (error) {
            console.error('Erro ao obter processo:', error);
            alert('Não foi possível carregar os detalhes do processo.');
        }
    }

    /**
     * Carregar processo para edição
     */
    static async editProcess(processoId) {
        try {
            const processo = await api.get(`/processes/${processoId}`);
            const form = document.getElementById('form-novo-processo');
            if (!form) return;

            document.getElementById('nome-processo').value = processo.nome || '';
            document.getElementById('macroprocesso-select').value = processo.macroprocesso_id || '';
            document.getElementById('observacoes-processo').value = processo.observacoes || '';

            if (window.app.currentUser.perfil !== 'SETOR') {
                document.getElementById('setor-select').value = processo.setor_id || '';
            }

            // Marcar modo de edição
            ProcessManager.editingId = processoId;
            const submitBtn = document.getElementById('form-novo-processo').querySelector('button[type=submit]');
            if (submitBtn) submitBtn.innerHTML = '<i class="fas fa-save"></i> Salvar Alterações';

            const tabButton = document.querySelector('[data-tab="novo-processo"]');
            if (tabButton) tabButton.click();
            alert('O formulário foi preenchido para edição. Altere os dados e clique em Salvar Alterações.');
        } catch (error) {
            console.error('Erro ao editar processo:', error);
            alert('Não foi possível iniciar a edição do processo.');
        }
    }

    /**
     * Deletar processo
     */
    static async deleteProcess(processoId) {
        if (confirm('Tem certeza que deseja deletar este processo?')) {
            try {
                await api.delete(`/processes/${processoId}`);
                this.loadProcesses();
            } catch (error) {
                console.error('Erro ao deletar processo:', error);
            }
        }
    }

    /**
     * Alternar visibilidade de fase (expandir/minimizar)
     */
    static togglePhase(event, processoId, fase) {
        event.preventDefault();
        event.stopPropagation();

        const stepElement = event.target.closest('.process-step');
        if (!stepElement) return;

        const isExpanded = stepElement.getAttribute('data-expanded') === 'true';
        const button = stepElement.querySelector('.phase-toggle');
        const activities = stepElement.querySelector('.step-activities');

        // Alternar estado
        stepElement.setAttribute('data-expanded', isExpanded ? 'false' : 'true');

        // Animar chevron
        if (button) {
            button.classList.toggle('collapsed');
        }

        // Animar atividades
        if (activities) {
            if (isExpanded) {
                activities.style.maxHeight = activities.scrollHeight + 'px';
                activities.offsetHeight; // Trigger reflow
                activities.style.maxHeight = '0';
                activities.style.opacity = '0';
            } else {
                activities.style.maxHeight = '0';
                activities.offsetHeight; // Trigger reflow
                activities.style.maxHeight = activities.scrollHeight + 'px';
                activities.style.opacity = '1';
            }
        }

        // Salvar estado no localStorage (opcional)
        const key = `phase-${processoId}-${fase}`;
        localStorage.setItem(key, isExpanded ? 'collapsed' : 'expanded');
    }

    /**
     * Restaurar estado das fases do localStorage
     */
    static restorePhaseState() {
        const steps = document.querySelectorAll('.process-step');
        steps.forEach(step => {
            const fase = step.getAttribute('data-fase');
            const processoId = step.closest('.process-card')?.querySelector('h4')?.textContent;
            const key = `phase-${processoId}-${fase}`;
            const savedState = localStorage.getItem(key);

            if (savedState === 'collapsed') {
                const button = step.querySelector('.phase-toggle');
                const activities = step.querySelector('.step-activities');

                step.setAttribute('data-expanded', 'false');
                if (button) button.classList.add('collapsed');
                if (activities) {
                    activities.style.maxHeight = '0';
                    activities.style.opacity = '0';
                }
            }
        });
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

            const data = {
                nome: document.getElementById('nome-processo').value,
                setor_id: window.app.currentUser.perfil === 'SETOR'
                    ? window.app.currentUser.setor_id
                    : parseInt(document.getElementById('setor-select').value),
                macroprocesso_id: parseInt(document.getElementById('macroprocesso-select').value),
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
