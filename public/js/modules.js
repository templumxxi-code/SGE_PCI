class ModulesManager {
    static modules = [];

    static escape(value) {
        return String(value || '').replace(/[&<>"']/g, (char) => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
        }[char]));
    }

    static async load() {
        this.modules = await AuthManager.get('/modules');
        this.render();
        return this.modules;
    }

    static render() {
        const container = document.getElementById('modules-list');
        if (!container) return;
        const processModule = this.modules.find((module) => module.code === 'PROCESS_MANAGEMENT');
        const strategicModule = this.modules.find((module) => module.code === 'STRATEGIC_PLANNING');
        const cards = [
            processModule || {
                name: 'Gestão de Processos',
                code: 'PROCESS_MANAGEMENT',
                description: 'Gerenciamento de processos organizacionais',
                enabled: false
            },
            strategicModule || {
                name: 'Planejamento Estratégico',
                code: 'STRATEGIC_PLANNING',
                description: 'Planejamento estratégico institucional',
                enabled: false
            }
        ];

        container.innerHTML = cards.map((module) => {
            const available = module.enabled !== false;
            const isStrategic = module.code === 'STRATEGIC_PLANNING';
            return `
                <article class="module-card${available ? '' : ' module-card-disabled'}">
                    <div class="module-card-icon" aria-hidden="true">${isStrategic ? '◈' : '⚙'}</div>
                    <div class="module-card-content">
                        <span class="module-card-status">${available ? 'Disponível' : 'Em desenvolvimento'}</span>
                        <h2>${this.escape(module.name)}</h2>
                        <p>${this.escape(module.description)}.</p>
                        ${available
                            ? `<button type="button" class="btn btn-primary module-access-btn" data-module-code="${this.escape(module.code)}">Acessar módulo</button>`
                            : '<button type="button" class="btn module-access-btn" disabled>Em breve</button>'}
                    </div>
                </article>
            `;
        }).join('');

        container.querySelectorAll('.module-access-btn').forEach((button) => {
            button.addEventListener('click', () => this.open(button.dataset.moduleCode));
        });
    }

    static async open(code) {
        if (code === 'PROCESS_MANAGEMENT') {
            history.pushState({}, '', '/');
            window.app?.showDashboard();
            return;
        }
        if (code === 'STRATEGIC_PLANNING') {
            history.pushState({}, '', '/strategic-planning');
            document.getElementById('modules-section')?.classList.remove('active');
            document.getElementById('strategic-planning-section')?.classList.add('active');
        }
    }

    static async loadAdminPanel() {
        const userSelect = document.getElementById('module-user-select');
        const panel = document.getElementById('module-permissions-list');
        if (!userSelect || !panel) return;
        try {
            const users = await AuthManager.get('/auth/usuarios');
            userSelect.innerHTML = users.map((user) => `<option value="${this.escape(user.id)}">${this.escape(user.nome || user.name)} — ${this.escape(user.email)}</option>`).join('');
            userSelect.onchange = () => this.renderAdminPermissions(userSelect.value, panel);
            await this.renderAdminPermissions(userSelect.value, panel);
        } catch (error) {
            panel.innerHTML = `<p class="form-errors">${this.escape(error.message)}</p>`;
        }
    }

    static async renderAdminPermissions(userId, panel) {
        if (!userId) return;
        const modules = await AuthManager.get(`/admin/users/${encodeURIComponent(userId)}/modules`);
        panel.innerHTML = modules.map((module) => `
            <label class="module-permission-row">
                <input type="checkbox" data-module-id="${this.escape(module.id)}" ${module.enabled ? 'checked' : ''}>
                <span><strong>${this.escape(module.name)}</strong><small>${this.escape(module.description)}</small></span>
            </label>
        `).join('');
        panel.querySelectorAll('input[data-module-id]').forEach((checkbox) => {
            checkbox.addEventListener('change', async () => {
                const endpoint = `/admin/users/${encodeURIComponent(userId)}/modules/${encodeURIComponent(checkbox.dataset.moduleId)}`;
                try {
                    if (checkbox.checked) await AuthManager.post(`/admin/users/${encodeURIComponent(userId)}/modules`, { moduleId: checkbox.dataset.moduleId });
                    else await AuthManager.delete(endpoint);
                } catch (error) {
                    checkbox.checked = !checkbox.checked;
                    if (typeof notificar === 'function') notificar(error.message, 'error');
                }
            });
        });
    }
}

window.ModulesManager = ModulesManager;
