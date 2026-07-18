// ============================================================================
// Attachment Routes
// ============================================================================

const express = require('express');
const multer = require('multer');
const path = require('path');
const { verifyToken } = require('../middleware/auth');
const attachmentController = require('../controllers/attachmentController');

const router = express.Router();
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10485760,
        files: 1,
        fields: 10,
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
        if (!allowedTypes.includes(file.mimetype)) {
            return cb(new Error('MIME inválido'));
        }
        cb(null, true);
    }
}).single('file');

const multerHandler = (req, res, next) => {
    upload(req, res, (err) => {
        if (err) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(413).json({ error: 'Arquivo maior que o limite permitido.' });
            }
            if (err.message === 'MIME inválido') {
                return res.status(415).json({ error: 'MIME inválido ou arquivo não suportado.' });
            }
            return res.status(400).json({ error: 'Erro no upload do arquivo.' });
        }
        next();
    });
};

router.post('/processes/:processId/activities/:activityId/attachments', verifyToken, multerHandler, async (req, res, next) => {
    try {
        const attachment = await attachmentController.uploadAttachment(req, parseInt(req.params.processId, 10), parseInt(req.params.activityId, 10));
        res.status(201).json(attachment);
    } catch (error) {
        next(error);
    }
});

router.get('/processes/:processId/activities/:activityId/attachments', verifyToken, async (req, res, next) => {
    try {
        const attachments = await attachmentController.listAttachments(parseInt(req.params.processId, 10), parseInt(req.params.activityId, 10), req.user);
        res.json({ attachments });
    } catch (error) {
        next(error);
    }
});

router.get('/processes/:processId/activities/:activityId/attachments/:attachmentId/download', verifyToken, async (req, res, next) => {
    try {
        const { attachment, filePath } = await attachmentController.getAttachmentForDownload(req, parseInt(req.params.processId, 10), parseInt(req.params.activityId, 10), parseInt(req.params.attachmentId, 10));
        res.setHeader('Content-Type', attachment.mime_type);
        res.setHeader('Content-Disposition', `attachment; filename="${attachment.nome_arquivo.replace(/\"/g, '')}"`);
        res.sendFile(filePath);
    } catch (error) {
        next(error);
    }
});

router.delete('/processes/:processId/activities/:activityId/attachments/:attachmentId', verifyToken, async (req, res, next) => {
    try {
        const result = await attachmentController.deleteAttachment(req, parseInt(req.params.processId, 10), parseInt(req.params.activityId, 10), parseInt(req.params.attachmentId, 10));
        res.json(result);
    } catch (error) {
        next(error);
    }
});

module.exports = router;
