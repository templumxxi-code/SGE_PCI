class HomeManager {
    static async loadSummary() {
        const [summary, alerts] = await Promise.all([
            AuthManager.get('/dashboard/summary'),
            AuthManager.get('/notifications/unread-count')
        ]);
        this.renderSummary({
            processosAtivos: summary.processos_em_andamento || 0,
            processosConcluidos: summary.processos_concluidos || 0,
            atividadesPendentes: summary.atividades_pendentes || 0,
            alertas: alerts.count || 0
        });
    }

    static renderSummary(summary) {
        Object.entries(summary).forEach(([key, value]) => {
            const element = document.querySelector(`[data-home-metric="${key}"]`);
            if (element) element.textContent = String(value);
        });
    }

    static navigate(button) {
        const tab = button.dataset.homeTab;
        const path = button.dataset.homePath;
        if (tab && window.app?.navigateFromHome) {
            window.app.navigateFromHome(tab, path);
        }
    }

    static bind() {
        if (this.bound) return;
        this.bound = true;
        document.querySelectorAll('[data-home-tab]').forEach((button) => {
            const allowed = window.AccessControl?.canAccessSection?.(window.app?.currentUser, button.dataset.homeTab) !== false;
            if (!allowed) button.closest('.home-card')?.classList.add('hidden');
            button.addEventListener('click', () => this.navigate(button));
        });
    }
}

window.HomeManager = HomeManager;
