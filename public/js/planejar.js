// ============================================================================
// Planejar Module - Frontend
// Fase de Planejamento BPM
// Polícia Científica do Rio Grande do Norte
// ============================================================================

const PlanejarModule = (() => {
    let currentProcessoId = null;
    let currentPlanejar = null;
    let estadoUI = {
        abas: {}
    };

    const init = (processoId) => {
        currentProcessoId = processoId;
        renderUI();
        loadPlanejar();
    };

    const renderUI = () => {
        const container = document.getElementById('planejar-container');
        if (!container) {
            console.error('Elemento #planejar-container não encontrado');
            return;
        }

        container.innerHTML = `
            <div class="planejar-container">
                <div class="planejar-header">
                    <h2>Fase: Planejar</h2>
                    <div class="status-badge" id="status-badge">NÃO_INICIADA</div>
                </div>

                <div class="planejar-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" id="progress-fill" style="width: 0%"></div>
                    </div>
                    <span id="progress-text">0% Completo</span>
                </div>

                <div class="planejar-sections">
                    <!-- A) ESTABELECER OBJETIVO -->
                    <div class="section accordion">
                        <div class="section-header accordion-header" data-section="objetivo">
                            <span class="section-title">A) Estabelecer Objetivo do Projeto de Melhoria</span>
                            <span class="accordion-icon">▼</span>
                        </div>
                        <div class="section-content accordion-content" id="objetivo-content" style="display: none;">
                            <div class="form-group">
                                <label for="objetivo">Objetivo do Projeto de Melhoria *</label>
                                <textarea id="objetivo" class="form-control" placeholder="Descreva o objetivo..." rows="4"></textarea>
                            </div>

                            <div class="form-group">
                                <h4>Análise SWOT</h4>
                                <div class="swot-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                                    <div>
                                        <label for="swot-forcas">Forças</label>
                                        <textarea id="swot-forcas" class="form-control" placeholder="Descreva as forças..." rows="3"></textarea>
                                    </div>
                                    <div>
                                        <label for="swot-fraquezas">Fraquezas</label>
                                        <textarea id="swot-fraquezas" class="form-control" placeholder="Descreva as fraquezas..." rows="3"></textarea>
                                    </div>
                                    <div>
                                        <label for="swot-oportunidades">Oportunidades</label>
                                        <textarea id="swot-oportunidades" class="form-control" placeholder="Descreva as oportunidades..." rows="3"></textarea>
                                    </div>
                                    <div>
                                        <label for="swot-ameacas">Ameaças</label>
                                        <textarea id="swot-ameacas" class="form-control" placeholder="Descreva as ameaças..." rows="3"></textarea>
                                    </div>
                                </div>
                            </div>

                            <div class="form-group">
                                <label>Anexar documento</label>
                                <div class="file-upload" style="display:flex;gap:8px;align-items:flex-end;flex-wrap:wrap;">
                                    <input type="file" id="file-objetivo-documento" class="form-control" style="flex:1" />
                                    <button type="button" class="btn btn-sm btn-primary" data-action="upload-documento-objetivo">Enviar documento</button>
                                </div>
                            </div>

                            <button type="button" class="btn btn-sm btn-primary" data-action="salvar-objetivo-swot">Salvar Objetivo e SWOT</button>
                            <div class="activity-note" style="margin-top:12px;">Digite o objetivo, preencha os quatro campos SWOT e anexe um documento do computador.</div>
                        </div>
                    </div>

                    <!-- B) DEFINIR EQUIPE -->
                    <div class="section accordion">
                        <div class="section-header accordion-header" data-section="equipe">
                            <span class="section-title">B) Definir Equipe de Melhoria</span>
                            <span class="accordion-icon">▼</span>
                        </div>
                        <div class="section-content accordion-content" id="equipe-content" style="display: none;">
                            <table class="table table-sm">
                                <thead>
                                    <tr>
                                        <th>Nome</th>
                                        <th>Matrícula</th>
                                        <th>Responsabilidades</th>
                                        <th>Setor</th>
                                        <th>Ações</th>
                                    </tr>
                                </thead>
                                <tbody id="equipe-table"></tbody>
                            </table>
                            <button type="button" class="btn btn-sm btn-outline" data-action="adicionar-equipe">+ Adicionar Participante</button>
                        </div>
                    </div>

                    <!-- C) DOCUMENTAÇÃO EXISTENTE -->
                    <div class="section accordion">
                        <div class="section-header accordion-header" data-section="documentacao">
                            <span class="section-title">C) Solicitar Documentação Existente do Processo</span>
                            <span class="accordion-icon">▼</span>
                        </div>
                        <div class="section-content accordion-content" id="documentacao-content" style="display: none;">
                            <div class="form-group">
                                <label>Upload de Documentação</label>
                                <div class="file-upload">
                                    <input type="file" id="file-documentacao" multiple>
                                    <button type="button" class="btn btn-sm" data-action="upload-documentacao">Enviar Documentos</button>
                                </div>
                            </div>
                            <div id="documentacao-list"></div>
                        </div>
                    </div>

                    <!-- D) DEIP -->
                    <div class="section accordion">
                        <div class="section-header accordion-header" data-section="deip">
                            <span class="section-title">D) Diagrama de Escopo e Interface (DEIP) — Anexo I</span>
                            <span class="accordion-icon">▼</span>
                        </div>
                        <div class="section-content accordion-content" id="deip-content" style="display: none;">
                            <div class="form-group">
                                <label>Upload do Anexo I (DEIP)</label>
                                <div class="file-upload">
                                    <input type="file" id="file-deip">
                                    <button type="button" class="btn btn-sm" data-action="upload-deip">Enviar DEIP</button>
                                </div>
                            </div>
                            <div id="deip-list"></div>
                        </div>
                    </div>

                    <!-- E) PLANO DE PROJETO -->
                    <div class="section accordion">
                        <div class="section-header accordion-header" data-section="plano">
                            <span class="section-title">E) Elaborar Plano de Projeto — Anexo II</span>
                            <span class="accordion-icon">▼</span>
                        </div>
                        <div class="section-content accordion-content" id="plano-content" style="display: none;">
                            <div class="alert alert-info">Referente à etapa E e F do Manual</div>
                            <div class="form-group">
                                <label for="plano-identificacao">Identificação do Projeto</label>
                                <input type="text" id="plano-identificacao" class="form-control" placeholder="Ex: Projeto de Melhoria...">
                            </div>
                            <div class="form-group">
                                <label for="plano-objetivo">Objetivo</label>
                                <textarea id="plano-objetivo" class="form-control" rows="3"></textarea>
                            </div>
                            <div class="form-group">
                                <label for="plano-justificativa">Justificativa</label>
                                <textarea id="plano-justificativa" class="form-control" rows="3"></textarea>
                            </div>
                            <div class="form-group">
                                <label for="plano-escopo">Escopo</label>
                                <textarea id="plano-escopo" class="form-control" rows="3"></textarea>
                            </div>
                            <div class="form-group">
                                <label for="plano-riscos">Riscos</label>
                                <textarea id="plano-riscos" class="form-control" rows="3"></textarea>
                            </div>
                            <div class="form-group">
                                <label for="plano-entregas">Entregas Previstas</label>
                                <textarea id="plano-entregas" class="form-control" rows="3"></textarea>
                            </div>
                            <div class="form-group">
                                <label>Upload do Anexo II</label>
                                <div class="file-upload">
                                    <input type="file" id="file-plano">
                                    <button type="button" class="btn btn-sm" data-action="upload-plano">Enviar Anexo II</button>
                                </div>
                                <div id="plano-list"></div>
                            </div>
                            <button type="button" class="btn btn-sm btn-outline" data-action="salvar-rascunho">💾 Salvar Rascunho</button>
                        </div>
                    </div>

                    <!-- G) APROVAÇÃO -->
                    <div class="section accordion">
                        <div class="section-header accordion-header" data-section="aprovacao">
                            <span class="section-title">G) Aprovar Plano do Projeto de Melhoria</span>
                            <span class="accordion-icon">▼</span>
                        </div>
                        <div class="section-content accordion-content" id="aprovacao-content" style="display: none;">
                            <h4>Checklist de Aprovação</h4>
                            <div id="checklist-items"></div>
                            
                            <h4 style="margin-top: 20px;">Ata de Validação</h4>
                            <div class="form-group">
                                <label>Upload da Ata de Validação</label>
                                <div class="file-upload">
                                    <input type="file" id="file-ata">
                                    <button type="button" class="btn btn-sm" data-action="upload-ata">Enviar Ata</button>
                                </div>
                            </div>
                            <div id="ata-list"></div>
                        </div>
                    </div>
                </div>

                <div class="planejar-actions">
                    <button type="button" class="btn btn-primary" id="btn-enviar" data-action="enviar-validacao">Enviar para Validação</button>
                    <button type="button" class="btn btn-secondary" id="btn-salvar-rascunho" data-action="salvar-rascunho">Salvar Rascunho</button>
                    <button type="button" id="btn-aprovar" class="btn btn-success" data-action="aprovar" style="display: none;">Aprovar</button>
                    <button type="button" id="btn-devolver" class="btn btn-danger" data-action="devolver" style="display: none;">Devolver para Correção</button>
                </div>

                <div class="planejar-history" id="planejar-history" style="display: none;">
                    <h4>Histórico</h4>
                    <div id="history-content"></div>
                </div>
            </div>
        `;

        setupAccordions();
        setupEventHandlers();
    };

    let containerClickHandler = null;
    let containerChangeHandler = null;

    const setupAccordions = () => {
        document.querySelectorAll('.accordion-header').forEach(header => {
            header.addEventListener('click', function() {
                const section = this.dataset.section;
                const content = document.getElementById(`${section}-content`);
                const isOpen = content.style.display !== 'none';
                
                content.style.display = isOpen ? 'none' : 'block';
                this.classList.toggle('active', !isOpen);
                estadoUI.abas[section] = !isOpen;
            });
        });
    };

    const setupEventHandlers = () => {
        const container = document.getElementById('planejar-container');
        if (!container) return;

        if (containerClickHandler) {
            container.removeEventListener('click', containerClickHandler);
        }
        if (containerChangeHandler) {
            container.removeEventListener('change', containerChangeHandler);
        }

        containerClickHandler = async (event) => {
            const button = event.target.closest('[data-action]');
            if (!button) return;

            const action = button.dataset.action;
            const tipo = button.dataset.tipo;
            const id = button.dataset.id;

            switch (action) {
                case 'salvar-objetivo-swot':
                    salvarObjetivoSWOT();
                    break;
                case 'upload-documento-objetivo':
                    uploadDocumentoObjetivo();
                    break;
                case 'adicionar-swot':
                    adicionarSwot(tipo);
                    break;
                case 'adicionar-cronograma':
                    adicionarCronograma();
                    break;
                case 'adicionar-equipe':
                    adicionarEquipe();
                    break;
                case 'upload-documentacao':
                    uploadDocumentacao();
                    break;
                case 'upload-deip':
                    uploadDEIP();
                    break;
                case 'upload-plano':
                    uploadPlano();
                    break;
                case 'upload-ata':
                    uploadAta();
                    break;
                case 'salvar-rascunho':
                    salvarRascunho();
                    break;
                case 'enviar-validacao':
                    enviarValidacao();
                    break;
                case 'aprovar':
                    aprovar();
                    break;
                case 'devolver':
                    devolver();
                    break;
                case 'remover-swot':
                    removerSwot(parseInt(id, 10));
                    break;
                case 'editar-cronograma':
                    editarCronograma(parseInt(id, 10));
                    break;
                case 'remover-cronograma':
                    removerCronograma(parseInt(id, 10));
                    break;
                case 'editar-equipe':
                    editarEquipe(parseInt(id, 10));
                    break;
                case 'remover-equipe':
                    removerEquipe(parseInt(id, 10));
                    break;
                default:
                    break;
            }
        };

        containerChangeHandler = (event) => {
            const input = event.target.closest('[data-action]');
            if (!input) return;
            const action = input.dataset.action;
            const index = parseInt(input.dataset.index, 10);

            switch (action) {
                case 'marcar-checklist':
                    marcarChecklist(index);
                    break;
                case 'atualizar-observacao':
                    atualizarObservacaoChecklist(index, event.target.value);
                    break;
                default:
                    break;
            }
        };

        container.addEventListener('click', containerClickHandler);
        container.addEventListener('change', containerChangeHandler);
    };

    const loadPlanejar = async () => {
        try {
            const response = await fetch(`/api/planejar/processo/${currentProcessoId}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('smp_token')}` }
            });

            if (!response.ok) throw new Error('Erro ao carregar dados');

            currentPlanejar = await response.json();
            updateUI();
            await loadAttachments();
        } catch (error) {
            console.error('Erro ao carregar planejamento:', error);
            showAlert('Erro ao carregar dados de planejamento', 'error');
        }
    };

    const loadAttachments = async () => {
        try {
            const resp = await fetch(`/api/planejar/${currentProcessoId}/documentacao`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('smp_token')}` }
            });
            if (!resp.ok) throw new Error('Erro ao carregar anexos');
            const data = await resp.json();
            renderAttachments(data.attachments || []);
        } catch (e) {
            console.error('Erro ao carregar anexos:', e);
        }
    };

    const renderAttachments = (attachments) => {
        const docList = document.getElementById('documentacao-list');
        const deipList = document.getElementById('deip-list');
        const planoList = document.getElementById('plano-list');
        const ataList = document.getElementById('ata-list');

        if (docList) docList.innerHTML = '';
        if (deipList) deipList.innerHTML = '';
        if (planoList) planoList.innerHTML = '';
        if (ataList) ataList.innerHTML = '';

        attachments.forEach(a => {
            const item = document.createElement('div');
            item.className = 'attachment-item';
            item.innerHTML = `
                <a href="/api/planejar/${currentProcessoId}/anexo/${a.id}/download" target="_blank">${a.nome_arquivo}</a>
                <span class="meta"> (${Math.round(a.tamanho_bytes/1024)} KB) </span>
                <button class="btn-sm btn-danger" data-id="${a.id}">Excluir</button>
            `;
            const delBtn = item.querySelector('button');
            delBtn.addEventListener('click', async () => {
                if (!confirm('Confirma exclusão (exclusão lógica)?')) return;
                try {
                    const resp = await fetch(`/api/planejar/${currentProcessoId}/anexo/${a.id}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${localStorage.getItem('smp_token')}` }
                    });
                    if (!resp.ok) throw new Error('Erro ao excluir');
                    await loadAttachments();
                    showAlert('Anexo excluído', 'success');
                } catch (e) {
                    console.error(e);
                    showAlert('Erro ao excluir anexo', 'error');
                }
            });

            const tipo = (a.tipo || '').toUpperCase();
            if (tipo === 'DEIP' || tipo === 'DEIP' ) {
                deipList && deipList.appendChild(item);
            } else if (tipo === 'PLANO' || tipo === 'PLANO') {
                planoList && planoList.appendChild(item);
            } else if (tipo === 'ATA' || tipo === 'ATA') {
                ataList && ataList.appendChild(item);
            } else {
                docList && docList.appendChild(item);
            }
        });
    };

    const updateUI = () => {
        if (!currentPlanejar) return;

        // Atualizar objetivo
        document.getElementById('objetivo').value = currentPlanejar.objetivo || '';

        // Atualizar status
        const statusBadge = document.getElementById('status-badge');
        statusBadge.textContent = currentPlanejar.status;
        statusBadge.className = `status-badge status-${currentPlanejar.status.toLowerCase()}`;

        // Renderizar SWOT
        renderSWOT(currentPlanejar.swot);

        // Renderizar Cronograma
        renderCronograma(currentPlanejar.cronograma);

        // Renderizar Equipe
        renderEquipe(currentPlanejar.equipe);

        // Renderizar Plano
        renderPlano(currentPlanejar.plano_projeto);

        // Renderizar Checklist
        renderChecklist(currentPlanejar.checklist);

        // Atualizar botões de ação
        updateActionButtons();

        // Calcular progresso
        updateProgress();
    };

    const renderSWOT = (swot) => {
        const tipos = {
            'FORCA': 'swot-forcas',
            'FRAQUEZA': 'swot-fraquezas',
            'OPORTUNIDADE': 'swot-oportunidades',
            'AMEACA': 'swot-ameacas'
        };

        Object.values(tipos).forEach(elementId => {
            const field = document.getElementById(elementId);
            if (field) field.value = '';
        });

        swot.forEach(item => {
            const field = document.getElementById(tipos[item.tipo]);
            if (field) {
                field.value = field.value ? `${field.value}\n${item.descricao}` : item.descricao;
            }
        });
    };

    const renderCronograma = (cronograma) => {
        const table = document.getElementById('cronograma-table');
        table.innerHTML = '';

        cronograma.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.atividade}</td>
                <td>${item.responsavel || '-'}</td>
                <td>${formatDate(item.data_inicial)}</td>
                <td>${formatDate(item.data_final)}</td>
                <td>${item.situacao}</td>
                <td>
                    <button type="button" class="btn-sm" data-action="editar-cronograma" data-id="${item.id}">Editar</button>
                    <button type="button" class="btn-sm btn-danger" data-action="remover-cronograma" data-id="${item.id}">Remover</button>
                </td>
            `;
            table.appendChild(row);
        });
    };

    const renderEquipe = (equipe) => {
        const table = document.getElementById('equipe-table');
        table.innerHTML = '';

        equipe.forEach(membro => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${membro.nome}</td>
                <td>${membro.matricula || '-'}</td>
                <td>${membro.responsabilidades || '-'}</td>
                <td>${membro.setor || '-'}</td>
                <td>
                    <button type="button" class="btn-sm" data-action="editar-equipe" data-id="${membro.id}">Editar</button>
                    <button type="button" class="btn-sm btn-danger" data-action="remover-equipe" data-id="${membro.id}">Remover</button>
                </td>
            `;
            table.appendChild(row);
        });
    };

    const renderPlano = (plano) => {
        document.getElementById('plano-identificacao').value = plano.identificacao || '';
        document.getElementById('plano-objetivo').value = plano.objetivo || '';
        document.getElementById('plano-justificativa').value = plano.justificativa || '';
        document.getElementById('plano-escopo').value = plano.escopo || '';
        document.getElementById('plano-riscos').value = plano.riscos || '';
        document.getElementById('plano-entregas').value = plano.entregas_previstas || '';
    };

    const renderChecklist = (checklist) => {
        const container = document.getElementById('checklist-items');
        container.innerHTML = '';

        if (!checklist || checklist.length === 0) {
            container.innerHTML = '<p>Nenhum item de checklist disponível</p>';
            return;
        }

        checklist.forEach((item, index) => {
            const row = document.createElement('div');
            row.className = 'checklist-item';
            row.innerHTML = `
                <input type="checkbox" data-action="marcar-checklist" data-index="${index}" ${item.concluido ? 'checked' : ''}>
                <label>${item.descricao}</label>
                <input type="text" placeholder="Observação" class="checklist-observacao" data-action="atualizar-observacao" data-index="${index}" value="${item.observacao || ''}">
            `;
            container.appendChild(row);
        });
    };

    const updateActionButtons = () => {
        const btnAprovar = document.getElementById('btn-aprovar');
        const btnDevolver = document.getElementById('btn-devolver');
        const btnEnviar = document.getElementById('btn-enviar');

        if (!btnAprovar || !btnDevolver || !btnEnviar) return;

        if (currentPlanejar.status === 'AGUARDANDO_VALIDACAO') {
            btnAprovar.style.display = 'inline-block';
            btnDevolver.style.display = 'inline-block';
            btnEnviar.style.display = 'none';
        } else if (currentPlanejar.status === 'APROVADA') {
            btnAprovar.style.display = 'none';
            btnDevolver.style.display = 'none';
            btnEnviar.style.display = 'none';
        } else {
            btnAprovar.style.display = 'none';
            btnDevolver.style.display = 'none';
            btnEnviar.style.display = 'inline-block';
        }
    };

    const updateProgress = () => {
        let completado = 0;
        let total = 5;

        if (currentPlanejar.objetivo) completado++;
        if (currentPlanejar.swot.length > 0) completado++;
        if (currentPlanejar.cronograma.length > 0) completado++;
        if (currentPlanejar.equipe.length > 0) completado++;
        if (currentPlanejar.plano_projeto && currentPlanejar.plano_projeto.objetivo) completado++;

        const percentual = Math.round((completado / total) * 100);
        document.getElementById('progress-fill').style.width = percentual + '%';
        document.getElementById('progress-text').textContent = `${percentual}% Completo`;
    };

    const salvarRascunho = async () => {
        try {
            const dados = {
                objetivo: document.getElementById('objetivo').value,
                plano_projeto: {
                    identificacao: document.getElementById('plano-identificacao').value,
                    objetivo: document.getElementById('plano-objetivo').value,
                    justificativa: document.getElementById('plano-justificativa').value,
                    escopo: document.getElementById('plano-escopo').value,
                    riscos: document.getElementById('plano-riscos').value,
                    entregas_previstas: document.getElementById('plano-entregas').value
                }
            };

            const response = await fetch(`/api/planejar/plano-projeto/salvar-draft/${currentProcessoId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('smp_token')}`
                },
                body: JSON.stringify(dados)
            });

            if (!response.ok) throw new Error('Erro ao salvar');

            showAlert('Rascunho salvo com sucesso', 'success');
        } catch (error) {
            console.error('Erro:', error);
            showAlert('Erro ao salvar rascunho', 'error');
        }
    };

    const enviarValidacao = async () => {
        try {
            const response = await fetch(`/api/planejar/processo/${currentProcessoId}/enviar-validacao`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('smp_token')}`
                },
                body: JSON.stringify({})
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Erro ao enviar');
            }

            currentPlanejar = await response.json();
            updateUI();
            showAlert('Projeto enviado para validação', 'success');
        } catch (error) {
            console.error('Erro:', error);
            showAlert(error.message || 'Erro ao enviar para validação', 'error');
        }
    };

    const aprovar = async () => {
        try {
            const response = await fetch(`/api/planejar/processo/${currentProcessoId}/aprovar`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('smp_token')}`
                }
            });

            if (!response.ok) throw new Error('Erro ao aprovar');

            currentPlanejar = await response.json();
            updateUI();
            showAlert('Projeto aprovado com sucesso', 'success');
        } catch (error) {
            console.error('Erro:', error);
            showAlert('Erro ao aprovar projeto', 'error');
        }
    };

    const devolver = async () => {
        const justificativa = prompt('Informe a justificativa para devolução:');
        if (!justificativa) return;

        try {
            const response = await fetch(`/api/planejar/processo/${currentProcessoId}/devolver`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('smp_token')}`
                },
                body: JSON.stringify({ justificativa })
            });

            if (!response.ok) throw new Error('Erro ao devolver');

            currentPlanejar = await response.json();
            updateUI();
            showAlert('Projeto devolvido para correção', 'success');
        } catch (error) {
            console.error('Erro:', error);
            showAlert('Erro ao devolver projeto', 'error');
        }
    };

    const adicionarSwot = (tipo) => {
        const descricao = prompt(`Adicionar ${tipo}:`);
        if (!descricao) return;

        // Chamada ao API
        fetch(`/api/planejar/swot/adicionar/${currentProcessoId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('smp_token')}`
            },
            body: JSON.stringify({ tipo, descricao })
        }).then(r => r.json()).then(data => {
            currentPlanejar = data;
            updateUI();
            showAlert('Item SWOT adicionado', 'success');
        }).catch(e => {
            console.error(e);
            showAlert('Erro ao adicionar SWOT', 'error');
        });
    };

    const removerSwot = (id) => {
        if (!confirm('Remover item?')) return;
        console.log('Remover SWOT:', id);
    };

    const adicionarCronograma = () => {
        console.log('Adicionar cronograma');
    };

    const editarCronograma = (id) => {
        console.log('Editar cronograma:', id);
    };

    const removerCronograma = (id) => {
        if (!confirm('Remover etapa?')) return;
        console.log('Remover cronograma:', id);
    };

    const adicionarEquipe = () => {
        console.log('Adicionar membro');
    };

    const editarEquipe = (id) => {
        console.log('Editar membro:', id);
    };

    const removerEquipe = (id) => {
        if (!confirm('Remover membro?')) return;
        console.log('Remover equipe:', id);
    };

    const salvarObjetivoSWOT = async () => {
        const objetivo = document.getElementById('objetivo').value.trim();
        const forcas = document.getElementById('swot-forcas').value.trim();
        const fraquezas = document.getElementById('swot-fraquezas').value.trim();
        const oportunidades = document.getElementById('swot-oportunidades').value.trim();
        const ameacas = document.getElementById('swot-ameacas').value.trim();

        const itensSWOT = [];
        const addSWOT = (tipo, valor) => {
            valor.split('\n').map(item => item.trim()).filter(Boolean).forEach(descricao => {
                itensSWOT.push({ tipo, descricao });
            });
        };

        addSWOT('FORCA', forcas);
        addSWOT('FRAQUEZA', fraquezas);
        addSWOT('OPORTUNIDADE', oportunidades);
        addSWOT('AMEACA', ameacas);

        try {
            const response = await fetch(`/api/planejar/processo/${currentProcessoId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('smp_token')}`
                },
                body: JSON.stringify({ objetivo, swot: itensSWOT })
            });

            if (!response.ok) {
                const body = await response.json().catch(() => ({}));
                throw new Error(body.error || body.message || 'Erro ao salvar objetivo e SWOT');
            }

            currentPlanejar = await response.json();
            updateUI();
            showAlert('Objetivo e SWOT salvos com sucesso', 'success');
        } catch (error) {
            console.error('Erro ao salvar objetivo e SWOT:', error);
            showAlert(error.message || 'Erro ao salvar objetivo e SWOT', 'error');
        }
    };

    const uploadDocumentoObjetivo = () => {
        const input = document.getElementById('file-objetivo-documento');
        if (!input || !input.files || input.files.length === 0) return showAlert('Selecione um arquivo', 'error');

        const file = input.files[0];
        const fd = new FormData();
        fd.append('file', file);

        fetch(`/api/planejar/${currentProcessoId}/documentacao`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('smp_token')}` },
            body: fd
        }).then(resp => {
            if (!resp.ok) throw new Error('Erro no upload');
            return resp.json();
        }).then(() => {
            showAlert('Documento enviado', 'success');
            input.value = '';
            loadAttachments();
        }).catch(e => {
            console.error(e);
            showAlert('Erro ao enviar documento', 'error');
        });
    };

    const uploadDocumentacao = () => {
        const input = document.getElementById('file-documentacao');
        if (!input || !input.files || input.files.length === 0) return showAlert('Selecione pelo menos um arquivo', 'error');

        Array.from(input.files).forEach(async (file) => {
            const fd = new FormData();
            fd.append('file', file);
            try {
                const resp = await fetch(`/api/planejar/${currentProcessoId}/documentacao`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('smp_token')}` },
                    body: fd
                });
                if (!resp.ok) throw new Error('Erro no upload');
                await loadAttachments();
                showAlert('Documento enviado', 'success');
            } catch (e) {
                console.error(e);
                showAlert('Erro ao enviar documento', 'error');
            }
        });
    };

    const uploadDEIP = () => {
        const input = document.getElementById('file-deip');
        if (!input || !input.files || input.files.length === 0) return showAlert('Selecione um arquivo', 'error');
        const file = input.files[0];
        const fd = new FormData();
        fd.append('file', file);
        fetch(`/api/planejar/${currentProcessoId}/deip`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('smp_token')}` },
            body: fd
        }).then(r => r.json()).then(() => {
            loadAttachments();
            showAlert('DEIP enviado', 'success');
        }).catch(e => {
            console.error(e);
            showAlert('Erro ao enviar DEIP', 'error');
        });
    };

    const uploadPlano = () => {
        const input = document.getElementById('file-plano');
        if (!input || !input.files || input.files.length === 0) return showAlert('Selecione um arquivo', 'error');
        const file = input.files[0];
        const fd = new FormData();
        fd.append('file', file);
        fetch(`/api/planejar/${currentProcessoId}/plano`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('smp_token')}` },
            body: fd
        }).then(r => r.json()).then(() => {
            loadAttachments();
            showAlert('Anexo II enviado', 'success');
        }).catch(e => {
            console.error(e);
            showAlert('Erro ao enviar Anexo II', 'error');
        });
    };

    const uploadAta = () => {
        const input = document.getElementById('file-ata');
        if (!input || !input.files || input.files.length === 0) return showAlert('Selecione um arquivo', 'error');
        const file = input.files[0];
        const fd = new FormData();
        fd.append('file', file);
        fetch(`/api/planejar/${currentProcessoId}/ata`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('smp_token')}` },
            body: fd
        }).then(r => r.json()).then(() => {
            loadAttachments();
            showAlert('Ata enviada', 'success');
        }).catch(e => {
            console.error(e);
            showAlert('Erro ao enviar ata', 'error');
        });
    };

    const marcarChecklist = (index) => {
        console.log('Marcar checklist:', index);
    };

    const atualizarObservacaoChecklist = (index, observacao) => {
        console.log('Atualizar observação:', index, observacao);
    };

    const formatDate = (date) => {
        if (!date) return '-';
        return new Date(date).toLocaleDateString('pt-BR');
    };

    const showAlert = (message, type = 'info') => {
        const alert = document.createElement('div');
        alert.className = `alert alert-${type}`;
        alert.textContent = message;
        document.body.insertBefore(alert, document.body.firstChild);
        setTimeout(() => alert.remove(), 5000);
    };

    return {
        init,
        salvarRascunho,
        enviarValidacao,
        aprovar,
        devolver,
        adicionarSwot,
        removerSwot,
        adicionarCronograma,
        editarCronograma,
        removerCronograma,
        adicionarEquipe,
        editarEquipe,
        removerEquipe,
        uploadDocumentacao,
        uploadDEIP,
        uploadPlano,
        uploadAta,
        marcarChecklist,
        atualizarObservacaoChecklist
    };
})();
