const { News, Category, Comment, sequelize } = require('../models');
const { Op } = require('sequelize');

async function getDashboard(req, res, next) {
  try {
    const [
      totalNews,
      publishedNews,
      draftNews,
      totalCategories,
      totalComments,
      totalViewsResult,
      telegramPublished,
      telegramFailed,
      topViewed
    ] = await Promise.all([
      News.count(),
      News.count({ where: { status: 'published' } }),
      News.count({ where: { status: 'draft' } }),
      Category.count(),
      Comment.count(),
      News.sum('views'),
      News.count({ where: { telegramStatus: 'published' } }),
      News.count({ where: { telegramStatus: 'failed' } }),
      News.findAll({
        where: { status: 'published' },
        order: [['views', 'DESC']],
        limit: 10,
        attributes: ['id', 'title', 'views', 'publishedAt', 'mainImage'],
        include: [{ model: Category, as: 'category', attributes: ['name'] }]
      })
    ]);

    res.json({
      success: true,
      data: {
        totalNews,
        publishedNews,
        draftNews,
        totalCategories,
        totalComments,
        totalViews: totalViewsResult || 0,
        telegramPublished,
        telegramFailed,
        topViewed
      }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getDashboard };
