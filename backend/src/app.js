const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const config = require('./config');
const { sequelize } = require('./models');
const apiRoutes = require('./routes/api');
const app = express();
app.disable('x-powered-by');
app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS || (config.nodeEnv === 'production' ? 1 : 0)));
app.use(helmet({ contentSecurityPolicy: { directives: {
  defaultSrc: ["'self'"], scriptSrc: ["'self'"], styleSrc: ["'self'"],
  imgSrc: ["'self'", 'https:', 'blob:'], mediaSrc: ["'self'", 'https:', 'blob:'],
  fontSrc: ["'self'"], connectSrc: ["'self'", config.frontendUrl, ...config.corsOrigins],
  objectSrc: ["'none'"], baseUri: ["'self'"], frameAncestors: ["'none'"],
  upgradeInsecureRequests: config.nodeEnv === 'production' ? [] : null
} }, crossOriginEmbedderPolicy: false }));
const origins = new Set([config.frontendUrl, config.siteBaseUrl, ...config.corsOrigins,
  ...(config.nodeEnv !== 'production' ? ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:3000', 'http://127.0.0.1:5173'] : [])]);
app.use((req,res,next)=>cors({ origin(origin, cb) {
  if (!origin || origins.has(origin) || origin === req.protocol+'://'+req.get('host')) return cb(null, true);
  const error = new Error('Origin is not allowed'); error.status = 403; error.code = 'CORS_DENIED'; cb(error);
}, methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'], allowedHeaders: ['Authorization', 'Content-Type'], maxAge: 600 })(req,res,next));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: false, limit: '2mb' }));
app.use('/api', (req, res, next) => { res.set('Cache-Control', 'no-store'); next(); }, rateLimit({ windowMs: 15 * 60000, limit: 500, standardHeaders: 'draft-7', legacyHeaders: false,
  message: { success: false, code: 'RATE_LIMITED', message: 'So‘rovlar ko‘payib ketdi. Birozdan keyin urinib ko‘ring.' } }));
app.get('/health', async (req, res) => {
  try { await sequelize.authenticate(); res.json({ ok: true, service: 'bukhara-best-api', brand: 'Buxara Best' }); }
  catch { res.status(503).json({ ok: false, service: 'bukhara-best-api' }); }
});
app.use('/api/v1', apiRoutes);
app.use('/api', apiRoutes);
app.use('/api', (req, res) => res.status(404).json({ success: false, code: 'NOT_FOUND', message: 'Endpoint not found' }));
const publicPath = path.resolve(__dirname, '../../frontend-vercel');
// One frontend and one admin implementation on both hosts. Archived EJS is not mounted.
app.get('/config.js', (req, res) => res.type('js').set('Cache-Control', 'no-store').send('window.__API_URL__ = location.origin;'));
const publicMediaHeaders=(res)=>res.setHeader('Cross-Origin-Resource-Policy','cross-origin');
app.use('/static', express.static(path.resolve(__dirname, '../../frontend/public'),{setHeaders:publicMediaHeaders}));
app.use('/uploads', express.static(path.resolve(__dirname, '../../uploads'), { dotfiles: 'deny',setHeaders:publicMediaHeaders }));
app.get(['/detail/:id', '/post/:id'], (req, res) => res.redirect(301, '/post.html?id=' + encodeURIComponent(req.params.id)));
app.get('/category/post/:id', (req, res) => res.redirect(301, '/category.html?id=' + encodeURIComponent(req.params.id)));
app.get('/news/:slug', (req, res) => res.redirect(301, '/post.html?id=' + encodeURIComponent(req.params.slug)));
app.get('/', (req,res,next)=>{
  if((req.get('accept') || '').includes('text/html'))return next();
  res.json({name:'Buxara Best API',version:'2.0.0',health:'/health',endpoints:{news:'GET /api/news',newsDetail:'GET /api/news/:idOrSlug',categories:'GET /api/categories',adminLogin:'POST /api/admin/login'}});
});
app.get('/admin*', (req, res) => res.sendFile(path.join(publicPath, 'admin/index.html')));
app.get(['/category', '/search', '/post'], (req, res) => res.sendFile(path.join(publicPath, req.path.slice(1) + '.html')));
app.use(express.static(publicPath));
app.use((req, res) => res.status(404).sendFile(path.join(publicPath, '404.html')));
app.use(require('./middleware/errorHandler'));
module.exports = app;
