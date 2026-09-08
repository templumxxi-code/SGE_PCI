const express = require('express');
const bcryptjs = require('bcryptjs');
const { verifyToken } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const { getUserScope } = require('../middleware/scopeAccess');
const { query } = require('../models/db');
const userRepository = require('../repositories/userRepository');
const { UUID_PATTERN } = require('../middleware/scopeAccess');

const router = express.Router();
const userFields = `u.id, u.nome, u.email, u.senha_hash, u.perfil, u.setor_id,
    u.ativo, u.criado_em, u.atualizado_em`;
const returningUserFields = `id, nome, email, senha_hash, perfil, setor_id,
    ativo, criado_em, atualizado_em`;

const safeUser = (user) => {
    if (!user) return null;
    const { senha_hash, password_hash, passwordHash, ...safe } = user;
    return safe;
};

const requireUuid = (value, res) => {
    if (!UUID_PATTERN.test(String(value || ''))) {
        res.status(400).json({ error: 'UUID inválido' });
        return false;
    }
    return true;
};

router.get('/', verifyToken, authorize({ permissions: ['USERS_EDIT'] }), async (req, res, next) => {
    try {
        const scope = await getUserScope(req.user);
        const users = scope.global
            ? await userRepository.findAllUsers()
            : await userRepository.findUsersByUnitIds(scope.unitIds);
        res.json(users.map(safeUser));
    } catch (error) { next(error); }
});

router.post('/', verifyToken, authorize({ permissions: ['USERS_CREATE'] }), async (req, res, next) => {
    try {
        const { nome, matricula, email, senha, perfil, organizationUnitId } = req.body || {};
        if (!nome || !email || !senha || !perfil) return res.status(400).json({ error: 'Campos obrigatórios não preenchidos' });
        if (String(senha).length < 8) return res.status(400).json({ error: 'A senha deve ter pelo menos 8 caracteres' });
        const hash = await bcryptjs.hash(String(senha), 12);
        if (organizationUnitId && !UUID_PATTERN.test(String(organizationUnitId))) return res.status(400).json({ error: 'UUID de lotação inválido' });
        const user = await userRepository.createUser({
            nome: String(nome).trim(), matricula, email, passwordHash: hash,
            roleCode: String(perfil).trim().toUpperCase(), organizationalUnitId
        });
        await query(`INSERT INTO audit_logs (user_id, action, entity, entity_id, new_data, ip) VALUES ($1, 'USER_CREATED', 'user', $2, $3, $4)`, [req.user.id, user.id, JSON.stringify({ email: user.email }), req.ip]);
        res.status(201).json(safeUser(user));
    } catch (error) { next(error); }
});

router.get('/:id', verifyToken, authorize({ permissions: ['USERS_EDIT'], allowSelf: true }), async (req, res, next) => {
    try {
        if (!requireUuid(req.params.id, res)) return;
        const user = await userRepository.findUserById(req.params.id);
        if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
        const scope = await getUserScope(req.user);
        if (!scope.global && String(user.id) !== String(req.user.id) && !scope.unitIds.includes(user.organizationUnitId)) {
            return res.status(403).json({ error: 'Acesso não autorizado à lotação' });
        }
        res.json(safeUser(user));
    } catch (error) { next(error); }
});

router.patch('/:id', verifyToken, async (req, res, next) => {
    try {
        if (!requireUuid(req.params.id, res)) return;
        const target = await userRepository.findUserById(req.params.id);
        if (!target) return res.status(404).json({ error: 'Usuário não encontrado' });
        const isSelf = String(req.user.id) === String(req.params.id);
        const scope = await getUserScope(req.user);
        if (!isSelf && !(scope.global || scope.unitIds.includes(target.organizationUnitId))) return res.status(403).json({ error: 'Acesso não autorizado à lotação' });
        const isAdmin = scope.global;
        const body = req.body || {};
        const passwordHash = body.senha ? await bcryptjs.hash(String(body.senha), 12) : undefined;
        if (body.senha && String(body.senha).length < 8) return res.status(400).json({ error: 'A senha deve ter pelo menos 8 caracteres' });
        const user = await userRepository.updateUser(req.params.id, {
            nome: body.nome, email: body.email, matricula: body.matricula,
            roleCode: isAdmin ? body.perfil : undefined,
            organizationalUnitId: isAdmin ? body.organizationUnitId : undefined,
            ativo: isAdmin && body.ativo !== undefined ? Boolean(body.ativo) : undefined
        });
        if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
        if (passwordHash) await userRepository.changePassword(req.params.id, passwordHash);
        await query(`INSERT INTO audit_logs (user_id, action, entity, entity_id, new_data, ip) VALUES ($1, 'USER_UPDATED', 'user', $2, $3, $4)`, [req.user.id, req.params.id, JSON.stringify({ fields: Object.keys(body).filter((field) => field !== 'senha') }), req.ip]);
        res.json(safeUser(user));
    } catch (error) { next(error); }
});

module.exports = router;
