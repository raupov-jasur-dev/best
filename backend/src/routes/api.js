const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const { authenticate, requireAdmin } = require('../middleware/auth');

const authCtrl = require('../controllers/authController');
const newsCtrl = require('../controllers/newsController');
const catCtrl = require('../controllers/categoryController');
const commentCtrl = require('../controllers/commentController');
const dashCtrl = require('../controllers/dashboardController');
const configCtrl = require('../controllers/configController');
const rateLimit = require('express-rate-limit');
const loginLimit = rateLimit({ windowMs: 15 * 60000, limit: 15, skipSuccessfulRequests: true, standardHeaders: 'draft-7', legacyHeaders: false, message: { success:false, code:'RATE_LIMITED', message:'Kirish urinishlari ko‘p. Keyinroq urinib ko‘ring.' } });
const commentLimit = rateLimit({ windowMs: 60000, limit: 5, standardHeaders:'draft-7', legacyHeaders:false, message: {success:false,code:'RATE_LIMITED',message:'Izohni birozdan keyin yuboring.'} });

// Auth
router.post('/admin/login', loginLimit, authCtrl.login);
router.get('/admin/me', authenticate, authCtrl.me);
router.get('/config', configCtrl.publicConfig);
router.get('/home', configCtrl.home);

// Public news
router.get('/news', newsCtrl.listNews);
router.get('/news/:idOrSlug', newsCtrl.getNewsBySlugOrId);

// Public categories
router.get('/categories', catCtrl.listCategories);
router.get('/categories/:id', catCtrl.getCategory);

// Public comments
router.post('/news/:newsId/comments', commentLimit, commentCtrl.createComment);

// Admin - protected
router.use('/admin', authenticate, requireAdmin);

router.get('/admin/dashboard', dashCtrl.getDashboard);
router.get('/admin/presentation', configCtrl.getPresentation);
router.put('/admin/presentation', configCtrl.updatePresentation);

router.get('/admin/news', newsCtrl.adminList);
router.get('/admin/news/:id', newsCtrl.adminGet);
router.post(
  '/admin/news',
  upload.fields([
    { name: 'mainImage', maxCount: 1 },
    { name: 'video', maxCount: 1 },
    { name: 'additionalImages', maxCount: 5 }
  ]),
  newsCtrl.createNews
);
router.put(
  '/admin/news/:id',
  upload.fields([
    { name: 'mainImage', maxCount: 1 },
    { name: 'video', maxCount: 1 },
    { name: 'additionalImages', maxCount: 5 }
  ]),
  newsCtrl.updateNews
);
router.delete('/admin/news/:id', newsCtrl.deleteNews);
router.post('/admin/news/:id/publish', newsCtrl.publishNews);
router.post('/admin/news/:id/telegram-retry', newsCtrl.retryTelegram);
router.post('/admin/news/:id/telegram-resolve', newsCtrl.resolveTelegram);

router.get('/admin/categories', catCtrl.listCategories);
router.post('/admin/categories', upload.single('icon'), catCtrl.createCategory);
router.put('/admin/categories/:id', upload.single('icon'), catCtrl.updateCategory);
router.delete('/admin/categories/:id', catCtrl.deleteCategory);

router.get('/admin/comments', commentCtrl.adminListComments);
router.patch('/admin/comments/:id', commentCtrl.moderateComment);
router.delete('/admin/comments/:id', commentCtrl.deleteComment);

module.exports = router;
