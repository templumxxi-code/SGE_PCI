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

    /**
     * Retorna a URL base da API, mesmo quando o app é aberto diretamente do arquivo
     */
    resolveApiUrl() {
        if (window.location.protocol === 'file:') {
            return 'http://localhost:3000/api';
        }
        return `${window.location.origin}/api`;
    }

    /**
     * Inicializar aplicação
     */
    init() {
        this.setupEventListeners();
        this.checkEnvironment();
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

        // Abas de navegação
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => this.switchTab(e));
        });

        // Login form
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
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

        if (token) {
            try {
                const response = await fetch(`${this.apiUrl}/auth/perfil`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (response.ok) {
                    this.currentUser = await response.json();
                    this.isAuthenticated = true;
                    this.showDashboard();
                } else {
                    this.logout();
                }
            } catch (error) {
                console.error('Erro ao verificar autenticação:', error);
                this.logout();
            }
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
                this.isAuthenticated = true;
                this.showDashboard();
                document.getElementById('login-form').reset();
            } else {
                const error = await response.json();
                alert('Erro no login: ' + (error.error || 'Credenciais inválidas'));
            }
        } catch (error) {
            console.error('Erro ao fazer login:', error);
            if (this.isRunningFromFile()) {
                alert('Não foi possível conectar à API. Abra a aplicação via servidor local, por exemplo: `npm run dev` e acesse http://localhost:3000');
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

        if (userNameElement) userNameElement.textContent = this.currentUser.nome;
        if (userRoleElement) userRoleElement.textContent = this.currentUser.perfil === 'NGE' ? 'NGE (Administrador)' : 'Setor/Núcleo';
    }

    /**
     * Ajustar abas e menus de acordo com o perfil do usuário
     */
    applyRolePermissions() {
        const perfil = this.currentUser?.perfil;
        document.querySelectorAll('.nav-item').forEach((item) => {
            item.classList.remove('active');
        });

        document.querySelectorAll('.nav-item').forEach((item) => {
            const role = item.dataset.role;

            if (perfil === 'NGE') {
                if (role === 'SETOR') {
                    item.classList.add('hidden');
                } else {
                    item.classList.remove('hidden');
                }
            } else if (perfil === 'SETOR') {
                if (role === 'NGE') {
                    item.classList.add('hidden');
                } else {
                    item.classList.remove('hidden');
                }
            } else {
                item.classList.add('hidden');
            }
        });

        const allTabs = document.querySelectorAll('.tab-content');
        allTabs.forEach((tab) => {
            tab.classList.remove('active');
        });

        if (perfil === 'NGE') {
            document.getElementById('dashboard-nge')?.classList.add('active');
            document.querySelector('[data-tab="dashboard-nge"]')?.classList.add('active');
        } else {
            document.getElementById('dashboard-setor')?.classList.add('active');
            document.querySelector('[data-tab="dashboard-setor"]')?.classList.add('active');
        }
    }

    /**
     * Preparar formulário de novo processo para o perfil Setor
     */
    prepareCreateProcessForm() {
        const setorSelect = document.getElementById('setor-select');
        if (!setorSelect) return;

        if (this.currentUser?.perfil === 'SETOR') {
            setorSelect.innerHTML = `
                <option value="${this.currentUser.setor_id}">Setor do usuário</option>
            `;
            setorSelect.value = this.currentUser.setor_id;
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
            ProcessManager.loadProcesses();
            IndicatorManager.loadIndicators();

            if (this.currentUser.perfil === 'NGE') {
                DashboardManager.loadNGEDashboard();
            } else {
                DashboardManager.loadSetorDashboard();
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
        const role = this.currentUser?.perfil;
        const allowedTabs = role === 'NGE'
            ? ['dashboard-nge', 'meus-processos', 'novo-processo', 'monitoramento-bpm', 'indicadores', 'relatorios', 'configuracoes']
            : ['dashboard-setor', 'meus-processos', 'novo-processo', 'monitoramento-bpm', 'indicadores'];

        if (!allowedTabs.includes(tabName)) {
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

    /**
     * Carregar dados específicos da aba
     */
    loadTabData(tabName) {
        switch (tabName) {
            case 'dashboard-nge':
                DashboardManager.loadNGEDashboard();
                break;
            case 'dashboard-setor':
                DashboardManager.loadSetorDashboard();
                break;
            case 'meus-processos':
                ProcessManager.loadProcesses();
                break;
            case 'indicadores':
                IndicatorManager.loadIndicators();
                break;
            case 'relatorios':
                ReportManager.loadReports();
                break;
            case 'configuracoes':
                SettingsManager.loadSettings();
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
}

// Inicializar aplicação quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    window.app = new SPMApp();
});
