// ============================================================================
// SMP PCI - Gerenciamento de Configurações
// ============================================================================

class SettingsManager {
    static get currentUser() {
        return window.app?.currentUser || null;
    }

    static canManageUsers() {
        const normalizedUser = window.AccessControl?.normalizeUser?.(this.currentUser) || this.currentUser;
        return normalizedUser?.perfil === 'NGE' || normalizedUser?.perfil === 'NGE_ADMIN';
    }

    static async loadSettings() {
        try {
            const canManage = this.canManageUsers();
            await this.loadUsers().catch(() => {});
            this.renderOrganizationStructure();
            this.setupOrganizationForm();
            this.setupUserForm();

            if (!canManage) {
                // Allow opening the form for inspection, but prevent saving for non-admins
                const saveBtn = document.querySelector('[data-action="save-user"]');
                if (saveBtn) {
                    saveBtn.disabled = true;
                    saveBtn.title = 'Somente administradores podem adicionar usuários';
                }
                const toggleBtn = document.getElementById('show-add-user-form-btn');
                if (toggleBtn) toggleBtn.title = 'Somente administradores podem adicionar usuários';
                return;
            }
        } catch (error) {
            console.error('Erro ao carregar configurações:', error);
        }
    }

    static async loadUsers() {
        try {
            const usuarios = await api.listUsers();
            this.renderUsersTable(usuarios);
        } catch (error) {
            const fallbackUsers = window.AccessControl?.getStoredUsers?.() || [];
            this.renderUsersTable(fallbackUsers);
        }
    }

    static renderOrganizationStructure() {
        const organization = window.AccessControl?.getStoredOrganizationData?.() || { institutes: [], regionais: [], subcoordenações: [], assessorias: [], nuclei: [], sectors: [] };
        document.getElementById('org-institutes-list').innerHTML = (organization.institutes || []).map(item => `<div><strong>${item.name}</strong><p>${item.active ? 'Ativo' : 'Inativo'}</p></div>`).join('') || '<p>Nenhum instituto cadastrado.</p>';
        document.getElementById('org-regionais-list').innerHTML = (organization.regionais || []).map(item => `<div><strong>${item.name}</strong><p>${item.active ? 'Ativa' : 'Inativa'}</p></div>`).join('') || '<p>Nenhuma regional cadastrada.</p>';
        document.getElementById('org-subcoord-list').innerHTML = (organization.subcoordenações || []).map(item => `<div><strong>${item.name}</strong><p>${item.parentType || 'Sem vínculo'}</p></div>`).join('') || '<p>Nenhuma subcoordenação cadastrada.</p>';
        document.getElementById('org-assessorias-list').innerHTML = (organization.assessorias || []).map(item => `<div><strong>${item.name}</strong><p>${item.active ? 'Ativa' : 'Inativa'}</p></div>`).join('') || '<p>Nenhuma assessoria cadastrada.</p>';
        document.getElementById('org-nuclei-list').innerHTML = (organization.nuclei || []).map(item => `<div><strong>${item.name}</strong><p>${item.parentType || 'Sem vínculo'}</p></div>`).join('') || '<p>Nenhum núcleo cadastrado.</p>';
        document.getElementById('org-sectors-list').innerHTML = (organization.sectors || []).map(item => `<div><strong>${item.name}</strong><p>${item.nucleusId ? `Núcleo ${item.nucleusId}` : 'Sem núcleo'}</p></div>`).join('') || '<p>Nenhum setor cadastrado.</p>';
    }

