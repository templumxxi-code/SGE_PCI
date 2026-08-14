// ============================================================================
// SMP PCI - Autenticação
// ============================================================================

class AuthManager {
    static get baseUrl() {
        if (window.location.protocol === 'file:') {
            return 'http://localhost:3000/api';
        }
        return `${window.location.origin}/api`;
    }

    /**
     * Fazer requisição autenticada
     */
    static async fetchWithAuth(url, options = {}) {
        const token = localStorage.getItem('smp_token');

        if (!token) {
            throw new Error('Token não encontrado. Faça login novamente.');
        }

        const headers = {
            'Authorization': `Bearer ${token}`,
            ...options.headers
        };

        if (!(options.body instanceof FormData)) {
            headers['Content-Type'] = 'application/json';
        }

        const response = await fetch(url, {
            ...options,
            headers
        });

        if (response.status === 401) {
            localStorage.removeItem('smp_token');
            window.location.href = '/';
            throw new Error('Sessão expirada. Faça login novamente.');
        }

        return response;
    }

    /**
     * Fazer requisição GET autenticada
     */
    static async get(endpoint) {
        const response = await this.fetchWithAuth(`${this.baseUrl}${endpoint}`);
        if (!response.ok) {
            throw new Error(`Erro na requisição: ${response.status}`);
        }
        return await response.json();
    }

    /**
     * Fazer requisição POST autenticada
     */
    static async post(endpoint, data) {
        const response = await this.fetchWithAuth(`${this.baseUrl}${endpoint}`, {
            method: 'POST',
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Erro ao enviar dados');
        }

        return await response.json();
    }

    /**
     * Fazer requisição PUT autenticada
     */
    static async put(endpoint, data) {
        const response = await this.fetchWithAuth(`${this.baseUrl}${endpoint}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Erro ao atualizar dados');
        }

        return await response.json();
    }

    /**
     * Fazer requisição DELETE autenticada
     */
    static async delete(endpoint) {
        const response = await this.fetchWithAuth(`${this.baseUrl}${endpoint}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            try {
                const errorData = await response.json();
                throw new Error(errorData.error || `Erro ao deletar: ${response.status}`);
            } catch (e) {
                throw new Error(`Erro ao deletar: ${response.status}`);
            }
        }

        return await response.json();
    }

    /**
     * Alterar senha
     */
    static async changePassword(senhaAtual, novaSenha) {
        return this.post('/auth/alterar-senha', {
            senhaAtual,
            novaSenha
        });
    }

    /**
     * Obter perfil do usuário
     */
    static async getProfile() {
        return this.get('/auth/perfil');
    }

    /**
     * Listar usuários (apenas admin)
     */
    static async listUsers() {
        return this.get('/auth/usuarios');
    }

    /**
     * Registrar novo usuário (apenas admin)
     */
    static async registerUser(data) {
        return this.post('/auth/registrar', data);
    }

    /**
     * Atualizar usuário
     */
    static async updateUser(id, data) {
        return this.put(`/auth/usuarios/${id}`, data);
    }

    /**
     * Deletar usuário (apenas admin)
     */
    static async deleteUser(id) {
        return this.delete(`/auth/usuarios/${id}`);
    }

    /**
     * Atualizar status do usuário (ativar/inativar)
     */
    static async updateUserStatus(id, active) {
        return this.put(`/auth/usuarios/${id}/status`, { active });
    }

    /**
     * Solicitar recuperação de senha
     */
    static async requestPasswordReset(email) {
        const response = await fetch(`${this.baseUrl}/auth/solicitar-reset-senha`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Erro ao solicitar reset de senha');
        }

        return await response.json();
    }

    /**
     * Redefinir senha com token
     */
    static async resetPassword(email, token, novaSenha) {
        const response = await fetch(`${this.baseUrl}/auth/reset-senha`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, token, novaSenha })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Erro ao redefinir senha');
        }

        return await response.json();
    }
}

// Alias para facilitar uso
const api = AuthManager;
