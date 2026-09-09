const express = require('express');
const multer = require('multer');
const { verifyToken } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const { requireModule } = require('../middleware/moduleAccess');
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
const requireProcessModule = requireModule('PROCESS_MANAGEMENT');

router.post('/processes', authenticate, requireProcessModule, authorize({ permissions: ['PROCESS_CREATE'] }), processController.create);
router.get('/processes', authenticate, requireProcessModule, authorize({ permissions: ['PROCESS_VIEW'] }), processController.list);
router.get('/processes/:id', authenticate, requireProcessModule, authorize({ permissions: ['PROCESS_VIEW'] }), processController.get);
router.put('/processes/:id', authenticate, requireProcessModule, authorize({ permissions: ['PROCESS_UPDATE'] }), processController.update);
router.post('/processes/:processId/phases', authenticate, requireProcessModule, authorize({ permissions: ['PROCESS_UPDATE'] }), phaseController.create);

router.get('/processes/:id/phases', authenticate, requireProcessModule, authorize({ permissions: ['PROCESS_VIEW'] }), phaseController.listByProcess);
router.post('/phases/:phaseId/activities', authenticate, requireProcessModule, authorize({ permissions: ['PROCESS_UPDATE'] }), activityController.create);
router.get('/phases/:id', authenticate, requireProcessModule, authorize({ permissions: ['PROCESS_VIEW'] }), phaseController.get);
router.get('/phases/:id/activities', authenticate, requireProcessModule, authorize({ permissions: ['PROCESS_VIEW'] }), activityController.listByPhase);
router.get('/activities/:id', authenticate, requireProcessModule, authorize({ permissions: ['PROCESS_VIEW'] }), activityController.get);
router.put('/activities/:id', authenticate, requireProcessModule, authorize({ permissions: ['PROCESS_UPDATE'] }), activityController.update);

router.get('/activities/:id/checklist', authenticate, requireProcessModule, authorize({ permissions: ['PROCESS_VIEW'] }), checklistController.list);
router.patch('/checklist/:id/complete', authenticate, requireProcessModule, authorize({ permissions: ['CHECKLIST_UPDATE'] }), checklistController.complete);
router.get('/activities/:id/responsibles', authenticate, requireProcessModule, authorize({ permissions: ['PROCESS_VIEW'] }), responsibleController.list);
router.post('/activities/:id/responsibles', authenticate, requireProcessModule, authorize({ permissions: ['PROCESS_UPDATE'] }), responsibleController.add);
router.delete('/activities/:id/responsibles/:userId', authenticate, requireProcessModule, authorize({ permissions: ['PROCESS_UPDATE'] }), responsibleController.remove);

router.post('/activities/:id/attachments', authenticate, requireProcessModule, authorize({ permissions: ['ATTACHMENT_CREATE'] }), upload, attachmentController.upload);
router.get('/activities/:id/attachments', authenticate, requireProcessModule, authorize({ permissions: ['PROCESS_VIEW'] }), attachmentController.list);
router.get('/processes/:id/indicators', authenticate, requireProcessModule, authorize({ permissions: ['PROCESS_VIEW'] }), indicatorController.list);
router.post('/processes/:id/indicators', authenticate, requireProcessModule, authorize({ permissions: ['INDICATOR_MANAGE'] }), indicatorController.create);
router.put('/indicators/:id', authenticate, requireProcessModule, authorize({ permissions: ['INDICATOR_MANAGE'] }), indicatorController.update);

module.exports = router;
