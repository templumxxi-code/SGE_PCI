// ============================================================================
// SMP PCI - Aplicação Principal
// ============================================================================

const APP_INFO = {
    name: 'SGE PCI/RN',
    fullName: 'Sistema de Gestão Estratégica',
    version: '1.0.0',
    developer: 'Núcleo de Gestão Estratégica — NGE',
    institution: 'Polícia Científica do Rio Grande do Norte'
};

class SPMApp {
    constructor() {
        this.currentUser = null;
        this.isAuthenticated = false;
        this.apiUrl = this.resolveApiUrl();
        this.init();
    }

    getCurrentUserFromStorage() {
        return window.AccessControl?.getCurrentUser?.() || null;
    }

    clearStaleSession() {
        localStorage.removeItem('smp_token');
        localStorage.removeItem('sge_pci_current_user');
        const loginSection = document.getElementById('login-section');
        const dashboardSection = document.getElementById('dashboard-section');
        if (loginSection) loginSection.classList.add('active');
        if (dashboardSection) dashboardSection.classList.remove('active');
    }

    /**
     * Retorna a URL base da API, mesmo quando o app é aberto diretamente do arquivo
     */
    resolveApiUrl() {
        if (window.location.protocol === 'file:') {
            return 'http://localhost:3000/api';
        }
        return `${window.location.origin}/api`;
    }

    isRunningFromFile() {
        return window.location.protocol === 'file:';
    }

    /**
     * Inicializar aplicação
     */
    init() {
        this.setupEventListeners();
        this.updateAppVersion();
        this.checkEnvironment();
        this.checkResetPasswordFlow();
        this.checkAuthentication();
    }

    updateAppVersion() {
        const versionLabel = document.getElementById('app-version-label');
        if (versionLabel) {
            versionLabel.textContent = `${APP_INFO.name} — Versão ${APP_INFO.version}`;
        }
    }

    setFieldError(fieldId, message) {
        const field = document.getElementById(fieldId);
        const errorField = field ? field.closest('.form-group')?.querySelector('.field-message') : null;
        if (!field || !errorField) return;

        field.setAttribute('aria-invalid', message ? 'true' : 'false');
        errorField.textContent = message || '';
        errorField.classList.toggle('is-visible', Boolean(message));
    }

    clearFieldErrors() {
        this.setFieldError('email-input', '');
        this.setFieldError('password-input', '');
        const alert = document.getElementById('login-error-message');
        if (alert) {
            alert.textContent = '';
            alert.classList.remove('visible');
        }
    }

    setLoginButtonState(isLoading) {
        const button = document.getElementById('login-submit-btn');
        if (!button) return;

        button.disabled = isLoading;
        button.textContent = isLoading ? 'Entrando...' : 'Entrar';
        button.setAttribute('aria-busy', String(isLoading));
    }

    async checkEnvironment() {
        try {
            await fetch(`${this.apiUrl}/health`);
        } catch (error) {
            console.warn('Backend não encontrado:', error);
            if (window.location.protocol === 'file:') {
                alert('O sistema está sendo aberto como arquivo local. Rode `npm run dev` e abra a aplicação em http://localhost:3000 para a melhor experiência.');
            }
        }
    }

    /**
     * Verificar se há fluxo de reset de senha na URL
     */
    checkResetPasswordFlow() {
        const params = new URLSearchParams(window.location.search);
        const resetToken = params.get('reset');

        if (resetToken) {
            // Mostrar a seção de reset de senha
            const loginSection = document.getElementById('login-section');
            const resetSection = document.getElementById('reset-password-section');
            const dashboardSection = document.getElementById('dashboard-section');

            if (loginSection) loginSection.classList.remove('active');
            if (resetSection) {
                resetSection.style.display = 'block';
                // Pré-preencher o token
                document.getElementById('reset-token-input').value = resetToken;
            }
            if (dashboardSection) dashboardSection.classList.remove('active');
        }
    }

    async checkEnvironment() {
        try {
            await fetch(`${this.apiUrl}/health`);
        } catch (error) {
            console.warn('Backend não encontrado:', error);
            if (window.location.protocol === 'file:') {
                alert('O sistema está sendo aberto como arquivo local. Rode `npm run dev` e abra a aplicação em http://localhost:3000 para a melhor experiência.');
            }
        }
    }

