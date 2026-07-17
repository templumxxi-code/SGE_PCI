// ============================================================================
// SMP PCI - Gerenciamento de Indicadores
// ============================================================================

class IndicatorManager {
    /**
     * Carregar indicadores
     */
    static async loadIndicators() {
        try {
            const perfil = window.app?.currentUser?.perfil;
            let url = '/indicators';

            if (perfil === 'SETOR') {
                const setorId = window.app.currentUser.setor_id;
                url = `/indicators/setor/${setorId}`;
            }

            const indicadores = await api.get(url);
            this.renderIndicators(indicadores);
        } catch (error) {
            console.error('Erro ao carregar indicadores:', error);
            this.renderIndicators([]);
        }
    }

    /**
     * Renderizar indicadores
     */
    static renderIndicators(indicadores) {
        const container = document.getElementById('indicators-grid');
        if (!container) return;

        if (!indicadores || indicadores.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-chart-line"></i>
                    <h3>Nenhum indicador encontrado</h3>
                    <p>Verifique se há indicadores vinculados aos processos do setor.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = indicadores.map(indicador => {
            const percentual = indicador.valor_meta > 0
                ? Math.min((indicador.valor_atual / indicador.valor_meta) * 100, 100)
                : 0;
            const status = percentual >= 85 ? 'success' : percentual >= 70 ? 'warning' : 'danger';

            return `
                <div class="indicator-card">
                    <div class="indicator-header">
                        <div>
                            <div class="indicator-name">${indicador.nome}</div>
                            <div class="indicator-type">${indicador.tipo_indicador || 'KPI'}</div>
                        </div>
                        <div class="badge badge-${status}">
                            ${percentual.toFixed(0)}%
                        </div>
                    </div>

                    <div class="indicator-values">
                        <div class="indicator-value">
                            <div class="indicator-value-label">Meta</div>
                            <div class="indicator-value-number">${indicador.valor_meta} ${indicador.unidade_medida || ''}</div>
                        </div>
                        <div class="indicator-value">
                            <div class="indicator-value-label">Atual</div>
                            <div class="indicator-value-number">${indicador.valor_atual} ${indicador.unidade_medida || ''}</div>
                        </div>
                    </div>

                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${percentual}%"></div>
                    </div>
                </div>
            `;
        }).join('');
    }

    /**
     * Atualizar valor do indicador
     */
    static async updateIndicator(indicadorId, novoValor) {
        try {
            const resultado = await api.put(`/indicators/${indicadorId}/valor`, {
                novoValor
            });
            console.log('Indicador atualizado:', resultado);
            this.loadIndicators();
        } catch (error) {
            console.error('Erro ao atualizar indicador:', error);
        }
    }
}
