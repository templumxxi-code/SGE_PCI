const express = require('express');
const { verifyToken } = require('../middleware/auth');
const { UUID_PATTERN } = require('../middleware/scopeAccess');
const notificationService = require('../services/notificationService');

const router = express.Router();
router.get('/', verifyToken, async (req, res, next) => {
    try { res.json(await notificationService.listNotifications(req.user.id, req.query.limit)); }
    catch (error) { next(error); }
});
router.get('/unread-count', verifyToken, async (req, res, next) => {
    try { res.json({ count: await notificationService.unreadCount(req.user.id) }); }
    catch (error) { next(error); }
});
router.patch('/:id/read', verifyToken, async (req, res, next) => {
    try {
        if (!UUID_PATTERN.test(String(req.params.id))) return res.status(400).json({ error: 'UUID inválido' });
        const notification = await notificationService.markAsRead(req.params.id, req.user.id);
        if (!notification) return res.status(404).json({ error: 'Notificação não encontrada' });
        res.json(notification);
    } catch (error) { next(error); }
});

module.exports = router;