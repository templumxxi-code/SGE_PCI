const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const attachmentRepository = require('../../repositories/bpm/attachmentRepository');
const { getActivityContext, audit } = require('./access');

const storageDir = path.resolve('storage/attachments/bpm');
const upload = async (req, res, next) => {
    try {
        const { activity, process } = await getActivityContext(req.params.id, req.user);
        if (!req.file) return res.status(400).json({ error: 'Arquivo obrigatório' });
        const extension = path.extname(req.file.originalname).toLowerCase();
        if (!['.pdf', '.png', '.jpg', '.jpeg'].includes(extension)) return res.status(415).json({ error: 'Formato não suportado' });
        await fs.mkdir(storageDir, { recursive: true });
        const storedName = `${crypto.randomUUID()}${extension}`;
        const storagePath = path.join(storageDir, storedName);
        await fs.writeFile(storagePath, req.file.buffer, { flag: 'wx' });
        const attachment = await attachmentRepository.saveAttachment({ processId: process.id, activityId: activity.id, fileName: req.file.originalname, storagePath, attachmentType: req.body?.attachment_type || 'GENERAL', required: req.body?.required === 'true', uploadedBy: req.user.id });
        await audit(req.user.id, 'ATTACHMENT_UPLOADED', 'attachment', attachment.id, req, { processId: process.id });
        res.status(201).json(attachment);
    } catch (error) { next(error); }
};

const list = async (req, res, next) => {
    try { const { activity, process } = await getActivityContext(req.params.id, req.user); res.json(await attachmentRepository.getAttachments(process.id, activity.id)); }
    catch (error) { next(error); }
};

module.exports = { upload, list };
