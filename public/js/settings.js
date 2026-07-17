// ============================================================================
// SMP PCI - Gerenciamento de Configurações
// ============================================================================

class SettingsManager {
    /**
     * Carregar configurações
     */
    static async loadSettings() {
        try {
            // Carregar usuários se for admin
            if (window.app.currentUser.perfil === 'NGE') {
                await this.loadUsers();
                this.setupUserForm();
            }
        } catch (error) {
            console.error('Erro ao carregar configurações:', error);
        }
    }

    /**
     * Carregar lista de usuários
     */
    static async loadUsers() {
        try {
            const usuarios = await api.listUsers();
            this.renderUsersTable(usuarios);
        } catch (error) {
            console.error('Erro ao carregar usuários:', error);
        }
    }

    static setupUserForm() {
        const form = document.getElementById('add-user-form');
        if (!form) return;

        const toggleBtn = document.getElementById('show-add-user-form-btn');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                form.style.display = form.style.display === 'none' ? 'block' : 'none';
            });
        }

        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            await this.createUser();
        });
    }

    static async createUser() {
        const nome = document.getElementById('new-user-name')?.value.trim();
        const email = document.getElementById('new-user-email')?.value.trim();
        const senha = document.getElementById('new-user-password')?.value;
        const perfil = document.getElementById('new-user-role')?.value;
        const setorId = document.getElementById('new-user-setor')?.value;

        if (!nome || !email || !senha || !perfil) {
            alert('Preencha todos os campos obrigatórios antes de criar o usuário.');
            return;
        }

        if (perfil === 'SETOR' && !setorId) {
            alert('Selecione um setor válido para o usuário do perfil SETOR.');
            return;
        }

        try {
            const payload = {
                nome,
                email,
                senha,
                perfil,
                setor_id: perfil === 'SETOR' ? parseInt(setorId, 10) : null
            };

            const resultado = await api.registerUser(payload);
            alert('Usuário criado com sucesso: ' + resultado.nome);
            const form = document.getElementById('add-user-form');
            form?.reset();
            if (form) form.style.display = 'none';
            this.loadUsers();
        } catch (error) {
            console.error('Erro ao criar usuário:', error);
            alert(error.message || 'Não foi possível criar o usuário.');
        }
    }

    /**
     * Renderizar tabela de usuários
     */
    static renderUsersTable(usuarios) {
        const tbody = document.querySelector('#users-table tbody');
        if (!tbody) return;

        tbody.innerHTML = usuarios.map(usuario => `
            <tr>
                <td>${usuario.nome}</td>
                <td>${usuario.email}</td>
                <td>${usuario.perfil}</td>
                <td>${usuario.setor_nome || '-'}</td>
                <td>
                    <button class="btn btn-small btn-primary">Editar</button>
                    <button class="btn btn-small btn-danger">Deletar</button>
                </td>
            </tr>
        `).join('');
    }
}

// Setup de event listeners de configurações
document.addEventListener('DOMContentLoaded', () => {
    const toggleBtn = document.getElementById('show-add-user-form-btn');
    const form = document.getElementById('add-user-form');

    if (form) {
        form.style.display = 'none';
    }

    if (toggleBtn && form) {
        toggleBtn.addEventListener('click', () => {
            form.style.display = form.style.display === 'none' ? 'block' : 'none';
        });
    }
});
