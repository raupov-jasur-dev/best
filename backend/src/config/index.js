require('dotenv').config();
const { randomBytes } = require('crypto');
const production = process.env.NODE_ENV === 'production';
const secret = process.env.JWT_SECRET;
if (production && (!secret || secret.length < 32 || /dev-secret|change-me|placeholder|REPLACE_|YOUR_|EXAMPLE/i.test(secret))) throw new Error('A unique JWT_SECRET of at least 32 characters is required in production');

module.exports = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: secret || randomBytes(48).toString('hex'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  frontendUrl: (process.env.FRONTEND_URL || 'https://bukharabest.vercel.app').replace(/\/$/, ''),
  siteBaseUrl: (process.env.SITE_BASE_URL || 'https://bukharabest.uz').replace(/\/$/, ''),
  siteName: 'Buxara Best',
  corsOrigins: (process.env.CORS_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean),
  telegramDryRun: process.env.TELEGRAM_DRY_RUN === 'true',
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || '',
  telegramChannelId: process.env.TELEGRAM_CHANNEL_ID || '',

  // Telegram post pastki linklar
  socialTelegram: process.env.SOCIAL_TELEGRAM || 'https://t.me/Buxarabest',
  socialInstagram: process.env.SOCIAL_INSTAGRAM || 'https://www.instagram.com/buxarabest_/',
  socialFacebook:
    process.env.SOCIAL_FACEBOOK ||
    'https://www.facebook.com/groups/716578230428961/?ref=share&mibextid=NSMWBT',
  socialYoutube: process.env.SOCIAL_YOUTUBE || 'https://www.youtube.com/@bukharabest2436',
  socialSite: process.env.SOCIAL_SITE || process.env.SITE_BASE_URL || 'https://bukharabest.uz',

  homeCarouselCategoryIds: (process.env.HOME_CAROUSEL_CATEGORY_IDS || '')
    .split(',')
    .map(Number)
    .filter(Boolean),
  homeTrendingCategoryIds: (process.env.HOME_TRENDING_CATEGORY_IDS || '')
    .split(',')
    .map(Number)
    .filter(Boolean),
  homeBuxoroCategoryIds: (process.env.HOME_BUXORO_CATEGORY_IDS || '')
    .split(',')
    .map(Number)
    .filter(Boolean),
  openWeatherApiKey: process.env.OPENWEATHER_API_KEY || ''
};
