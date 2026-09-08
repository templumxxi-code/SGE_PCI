const express = require('express');
const multer = require('multer');
const { verifyToken } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const processController = require('../controllers/bpm/processController');
const phaseController = require('../controllers/bpm/phaseController');
const activityController = require('../controllers/bpm/activityController');
const checklistController = require('../controllers/bpm/checklistController');
const responsibleController = require('../controllers/bpm/responsibleController');
const attachmentController = require('../controllers/bpm/attachmentController');
const indicatorController = require('../controllers/bpm/indicatorController');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024, files: 1 } }).single('file');
const authenticate = verifyToken;

router.post('/processes', authenticate, authorize({ permissions: ['PROCESS_CREATE'] }), processController.create);
router.get('/processes', authenticate, authorize({ permissions: ['PROCESS_VIEW'] }), processController.list);
router.get('/processes/:id', authenticate, authorize({ permissions: ['PROCESS_VIEW'] }), processController.get);
router.put('/processes/:id', authenticate, authorize({ permissions: ['PROCESS_UPDATE'] }), processController.update);
router.post('/processes/:processId/phases', authenticate, authorize({ permissions: ['PROCESS_UPDATE'] }), phaseController.create);

router.get('/processes/:id/phases', authenticate, authorize({ permissions: ['PROCESS_VIEW'] }), phaseController.listByProcess);
router.post('/phases/:phaseId/activities', authenticate, authorize({ permissions: ['PROCESS_UPDATE'] }), activityController.create);
router.get('/phases/:id', authenticate, authorize({ permissions: ['PROCESS_VIEW'] }), phaseController.get);
router.get('/phases/:id/activities', authenticate, authorize({ permissions: ['PROCESS_VIEW'] }), activityController.listByPhase);
router.get('/activities/:id', authenticate, authorize({ permissions: ['PROCESS_VIEW'] }), activityController.get);
router.put('/activities/:id', authenticate, authorize({ permissions: ['PROCESS_UPDATE'] }), activityController.update);

router.get('/activities/:id/checklist', authenticate, authorize({ permissions: ['PROCESS_VIEW'] }), checklistController.list);
router.patch('/checklist/:id/complete', authenticate, authorize({ permissions: ['CHECKLIST_UPDATE'] }), checklistController.complete);
router.get('/activities/:id/responsibles', authenticate, authorize({ permissions: ['PROCESS_VIEW'] }), responsibleController.list);
router.post('/activities/:id/responsibles', authenticate, authorize({ permissions: ['PROCESS_UPDATE'] }), responsibleController.add);
router.delete('/activities/:id/responsibles/:userId', authenticate, authorize({ permissions: ['PROCESS_UPDATE'] }), responsibleController.remove);

router.post('/activities/:id/attachments', authenticate, authorize({ permissions: ['ATTACHMENT_CREATE'] }), upload, attachmentController.upload);
router.get('/activities/:id/attachments', authenticate, authorize({ permissions: ['PROCESS_VIEW'] }), attachmentController.list);
router.get('/processes/:id/indicators', authenticate, authorize({ permissions: ['PROCESS_VIEW'] }), indicatorController.list);
router.post('/processes/:id/indicators', authenticate, authorize({ permissions: ['INDICATOR_MANAGE'] }), indicatorController.create);
router.put('/indicators/:id', authenticate, authorize({ permissions: ['INDICATOR_MANAGE'] }), indicatorController.update);

module.exports = router;
