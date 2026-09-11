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
            await this.renderOrganizationStructure();
            this.setupOrganizationForm();
            this.setupUserForm();
            if (canManage) {
                await window.ModulesManager?.loadAdminPanel();
            }

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

    static async renderOrganizationStructure() {
        let tree = [];
        try {
            tree = await AuthManager.get('/organization/tree');
        } catch (error) {
            console.error('Erro ao carregar árvore organizacional oficial:', error);
        }
        const flatten = (nodes, parent = null) => nodes.flatMap((node) => [
            { ...node, parent },
            ...flatten(node.children || [], node)
        ]);
        const officialUnits = flatten(Array.isArray(tree) ? tree : []);
        this.officialOrganizationUnits = officialUnits;
        const byType = (types) => officialUnits.filter((item) => types.includes(item.tipo));
        const toDisplayItem = (item) => ({
            id: item.id,
            name: item.nome,
            active: item.ativo,
            code: item.sigla,
            parentType: item.parent?.nome || 'Unidade superior'
        });
        const organization = {
            institutes: byType(['INSTITUTO']).map(toDisplayItem),
            regionais: byType(['REGIONAL']).map(toDisplayItem),
            subcoordenações: byType(['SUBCOORDENACAO']).map(toDisplayItem),
            assessorias: byType(['ASSESSORIA']).map(toDisplayItem),
            nuclei: byType(['NUCLEO']).map(toDisplayItem),
            sectors: byType(['SETOR', 'SERVICO', 'LABORATORIO', 'COMISSAO', 'CORREGEDORIA', 'DIRETORIA', 'ORGAO', 'UNIDADE']).map(toDisplayItem)
        };
        const renderGroup = (items, emptyMessage) => items.map(item => `<div class="org-item"><div><strong>${item.name}</strong><p>${item.code || ''} · ${item.active ? 'Ativo' : 'Inativo'} · ${item.parentType || 'Raiz'}</p></div></div>`).join('') || `<p>${emptyMessage}</p>`;
        document.getElementById('org-institutes-list').innerHTML = renderGroup(organization.institutes, 'Nenhum instituto cadastrado.');
        document.getElementById('org-regionais-list').innerHTML = renderGroup(organization.regionais, 'Nenhuma regional cadastrada.');
        document.getElementById('org-subcoord-list').innerHTML = renderGroup(organization.subcoordenações, 'Nenhuma subcoordenação cadastrada.');
        document.getElementById('org-assessorias-list').innerHTML = renderGroup(organization.assessorias, 'Nenhuma assessoria cadastrada.');
        document.getElementById('org-nuclei-list').innerHTML = renderGroup(organization.nuclei, 'Nenhum núcleo cadastrado.');
        document.getElementById('org-sectors-list').innerHTML = renderGroup(organization.sectors, 'Nenhum setor cadastrado.');
        const escapeHtml = (value) => String(value || '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
        const renderTree = (nodes) => nodes.map((node) => `<li><div class="organizational-tree-node"><strong>${escapeHtml(node.nome)}</strong><span>${escapeHtml(node.sigla)} · ${escapeHtml(node.tipo)} · Nível ${node.nivel_hierarquico}</span></div>${node.children?.length ? `<ul>${renderTree(node.children)}</ul>` : ''}</li>`).join('');
        const treeElement = document.getElementById('organizational-tree');
        if (treeElement) treeElement.innerHTML = officialUnits.length ? `<ul>${renderTree(tree)}</ul>` : '<p>Nenhuma unidade oficial cadastrada.</p>';

        document.querySelectorAll('.remove-organization-item').forEach((button) => {
            button.addEventListener('click', () => {
                const type = button.dataset.type;
                const id = button.dataset.id;
                if (!type || !id) return;
                const removed = window.AccessControl?.removeOrganizationItem?.(type, id);
                if (removed) {
                    this.renderOrganizationStructure();
                    this.refreshOrganizationParentOptions();
                    this.syncAvailableOrganizationTypes();
                    if (typeof this.refreshFormFields === 'function') this.refreshFormFields();
                }
            });
        });
    }

    static setupOrganizationForm() {
        const form = document.getElementById('org-structure-form');
        const typeSelector = document.getElementById('org-structure-type');
        const parentGroup = document.getElementById('org-structure-parent-group');
        const parentSelect = document.getElementById('org-structure-parent');
        const saveBtn = document.getElementById('org-structure-save');

        if (!form || form.dataset.eventsBound === 'true') {
            return;
        }
        form.dataset.eventsBound = 'true';

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

    static normalizeOrganizationName(value) {
        return String(value || '').trim().toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    }

    static organizationSaveInProgress = false;

    static createOrganizationItem() {
        if (this.organizationSaveInProgress) return;
        const type = document.getElementById('org-structure-type')?.value || 'INSTITUTO';
        const nameInput = document.getElementById('org-structure-name');
        const parentSelect = document.getElementById('org-structure-parent');
        const saveBtn = document.getElementById('org-structure-save');
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
        const normalizedName = this.normalizeOrganizationName(name);
        const duplicate = list.find(item => item.active !== false && this.normalizeOrganizationName(item.name) === normalizedName);
        if (duplicate) {
            this.showOrganizationError(`Já existe uma ${type === 'ASSESSORIA' ? 'Assessoria' : 'estrutura'} cadastrada com esse nome.`);
            return;
        }

        this.organizationSaveInProgress = true;
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.dataset.originalText = saveBtn.textContent;
            saveBtn.textContent = 'Salvando...';
        }

        try {
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
            this.syncAvailableOrganizationTypes();
            if (typeof this.refreshFormFields === 'function') this.refreshFormFields();
            if (nameInput) nameInput.value = '';
            this.clearOrganizationError();
        } catch (error) {
            console.error('Erro ao salvar unidade organizacional:', error);
            this.showOrganizationError('Não foi possível salvar a unidade. Tente novamente.');
        } finally {
            this.organizationSaveInProgress = false;
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.textContent = saveBtn.dataset.originalText || 'Salvar Unidade';
            }
        }
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

    static refreshFormFields() {
        const form = document.getElementById('add-user-form');
        if (!form) return;

        this.syncAvailableOrganizationTypes();
        this.renderUserForm();
        this.renderUserAssignmentSummary();
        this.validateUserForm();
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

        const roleValue = document.getElementById('new-user-role')?.value || '';
        const filteredOptions = roleValue && roleValue !== 'NGE'
            ? availableOptions.filter((option) => {
                const expected = this.getDefaultOrganizationTypeForProfile(roleValue);
                return !expected || option.value === expected;
            })
            : availableOptions;

        if (!filteredOptions.length) {
            select.innerHTML = '<option value="">Cadastre uma unidade primeiro</option>';
            return;
        }

        const currentValue = filteredOptions.some((option) => option.value === select.value)
            ? select.value
            : filteredOptions[0].value;

        select.innerHTML = filteredOptions.map((option) => `<option value="${option.value}">${option.label}</option>`).join('');
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

    static openUserForm(mode = 'create', userId = null) {
        const form = document.getElementById('add-user-form');
        const title = document.getElementById('user-form-title');
        if (!form) return;
        form.style.display = 'block';
        form.hidden = false;
        if (title) {
            title.textContent = mode === 'edit' ? 'Editar usuário' : 'Novo usuário';
        }
        form.dataset.mode = mode;
        form.dataset.userId = userId || '';
        this.renderUserForm();
    }

    static closeUserForm() {
        const form = document.getElementById('add-user-form');
        if (!form) return;
        form.style.display = 'none';
        form.hidden = true;
        form.dataset.mode = 'create';
        form.dataset.userId = '';
        form.reset();
        this.clearErrors();
        this.renderUserAssignmentSummary();
    }

    static renderUserForm() {
        const roleSelect = document.getElementById('new-user-role');
        const typeSelect = document.getElementById('new-user-organization-type');
        const unitSelect = document.getElementById('new-user-unit');
        const nucleusSelect = document.getElementById('new-user-nucleus');
        const sectorSelect = document.getElementById('new-user-sector');
        const organization = window.AccessControl?.getStoredOrganizationData?.() || { institutes: [], regionais: [], subcoordenações: [], assessorias: [], nuclei: [], sectors: [] };

        this.syncAvailableOrganizationTypes();

        if (!roleSelect || !typeSelect || !unitSelect || !nucleusSelect || !sectorSelect) {
            return;
        }

        const profile = roleSelect.value;
        const requiredFields = this.getRequiredOrganizationFields(profile);

        const showGroup = (element, visible) => {
            if (element) {
                element.style.display = visible ? 'block' : 'none';
                element.hidden = !visible;
            }
        };

        showGroup(document.getElementById('new-user-organization-type-group'), profile !== 'NGE');
        showGroup(document.getElementById('new-user-unit-group'), requiredFields.includes('UNIDADE'));
        showGroup(document.getElementById('new-user-nucleus-group'), requiredFields.includes('NUCLEO'));
        showGroup(document.getElementById('new-user-sector-group'), requiredFields.includes('SETOR'));

        const typesForProfile = this.getAvailableOrganizationTypeOptions(profile, organization);
        typeSelect.innerHTML = typesForProfile.length
            ? typesForProfile.map((option) => `<option value="${option.value}">${option.label}</option>`).join('')
            : '<option value="">Selecione a unidade</option>';

        if (profile === 'NGE') {
            typeSelect.innerHTML = '<option value="">NGE</option>';
            unitSelect.innerHTML = '<option value="">NGE</option>';
            nucleusSelect.innerHTML = '<option value="">NGE</option>';
            sectorSelect.innerHTML = '<option value="">NGE</option>';
            return;
        }

        const selectedType = this.getDefaultOrganizationTypeForProfile(profile) || typeSelect.value || typesForProfile[0]?.value || '';
        if (selectedType) {
            typeSelect.value = selectedType;
        }

        if (requiredFields.includes('UNIDADE') && ['DIRETOR_INSTITUTO', 'SUBCOORDENADOR_INSTITUTO', 'SUBCOORDENADOR_REGIONAL', 'ASSESSOR'].includes(profile)) {
            const unitOptions = this.getAvailableOrganizationUnits(profile, organization);
            unitSelect.innerHTML = unitOptions.length ? unitOptions.map((item) => `<option value="${item.value}">${item.label}</option>`).join('') : '<option value="">Selecione a unidade</option>';
            if (unitOptions.length && !unitSelect.value) {
                unitSelect.value = unitOptions[0].value;
            }
        } else if (profile === 'CHEFE_NUCLEO') {
            const nuclei = this.getAvailableNuclei();
            nucleusSelect.innerHTML = nuclei.length ? nuclei.map((item) => `<option value="${item.id}">${item.name}</option>`).join('') : '<option value="">Selecione o núcleo</option>';
            if (nuclei.length && !nucleusSelect.value) {
                nucleusSelect.value = nuclei[0].id;
            }
            const selectedNucleus = nuclei.find((item) => String(item.id) === String(nucleusSelect.value));
            if (selectedNucleus) {
                const parentUnit = this.getParentUnitForNucleus(selectedNucleus, organization);
                unitSelect.innerHTML = parentUnit ? `<option value="${parentUnit.id}">${parentUnit.name}</option>` : '<option value="">Selecione a unidade</option>';
                if (parentUnit) {
                    typeSelect.value = this.getOrganizationTypeByUnit(parentUnit, organization) || '';
                }
            }
        } else if (['CHEFE_SETOR', 'OPERACIONAL'].includes(profile)) {
            const sectors = this.getAvailableSectors();
            sectorSelect.innerHTML = sectors.length ? sectors.map((item) => `<option value="${item.id}">${item.name}</option>`).join('') : '<option value="">Selecione o setor</option>';
            if (sectors.length && !sectorSelect.value) {
                sectorSelect.value = sectors[0].id;
            }
            const selectedSector = sectors.find((item) => String(item.id) === String(sectorSelect.value));
            if (selectedSector) {
                const nucleus = this.getNucleusById(selectedSector.nucleusId, organization);
                nucleusSelect.innerHTML = nucleus ? `<option value="${nucleus.id}">${nucleus.name}</option>` : '<option value="">Selecione o núcleo</option>';
                const parentUnit = this.getParentUnitForNucleus(nucleus, organization);
                unitSelect.innerHTML = parentUnit ? `<option value="${parentUnit.id}">${parentUnit.name}</option>` : '<option value="">Selecione a unidade</option>';
                if (parentUnit) {
                    typeSelect.value = this.getOrganizationTypeByUnit(parentUnit, organization) || '';
                }
            }
        }

        this.renderUserAssignmentSummary();
    }

    static handleUserRoleChange() {
        const role = document.getElementById('new-user-role')?.value;
        const organizationType = document.getElementById('new-user-organization-type');
        const unit = document.getElementById('new-user-unit');
        const nucleus = document.getElementById('new-user-nucleus');
        const sector = document.getElementById('new-user-sector');

        if (role === 'NGE') {
            if (organizationType) organizationType.value = '';
            if (unit) unit.innerHTML = '<option value="">NGE</option>';
            if (nucleus) nucleus.innerHTML = '<option value="">NGE</option>';
            if (sector) sector.innerHTML = '<option value="">NGE</option>';
        }

        if (role && role !== 'NGE') {
            this.renderUserForm();
        }

        this.validateUserForm();
        this.renderUserAssignmentSummary();
    }

    static getRequiredOrganizationFields(profile) {
        const profileValue = String(profile || '').toUpperCase();
        switch (profileValue) {
            case 'NGE':
                return [];
            case 'DIRETOR_INSTITUTO':
            case 'SUBCOORDENADOR_INSTITUTO':
                return ['UNIDADE'];
            case 'SUBCOORDENADOR_REGIONAL':
                return ['UNIDADE'];
            case 'ASSESSOR':
                return ['UNIDADE'];
            case 'CHEFE_NUCLEO':
                return ['NUCLEO'];
            case 'CHEFE_SETOR':
            case 'OPERACIONAL':
                return ['SETOR'];
            default:
                return [];
        }
    }

    static getDefaultOrganizationTypeForProfile(profile) {
        const profileValue = String(profile || '').toUpperCase();
        const mapping = {
            DIRETOR_INSTITUTO: 'INSTITUTO',
            SUBCOORDENADOR_INSTITUTO: 'INSTITUTO',
            SUBCOORDENADOR_REGIONAL: 'REGIONAL',
            ASSESSOR: 'ASSESSORIA',
            CHEFE_NUCLEO: 'NUCLEO',
            CHEFE_SETOR: 'SETOR',
            OPERACIONAL: 'SETOR'
        };
        return mapping[profileValue] || '';
    }

    static getAvailableOrganizationTypeOptions(profile, organization = null) {
        const org = organization || window.AccessControl?.getStoredOrganizationData?.() || { institutes: [], regionais: [], subcoordenações: [], assessorias: [], nuclei: [], sectors: [] };
        const profileValue = String(profile || '').toUpperCase();
        const list = [];

        if (profileValue === 'NGE') {
            return list;
        }

        if (['DIRETOR_INSTITUTO', 'SUBCOORDENADOR_INSTITUTO'].includes(profileValue) && (org.institutes || []).length) {
            list.push({ value: 'INSTITUTO', label: 'Instituto' });
        }
        if (profileValue === 'SUBCOORDENADOR_REGIONAL' && (org.regionais || []).length) {
            list.push({ value: 'REGIONAL', label: 'Regional' });
        }
        if (profileValue === 'ASSESSOR' && (org.assessorias || []).length) {
            list.push({ value: 'ASSESSORIA', label: 'Assessoria' });
        }
        if (profileValue === 'CHEFE_NUCLEO' && (org.nuclei || []).length) {
            list.push({ value: 'NUCLEO', label: 'Núcleo' });
        }
        if (['CHEFE_SETOR', 'OPERACIONAL'].includes(profileValue) && (org.sectors || []).length) {
            list.push({ value: 'SETOR', label: 'Setor' });
        }

        return list.length ? list : [{ value: this.getDefaultOrganizationTypeForProfile(profileValue) || '', label: 'Selecione a unidade' }].filter((option) => option.value);
    }

    static getAvailableOrganizationUnits(profile, organization = null) {
        const org = organization || window.AccessControl?.getStoredOrganizationData?.() || { institutes: [], regionais: [], subcoordenações: [], assessorias: [], nuclei: [], sectors: [] };
        const profileValue = String(profile || '').toUpperCase();
        switch (profileValue) {
            case 'DIRETOR_INSTITUTO':
            case 'SUBCOORDENADOR_INSTITUTO':
                return (org.institutes || []).map((item) => ({ value: String(item.id), label: item.name }));
            case 'SUBCOORDENADOR_REGIONAL':
                return (org.regionais || []).map((item) => ({ value: String(item.id), label: item.name }));
            case 'ASSESSOR':
                return (org.assessorias || []).map((item) => ({ value: String(item.id), label: item.name }));
            case 'CHEFE_NUCLEO':
                return (org.nuclei || []).map((item) => ({ value: String(item.id), label: item.name }));
            case 'CHEFE_SETOR':
            case 'OPERACIONAL':
                return (org.sectors || []).map((item) => ({ value: String(item.id), label: item.name }));
            default:
                return [];
        }
    }

    static getAvailableNuclei() {
        const org = window.AccessControl?.getStoredOrganizationData?.() || { institutes: [], regionais: [], subcoordenações: [], assessorias: [], nuclei: [], sectors: [] };
        return Array.isArray(org.nuclei) ? org.nuclei : [];
    }

    static getAvailableSectors() {
        const org = window.AccessControl?.getStoredOrganizationData?.() || { institutes: [], regionais: [], subcoordenações: [], assessorias: [], nuclei: [], sectors: [] };
        return Array.isArray(org.sectors) ? org.sectors : [];
    }

    static getNucleusById(nucleusId, organization = null) {
        const org = organization || window.AccessControl?.getStoredOrganizationData?.() || { institutes: [], regionais: [], subcoordenações: [], assessorias: [], nuclei: [], sectors: [] };
        const nuclei = Array.isArray(org.nuclei) ? org.nuclei : [];
        return nuclei.find((item) => String(item.id) === String(nucleusId)) || null;
    }

    static getParentUnitForNucleus(nucleus, organization = null) {
        const org = organization || window.AccessControl?.getStoredOrganizationData?.() || { institutes: [], regionais: [], subcoordenações: [], assessorias: [], nuclei: [], sectors: [] };
        if (!nucleus) return null;
        const parentId = nucleus.parentUnitId || nucleus.instituteId || nucleus.regionalId || nucleus.assessoriaId || null;
        const institutes = Array.isArray(org.institutes) ? org.institutes : [];
        const regionais = Array.isArray(org.regionais) ? org.regionais : [];
        const assessorias = Array.isArray(org.assessorias) ? org.assessorias : [];
        const candidate = [...institutes, ...regionais, ...assessorias].find((item) => String(item.id) === String(parentId));
        return candidate || null;
    }

    static getOrganizationTypeByUnit(unit, organization = null) {
        const org = organization || window.AccessControl?.getStoredOrganizationData?.() || { institutes: [], regionais: [], subcoordenações: [], assessorias: [], nuclei: [], sectors: [] };
        if (!unit) return '';
        if ((org.institutes || []).some((item) => String(item.id) === String(unit.id || unit))) return 'INSTITUTO';
        if ((org.regionais || []).some((item) => String(item.id) === String(unit.id || unit))) return 'REGIONAL';
        if ((org.assessorias || []).some((item) => String(item.id) === String(unit.id || unit))) return 'ASSESSORIA';
        if ((org.nuclei || []).some((item) => String(item.id) === String(unit.id || unit))) return 'NUCLEO';
        return 'SETOR';
    }

    static buildUserOrganizationalAssignment() {
        const perfil = document.getElementById('new-user-role')?.value || '';
        const organizationType = document.getElementById('new-user-organization-type')?.value || '';
        const unitId = document.getElementById('new-user-unit')?.value || '';
        const nucleusId = document.getElementById('new-user-nucleus')?.value || '';
        const sectorId = document.getElementById('new-user-sector')?.value || '';
        const org = window.AccessControl?.getStoredOrganizationData?.() || { institutes: [], regionais: [], subcoordenações: [], assessorias: [], nuclei: [], sectors: [] };
        const unit = this.getUnitById(unitId, org);
        const nucleus = this.getNucleusById(nucleusId, org);
        const sector = this.getSectorById(sectorId, org);

        return {
            perfil,
            organizationType,
            organizationUnitId: unitId || null,
            unitName: unit ? unit.name : null,
            nucleusId: nucleusId || null,
            nucleusName: nucleus ? nucleus.name : null,
            sectorId: sectorId || null,
            sectorName: sector ? sector.name : null
        };
    }

    static getUnitById(unitId, organization = null) {
        const org = organization || window.AccessControl?.getStoredOrganizationData?.() || { institutes: [], regionais: [], subcoordenações: [], assessorias: [], nuclei: [], sectors: [] };
        const sources = [(org.institutes || []), (org.regionais || []), (org.assessorias || []), (org.nuclei || [])];
        for (const source of sources) {
            const item = source.find((entry) => String(entry.id) === String(unitId));
            if (item) return item;
        }
        return null;
    }

    static getSectorById(sectorId, organization = null) {
        const org = organization || window.AccessControl?.getStoredOrganizationData?.() || { institutes: [], regionais: [], subcoordenações: [], assessorias: [], nuclei: [], sectors: [] };
        return (org.sectors || []).find((entry) => String(entry.id) === String(sectorId)) || null;
    }

    static validateUserOrganizationalAssignment(userData = {}) {
        const errors = [];
        const perfil = String(userData.perfil || '').toUpperCase();
        const organizationType = String(userData.organizationType || '').toUpperCase();
        const effectiveOrganizationType = organizationType || this.getDefaultOrganizationTypeForProfile(perfil) || '';
        const organizationUnitId = userData.organizationUnitId || userData.unitId || userData.instituteId || userData.regionalId || userData.advisoryId || userData.nucleusId || null;
        const nucleusId = userData.nucleusId || null;
        const sectorId = userData.sectorId || null;

        if (perfil === 'NGE') {
            if (organizationType || organizationUnitId || nucleusId || sectorId) {
                errors.push('NGE não pode estar vinculado a uma unidade, núcleo ou setor.');
            }
            return { valid: errors.length === 0, errors };
        }

        if (['DIRETOR_INSTITUTO', 'SUBCOORDENADOR_INSTITUTO'].includes(perfil)) {
            if (!effectiveOrganizationType && !organizationUnitId) {
                errors.push('Selecione o Instituto.');
            }
            if (!organizationUnitId && !nucleusId && !sectorId) {
                errors.push('Selecione o Instituto.');
            }
        }

        if (perfil === 'SUBCOORDENADOR_REGIONAL') {
            if (!effectiveOrganizationType && !organizationUnitId) {
                errors.push('Selecione a Regional.');
            }
            if (!organizationUnitId) {
                errors.push('Selecione a Regional.');
            }
        }

        if (perfil === 'ASSESSOR') {
            if (!effectiveOrganizationType && !organizationUnitId) {
                errors.push('Selecione a Assessoria.');
            }
            if (!organizationUnitId) {
                errors.push('Selecione a Assessoria.');
            }
        }

        if (perfil === 'CHEFE_NUCLEO') {
            if (!nucleusId && !organizationUnitId) {
                errors.push('Selecione o Núcleo.');
            }
        }

        if (['CHEFE_SETOR', 'OPERACIONAL'].includes(perfil)) {
            if (!sectorId && !organizationUnitId) {
                errors.push('Selecione o Setor.');
            }
        }

        if (['CHEFE_SETOR', 'OPERACIONAL'].includes(perfil) && effectiveOrganizationType && effectiveOrganizationType !== 'SETOR') {
            errors.push('Perfil de setor exige vínculo ao Setor.');
        }

        return { valid: errors.length === 0, errors };
    }

    static validateUserForm() {
        const fields = ['new-user-name', 'new-user-registration', 'new-user-email', 'new-user-role', 'new-user-lotacao', 'new-user-password', 'new-user-confirm-password'];
        const errors = [];
        const nome = document.getElementById('new-user-name')?.value.trim();
        const registration = document.getElementById('new-user-registration')?.value.trim();
        const email = document.getElementById('new-user-email')?.value.trim();
        const senha = document.getElementById('new-user-password')?.value || '';
        const confirmSenha = document.getElementById('new-user-confirm-password')?.value || '';
        const perfil = document.getElementById('new-user-role')?.value || '';
        const organizationTypeElement = document.getElementById('new-user-organization-type');
        const organizationType = organizationTypeElement?.value || this.getDefaultOrganizationTypeForProfile(perfil) || '';
        if (organizationTypeElement && !organizationTypeElement.value && organizationType) {
            organizationTypeElement.value = organizationType;
        }
        const unitId = document.getElementById('new-user-unit')?.value || '';
        const nucleusId = document.getElementById('new-user-nucleus')?.value || '';
        const sectorId = document.getElementById('new-user-sector')?.value || '';

        fields.forEach((fieldId) => {
            const field = document.getElementById(fieldId)?.closest('.form-field');
            if (field) field.classList.remove('is-invalid');
        });

        if (!nome) {
            errors.push({ field: 'new-user-name', message: 'Informe o nome completo.' });
        }
        if (!registration) {
            errors.push({ field: 'new-user-registration', message: 'Informe a matrícula.' });
        }
        if (!email) {
            errors.push({ field: 'new-user-email', message: 'Informe o e-mail institucional.' });
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            errors.push({ field: 'new-user-email', message: 'Informe um e-mail institucional válido.' });
        }
        if (!perfil) {
            errors.push({ field: 'new-user-role', message: 'Selecione o perfil.' });
        }
        if (perfil && perfil !== 'NGE' && !document.getElementById('new-user-lotacao')?.value) {
            errors.push({ field: 'new-user-lotacao', message: 'Selecione a lotação do usuário.' });
        }
        if (!senha) {
            errors.push({ field: 'new-user-password', message: 'Informe a senha temporária.' });
        } else if (senha.length < 8) {
            errors.push({ field: 'new-user-password', message: 'A senha deve ter pelo menos 8 caracteres.' });
        }
        if (!confirmSenha) {
            errors.push({ field: 'new-user-confirm-password', message: 'Confirme a senha.' });
        } else if (senha && confirmSenha && senha !== confirmSenha) {
            errors.push({ field: 'new-user-confirm-password', message: 'As senhas não coincidem.' });
        }

        const assignmentValidation = this.validateUserOrganizationalAssignment({
            perfil,
            organizationType,
            organizationUnitId: unitId,
            nucleusId,
            sectorId
        });
        assignmentValidation.errors.forEach((message) => {
            errors.push({ field: 'new-user-lotacao', message });
        });

        const existingUsers = window.AccessControl?.getStoredUsers?.() || [];
        const duplicateEmail = existingUsers.some((user) => String(user.email || '').toLowerCase() === String(email || '').toLowerCase());
        if (email && duplicateEmail) {
            errors.push({ field: 'new-user-email', message: 'E-mail já cadastrado.' });
        }
        const duplicateRegistration = existingUsers.some((user) => String(user.registration || '').toLowerCase() === String(registration || '').toLowerCase());
        if (registration && duplicateRegistration) {
            errors.push({ field: 'new-user-registration', message: 'Matrícula já cadastrada.' });
        }

        errors.forEach(({ field, message }) => {
            const input = document.getElementById(field);
            const fieldWrap = input?.closest('.form-field');
            if (fieldWrap) {
                fieldWrap.classList.add('is-invalid');
                const messageNode = fieldWrap.querySelector('.field-message');
                if (messageNode) {
                    messageNode.textContent = message;
                }
            }
        });

        const validFields = document.querySelectorAll('.form-field');
        validFields.forEach((field) => {
            const input = field.querySelector('input, select, textarea');
            const fieldId = input?.id || '';
            const error = errors.find((entry) => entry.field === fieldId);
            if (!error && fieldId && fieldId !== 'new-user-observations') {
                const messageNode = field.querySelector('.field-message');
                if (messageNode) messageNode.textContent = '';
            }
        });

        return errors;
    }

    static renderUserAssignmentSummary() {
        const summary = document.getElementById('new-user-assignment-summary');
        if (!summary) return;
        const perfil = document.getElementById('new-user-role')?.value || '';
        const assignment = this.buildUserOrganizationalAssignment();
        if (!perfil || perfil === 'NGE') {
            summary.innerHTML = '<strong>Lotação:</strong> NGE';
            return;
        }
        const parts = [];
        if (assignment.unitName) parts.push(assignment.unitName);
        if (assignment.nucleusName) parts.push(assignment.nucleusName);
        if (assignment.sectorName) parts.push(assignment.sectorName);
        summary.innerHTML = parts.length ? `<strong>Perfil:</strong> ${this.getRoleLabel(perfil)}<br><strong>Lotação:</strong> ${parts.join(' → ')}` : '<strong>Lotação:</strong> Lotação ainda não definida.';
    }

    static getRoleLabel(profile) {
        const map = {
            NGE: 'NGE',
            DIRETOR_INSTITUTO: 'Diretor de Instituto',
            SUBCOORDENADOR_INSTITUTO: 'Subcoordenador de Instituto',
            SUBCOORDENADOR_REGIONAL: 'Subcoordenador de Regional',
            ASSESSOR: 'Assessor',
            CHEFE_NUCLEO: 'Chefe de Núcleo',
            CHEFE_SETOR: 'Chefe de Setor',
            OPERACIONAL: 'Operacional'
        };
        return map[String(profile || '').toUpperCase()] || profile || 'Perfil';
    }

    static async createUser() {
        const errors = this.validateUserForm();
        if (errors.length) {
            this.showErrors(errors.map((entry) => entry.message));
            return;
        }

        const assignment = this.buildUserOrganizationalAssignment();
        const payload = {
            nome: document.getElementById('new-user-name')?.value.trim(),
            registration: document.getElementById('new-user-registration')?.value.trim(),
            email: document.getElementById('new-user-email')?.value.trim(),
            senha: document.getElementById('new-user-password')?.value,
            perfil: document.getElementById('new-user-role')?.value,
            ...assignment,
            active: document.getElementById('new-user-status')?.value === 'true',
            observations: document.getElementById('new-user-observations')?.value.trim()
        };

        const validation = this.validateUserOrganizationalAssignment(payload);
        if (!validation.valid) {
            this.showErrors(validation.errors);
            return;
        }

        const saveButton = document.querySelector('[data-action="save-user"]');
        if (saveButton) saveButton.disabled = true;

        try {
            const resultado = await api.registerUser(payload);
            await this.loadUsers();
            this.closeUserForm();
            this.showErrors([`Usuário criado com sucesso: ${resultado.nome || resultado.email}`]);
            setTimeout(() => this.clearErrors(), 2500);
        } catch (error) {
            console.error('Erro ao criar usuário:', error);
            this.showErrors([error.message || 'Não foi possível criar o usuário.']);
        } finally {
            if (saveButton) saveButton.disabled = false;
        }
    }

    static getFilteredUsers() {
        const usuarios = window.AccessControl?.getStoredUsers?.() || [];
        const search = document.getElementById('user-table-search')?.value.trim().toLowerCase() || '';
        const profileFilter = document.getElementById('user-table-profile-filter')?.value || '';
        const lotacaoFilter = document.getElementById('user-table-lotacao-filter')?.value || '';
        const statusFilter = document.getElementById('user-table-status-filter')?.value || '';

        return usuarios.filter((usuario) => {
            const nome = (usuario.nome || '').toLowerCase();
            const email = (usuario.email || '').toLowerCase();
            const registration = (usuario.registration || '').toLowerCase();
            const perfil = String(usuario.perfil || usuario.role || '').toUpperCase();
            const assignment = this.resolveLegacyUserAssignment(usuario);
            const status = usuario.active !== false ? 'true' : 'false';

            const matchesSearch = !search || nome.includes(search) || email.includes(search) || registration.includes(search);
            const matchesProfile = !profileFilter || perfil === profileFilter;
            const matchesLotacao = !lotacaoFilter || assignment.key === lotacaoFilter;
            const matchesStatus = !statusFilter || status === statusFilter;

            return matchesSearch && matchesProfile && matchesLotacao && matchesStatus;
        });
    }

    static renderUsersTable(usuarios) {
        const tbody = document.querySelector('#users-table tbody');
        if (!tbody) return;

        const rows = Array.isArray(usuarios) ? usuarios : [];
        const lotacaoFilter = document.getElementById('user-table-lotacao-filter');
        if (lotacaoFilter) {
            const current = lotacaoFilter.value;
            lotacaoFilter.innerHTML = '<option value="">Todas as lotações</option>' + this.getAllOrganizationalAssignments().map(item => `<option value="${item.key}">${item.path}</option>`).join('');
            lotacaoFilter.value = current;
        }
        tbody.innerHTML = rows.map((usuario) => {
            const perfil = String(usuario.perfil || usuario.role || '').toUpperCase();
            const assignment = this.resolveLegacyUserAssignment(usuario);
            const unitName = assignment.path || usuario.setor_nome || usuario.setorName || 'Não informado';
            const status = usuario.active === false ? 'Inativo' : 'Ativo';
            const roleLabel = this.getRoleLabel(perfil);

            return `
                <tr data-user-id="${usuario.id}">
                    <td>${usuario.nome || usuario.name || '-'}</td>
                    <td>${usuario.registration || '-'}</td>
                    <td>${usuario.email || '-'}</td>
                    <td>${roleLabel}</td>
                    <td>${unitName}</td>
                    <td>${status}</td>
                    <td>
                        <button class="btn btn-small btn-primary view-user-btn" type="button" data-user-id="${usuario.id}">Visualizar</button>
                        <button class="btn btn-small btn-secondary edit-user-btn" type="button" data-user-id="${usuario.id}">Editar</button>
                        <button class="btn btn-small btn-success activate-user-btn" type="button" data-user-id="${usuario.id}">${usuario.active === false ? 'Ativar' : 'Inativar'}</button>
                        <button class="btn btn-small btn-danger delete-user-btn" type="button" data-user-id="${usuario.id}">Remover</button>
                    </td>
                </tr>
            `;
        }).join('');

        tbody.querySelectorAll('.edit-user-btn').forEach((btn) => {
            btn.addEventListener('click', () => this.editUser(btn.dataset.userId, rows));
        });
        tbody.querySelectorAll('.delete-user-btn').forEach((btn) => {
            btn.addEventListener('click', async () => {
                const userId = btn.dataset.userId;
                await this.removeUser(userId);
            });
        });
        tbody.querySelectorAll('.activate-user-btn').forEach((btn) => {
            btn.addEventListener('click', async () => {
                const userId = btn.dataset.userId;
                const user = rows.find((entry) => String(entry.id) === String(userId));
                const nextStatus = user?.active === false;
                await this.setUserStatus(userId, nextStatus);
            });
        });
        tbody.querySelectorAll('.view-user-btn').forEach((btn) => {
            btn.addEventListener('click', () => {
                const userId = btn.dataset.userId;
                const user = rows.find((entry) => String(entry.id) === String(userId));
                if (user) {
                    alert(`${user.nome}\nPerfil: ${this.getRoleLabel(user.perfil || user.role || '')}\nE-mail: ${user.email}\nMatrícula: ${user.registration || '-'}`);
                }
            });
        });
    }

    static async removeUser(userId) {
        if (!userId) return;
        const confirmed = window.confirm('Deseja remover este login do sistema?');
        if (!confirmed) return;

        try {
            await api.deleteUser(userId);
            await this.loadUsers();
            this.clearErrors();
            this.showErrors(['Login removido com sucesso.']);
            setTimeout(() => this.clearErrors(), 2500);
        } catch (error) {
            const removed = window.AccessControl?.removeStoredUser?.(userId);
            if (removed) {
                await this.loadUsers();
                this.clearErrors();
                this.showErrors(['Login removido localmente com sucesso.']);
                setTimeout(() => this.clearErrors(), 2500);
                return;
            }
            console.error('Erro ao remover usuário:', error);
            this.showErrors(['Não foi possível remover o login.']);
        }
    }

    static async setUserStatus(userId, active) {
        try {
            if (typeof api.updateUserStatus === 'function') {
                await api.updateUserStatus(userId, active);
            } else {
                await api.updateUser(userId, { active });
            }
            await this.loadUsers();
        } catch (error) {
            console.error('Erro ao atualizar status do usuário:', error);
            this.showErrors(['Não foi possível alterar o status do usuário.']);
        }
    }

    static editUser(userId, usuarios = []) {
        const user = (usuarios.length ? usuarios : (window.AccessControl?.getStoredUsers?.() || [])).find((entry) => String(entry.id) === String(userId));
        if (!user) return;
        this.openUserForm('edit', userId);
        const form = document.getElementById('add-user-form');
        if (!form) return;
        document.getElementById('new-user-name').value = user.nome || '';
        document.getElementById('new-user-registration').value = user.registration || '';
        document.getElementById('new-user-email').value = user.email || '';
        document.getElementById('new-user-role').value = String(user.perfil || user.role || '');
        document.getElementById('new-user-status').value = user.active === false ? 'false' : 'true';
        document.getElementById('new-user-observations').value = user.observations || '';
        this.renderUserForm();
        const assignment = this.resolveLegacyUserAssignment(user);
        const lotacao = document.getElementById('new-user-lotacao');
        if (lotacao && assignment.key) {
            lotacao.value = assignment.key;
            this.renderUserAssignmentSummary();
        }
    }

    static async saveUser() {
        return this.createUser();
    }

    static setupUserForm() {
        const form = document.getElementById('add-user-form');
        if (!form) return;

        const toggleBtn = document.getElementById('show-add-user-form-btn');
        if (toggleBtn) {
            const newBtn = toggleBtn.cloneNode(true);
            toggleBtn.parentNode.replaceChild(newBtn, toggleBtn);
            document.getElementById('show-add-user-form-btn').addEventListener('click', (e) => {
                e.preventDefault();
                this.openUserForm('create');
            });
        }

        const cancelBtn = document.querySelector('[data-action="cancel-user-form"]');
        if (cancelBtn) {
            const newCancel = cancelBtn.cloneNode(true);
            cancelBtn.parentNode.replaceChild(newCancel, cancelBtn);
            document.querySelector('[data-action="cancel-user-form"]').addEventListener('click', (e) => {
                e.preventDefault();
                this.closeUserForm();
            });
        }

        const saveBtn = document.querySelector('[data-action="save-user"]');
        if (saveBtn) {
            const newSave = saveBtn.cloneNode(true);
            saveBtn.parentNode.replaceChild(newSave, saveBtn);
            document.querySelector('[data-action="save-user"]').addEventListener('click', (e) => {
                e.preventDefault();
                this.createUser();
            });
        }

        const roleSelect = document.getElementById('new-user-role');
        if (roleSelect) {
            roleSelect.addEventListener('change', () => this.handleUserRoleChange());
        }

        const lotacaoSelect = document.getElementById('new-user-lotacao');
        if (lotacaoSelect) {
            lotacaoSelect.addEventListener('change', () => {
                this.renderUserAssignmentSummary();
                this.validateUserForm();
            });
        }

        const orgTypeSelect = document.getElementById('new-user-organization-type');
        if (orgTypeSelect) {
            orgTypeSelect.addEventListener('change', () => this.renderUserAssignmentSummary());
        }

        const unitSelect = document.getElementById('new-user-unit');
        if (unitSelect) {
            unitSelect.addEventListener('change', () => this.renderUserAssignmentSummary());
        }

        const nucleusSelect = document.getElementById('new-user-nucleus');
        if (nucleusSelect) {
            nucleusSelect.addEventListener('change', () => this.renderUserAssignmentSummary());
        }

        const sectorSelect = document.getElementById('new-user-sector');
        if (sectorSelect) {
            sectorSelect.addEventListener('change', () => this.renderUserAssignmentSummary());
        }

        const passwordToggle = document.getElementById('toggle-password-visibility');
        if (passwordToggle) {
            passwordToggle.addEventListener('click', () => {
                const input = document.getElementById('new-user-password');
                if (!input) return;
                const nextType = input.type === 'password' ? 'text' : 'password';
                input.type = nextType;
                passwordToggle.textContent = nextType === 'password' ? 'Mostrar' : 'Ocultar';
            });
        }

        const passwordGenerate = document.getElementById('generate-password-btn');
        if (passwordGenerate) {
            passwordGenerate.addEventListener('click', () => {
                const length = 12;
                const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
                let generated = '';
                for (let index = 0; index < length; index += 1) {
                    generated += chars[Math.floor(Math.random() * chars.length)];
                }
                const passwordInput = document.getElementById('new-user-password');
                const confirmInput = document.getElementById('new-user-confirm-password');
                if (passwordInput) passwordInput.value = generated;
                if (confirmInput) confirmInput.value = generated;
            });
        }

        const searchInput = document.getElementById('user-table-search');
        if (searchInput) {
            searchInput.addEventListener('input', () => this.renderUsersTable(this.getFilteredUsers()));
        }

        const profileFilter = document.getElementById('user-table-profile-filter');
        if (profileFilter) {
            profileFilter.addEventListener('change', () => this.renderUsersTable(this.getFilteredUsers()));
        }

        const statusFilter = document.getElementById('user-table-status-filter');
        if (statusFilter) {
            statusFilter.addEventListener('change', () => this.renderUsersTable(this.getFilteredUsers()));
        }

        const lotacaoFilter = document.getElementById('user-table-lotacao-filter');
        if (lotacaoFilter) {
            lotacaoFilter.addEventListener('change', () => this.renderUsersTable(this.getFilteredUsers()));
        }

        const clearButton = document.getElementById('clear-user-filters-btn');
        if (clearButton) {
            clearButton.addEventListener('click', () => {
                if (searchInput) searchInput.value = '';
                if (profileFilter) profileFilter.value = '';
                if (lotacaoFilter) lotacaoFilter.value = '';
                if (statusFilter) statusFilter.value = '';
                this.renderUsersTable(this.getFilteredUsers());
            });
        }

        this.renderUserForm();
        this.renderUsersTable(this.getFilteredUsers());
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

    static getAllowedAssignmentTypesForRole(profile) {
        const mapping = {
            DIRETOR_INSTITUTO: ['INSTITUTO'],
            SUBCOORDENADOR_INSTITUTO: ['INSTITUTO'],
            SUBCOORDENADOR_REGIONAL: ['REGIONAL'],
            ASSESSOR: ['ASSESSORIA'],
            CHEFE_NUCLEO: ['NUCLEO'],
            CHEFE_SETOR: ['SETOR'],
            OPERACIONAL: ['SETOR']
        };
        return mapping[String(profile || '').toUpperCase()] || [];
    }

    static getAllOrganizationalAssignments() {
        if (Array.isArray(this.officialOrganizationUnits)) {
            return this.officialOrganizationUnits.map((item) => ({
                key: `${item.tipo}:${item.id}`,
                id: item.id,
                name: item.nome,
                label: this.getOrganizationTypeLabel(item.tipo),
                type: item.tipo,
                active: item.ativo !== false && item.status !== 'INACTIVE',
                parentId: item.parent_id || item.parent?.id || null,
                organizationUnitId: item.id,
                path: this.getOfficialOrganizationPath(item),
                instituteId: null,
                regionalId: null,
                advisoryId: null,
                nucleusId: item.tipo === 'NUCLEO' ? item.id : null,
                sectorId: item.tipo === 'SETOR' ? item.id : null
            }));
        }
        const org = window.AccessControl?.getStoredOrganizationData?.() || {};
        const groups = [
            ['INSTITUTO', 'Institutos', org.institutes || []],
            ['REGIONAL', 'Regionais', org.regionais || []],
            ['ASSESSORIA', 'Assessorias', org.assessorias || []],
            ['NUCLEO', 'Núcleos', org.nuclei || []],
            ['SETOR', 'Setores', org.sectors || []]
        ];
        const all = [];
        const find = (type, id) => groups.find(([groupType, , items]) => groupType === type)?.[2].find(item => String(item.id) === String(id)) || null;
        const parentUnit = item => find('INSTITUTO', item?.parentUnitId || item?.instituteId) || find('REGIONAL', item?.parentUnitId || item?.regionalId) || find('ASSESSORIA', item?.parentUnitId || item?.assessoriaId);
        const nucleus = item => find('NUCLEO', item?.nucleusId || item?.nucleoId);

        groups.forEach(([type, label, items]) => items.filter(item => item.active !== false).forEach(item => {
            const parent = type === 'NUCLEO' ? parentUnit(item) : type === 'SETOR' ? parentUnit(nucleus(item)) : null;
            const parentNucleus = type === 'SETOR' ? nucleus(item) : null;
            const path = [parent?.name, parentNucleus?.name, item.name].filter(Boolean);
            const hierarchy = path.join(' → ');
            const key = `${type}:${item.id}`;
            all.push({ key, id: item.id, type, name: item.name, label, active: item.active !== false, parentId: parent?.id || null, parentType: parent ? (['INSTITUTO', 'REGIONAL', 'ASSESSORIA'].find(parentType => find(parentType, parent.id)) || null) : null, nucleusId: parentNucleus?.id || (type === 'NUCLEO' ? item.id : null), organizationUnitId: type === 'INSTITUTO' || type === 'REGIONAL' || type === 'ASSESSORIA' ? item.id : parent?.id || null, instituteId: type === 'INSTITUTO' ? item.id : parent?.instituteId || (parent && find('INSTITUTO', parent.id)?.id) || null, regionalId: type === 'REGIONAL' ? item.id : parent?.regionalId || (parent && find('REGIONAL', parent.id)?.id) || null, advisoryId: type === 'ASSESSORIA' ? item.id : parent?.assessoriaId || (parent && find('ASSESSORIA', parent.id)?.id) || null, sectorId: type === 'SETOR' ? item.id : null, path: hierarchy || item.name });
        }));
        return all;
    }

    static getOrganizationTypeLabel(type) {
        const labels = {
            ORGAO: 'Órgãos superiores',
            CORREGEDORIA: 'Corregedoria',
            DIRETORIA: 'Diretorias',
            INSTITUTO: 'Institutos',
            SUBCOORDENACAO: 'Subcoordenações',
            ASSESSORIA: 'Assessorias',
            NUCLEO: 'Núcleos',
            SETOR: 'Setores',
            SERVICO: 'Serviços',
            LABORATORIO: 'Laboratórios',
            COMISSAO: 'Comissões',
            UNIDADE: 'Unidades'
        };
        return labels[type] || 'Unidades organizacionais';
    }

    static getOfficialOrganizationPath(item) {
        const names = [];
        let current = item;
        while (current) {
            names.unshift(current.nome);
            current = current.parent || null;
        }
        return names.join(' → ');
    }

    static getAssignmentById(key) {
        return this.getAllOrganizationalAssignments().find(item => item.key === key) || null;
    }

    static resolveLegacyUserAssignment(user = {}) {
        const type = String(user.lotacaoType || user.organizationType || '').toUpperCase();
        const id = user.lotacaoId || user.organizationUnitId || user.instituteId || user.regionalId || user.advisoryId || user.nucleusId || user.sectorId || user.setor_id;
        const exact = this.getAssignmentById(`${type}:${id}`);
        if (exact) return exact;
        const fallbackType = user.sectorId || user.setor_id ? 'SETOR' : user.nucleusId ? 'NUCLEO' : type;
        return this.getAssignmentById(`${fallbackType}:${id}`) || { key: '', path: user.setor_nome || user.setorName || 'Não informado' };
    }

    static renderUserAssignmentOptions() {
        const select = document.getElementById('new-user-lotacao');
        if (!select) return;
        const profile = document.getElementById('new-user-role')?.value || '';
        const allowed = this.getAllowedAssignmentTypesForRole(profile);
        const groups = new Map();
        this.getAllOrganizationalAssignments().forEach(item => {
            if (!groups.has(item.type)) groups.set(item.type, { label: item.label, items: [] });
            groups.get(item.type).items.push(item);
        });
        const current = select.value;
        select.innerHTML = '<option value="">Selecione a lotação</option>';
        if (String(profile).toUpperCase() === 'NGE') {
            select.insertAdjacentHTML('beforeend', '<option value="NGE:NGE">NGE — Núcleo de Gestão Estratégica</option>');
        }
        groups.forEach((group, type) => {
                const options = group.items.map(item => `<option value="${item.key}" ${allowed.length && !allowed.includes(type) ? 'disabled' : ''}>${item.name}${item.path !== item.name ? ` — ${item.path}` : ''}</option>`).join('');
            if (options) select.insertAdjacentHTML('beforeend', `<optgroup label="${group.label}">${options}</optgroup>`);
        });
        if ([...select.options].some(option => option.value === current)) select.value = current;
        this.renderUserAssignmentSummary();
    }

    static buildUserOrganizationalAssignment() {
        const perfil = document.getElementById('new-user-role')?.value || '';
        const key = document.getElementById('new-user-lotacao')?.value || '';
        if (key === 'NGE:NGE' || String(perfil).toUpperCase() === 'NGE') return { perfil, organizationType: '', organizationUnitId: null, instituteId: null, regionalId: null, advisoryId: null, nucleusId: null, sectorId: null, lotacaoId: null, lotacaoType: 'NGE', unitName: 'NGE — Núcleo de Gestão Estratégica', nucleusName: null, sectorName: null };
        const assignment = this.getAssignmentById(key);
        if (!assignment) return { perfil, organizationType: '', organizationUnitId: null, instituteId: null, regionalId: null, advisoryId: null, nucleusId: null, sectorId: null, lotacaoId: null, lotacaoType: '' };
        return { perfil, organizationType: assignment.type, organizationUnitId: assignment.organizationUnitId, instituteId: assignment.instituteId, regionalId: assignment.regionalId, advisoryId: assignment.advisoryId, nucleusId: assignment.nucleusId, sectorId: assignment.sectorId, lotacaoId: assignment.id, lotacaoType: assignment.type, unitName: assignment.path, nucleusName: assignment.name, sectorName: assignment.type === 'SETOR' ? assignment.name : null };
    }

    static validateUserOrganizationalAssignment(userData = {}) {
        const profile = String(userData.perfil || '').toUpperCase();
        if (profile === 'NGE') return { valid: true, errors: [] };
        const key = userData.lotacaoKey || document.getElementById('new-user-lotacao')?.value || '';
        const assignment = this.getAssignmentById(key);
        if (!assignment) return { valid: false, errors: ['Selecione a lotação do usuário.'] };
        if (!assignment.active) return { valid: false, errors: ['Selecione uma lotação ativa.'] };
        const allowed = this.getAllowedAssignmentTypesForRole(profile);
        if (allowed.length && !allowed.includes(assignment.type)) return { valid: false, errors: ['A lotação selecionada não é compatível com o perfil escolhido.'] };
        return { valid: true, errors: [] };
    }

    static renderUserForm() {
        const role = document.getElementById('new-user-role');
        const lotacao = document.getElementById('new-user-lotacao');
        if (!role || !lotacao) return;
        this.renderUserAssignmentOptions();
        const profile = role.value;
        lotacao.required = profile !== 'NGE';
        lotacao.setAttribute('aria-required', profile !== 'NGE' ? 'true' : 'false');
        lotacao.closest('.form-field')?.classList.toggle('field-required', profile !== 'NGE');
    }

    static renderUserAssignmentSummary() {
        const summary = document.getElementById('new-user-assignment-summary');
        if (!summary) return;
        const assignment = this.buildUserOrganizationalAssignment();
        summary.innerHTML = assignment.lotacaoId || assignment.lotacaoType === 'NGE'
            ? `<strong>Perfil:</strong> ${this.getRoleLabel(assignment.perfil)}<br><strong>Lotação definida:</strong> ${assignment.unitName || assignment.path || 'NGE — Núcleo de Gestão Estratégica'}`
            : '<strong>Lotação:</strong> Lotação ainda não definida.';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('add-user-form');
    if (form) {
        form.style.display = 'none';
    }

    // IMPORTANTE: Os event listeners principais são adicionados por setupUserForm() 
    // quando loadSettings() é chamado. Não adicionar novamente aqui para evitar conflitos.
});
