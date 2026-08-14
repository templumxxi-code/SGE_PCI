// ============================================================================
// SMP PCI - Aplicação Principal
// ============================================================================

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
        this.checkEnvironment();
        this.checkResetPasswordFlow();
        this.checkAuthentication();
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

        const loginProfileSelect = document.getElementById('login-profile-select');
        if (loginProfileSelect) {
            loginProfileSelect.addEventListener('change', () => this.applyLoginProfile(loginProfileSelect.value));
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

        const notificationButton = document.querySelector('.btn-notification');
        if (notificationButton) {
            notificationButton.addEventListener('click', () => {
                if (typeof notificar === 'function') {
                    notificar('Notificações não implementadas no momento.', 'info');
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

        const email = document.getElementById('email-input').value;
        const senha = document.getElementById('password-input').value;

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
            alert('Erro no login: ' + (error.error || 'Credenciais inválidas'));
        } catch (error) {
            console.error('Erro ao fazer login:', error);
            if (this.isRunningFromFile()) {
                alert('Não foi possível conectar à API. Abra a aplicação via servidor local, por exemplo: npm run dev e acesse http://localhost:3000');
            } else {
                alert('Erro na comunicação com o servidor. Verifique se o backend está ativo em http://localhost:3000');
            }
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

        const loginSection = document.getElementById('login-section');
        const dashboardSection = document.getElementById('dashboard-section');

        loginSection.classList.add('active');
        dashboardSection.classList.remove('active');
        document.getElementById('login-form').reset();
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
     * Aplicar perfil de login ao selecionar no menu suspenso
     */
    applyLoginProfile(profile) {
        const emailInput = document.getElementById('email-input');
        const passwordInput = document.getElementById('password-input');

        if (!emailInput || !passwordInput) {
            return;
        }

        switch (profile) {
            case 'admin':
                emailInput.value = 'admin@pci.rn.gov.br';
                passwordInput.value = 'admin123';
                break;
            default:
                emailInput.value = 'admin@pci.rn.gov.br';
                passwordInput.value = 'admin123';
                break;
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

// Inicializar aplicação quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    window.app = new SPMApp();
});
