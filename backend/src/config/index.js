require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  frontendUrl: (process.env.FRONTEND_URL || 'https://bukharabest.vercel.app').replace(/\/$/, ''),
  siteBaseUrl: (process.env.SITE_BASE_URL || 'https://bukharabest.uz').replace(/\/$/, ''),
  siteName: process.env.SITE_NAME || 'Bukhara Best',
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

  homeCarouselCategoryIds: (process.env.HOME_CAROUSEL_CATEGORY_IDS || '1')
    .split(',')
    .map(Number)
    .filter(Boolean),
  homeTrendingCategoryIds: (process.env.HOME_TRENDING_CATEGORY_IDS || '1,2')
    .split(',')
    .map(Number)
    .filter(Boolean),
  homeBuxoroCategoryIds: (process.env.HOME_BUXORO_CATEGORY_IDS || '1,3')
    .split(',')
    .map(Number)
    .filter(Boolean),
  openWeatherApiKey: process.env.OPENWEATHER_API_KEY || ''
};