    static setupOrganizationForm() {
        const form = document.getElementById('org-structure-form');
        const typeSelector = document.getElementById('org-structure-type');
        const parentGroup = document.getElementById('org-structure-parent-group');
        const parentSelect = document.getElementById('org-structure-parent');
        const saveBtn = document.getElementById('org-structure-save');

        const populateParentOptions = () => {
            const organization = window.AccessControl?.getStoredOrganizationData?.() || { institutes: [], regionais: [], subcoordenações: [], assessorias: [], nuclei: [], sectors: [] };
            const type = typeSelector?.value || 'INSTITUTO';
            const items = type === 'SETOR' ? (organization.nuclei || []) : (type === 'NUCLEO' ? (organization.institutes || []) : (organization.regionais || []));
            const options = items.length ? items.map((item) => `<option value="${item.id}">${item.name}</option>`).join('') : '<option value="">Sem opções disponíveis</option>';
            if (parentSelect) {
                parentSelect.innerHTML = options;
            }
            if (parentGroup) {
                parentGroup.style.display = type === 'NUCLEO' || type === 'SETOR' ? 'block' : 'none';
            }
        };

        typeSelector?.addEventListener('change', populateParentOptions);
        saveBtn?.addEventListener('click', () => this.createOrganizationItem());
        populateParentOptions();
    }

    static createOrganizationItem() {
        const type = document.getElementById('org-structure-type')?.value || 'INSTITUTO';
        const nameInput = document.getElementById('org-structure-name');
        const parentSelect = document.getElementById('org-structure-parent');
        const name = nameInput?.value.trim();

        if (!name) {
            this.showOrganizationError('Informe o nome da unidade.');
            return;
        }

        const organization = window.AccessControl?.getStoredOrganizationData?.() || { institutes: [], regionais: [], subcoordenações: [], assessorias: [], nuclei: [], sectors: [] };
        const keyMap = {
            INSTITUTO: 'institutes',
            REGIONAL: 'regionais',
            SUBCOORDENACAO: 'subcoordenações',
            ASSESSORIA: 'assessorias',
            NUCLEO: 'nuclei',
            SETOR: 'sectors'
        };

        const targetKey = keyMap[type];
        const list = Array.isArray(organization[targetKey]) ? organization[targetKey] : [];
        const nextId = list.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1;
        const baseItem = {
            id: nextId,
            name,
            active: true,
            createdAt: new Date().toISOString()
        };

        if (type === 'NUCLEO') {
            baseItem.parentType = 'INSTITUTO';
            baseItem.parentUnitId = parentSelect?.value ? Number(parentSelect.value) : null;
        } else if (type === 'SETOR') {
            baseItem.nucleusId = parentSelect?.value ? Number(parentSelect.value) : null;
            baseItem.parentType = 'NUCLEO';
            baseItem.parentUnitId = parentSelect?.value ? Number(parentSelect.value) : null;
        } else if (type === 'SUBCOORDENACAO') {
            baseItem.parentType = 'REGIONAL';
            baseItem.parentId = parentSelect?.value ? Number(parentSelect.value) : null;
        }

        const nextOrganization = { ...organization, [targetKey]: [...list, baseItem] };
        window.AccessControl?.saveOrganizationData?.(nextOrganization);
        this.renderOrganizationStructure();
        this.refreshOrganizationParentOptions();
        if (nameInput) nameInput.value = '';
        this.clearOrganizationError();
    }

    static refreshOrganizationParentOptions() {
        const typeSelector = document.getElementById('org-structure-type');
        const parentSelect = document.getElementById('org-structure-parent');
        if (!typeSelector || !parentSelect) return;
        const organization = window.AccessControl?.getStoredOrganizationData?.() || { institutes: [], regionais: [], subcoordenações: [], assessorias: [], nuclei: [], sectors: [] };
        const type = typeSelector.value;
        const items = type === 'SETOR' ? (organization.nuclei || []) : (type === 'NUCLEO' ? (organization.institutes || []) : (organization.regionais || []));
        parentSelect.innerHTML = (items.length ? items.map((item) => `<option value="${item.id}">${item.name}</option>`).join('') : '<option value="">Sem opções disponíveis</option>');
        const parentGroup = document.getElementById('org-structure-parent-group');
        if (parentGroup) parentGroup.style.display = type === 'NUCLEO' || type === 'SETOR' ? 'block' : 'none';
    }

