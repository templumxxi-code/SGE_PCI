const express = require('express');
const { verifyToken } = require('../middleware/auth');
const { queryMany } = require('../models/db');

const router = express.Router();

router.get('/tree', verifyToken, async (req, res, next) => {
    try {
        const rows = await queryMany(`
            SELECT id, nome, sigla, tipo, unidade_superior_id AS parent_id, ativo
            FROM organizational_units
            WHERE ativo = TRUE
            ORDER BY tipo, nome
        `);
        const byId = new Map(rows.map((unit) => [String(unit.id), { ...unit, children: [] }]));
        const roots = [];
        byId.forEach((unit) => {
            const parent = unit.parent_id && byId.get(String(unit.parent_id));
            if (parent) parent.children.push(unit);
            else roots.push(unit);
        });
        res.json(roots);
    } catch (error) { next(error); }
});

module.exports = router;
