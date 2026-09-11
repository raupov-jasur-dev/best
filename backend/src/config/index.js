require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  siteBaseUrl: process.env.SITE_BASE_URL || 'https://bukhara-best.uz',
  siteName: process.env.SITE_NAME || 'Bukhara Best',
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || '',
  telegramChannelId: process.env.TELEGRAM_CHANNEL_ID || '',
  homeCarouselCategoryIds: (process.env.HOME_CAROUSEL_CATEGORY_IDS || '1').split(',').map(Number).filter(Boolean),
  homeTrendingCategoryIds: (process.env.HOME_TRENDING_CATEGORY_IDS || '1,2').split(',').map(Number).filter(Boolean),
  homeBuxoroCategoryIds: (process.env.HOME_BUXORO_CATEGORY_IDS || '1,3').split(',').map(Number).filter(Boolean),
  openWeatherApiKey: process.env.OPENWEATHER_API_KEY || ''
};