    static showOrganizationError(message) {
        const errorBox = document.getElementById('org-structure-error');
        if (errorBox) errorBox.textContent = message;
    }

    static clearOrganizationError() {
        const errorBox = document.getElementById('org-structure-error');
        if (errorBox) errorBox.textContent = '';
    }

    static setupUserForm() {
        const form = document.getElementById('add-user-form');
        if (!form) return;

        // Adicionar listener ao botão ADICIONAR com força
        const toggleBtn = document.getElementById('show-add-user-form-btn');
        if (toggleBtn) {
            // Remover listeners anteriores
            const newBtn = toggleBtn.cloneNode(true);
            toggleBtn.parentNode.replaceChild(newBtn, toggleBtn);
            
            // Adicionar novo listener
            document.getElementById('show-add-user-form-btn').addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.toggleUserForm();
                return false;
            });
        }

        // Botão CANCELAR
        const cancelBtn = document.querySelector('[data-action="cancel-user-form"]');
        if (cancelBtn) {
            const newCancel = cancelBtn.cloneNode(true);
            cancelBtn.parentNode.replaceChild(newCancel, cancelBtn);
            document.querySelector('[data-action="cancel-user-form"]').addEventListener('click', (e) => {
                e.preventDefault();
                this.hideUserForm();
            });
        }

        // Botão SALVAR
        const saveBtn = document.querySelector('[data-action="save-user"]');
        if (saveBtn) {
            const newSave = saveBtn.cloneNode(true);
            saveBtn.parentNode.replaceChild(newSave, saveBtn);
            document.querySelector('[data-action="save-user"]').addEventListener('click', (e) => {
                e.preventDefault();
                this.createUser();
            });
        }

        document.getElementById('new-user-role')?.addEventListener('change', () => this.refreshFormFields());
        document.getElementById('new-user-organization-type')?.addEventListener('change', () => this.refreshFormFields());
        this.syncAvailableOrganizationTypes();
        this.refreshFormFields();
    }

    static syncAvailableOrganizationTypes() {
        const select = document.getElementById('new-user-organization-type');
        if (!select) return;

        const organization = window.AccessControl?.getStoredOrganizationData?.() || { institutes: [], regionais: [], subcoordenações: [], assessorias: [], nuclei: [], sectors: [] };
        const availableOptions = [
            { value: 'INSTITUTO', label: 'Instituto', items: organization.institutes || [] },
            { value: 'REGIONAL', label: 'Regional', items: organization.regionais || [] },
            { value: 'ASSESSORIA', label: 'Assessoria', items: organization.assessorias || [] },
            { value: 'NUCLEO', label: 'Núcleo', items: organization.nuclei || [] },
            { value: 'SETOR', label: 'Setor', items: organization.sectors || [] }
        ].filter((option) => Array.isArray(option.items) && option.items.length > 0);

        if (!availableOptions.length) {
            select.innerHTML = '<option value="">Cadastre uma unidade primeiro</option>';
            return;
        }

        const currentValue = availableOptions.some((option) => option.value === select.value) ? select.value : availableOptions[0].value;
        select.innerHTML = availableOptions.map((option) => `<option value="${option.value}">${option.label}</option>`).join('');
        select.value = currentValue;
    }

    static toggleUserForm() {
        const form = document.getElementById('add-user-form');
        if (!form) return;

        const isHidden = form.style.display === 'none' || form.hidden;
        form.style.display = isHidden ? 'block' : 'none';
        form.hidden = !isHidden;

        if (isHidden) {
            this.clearErrors();
            this.syncAvailableOrganizationTypes();
            this.refreshFormFields();
        }
    }

    static hideUserForm() {
        const form = document.getElementById('add-user-form');
        if (form) {
            form.style.display = 'none';
            form.reset();
            this.clearErrors();
        }
    }

    static clearErrors() {
        const errorsContainer = document.getElementById('new-user-errors');
        if (errorsContainer) {
            errorsContainer.innerHTML = '';
        }
    }

    static showErrors(errors) {
        const errorsContainer = document.getElementById('new-user-errors');
        if (!errorsContainer) return;
        errorsContainer.innerHTML = errors.map((error) => `<div class="form-error">${error}</div>`).join('');
    }

    static validateForm() {
        const errors = [];
        const nome = document.getElementById('new-user-name')?.value.trim();
        const registration = document.getElementById('new-user-registration')?.value.trim();
        const email = document.getElementById('new-user-email')?.value.trim();
        const senha = document.getElementById('new-user-password')?.value;
        const confirmSenha = document.getElementById('new-user-confirm-password')?.value;
        const perfil = document.getElementById('new-user-role')?.value;
        const organizationType = document.getElementById('new-user-organization-type')?.value;
        const unitId = document.getElementById('new-user-unit')?.value;
        const nucleusId = document.getElementById('new-user-nucleus')?.value;
        const sectorId = document.getElementById('new-user-sector')?.value;

        if (!nome) errors.push('Nome completo é obrigatório.');
        if (!registration) errors.push('Matrícula é obrigatória.');
        if (!email) errors.push('E-mail é obrigatório.');
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('E-mail inválido.');
        if (!senha || senha.length < 8) errors.push('A senha deve ter pelo menos 8 caracteres.');
        if (!confirmSenha) errors.push('Confirme a senha.');
        if (senha && confirmSenha && senha !== confirmSenha) errors.push('As senhas não coincidem.');
        if (!perfil) errors.push('Selecione o perfil.');

        if (perfil === 'DIRETOR_INSTITUTO' || perfil === 'SUBCOORDENADOR_INSTITUTO') {
            if (!organizationType || organizationType !== 'INSTITUTO') errors.push('Diretor/Subcoordenador de Instituto exige Instituto.');
            if (!unitId) errors.push('Selecione um Instituto.');
        } else if (perfil === 'SUBCOORDENADOR_REGIONAL') {
            if (!organizationType || organizationType !== 'REGIONAL') errors.push('Subcoordenador Regional exige Regional.');
            if (!unitId) errors.push('Selecione uma Regional.');
        } else if (perfil === 'ASSESSOR') {
            if (!organizationType || organizationType !== 'ASSESSORIA') errors.push('Assessor exige Assessoria.');
            if (!unitId) errors.push('Selecione uma Assessoria.');
        } else if (perfil === 'CHEFE_NUCLEO') {
            if (!organizationType || organizationType !== 'NUCLEO') errors.push('Chefe de Núcleo exige Núcleo.');
            if (!unitId) errors.push('Selecione um Núcleo.');
        } else if (perfil === 'CHEFE_SETOR' || perfil === 'OPERACIONAL') {
            if (!organizationType || organizationType !== 'SETOR') errors.push('Chefe de Setor/Operacional exige Setor.');
            if (!sectorId) errors.push('Selecione um Setor.');
        }

        return errors;
    }

    static async createUser() {
        const errors = this.validateForm();
        if (errors.length) {
            this.showErrors(errors);
            return;
        }

        const saveButton = document.querySelector('[data-action="save-user"]');
        if (saveButton) saveButton.disabled = true;
        this.clearErrors();

        try {
            const payload = {
                nome: document.getElementById('new-user-name')?.value.trim(),
                registration: document.getElementById('new-user-registration')?.value.trim(),
                email: document.getElementById('new-user-email')?.value.trim(),
                senha: document.getElementById('new-user-password')?.value,
                perfil: document.getElementById('new-user-role')?.value,
                organizationType: document.getElementById('new-user-organization-type')?.value,
                organizationUnitId: document.getElementById('new-user-unit')?.value || null,
                instituteId: document.getElementById('new-user-organization-type')?.value === 'INSTITUTO' ? document.getElementById('new-user-unit')?.value || null : null,
                regionalId: document.getElementById('new-user-organization-type')?.value === 'REGIONAL' ? document.getElementById('new-user-unit')?.value || null : null,
                advisoryId: document.getElementById('new-user-organization-type')?.value === 'ASSESSORIA' ? document.getElementById('new-user-unit')?.value || null : null,
                nucleusId: document.getElementById('new-user-organization-type')?.value === 'NUCLEO' ? document.getElementById('new-user-unit')?.value || null : null,
                sectorId: document.getElementById('new-user-sector')?.value || null,
                active: document.getElementById('new-user-status')?.value === 'true',
                observations: document.getElementById('new-user-observations')?.value.trim()
            };

            const resultado = await api.registerUser(payload);
            window.AccessControl?.saveStoredUsers?.([...(window.AccessControl?.getStoredUsers?.() || []), resultado]);
            this.renderUsersTable([...(await api.listUsers().catch(() => []))]);
            this.hideUserForm();
            this.showErrors([`Usuário criado com sucesso: ${resultado.nome || resultado.email}`]);
            setTimeout(() => this.clearErrors(), 2500);
        } catch (error) {
            console.error('Erro ao criar usuário:', error);
            this.showErrors([error.message || 'Não foi possível criar o usuário.']);
        } finally {
            if (saveButton) saveButton.disabled = false;
        }
    }

    static refreshFormFields() {
        const role = document.getElementById('new-user-role')?.value;
        const organizationType = document.getElementById('new-user-organization-type')?.value;
        const unitSelect = document.getElementById('new-user-unit');
        const nucleusSelect = document.getElementById('new-user-nucleus');
        const sectorSelect = document.getElementById('new-user-sector');
        const unitGroup = document.getElementById('new-user-unit-group');
        const nucleusGroup = document.getElementById('new-user-nucleus-group');
        const sectorGroup = document.getElementById('new-user-sector-group');

        const organization = window.AccessControl?.getStoredOrganizationData?.() || { institutes: [], regionais: [], assessorias: [], nuclei: [], sectors: [] };
        const buildOptions = (items, emptyLabel = 'Sem opções disponíveis') => {
            const safeItems = Array.isArray(items) ? items : [];
            return safeItems.length ? safeItems.map((item) => `<option value="${item.id}">${item.name}</option>`).join('') : `<option value="">${emptyLabel}</option>`;
        };

        const safePopulateSelect = (select, items, emptyLabel) => {
            if (!select) return;
            select.innerHTML = buildOptions(items, emptyLabel);
        };

        const fallbackRegionals = [
            { id: 'reg-natal', name: 'Natal' },
            { id: 'reg-pau-dos-ferros', name: 'Pau dos Ferros' },
            { id: 'reg-mossoro', name: 'Mossoró' },
            { id: 'reg-caico', name: 'Caicó' }
        ];

        if (role === 'DIRETOR_INSTITUTO' || role === 'SUBCOORDENADOR_INSTITUTO') {
            safePopulateSelect(unitSelect, organization.institutes || [], 'Nenhum instituto cadastrado');
            unitGroup.style.display = 'block';
            nucleusGroup.style.display = 'none';
            sectorGroup.style.display = 'none';
        } else if (role === 'SUBCOORDENADOR_REGIONAL') {
            const regionais = (organization.regionais && organization.regionais.length) ? organization.regionais : fallbackRegionals;
            safePopulateSelect(unitSelect, regionais, 'Nenhuma regional cadastrada');
            unitGroup.style.display = 'block';
            nucleusGroup.style.display = 'none';
            sectorGroup.style.display = 'none';
        } else if (role === 'ASSESSOR') {
            safePopulateSelect(unitSelect, organization.assessorias || [], 'Nenhuma assessoria cadastrada');
            unitGroup.style.display = 'block';
            nucleusGroup.style.display = 'none';
            sectorGroup.style.display = 'none';
        } else if (role === 'CHEFE_NUCLEO') {
            safePopulateSelect(unitSelect, organization.nuclei || [], 'Nenhum núcleo cadastrado');
            unitGroup.style.display = 'block';
            nucleusGroup.style.display = 'none';
            sectorGroup.style.display = 'none';
        } else if (role === 'CHEFE_SETOR' || role === 'OPERACIONAL') {
            unitGroup.style.display = 'none';
            nucleusGroup.style.display = 'block';
            sectorGroup.style.display = 'block';
            safePopulateSelect(nucleusSelect, organization.nuclei || [], 'Nenhum núcleo cadastrado');
            safePopulateSelect(sectorSelect, organization.sectors || [], 'Nenhum setor cadastrado');
        } else {
            unitGroup.style.display = 'none';
            nucleusGroup.style.display = 'none';
            sectorGroup.style.display = 'none';
        }

        const selectedType = organizationType || 'INSTITUTO';
        if (selectedType === 'INSTITUTO') {
            safePopulateSelect(unitSelect, organization.institutes || [], 'Nenhum instituto cadastrado');
        } else if (selectedType === 'REGIONAL') {
            const regionais = (organization.regionais && organization.regionais.length) ? organization.regionais : fallbackRegionals;
            safePopulateSelect(unitSelect, regionais, 'Nenhuma regional cadastrada');
        } else if (selectedType === 'ASSESSORIA') {
            safePopulateSelect(unitSelect, organization.assessorias || [], 'Nenhuma assessoria cadastrada');
        } else if (selectedType === 'NUCLEO') {
            safePopulateSelect(unitSelect, organization.nuclei || [], 'Nenhum núcleo cadastrado');
        } else if (selectedType === 'SETOR') {
            safePopulateSelect(sectorSelect, organization.sectors || [], 'Nenhum setor cadastrado');
        }

        this.syncAvailableOrganizationTypes();
    }

    static renderUsersTable(usuarios) {
        const tbody = document.querySelector('#users-table tbody');
        if (!tbody) return;

        const rows = Array.isArray(usuarios) ? usuarios : [];
        tbody.innerHTML = rows.map((usuario) => `
            <tr data-user-id="${usuario.id}">
                <td>${usuario.nome || usuario.name || '-'}</td>
                <td>${usuario.email || '-'}</td>
                <td>${window.AccessControl?.getProfile?.(usuario.perfil || usuario.role)?.visibleName || usuario.perfil || usuario.role || '-'}</td>
                <td>${usuario.setor_nome || usuario.setorName || usuario.sectorId || usuario.setor_id || '-'}</td>
                <td>
                    <button class="btn btn-small btn-primary edit-user-btn" type="button" data-user-id="${usuario.id}">Editar</button>
                    <button class="btn btn-small btn-danger delete-user-btn" type="button" data-user-id="${usuario.id}">Inativar</button>
                </td>
            </tr>
        `).join('');

        // Adicionar event listeners aos botões
        tbody.querySelectorAll('.edit-user-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const userId = btn.getAttribute('data-user-id');
                this.openEditUserModal(userId, usuarios);
            });
        });

        tbody.querySelectorAll('.delete-user-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const userId = btn.getAttribute('data-user-id');
                this.openDeleteConfirmModal(userId, usuarios);
            });
        });
    }

    static openEditUserModal(userId, usuarios) {
        const usuario = usuarios.find(u => u.id == userId);
        if (!usuario) {
            alert('Usuário não encontrado');
            return;
        }

        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = 'edit-user-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Editar Usuário</h2>
                    <button class="modal-close" type="button">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label for="edit-user-name">Nome Completo</label>
                        <input type="text" id="edit-user-name" value="${usuario.nome || ''}" />
                    </div>
                    <div class="form-group">
                        <label for="edit-user-email">E-mail</label>
                        <input type="email" id="edit-user-email" value="${usuario.email || ''}" />
                    </div>
                    <div class="form-group">
                        <label for="edit-user-role">Perfil</label>
                        <select id="edit-user-role" disabled>
                            <option>${usuario.perfil || usuario.role || 'N/A'}</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="edit-user-sector">Setor</label>
                        <input type="text" id="edit-user-sector" value="${usuario.setor_nome || usuario.setorName || usuario.sectorId || usuario.setor_id || ''}" />
                    </div>
                    <div class="form-group">
                        <label for="edit-user-status">Status</label>
                        <select id="edit-user-status">
                            <option value="true" ${usuario.active !== false ? 'selected' : ''}>Ativo</option>
                            <option value="false" ${usuario.active === false ? 'selected' : ''}>Inativo</option>
                        </select>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-action="cancel-edit">Cancelar</button>
                    <button type="button" class="btn btn-primary" data-action="save-edit" data-user-id="${usuario.id}">Salvar</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        modal.classList.add('active');

        modal.querySelector('.modal-close')?.addEventListener('click', () => modal.remove());
        modal.querySelector('[data-action="cancel-edit"]')?.addEventListener('click', () => modal.remove());
        modal.querySelector('[data-action="save-edit"]')?.addEventListener('click', () => {
            this.saveUserEdit(usuario.id, modal);
        });
    }

    static async saveUserEdit(userId, modal) {
        try {
            const updates = {
                nome: document.getElementById('edit-user-name')?.value.trim(),
                email: document.getElementById('edit-user-email')?.value.trim(),
                active: document.getElementById('edit-user-status')?.value === 'true'
            };

            await api.updateUser(userId, updates);
            modal.remove();
            await this.loadUsers();
            this.showErrors([`Usuário atualizado com sucesso`]);
            setTimeout(() => this.clearErrors(), 2500);
        } catch (error) {
            console.error('Erro ao atualizar usuário:', error);
            alert('Erro ao atualizar usuário: ' + error.message);
        }
    }

    static openDeleteConfirmModal(userId, usuarios) {
        const usuario = usuarios.find(u => u.id == userId);
        if (!usuario) {
            alert('Usuário não encontrado');
            return;
        }

        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = 'delete-user-modal';
        modal.innerHTML = `
            <div class="modal-content modal-small">
                <div class="modal-header">
                    <h2>Confirmar Inativação</h2>
                    <button class="modal-close" type="button">&times;</button>
                </div>
                <div class="modal-body">
                    <p>Tem certeza que deseja inativar o usuário <strong>${usuario.nome || usuario.email}</strong>?</p>
                    <p style="color: #666; font-size: 0.9em;">Essa ação marcará o usuário como inativo, impedindo seu acesso ao sistema.</p>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-action="cancel-delete">Cancelar</button>
                    <button type="button" class="btn btn-danger" data-action="confirm-delete" data-user-id="${usuario.id}">Inativar</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        modal.classList.add('active');

        modal.querySelector('.modal-close')?.addEventListener('click', () => modal.remove());
        modal.querySelector('[data-action="cancel-delete"]')?.addEventListener('click', () => modal.remove());
        modal.querySelector('[data-action="confirm-delete"]')?.addEventListener('click', async () => {
            await this.confirmDeleteUser(usuario.id, modal);
        });
    }

    static async confirmDeleteUser(userId, modal) {
        try {
            await api.deleteUser(userId);
            modal.remove();
            await this.loadUsers();
            this.showErrors([`Usuário inativado com sucesso`]);
            setTimeout(() => this.clearErrors(), 2500);
        } catch (error) {
            console.error('Erro ao inativar usuário:', error);
            alert('Erro ao inativar usuário: ' + error.message);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('add-user-form');
    if (form) {
        form.style.display = 'none';
    }

    // IMPORTANTE: Os event listeners principais são adicionados por setupUserForm() 
    // quando loadSettings() é chamado. Não adicionar novamente aqui para evitar conflitos.
    document.getElementById('org-structure-type')?.addEventListener('change', () => SettingsManager.refreshOrganizationParentOptions());
    document.getElementById('org-structure-save')?.addEventListener('click', () => SettingsManager.createOrganizationItem());
});
