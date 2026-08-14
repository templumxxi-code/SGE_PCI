// ============================================================================
// Auth Routes
// ============================================================================

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const { loginLimiter } = require('../middleware/loginLimiter');

/**
 * POST /api/auth/login
 * Fazer login
 */
router.post('/login', loginLimiter, async (req, res, next) => {
    try {
        const { email, senha } = req.body;

        if (!email || !senha) {
            return res.status(400).json({ error: 'Credenciais inválidas.' });
        }

        const resultado = await authController.login(email, senha);
        res.json(resultado);
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/auth/registrar
 * Registrar novo usuário (apenas admin)
 */
router.post('/registrar', verifyToken, requireAdmin, async (req, res, next) => {
    try {
        const usuario = await authController.registrar(req.body);
        res.status(201).json(usuario);
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/auth/usuarios
 * Listar todos os usuários (apenas admin)
 */
router.get('/usuarios', verifyToken, requireAdmin, async (req, res, next) => {
    try {
        const usuarios = await authController.listarUsuarios();
        res.json(usuarios);
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/auth/usuarios/:id
 * Obter detalhes do usuário
 */
router.get('/usuarios/:id', verifyToken, async (req, res, next) => {
    try {
        const { id } = req.params;

        // Verificar acesso: usuário só pode acessar seus próprios dados, exceto admin
        if (req.user.id !== parseInt(id) && req.user.perfil !== 'NGE') {
            return res.status(403).json({ error: 'Acesso não autorizado' });
        }

        const usuario = await authController.obterUsuario(id);
        if (!usuario) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }

        res.json(usuario);
    } catch (error) {
        next(error);
    }
});

/**
 * PUT /api/auth/usuarios/:id
 * Atualizar usuário
 */
router.put('/usuarios/:id', verifyToken, async (req, res, next) => {
    try {
        const { id } = req.params;

        // Validar acesso
        if (req.user.id !== parseInt(id) && req.user.perfil !== 'NGE') {
            return res.status(403).json({ error: 'Acesso não autorizado' });
        }

        const usuarioAtualizado = await authController.atualizarUsuario(id, req.body);
        res.json(usuarioAtualizado);
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/auth/alterar-senha
 * Alterar senha do usuário
 */
router.post('/alterar-senha', verifyToken, async (req, res, next) => {
    try {
        const { senhaAtual, novaSenha } = req.body;

        if (!senhaAtual || !novaSenha) {
            return res.status(400).json({ error: 'Campos obrigatórios não preenchidos' });
        }

        const resultado = await authController.alterarSenha(req.user.id, senhaAtual, novaSenha);
        res.json(resultado);
    } catch (error) {
        next(error);
    }
});

/**
 * DELETE /api/auth/usuarios/:id
 * Deletar/Inativar usuário
 */
router.delete('/usuarios/:id', verifyToken, requireAdmin, async (req, res, next) => {
    try {
        const { id } = req.params;
        
        // Validar ID
        if (!id || isNaN(parseInt(id))) {
            return res.status(400).json({ error: 'ID de usuário inválido' });
        }
        
        // Não permitir deletar a si mesmo
        if (req.user.id === parseInt(id)) {
            return res.status(400).json({ error: 'Não é possível deletar sua própria conta.' });
        }

        const resultado = await authController.deletarUsuario(id);
        res.status(200).json({ message: 'Usuário inativado com sucesso', usuario: resultado });
    } catch (error) {
        next(error);
    }
});

/**
 * PUT /api/auth/usuarios/:id/status
 * Inativar/Ativar usuário
 */
router.put('/usuarios/:id/status', verifyToken, requireAdmin, async (req, res, next) => {
    try {
        const { id } = req.params;
        const { active } = req.body;

        const resultado = await authController.atualizarStatusUsuario(id, active);
        res.json({ message: 'Status atualizado com sucesso', usuario: resultado });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/auth/perfil
 * Obter perfil do usuário autenticado
 */
router.get('/perfil', verifyToken, async (req, res) => {
    res.json(req.user);
});

module.exports = router;
