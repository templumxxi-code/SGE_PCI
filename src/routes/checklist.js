const express = require('express');
const { verifyToken } = require('../middleware/auth');
const { query, queryOne } = require('../models/db');
const { isGlobalAdmin } = require('../services/roles');

const router = express.Router();

router.patch('/:id', verifyToken, async (req, res, next) => {
    try {
        const item = await queryOne(`
            SELECT t.id, t.atividade_id, t.conclusao, p.setor_id
            FROM tarefas t
            INNER JOIN atividades a ON a.id = t.atividade_id
            INNER JOIN subprocessos s ON s.id = a.subprocesso_id
            INNER JOIN processos p ON p.id = s.processo_id
            WHERE t.id = $1
        `, [req.params.id]);
        if (!item) return res.status(404).json({ error: 'Item de checklist não encontrado' });
        if (!isGlobalAdmin(req.user.perfil) && Number(item.setor_id) !== Number(req.user.setor_id)) return res.status(403).json({ error: 'Acesso não autorizado' });
        if (typeof req.body?.completed !== 'boolean' && typeof req.body?.concluido !== 'boolean') return res.status(400).json({ error: 'completed deve ser booleano' });
        const completed = req.body.completed ?? req.body.concluido;
        const updated = await queryOne(`
            UPDATE tarefas
            SET conclusao = $1, percentual_conclusao = CASE WHEN $1 THEN 100 ELSE 0 END,
                data_conclusao = CASE WHEN $1 THEN CURRENT_TIMESTAMP ELSE NULL END
            WHERE id = $2
            RETURNING id, atividade_id, conclusao AS completed, percentual_conclusao AS progress, data_conclusao
        `, [completed, req.params.id]);
        await query('INSERT INTO logs (usuario_id, acao, tabela_afetada, id_registro, valores_novos) VALUES ($1, $2, $3, $4, $5)', [req.user.id, 'CHECKLIST_ATUALIZADO', 'tarefas', item.id, JSON.stringify({ completed })]);
        res.json(updated);
    } catch (error) { next(error); }
});

module.exports = router;