    /**
     * Setup de event listeners globais
     */
    setupEventListeners() {
        // Logout
        const logoutBtn = document.getElementById('logout-btn');
        const logoutBtnVisible = document.getElementById('logout-btn-visible');

        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.logout());
        }
        if (logoutBtnVisible) {
            logoutBtnVisible.addEventListener('click', () => this.logout());
        }

        // Recuperação de Senha
        const btnForgotPassword = document.getElementById('btn-forgot-password');
        if (btnForgotPassword) {
            btnForgotPassword.addEventListener('click', () => this.showForgotPasswordModal());
        }

        const btnSendRecoveryEmail = document.getElementById('btn-send-recovery-email');
        if (btnSendRecoveryEmail) {
            btnSendRecoveryEmail.addEventListener('click', () => this.sendRecoveryEmail());
        }

        const btnBackToLogin = document.getElementById('btn-back-to-login');
        if (btnBackToLogin) {
            btnBackToLogin.addEventListener('click', () => this.backToLogin());
        }

        const resetPasswordForm = document.getElementById('reset-password-form');
        if (resetPasswordForm) {
            resetPasswordForm.addEventListener('submit', (e) => this.handleResetPassword(e));
        }

        // Modal close buttons
        document.querySelectorAll('[data-dismiss="modal"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                if (modal) {
                    modal.style.display = 'none';
                }
            });
        });

        // Abas de navegação
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => this.switchTab(e));
        });

        // Login form
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        const togglePasswordBtn = document.getElementById('btn-toggle-password');
        const passwordInput = document.getElementById('password-input');
        if (togglePasswordBtn && passwordInput) {
            togglePasswordBtn.addEventListener('click', () => {
                const isPassword = passwordInput.type === 'password';
                passwordInput.type = isPassword ? 'text' : 'password';
                togglePasswordBtn.setAttribute('aria-label', isPassword ? 'Ocultar senha' : 'Mostrar senha');
                togglePasswordBtn.setAttribute('aria-pressed', String(isPassword));
                togglePasswordBtn.textContent = isPassword ? '🙈' : '👁';
                passwordInput.focus();
            });
        }

        // Header search box (sync with process list filter)
        const headerSearchInput = document.getElementById('process-search-header');
        if (headerSearchInput) {
            headerSearchInput.addEventListener('input', (event) => {
                const searchValue = event.target.value || '';
                const sideSearch = document.getElementById('process-search');
                if (sideSearch) {
                    sideSearch.value = searchValue;
                    if (typeof ProcessManager?.renderProcesses === 'function') {
                        ProcessManager.renderProcesses(ProcessManager.getStoredProcesses());
                    }
                }
            });
        }

        // Dropdown menu
        const userMenuBtn = document.getElementById('user-menu-btn');
        if (userMenuBtn) {
            userMenuBtn.addEventListener('click', () => this.toggleUserMenu());
        }

        // Fechar dropdown ao clicar fora
        document.addEventListener('click', (e) => {
            const userDropdown = document.querySelector('.user-dropdown');
            if (userDropdown && userMenuBtn && !userDropdown.contains(e.target) && !userMenuBtn.contains(e.target)) {
                userDropdown.classList.remove('active');
            }
        });
    }

    /**
     * Verificar autenticação
     */
    async checkAuthentication() {
        const token = this.getToken();
        const loginSection = document.getElementById('login-section');
        const dashboardSection = document.getElementById('dashboard-section');

        const storedUser = this.getCurrentUserFromStorage();
        const staleStoredUser = storedUser && (
            String(storedUser.email || '').toLowerCase() === 'setor@pci.rn.gov.br'
            || String(storedUser.email || '').toLowerCase() === 'x@y.com'
            || String(storedUser.email || '').toLowerCase() === 'novo@pci.rn.gov.br'
            || String(storedUser.email || '').toLowerCase() === 'demo@pci.rn.gov.br'
        );

        if (staleStoredUser) {
            this.clearStaleSession();
            return;
        }

        if (token) {
            try {
                const response = await fetch(`${this.apiUrl}/auth/perfil`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (response.ok) {
                    this.currentUser = await response.json();
                    this.currentUser.perfil = this.normalizeProfile(this.currentUser.perfil);
                    this.isAuthenticated = true;
                    window.AccessControl?.saveCurrentUser?.(this.currentUser);
                    this.showDashboard();
                } else {
                    this.logout();
                }
            } catch (error) {
                console.error('Erro ao verificar autenticação:', error);
                this.logout();
            }
        } else if (storedUser) {
            this.currentUser = storedUser;
            this.currentUser.perfil = this.normalizeProfile(this.currentUser.perfil || this.currentUser.role);
            this.isAuthenticated = true;
            this.showDashboard();
        } else {
            loginSection.classList.add('active');
            dashboardSection.classList.remove('active');
        }
    }

    /**
     * Fazer login
     */
    async handleLogin(event) {
        event.preventDefault();

        const emailInput = document.getElementById('email-input');
        const passwordInput = document.getElementById('password-input');
        const email = (emailInput?.value || '').trim();
        const senha = passwordInput?.value || '';

        this.clearFieldErrors();

        if (!email) {
            this.setFieldError('email-input', 'Informe seu e-mail institucional.');
            emailInput?.focus();
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            this.setFieldError('email-input', 'Informe um e-mail válido.');
            emailInput?.focus();
            return;
        }

        if (!senha) {
            this.setFieldError('password-input', 'Informe sua senha.');
            passwordInput?.focus();
            return;
        }

        this.setLoginButtonState(true);

        try {
            const response = await fetch(`${this.apiUrl}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, senha })
            });

            if (response.ok) {
                const data = await response.json();
                this.setToken(data.token);
                this.currentUser = data.usuario;
                this.currentUser.perfil = this.normalizeProfile(this.currentUser.perfil);
                this.isAuthenticated = true;
                window.AccessControl?.saveCurrentUser?.(this.currentUser);
                this.showDashboard();
                document.getElementById('login-form').reset();
                return;
            }

            const error = await response.json().catch(() => ({}));
            const message = String(error.error || 'E-mail ou senha inválidos.');
            const lowerMessage = message.toLowerCase();

            if (lowerMessage.includes('inativo') || lowerMessage.includes('ativo')) {
                this.setFieldError('password-input', 'Este usuário está inativo. Entre em contato com o administrador do sistema.');
            } else {
                const alert = document.getElementById('login-error-message');
                if (alert) {
                    alert.textContent = 'E-mail ou senha inválidos.';
                    alert.classList.add('visible');
                }
                this.setFieldError('password-input', 'E-mail ou senha inválidos.');
            }
        } catch (error) {
            console.error('Erro ao fazer login:', error);
            const alert = document.getElementById('login-error-message');
            if (alert) {
                alert.textContent = this.isRunningFromFile()
                    ? 'Não foi possível conectar ao servidor. Abra a aplicação em http://localhost:3000.'
                    : 'Não foi possível concluir o login. Verifique a conexão com o servidor.';
                alert.classList.add('visible');
            }
        } finally {
            this.setLoginButtonState(false);
        }
    }

    /**
     * Logout
     */
    logout() {
        this.removeToken();
        this.currentUser = null;
        this.isAuthenticated = false;
        window.AccessControl?.saveCurrentUser?.(null);
        localStorage.removeItem('sge_pci_current_user');
        if (window.NotificationCenter?.closeNotificationDropdown) {
            window.NotificationCenter.closeNotificationDropdown();
        }

        const loginSection = document.getElementById('login-section');
        const dashboardSection = document.getElementById('dashboard-section');

        loginSection.classList.add('active');
        dashboardSection.classList.remove('active');
        document.getElementById('login-form').reset();
        if (window.NotificationCenter?.renderNotificationBadge) {
            window.NotificationCenter.renderNotificationBadge();
        }
    }

    /**
     * Mostrar dashboard
     */
    showDashboard() {
        const loginSection = document.getElementById('login-section');
        const dashboardSection = document.getElementById('dashboard-section');

        loginSection.classList.remove('active');
        dashboardSection.classList.add('active');

        // Atualizar informações do usuário
        this.updateUserInfo();
        window.AccessControl?.saveCurrentUser?.(this.currentUser);
        if (window.NotificationCenter?.initNotificationCenter) {
            window.NotificationCenter.initNotificationCenter();
        }

        // Ajustar navegação e abas conforme perfil
        this.applyRolePermissions();
        this.prepareCreateProcessForm();
        ProcessManager.initializeCreateProcessForm();

        // Carregar dados iniciais
        this.loadDashboardData();
    }

    /**
     * Atualizar informações do usuário na UI
     */
    updateUserInfo() {
        const userNameElement = document.querySelector('.user-name');
        const userRoleElement = document.querySelector('.user-role');
        const profileSummary = window.AccessControl?.normalizeUser?.(this.currentUser);

        if (userNameElement) userNameElement.textContent = this.currentUser.nome || 'Usuário';
        if (userRoleElement) userRoleElement.textContent = profileSummary?.profileLabel || (this.currentUser.perfil === 'NGE' ? 'NGE (Administrador)' : 'Setor/Núcleo');
    }

    normalizeProfile(profile) {
        return window.AccessControl?.normalizeProfile?.(profile) || (profile === 'NGE_ADMIN' ? 'NGE' : profile);
    }

    /**
     * Ajustar abas e menus de acordo com o perfil do usuário
     */
    applyRolePermissions() {
        const normalizedUser = window.AccessControl?.normalizeUser?.(this.currentUser) || this.currentUser;
        const visibleTabs = window.AccessControl?.getVisibleTabs?.(normalizedUser) || [];

        document.querySelectorAll('.nav-item').forEach((item) => {
            item.classList.remove('active');
            const tab = item.dataset.tab;
            const allowed = window.AccessControl?.canAccessSection?.(normalizedUser, tab) || visibleTabs.includes(tab);
            item.classList.toggle('hidden', !allowed);
        });

        const allTabs = document.querySelectorAll('.tab-content');
        allTabs.forEach((tab) => {
            tab.classList.remove('active');
        });

        const defaultTab = visibleTabs.includes('dashboard-nge') ? 'dashboard-nge' : (visibleTabs.includes('dashboard-setor') ? 'dashboard-setor' : visibleTabs[0] || 'dashboard-setor');
        document.getElementById(defaultTab)?.classList.add('active');
        document.querySelector(`[data-tab="${defaultTab}"]`)?.classList.add('active');
    }

    /**
     * Preparar formulário de novo processo para o perfil Setor
     */
    prepareCreateProcessForm() {
        const setorSelect = document.getElementById('setor-select');
        if (!setorSelect) return;

        const normalizedUser = window.AccessControl?.normalizeUser?.(this.currentUser) || this.currentUser;
        const canSelectUnit = normalizedUser?.perfil !== 'OPERACIONAL' && normalizedUser?.perfil !== 'CHEFE_SETOR';

        if (!canSelectUnit) {
            setorSelect.innerHTML = `
                <option value="${normalizedUser?.unitId || this.currentUser?.setor_id || ''}">Setor do usuário</option>
            `;
            setorSelect.value = normalizedUser?.unitId || this.currentUser?.setor_id || '';
            setorSelect.disabled = true;
        } else {
            setorSelect.disabled = false;
        }
    }

    /**
     * Carregar dados do dashboard
     */
    async loadDashboardData() {
        try {
            if (typeof ProcessManager?.loadProcesses === 'function') {
                ProcessManager.loadProcesses();
            }
            if (typeof IndicatorManager?.loadIndicators === 'function') {
                IndicatorManager.loadIndicators();
            }

            if (window.AccessControl?.isNGE?.(this.currentUser)) {
                if (typeof DashboardManager?.loadNGEDashboard === 'function') {
                    DashboardManager.loadNGEDashboard();
                }
            } else {
                if (typeof DashboardManager?.loadSetorDashboard === 'function') {
                    DashboardManager.loadSetorDashboard();
                }
            }
        } catch (error) {
            console.error('Erro ao carregar dados do dashboard:', error);
        }
    }

    /**
     * Trocar de aba
     */
    switchTab(event) {
        const tabName = event.currentTarget.dataset.tab;
        const normalizedUser = window.AccessControl?.normalizeUser?.(this.currentUser) || this.currentUser;
        const allowedTabs = window.AccessControl?.getVisibleTabs?.(normalizedUser) || [];

        if (!window.AccessControl?.canAccessSection?.(normalizedUser, tabName) && !allowedTabs.includes(tabName)) {
            this.showAccessDenied();
            return;
        }

        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
        });

        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });

        const selectedTab = document.getElementById(tabName);
        if (selectedTab) {
            selectedTab.classList.add('active');
        }

        event.currentTarget.classList.add('active');
        this.loadTabData(tabName);
    }

    showAccessDenied() {
        const activeTab = document.querySelector('.tab-content.active');
        const targetTab = document.getElementById('meus-processos') || document.getElementById('dashboard-setor');
        if (targetTab) {
            document.querySelectorAll('.tab-content').forEach((tab) => tab.classList.remove('active'));
            targetTab.classList.add('active');
            document.querySelectorAll('.nav-item').forEach((item) => item.classList.remove('active'));
            document.querySelector('[data-tab="meus-processos"]')?.classList.add('active');
        }
        if (typeof notificar === 'function') {
            notificar('Você não possui permissão para acessar esta área.', 'error');
        }
    }

    /**
     * Carregar dados específicos da aba
     */
    loadTabData(tabName) {
        switch (tabName) {
            case 'dashboard-nge':
                if (typeof DashboardManager?.loadNGEDashboard === 'function') {
                    DashboardManager.loadNGEDashboard();
                }
                break;
            case 'dashboard-setor':
                if (typeof DashboardManager?.loadSetorDashboard === 'function') {
                    DashboardManager.loadSetorDashboard();
                }
                break;
            case 'meus-processos':
                if (typeof ProcessManager?.loadProcesses === 'function') {
                    ProcessManager.loadProcesses();
                }
                break;
            case 'indicadores':
                if (typeof IndicatorManager?.loadIndicators === 'function') {
                    IndicatorManager.loadIndicators();
                }
                break;
            case 'relatorios':
                if (typeof ReportManager?.loadReports === 'function') {
                    ReportManager.loadReports();
                }
                break;
            case 'configuracoes':
                if (typeof SettingsManager?.loadSettings === 'function') {
                    SettingsManager.loadSettings();
                }
                break;
        }
    }

    /**
     * Toggle do menu do usuário
     */
    toggleUserMenu() {
        const userDropdown = document.querySelector('.user-dropdown');
        const btnDropdown = document.getElementById('user-menu-btn');

        userDropdown.classList.toggle('active');
        btnDropdown.classList.toggle('active');
    }

    /**
     * Armazenar token
     */
    setToken(token) {
        localStorage.setItem('smp_token', token);
    }

    /**
     * Recuperar token
     */
    getToken() {
        return localStorage.getItem('smp_token');
    }

    /**
     * Remover token
     */
    removeToken() {
        localStorage.removeItem('smp_token');
    }

    /**
     * Mostrar modal de recuperação de senha
     */
    showForgotPasswordModal() {
        const modal = document.getElementById('forgot-password-modal');
        if (modal) {
            modal.style.display = 'flex';
            // Reset do modal para step 1
            document.getElementById('forgot-password-step1').style.display = 'block';
            document.getElementById('forgot-password-step2').style.display = 'none';
            document.getElementById('recovery-email-input').value = '';
        }
    }

    /**
     * Enviar email de recuperação
     */
    async sendRecoveryEmail() {
        const email = document.getElementById('recovery-email-input').value.trim();

        if (!email) {
            alert('Por favor, digite um e-mail válido.');
            return;
        }

        try {
            const result = await api.requestPasswordReset(email);
            
            // Mostrar token e link para o dev
            document.getElementById('recovery-token-display').textContent = `Token: ${result.token}`;
            document.getElementById('recovery-link-display').textContent = `${window.location.origin}/?reset=${result.token}`;
            document.getElementById('recovery-link-display').href = `${window.location.origin}/?reset=${result.token}`;

            // Mostrar step 2
            document.getElementById('forgot-password-step1').style.display = 'none';
            document.getElementById('forgot-password-step2').style.display = 'block';
        } catch (error) {
            alert('Erro ao solicitar recuperação: ' + error.message);
        }
    }

    /**
     * Voltar ao login
     */
    backToLogin() {
        const modal = document.getElementById('forgot-password-modal');
        const resetSection = document.getElementById('reset-password-section');
        const loginSection = document.getElementById('login-section');

        if (modal) modal.style.display = 'none';
        if (resetSection) resetSection.style.display = 'none';
        if (loginSection) loginSection.style.display = 'block';
        loginSection.classList.add('active');

        // Reset do formulário
        const resetForm = document.getElementById('reset-password-form');
        if (resetForm) resetForm.reset();
    }

    /**
     * Redefinir senha
     */
    async handleResetPassword(event) {
        event.preventDefault();

        const token = document.getElementById('reset-token-input').value.trim();
        const email = document.getElementById('reset-email-input').value.trim();
        const novaSenha = document.getElementById('reset-new-password-input').value;
        const confirmaSenha = document.getElementById('reset-confirm-password-input').value;

        if (novaSenha !== confirmaSenha) {
            alert('As senhas não coincidem!');
            return;
        }

        if (novaSenha.length < 6) {
            alert('A senha deve ter no mínimo 6 caracteres.');
            return;
        }

        try {
            await api.resetPassword(email, token, novaSenha);
            alert('Senha redefinida com sucesso! Faça login com sua nova senha.');
            this.backToLogin();
        } catch (error) {
            alert('Erro ao redefinir senha: ' + error.message);
        }
    }
}

const NotificationCenter = {
    storageKey: 'sge_pci_notifications',
    filter: 'ALL',
    initialized: false,
    allowedEvents: [
        'PROCESSO_CRIADO',
        'PROCESSO_SUBMETIDO',
        'ATIVIDADE_SUBMETIDA',
        'ATIVIDADE_AVANCADA',
        'PROCESSO_APROVADO',
        'PROCESSO_DEVOLVIDO',
        'PROCESSO_HOMOLOGADO',
        'PROCESSO_ARQUIVADO',
        'INDICADOR_CADASTRADO',
        'CONTRA_MEDIDA_CADASTRADA',
        'USUARIO_CRIADO',
        'USUARIO_ATUALIZADO',
        'USUARIO_INATIVADO',
        'PRAZO_VENCIDO',
        'SISTEMA'
    ],

    normalizeNotification(item) {
        if (!item || typeof item !== 'object') return null;
        const normalized = { ...item };
        normalized.id = normalized.id || `notification-${Date.now()}-${Math.random().toString(16).slice(2)}`;
        normalized.category = normalized.category || 'SYSTEM';
        normalized.priority = normalized.priority || 'INFO';
        normalized.read = Boolean(normalized.read);
        normalized.archived = Boolean(normalized.archived);
        normalized.createdAt = normalized.createdAt || new Date().toISOString();
        normalized.readAt = normalized.readAt || null;
        normalized.sourceEvent = normalized.sourceEvent || normalized.eventType || 'SISTEMA';
        return normalized;
    },

    loadNotifications() {
        try {
            const raw = localStorage.getItem(this.storageKey);
            const list = raw ? JSON.parse(raw) : [];
            return Array.isArray(list) ? list.map((item) => this.normalizeNotification(item)).filter(Boolean) : [];
        } catch (error) {
            return [];
        }
    },

    saveNotifications(items) {
        localStorage.setItem(this.storageKey, JSON.stringify((Array.isArray(items) ? items : []).map((item) => this.normalizeNotification(item)).filter(Boolean)));
    },

    notificationExists(dedupKey) {
        if (!dedupKey) return false;
        return this.loadNotifications().some((notification) => String(notification.dedupKey || '') === String(dedupKey));
    },

    getCurrentUser() {
        return window.app?.currentUser || window.AccessControl?.getCurrentUser?.() || null;
    },

    isKnownEventSource(sourceEvent) {
        return this.allowedEvents.includes(String(sourceEvent || '').trim().toUpperCase());
    },

    resolveCategoryFromEvent(eventType) {
        const type = String(eventType || '').trim().toUpperCase();
        if (type.includes('APROV')) return 'APPROVAL';
        if (type.includes('PRAZO') || type.includes('ALERT')) return 'ALERT';
        if (type.includes('INDICADOR') || type.includes('CONTRA') || type.includes('USUARIO') || type.includes('PROCESSO')) return 'UPDATE';
        return 'SYSTEM';
    },

    createNotification(payload = {}) {
        const safePayload = { ...payload };
        const sourceEvent = String(safePayload.sourceEvent || safePayload.eventType || 'SISTEMA').trim().toUpperCase();
        if (!this.isKnownEventSource(sourceEvent)) {
            return null;
        }

        const dedupKey = safePayload.dedupKey || [
            sourceEvent,
            safePayload.processId || '',
            safePayload.recipientUserId || safePayload.targetUserId || '',
            safePayload.entityId || safePayload.targetProcessId || safePayload.indicatorId || '',
            safePayload.createdAt || new Date().toISOString()
        ].join(':');

        if (this.notificationExists(dedupKey)) {
            return null;
        }

        const normalized = this.normalizeNotification({
            ...safePayload,
            id: safePayload.id || `notification-${Date.now()}-${Math.random().toString(16).slice(2)}`,
            recipientUserId: safePayload.recipientUserId || null,
            recipientRole: safePayload.recipientRole || null,
            organizationType: safePayload.organizationType || null,
            organizationUnitId: safePayload.organizationUnitId || null,
            instituteId: safePayload.instituteId || null,
            regionalId: safePayload.regionalId || null,
            advisoryId: safePayload.advisoryId || null,
            nucleusId: safePayload.nucleusId || null,
            sectorId: safePayload.sectorId || null,
            processId: safePayload.processId || null,
            indicatorId: safePayload.indicatorId || null,
            phaseCode: safePayload.phaseCode || null,
            activityCode: safePayload.activityCode || null,
            category: this.resolveCategoryFromEvent(sourceEvent),
            priority: safePayload.priority || 'INFO',
            title: safePayload.title || 'Notificação',
            message: safePayload.message || '',
            read: Boolean(safePayload.read),
            archived: Boolean(safePayload.archived),
            targetSection: safePayload.targetSection || null,
            targetProcessId: safePayload.targetProcessId || safePayload.processId || null,
            targetPhaseCode: safePayload.targetPhaseCode || safePayload.phaseCode || null,
            targetActivityCode: safePayload.targetActivityCode || safePayload.activityCode || null,
            targetIndicatorId: safePayload.targetIndicatorId || safePayload.indicatorId || null,
            createdAt: safePayload.createdAt || new Date().toISOString(),
            readAt: safePayload.readAt || null,
            dedupKey,
            eventType: sourceEvent,
            sourceEvent
        });

        const all = this.loadNotifications();
        all.unshift(normalized);
        this.saveNotifications(all);
        return normalized;
    },

    emitNotification(eventType, payload = {}) {
        const sourceEvent = String(payload.sourceEvent || eventType || '').trim().toUpperCase();
        if (!this.isKnownEventSource(sourceEvent)) {
            return null;
        }

        const currentUser = payload.currentUser || this.getCurrentUser();
        const userProfile = currentUser ? (window.AccessControl?.normalizeUser?.(currentUser) || currentUser) : null;
        const item = this.createNotification({
            ...payload,
            sourceEvent,
            eventType: sourceEvent,
            category: payload.category || this.resolveCategoryFromEvent(sourceEvent),
            recipientUserId: payload.recipientUserId || (currentUser ? currentUser.id : null),
            recipientRole: payload.recipientRole || (userProfile ? userProfile.accessProfileKey || userProfile.perfil : null),
            read: Boolean(payload.read),
            archived: Boolean(payload.archived),
            createdAt: payload.createdAt || new Date().toISOString(),
            dedupKey: payload.dedupKey || [
                sourceEvent,
                payload.processId || '',
                payload.recipientUserId || (currentUser ? currentUser.id : ''),
                payload.entityId || payload.targetProcessId || payload.indicatorId || '',
                payload.createdAt || new Date().toISOString()
            ].join(':')
        });

        this.renderNotificationBadge();
        return item;
    },

    canUserReceiveNotification(user, notification) {
        if (!user || !notification) return false;
        const normalizedUser = window.AccessControl?.normalizeUser?.(user) || user;
        if (String(normalizedUser.accessProfileKey || normalizedUser.perfil || '').toUpperCase() === 'NGE_ADMIN') {
            return !notification.archived;
        }

        if (notification.recipientUserId && String(notification.recipientUserId) !== String(normalizedUser.id)) {
            return false;
        }

        if (notification.recipientRole && String(notification.recipientRole).toUpperCase() !== String(normalizedUser.accessProfileKey || normalizedUser.perfil || '').toUpperCase()) {
            return false;
        }

        if (notification.processId) {
            const processList = JSON.parse(localStorage.getItem('sge_pci_processos') || '[]');
            const process = Array.isArray(processList) ? processList.find((item) => String(item.id) === String(notification.processId)) : null;
            if (process && window.AccessControl?.canViewProcess && !window.AccessControl.canViewProcess(normalizedUser, process)) {
                return false;
            }
        }

        if (notification.instituteId && normalizedUser.instituteId && String(normalizedUser.instituteId) !== String(notification.instituteId)) {
            return false;
        }
        if (notification.regionalId && normalizedUser.regionalId && String(normalizedUser.regionalId) !== String(notification.regionalId)) {
            return false;
        }
        if (notification.advisoryId && normalizedUser.advisoryId && String(normalizedUser.advisoryId) !== String(notification.advisoryId)) {
            return false;
        }
        if (notification.nucleusId && normalizedUser.nucleusId && String(normalizedUser.nucleusId) !== String(notification.nucleusId)) {
            return false;
        }
        if (notification.sectorId && normalizedUser.sectorId && String(normalizedUser.sectorId) !== String(notification.sectorId)) {
            return false;
        }

        return !notification.archived;
    },

    getNotificationsForUser(user = this.getCurrentUser()) {
        const currentUser = user || this.getCurrentUser();
        if (!currentUser) return [];
        return this.loadNotifications().filter((notification) => this.canUserReceiveNotification(currentUser, notification));
    },

    getVisibleNotifications() {
        return this.getNotificationsForUser(this.getCurrentUser());
    },

    getUnreadNotificationCount(user = this.getCurrentUser()) {
        return this.getNotificationsForUser(user).filter((notification) => !notification.read).length;
    },

    getPriorityLabel(priority) {
        const labels = { CRITICAL: 'Crítica', WARNING: 'Atenção', INFO: 'Informativa', SUCCESS: 'Sucesso' };
        return labels[String(priority || 'INFO').toUpperCase()] || 'Informativa';
    },

    getCategoryLabel(category) {
        const labels = { APPROVAL: 'Aprovações', ALERT: 'Alertas', UPDATE: 'Atualizações', SYSTEM: 'Sistema' };
        return labels[String(category || 'SYSTEM').toUpperCase()] || 'Sistema';
    },

    formatRelativeTime(dateString) {
        if (!dateString) return 'agora';
        const diffMs = Date.now() - new Date(dateString).getTime();
        const diffMinutes = Math.max(0, Math.round(diffMs / 60000));
        if (diffMinutes < 1) return 'agora';
        if (diffMinutes < 60) return `há ${diffMinutes} min`;
        const diffHours = Math.round(diffMinutes / 60);
        if (diffHours < 24) return `há ${diffHours} h`;
        const diffDays = Math.round(diffHours / 24);
        return `há ${diffDays} dia(s)`;
    },

    renderNotificationBadge() {
        const badge = document.querySelector('.notification-badge');
        const button = document.querySelector('.btn-notification');
        const count = this.getUnreadNotificationCount();
        if (!badge || !button) return;

        const display = count > 99 ? '99+' : String(count);
        badge.textContent = display;
        badge.classList.toggle('visible', count > 0);
        badge.setAttribute('aria-label', `${count} notificações não lidas`);
        button.setAttribute('aria-label', `Notificações, ${count} não lidas`);
    },

    filterNotifications(notifications, filter = this.filter) {
        if (!Array.isArray(notifications)) return [];
        const activeFilter = filter || 'ALL';
        if (activeFilter === 'ALL') return notifications;
        if (activeFilter === 'UNREAD') return notifications.filter((item) => !item.read);
        if (activeFilter === 'READ') return notifications.filter((item) => item.read);
        return notifications.filter((item) => String(item.category).toUpperCase() === String(activeFilter).toUpperCase());
    },

    renderNotificationDropdown() {
        const dropdown = document.getElementById('notification-dropdown');
        const currentUser = this.getCurrentUser();
        if (!dropdown) return;

        const notifications = this.getNotificationsForUser(currentUser).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        const visible = this.filterNotifications(notifications, this.filter);

        dropdown.innerHTML = `
            <div class="notification-header">
                <h3>Notificações</h3>
                <div class="notification-filters">
                    <button type="button" class="notification-filter-btn ${this.filter === 'ALL' ? 'active' : ''}" data-filter="ALL">Todas</button>
                    <button type="button" class="notification-filter-btn ${this.filter === 'UNREAD' ? 'active' : ''}" data-filter="UNREAD">Não lidas</button>
                    <button type="button" class="notification-filter-btn ${this.filter === 'APPROVAL' ? 'active' : ''}" data-filter="APPROVAL">Aprovações</button>
                    <button type="button" class="notification-filter-btn ${this.filter === 'ALERT' ? 'active' : ''}" data-filter="ALERT">Alertas</button>
                    <button type="button" class="notification-filter-btn ${this.filter === 'UPDATE' ? 'active' : ''}" data-filter="UPDATE">Atualizações</button>
                    <button type="button" class="notification-filter-btn ${this.filter === 'SYSTEM' ? 'active' : ''}" data-filter="SYSTEM">Sistema</button>
                </div>
            </div>
            <div class="notification-list">
                ${visible.length ? visible.map((notification) => `
                    <div class="notification-item ${notification.read ? '' : 'unread'}" data-id="${notification.id}" tabindex="0" role="button" aria-label="Abrir notificação: ${notification.title}">
                        <div class="notification-icon">${notification.priority === 'CRITICAL' ? '🔴' : notification.priority === 'WARNING' ? '🟠' : notification.priority === 'SUCCESS' ? '🟢' : '🔵'}</div>
                        <div class="notification-body">
                            <div class="notification-title">${this.getCategoryLabel(notification.category)}</div>
                            <div class="notification-message">${notification.title}</div>
                            <div class="notification-meta">${notification.message} · ${this.formatRelativeTime(notification.createdAt)}</div>
                        </div>
                        <div class="notification-priority priority-${notification.priority || 'INFO'}">${this.getPriorityLabel(notification.priority)}</div>
                    </div>
                `).join('') : '<div class="notification-empty">Nenhuma notificação para este escopo.</div>'}
            </div>
            <div class="notification-footer">
                <button type="button" data-action="mark-all-read">Marcar todas como lidas</button>
                <button type="button" data-action="close-notifications">Fechar</button>
            </div>
        `;

        dropdown.querySelectorAll('[data-filter]').forEach((button) => {
            button.addEventListener('click', (event) => {
                this.filter = event.currentTarget.dataset.filter || 'ALL';
                this.renderNotificationDropdown();
            });
        });

        dropdown.querySelectorAll('.notification-item').forEach((item) => {
            item.addEventListener('click', () => {
                const id = item.dataset.id;
                if (id) {
                    this.markNotificationAsRead(id);
                    this.openNotificationTarget(this.loadNotifications().find((notification) => notification.id === id));
                }
            });
        });

        dropdown.querySelector('[data-action="mark-all-read"]').addEventListener('click', () => this.markAllNotificationsAsRead());
        dropdown.querySelector('[data-action="close-notifications"]').addEventListener('click', () => this.closeNotificationDropdown());
    },

    markNotificationAsRead(notificationId) {
        const list = this.loadNotifications();
        const updated = list.map((notification) => (
            notification.id === notificationId ? { ...notification, read: true, readAt: new Date().toISOString() } : notification
        ));
        this.saveNotifications(updated);
        this.renderNotificationBadge();
        this.renderNotificationDropdown();
    },

    markAllNotificationsAsRead() {
        const currentUser = this.getCurrentUser();
        const notifications = this.getNotificationsForUser(currentUser).map((notification) => ({ ...notification, read: true, readAt: new Date().toISOString() }));
        const all = this.loadNotifications().map((notification) => {
            const match = notifications.find((item) => item.id === notification.id);
            return match || notification;
        });
        this.saveNotifications(all);
        this.renderNotificationBadge();
        this.renderNotificationDropdown();
    },

    openNotificationTarget(notification) {
        if (!notification) return;
        if (notification.targetSection) {
            const targetTabButton = document.querySelector(`[data-tab="${notification.targetSection}"]`);
            if (targetTabButton) {
                targetTabButton.click();
            }
        }

        if (notification.targetProcessId) {
            const tabButton = document.querySelector('[data-tab="meus-processos"]');
            if (tabButton) {
                tabButton.click();
            }
            setTimeout(() => {
                if (typeof ProcessManager?.selectActivity === 'function' && notification.targetPhaseCode && notification.targetActivityCode) {
                    ProcessManager.selectActivity(notification.targetProcessId, notification.targetPhaseCode, notification.targetActivityCode);
                } else if (typeof ProcessManager?.renderProcesses === 'function') {
                    ProcessManager.renderProcesses(ProcessManager.getStoredProcesses());
                }
            }, 200);
        }

        if (notification.targetIndicatorId) {
            const tabButton = document.querySelector('[data-tab="indicadores"]');
            if (tabButton) {
                tabButton.click();
            }
        }
    },

    closeNotificationDropdown() {
        const dropdown = document.getElementById('notification-dropdown');
        const bell = document.querySelector('.btn-notification');
        if (dropdown) {
            dropdown.classList.add('hidden');
        }
        if (bell) {
            bell.setAttribute('aria-expanded', 'false');
        }
    },

    toggleNotificationDropdown() {
        const dropdown = document.getElementById('notification-dropdown');
        const bell = document.querySelector('.btn-notification');
        if (!dropdown || !bell) return;
        const willOpen = dropdown.classList.contains('hidden');
        dropdown.classList.toggle('hidden', !willOpen);
        bell.setAttribute('aria-expanded', String(willOpen));
        if (willOpen) {
            this.renderNotificationDropdown();
        }
    },

    initNotificationCenter() {
        if (this.initialized) {
            this.renderNotificationBadge();
            return;
        }

        this.initialized = true;
        const bell = document.querySelector('.btn-notification');
        if (!bell) return;

        bell.addEventListener('click', (event) => {
            event.stopPropagation();
            this.toggleNotificationDropdown();
        });

        document.addEventListener('click', (event) => {
            const dropdown = document.getElementById('notification-dropdown');
            const bellButton = document.querySelector('.btn-notification');
            if (dropdown && !dropdown.contains(event.target) && !bellButton?.contains(event.target)) {
                this.closeNotificationDropdown();
            }
        });

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                this.closeNotificationDropdown();
            }
        });

        this.renderNotificationBadge();
    }
};

window.NotificationCenter = NotificationCenter;

// Inicializar aplicação quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    window.app = new SPMApp();
    if (window.NotificationCenter?.initNotificationCenter) {
        window.NotificationCenter.initNotificationCenter();
    }
});
