const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const config = require('./config');
const errorHandler = require('./middleware/errorHandler');
const apiRoutes = require('./routes/api');

const app = express();

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

// CORS: allow Vercel frontend + local
const allowedOrigins = [
  config.frontendUrl,
  config.siteBaseUrl,
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:3000'
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (config.nodeEnv !== 'production') return callback(null, true);
    if (
      allowedOrigins.includes(origin) ||
      origin.endsWith('.vercel.app') ||
      (config.frontendUrl && origin === config.frontendUrl)
    ) {
      return callback(null, true);
    }
    console.warn('CORS blocked origin:', origin);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 400,
  standardHeaders: true,
  legacyHeaders: false
}));

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Health (Railway)
app.get('/health', (req, res) => res.json({ ok: true, service: 'bukhara-best-api' }));

// REST API
app.use('/api', apiRoutes);

// Optional: serve admin SPA from API host as fallback
const staticPath = path.join(__dirname, '../../frontend/public');
app.use('/static', express.static(staticPath));
app.get('/admin*', (req, res) => {
  res.sendFile(path.join(staticPath, 'admin', 'index.html'), (err) => {
    if (err) res.status(404).json({ message: 'Admin panel not found' });
  });
});

app.get('/', (req, res) => {
  res.json({
    name: 'Bukhara Best API',
    version: '2.0.0',
    health: '/health',
    endpoints: {
      news: 'GET /api/news',
      newsDetail: 'GET /api/news/:idOrSlug',
      categories: 'GET /api/categories',
      adminLogin: 'POST /api/admin/login'
    }
  });
});

app.use(errorHandler);

module.exports = app;
