const express = require('express');
const { verifyToken } = require('../middleware/auth');
const { queryMany } = require('../models/db');

const router = express.Router();

router.get('/tree', verifyToken, async (req, res, next) => {
    try {
        const rows = await queryMany(`
            SELECT id,
                   nome,
                   sigla,
                   tipo,
                   parent_id,
                   codigo_hierarquico,
                   nivel_hierarquico,
                   status,
                   ativo
            FROM organizational_units_v2
            WHERE ativo = TRUE
            ORDER BY string_to_array(codigo_hierarquico, '.')::INTEGER[] NULLS LAST, nome
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
