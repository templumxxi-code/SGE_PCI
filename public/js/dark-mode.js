/**
 * SMP PCI - Dark Mode Manager
 * Gerencia alternância entre modo claro e escuro
 */

class ThemeManager {
    constructor() {
        this.STORAGE_KEY = 'smp-pci-theme';
        this.DARK_THEME = 'dark';
        this.LIGHT_THEME = 'light';
        this.init();
    }

    /**
     * Inicializa o gerenciador de tema
     */
    init() {
        // Verifica preferência salva
        const savedTheme = this.getSavedTheme();
        
        // Verifica preferência do sistema
        const systemTheme = this.getSystemTheme();
        
        // Define o tema (salvo > sistema > padrão)
        const themeToUse = savedTheme || systemTheme || this.LIGHT_THEME;
        
        this.setTheme(themeToUse);
        this.setupThemeToggle();
    }

    /**
     * Obtém o tema salvo no localStorage
     */
    getSavedTheme() {
        try {
            return localStorage.getItem(this.STORAGE_KEY);
        } catch (e) {
            console.warn('localStorage não disponível:', e);
            return null;
        }
    }

    /**
     * Obtém a preferência de tema do sistema
     */
    getSystemTheme() {
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return this.DARK_THEME;
        }
        return this.LIGHT_THEME;
    }

    /**
     * Define o tema
     * @param {string} theme - 'light' ou 'dark'
     */
    setTheme(theme) {
        if (theme !== this.LIGHT_THEME && theme !== this.DARK_THEME) {
            theme = this.LIGHT_THEME;
        }

        // Aplica tema ao HTML
        document.documentElement.setAttribute('data-theme', theme);

        // Salva preferência
        try {
            localStorage.setItem(this.STORAGE_KEY, theme);
        } catch (e) {
            console.warn('localStorage não disponível:', e);
        }

        // Atualiza ícone do botão
        this.updateThemeButton(theme);

        // Dispara evento customizado
        window.dispatchEvent(new CustomEvent('themechange', { detail: { theme } }));
    }

    /**
     * Alterna entre tema claro e escuro
     */
    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme') || this.LIGHT_THEME;
        const newTheme = currentTheme === this.LIGHT_THEME ? this.DARK_THEME : this.LIGHT_THEME;
        this.setTheme(newTheme);
    }

    /**
     * Atualiza o ícone do botão de tema
     */
    updateThemeButton(theme) {
        const button = document.getElementById('toggle-theme-btn');
        if (!button) return;

        const icon = button.querySelector('span');
        if (icon) {
            if (theme === this.DARK_THEME) {
                icon.textContent = '☀️'; // Sol para modo escuro
                button.title = 'Modo Claro';
                button.setAttribute('aria-label', 'Mudar para modo claro');
            } else {
                icon.textContent = '🌙'; // Lua para modo claro
                button.title = 'Modo Escuro';
                button.setAttribute('aria-label', 'Mudar para modo escuro');
            }
        }
    }

    /**
     * Configura o botão de alternância de tema
     */
    setupThemeToggle() {
        // Tenta encontrar ou criar o botão
        let button = document.getElementById('toggle-theme-btn');
        
        if (!button) {
            // Se não encontrar, cria um novo
            button = this.createThemeButton();
            this.insertThemeButton(button);
        }

        // Adiciona event listener
        button.addEventListener('click', () => this.toggleTheme());

        // Atualiza ícone inicial
        const currentTheme = document.documentElement.getAttribute('data-theme') || this.LIGHT_THEME;
        this.updateThemeButton(currentTheme);

        // Observa mudanças de preferência do sistema
        if (window.matchMedia) {
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
                if (!this.getSavedTheme()) {
                    this.setTheme(e.matches ? this.DARK_THEME : this.LIGHT_THEME);
                }
            });
        }
    }

    /**
     * Cria o botão de alternância de tema
     */
    createThemeButton() {
        const button = document.createElement('button');
        button.id = 'toggle-theme-btn';
        button.className = 'toggle-theme-btn';
        button.setAttribute('type', 'button');
        button.setAttribute('aria-label', 'Alternar tema');
        button.title = 'Alternar tema (Claro/Escuro)';
        
        const icon = document.createElement('span');
        icon.style.fontSize = '20px';
        icon.textContent = '🌙';
        
        button.appendChild(icon);
        return button;
    }

    /**
     * Insere o botão na barra de navegação
     */
    insertThemeButton(button) {
        // Tenta encontrar local apropriado para inserir o botão
        const navBar = document.querySelector('.navbar-right') || 
                      document.querySelector('.nav-right') ||
                      document.querySelector('.header-right') ||
                      document.querySelector('.top-bar');

        if (navBar) {
            navBar.insertBefore(button, navBar.firstChild);
        } else {
            // Se não encontrar, insere no corpo
            document.body.insertBefore(button, document.body.firstChild);
        }
    }

    /**
     * Obtém o tema atual
     */
    getCurrentTheme() {
        return document.documentElement.getAttribute('data-theme') || this.LIGHT_THEME;
    }

    /**
     * Força um tema específico
     */
    forceTheme(theme) {
        this.setTheme(theme);
    }
}

// Inicializa o gerenciador de tema quando o DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.themeManager = new ThemeManager();
    });
} else {
    window.themeManager = new ThemeManager();
}

// Exportar para uso em módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ThemeManager;
}
