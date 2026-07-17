// ============================================================================
// SMP PCI - Utilitários Globais
// ============================================================================

/**
 * Abrir modal
 */
function abrirModal(titulo, mensagem, callback) {
    const modal = document.getElementById('modal-confirmacao');
    const modalTexto = document.getElementById('modal-texto');
    const btnConfirmar = document.getElementById('btn-confirmar');

    if (modal && modalTexto) {
        document.querySelector('.modal-header h2').textContent = titulo;
        modalTexto.textContent = mensagem;
        modal.classList.add('active');

        if (callback) {
            btnConfirmar.onclick = () => {
                callback();
                fecharModal();
            };
        }
    }
}

/**
 * Fechar modal
 */
function fecharModal() {
    const modal = document.getElementById('modal-confirmacao');
    if (modal) {
        modal.classList.remove('active');
    }
}

/**
 * Formatar data
 */
function formatarData(data) {
    if (!data) return '-';
    return new Date(data).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

/**
 * Formatar data com hora
 */
function formatarDataHora(data) {
    if (!data) return '-';
    return new Date(data).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Mostrar notificação
 */
function notificar(mensagem, tipo = 'info', duracao = 3000) {
    const notificacao = document.createElement('div');
    notificacao.className = `notification notification-${tipo}`;
    notificacao.textContent = mensagem;
    notificacao.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        background-color: var(--color-${tipo});
        color: white;
        border-radius: var(--border-radius);
        box-shadow: var(--shadow-lg);
        z-index: 3000;
        animation: slideIn 0.3s ease-out;
    `;

    document.body.appendChild(notificacao);

    setTimeout(() => {
        notificacao.style.animation = 'fadeOut 0.3s ease-out';
        setTimeout(() => notificacao.remove(), 300);
    }, duracao);
}

/**
 * Validar email
 */
function validarEmail(email) {
    const regex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
    return regex.test(email);
}

/**
 * Validar senha forte
 */
function validarSenha(senha) {
    // Mínimo 8 caracteres, pelo menos 1 maiúscula, 1 minúscula, 1 número
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).{8,}$/;
    return regex.test(senha);
}

/**
 * Copiar para clipboard
 */
function copiarParaClipboard(texto) {
    navigator.clipboard.writeText(texto).then(() => {
        notificar('Copiado para clipboard!', 'success', 2000);
    }).catch(() => {
        alert('Erro ao copiar para clipboard');
    });
}

/**
 * Exportar para CSV
 */
function exportarCSV(dados, nomeArquivo = 'export.csv') {
    if (!dados || dados.length === 0) return;

    const headers = Object.keys(dados[0]);
    const csv = [
        headers.join(','),
        ...dados.map(row =>
            headers.map(header => {
                const valor = row[header];
                // Escapar aspas e envolver com aspas se contiver vírgula
                return typeof valor === 'string' && valor.includes(',')
                    ? `"${valor.replace(/"/g, '""')}"`
                    : valor;
            }).join(',')
        )
    ].join('\\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nomeArquivo;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}

/**
 * Debounce para funções
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Throttle para funções
 */
function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * Gerar ID único
 */
function gerarID() {
    return Math.random().toString(36).substr(2, 9);
}

/**
 * Formatar moeda
 */
function formatarMoeda(valor, moeda = 'BRL') {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: moeda
    }).format(valor);
}

/**
 * Validar CPF
 */
function validarCPF(cpf) {
    const regex = /^\\d{3}\\.\\d{3}\\.\\d{3}-\\d{2}$/;
    return regex.test(cpf);
}

/**
 * Máscara de CPF
 */
function mascaraCPF(valor) {
    return valor
        .replace(/\\D/g, '')
        .replace(/(\\d{3})(\\d)/, '$1.$2')
        .replace(/(\\d{3})(\\d)/, '$1.$2')
        .replace(/(\\d{3})(\\d{2})$/, '$1-$2');
}

/**
 * Máscara de telefone
 */
function mascaraTelefone(valor) {
    return valor
        .replace(/\\D/g, '')
        .replace(/(\\d{2})(\\d)/, '($1) $2')
        .replace(/(\\d{5})(\\d)/, '$1-$2');
}

/**
 * Máscara de CEP
 */
function mascaraCEP(valor) {
    return valor
        .replace(/\\D/g, '')
        .replace(/(\\d{5})(\\d)/, '$1-$2');
}

/**
 * Scrollar para elemento
 */
function scrollParaElemento(seletor) {
    const elemento = document.querySelector(seletor);
    if (elemento) {
        elemento.scrollIntoView({ behavior: 'smooth' });
    }
}

/**
 * Verificar se elemento está visível
 */
function estaVisivel(elemento) {
    const rect = elemento.getBoundingClientRect();
    return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
}

/**
 * Esperar (delay)
 */
function esperar(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Clonar objeto profundo
 */
function clonarProfundo(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof Array) return obj.map(item => clonarProfundo(item));

    const clone = {};
    for (let key in obj) {
        if (obj.hasOwnProperty(key)) {
            clone[key] = clonarProfundo(obj[key]);
        }
    }
    return clone;
}

// Setup de listeners globais
document.addEventListener('DOMContentLoaded', () => {
    // Fechar modais ao clicar no X
    document.querySelectorAll('.btn-close').forEach(btn => {
        btn.addEventListener('click', fecharModal);
    });

    // Fechar modais ao clicar fora
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            fecharModal();
        }
    });
});
