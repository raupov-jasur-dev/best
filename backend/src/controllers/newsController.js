const { Op } = require('sequelize');
const { News, Category, NewsImage, Comment } = require('../models');
const { makeSlug, paginate } = require('../utils/helpers');
const { uploadImage, uploadVideo, deleteMedia } = require('../services/uploadService');
const { sendToTelegram } = require('../services/telegramService');

// Public
async function listNews(req, res, next) {
  try {
    const { page, limit, category, search, featured } = req.query;
    const { offset, limit: lim, page: p } = paginate(null, page, limit);
    const where = { status: 'published' };
    if (category) where.categoryId = category;
    if (featured === 'true') where.featured = true;
    if (search) {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { shortDescription: { [Op.iLike]: `%${search}%` } },
        { content: { [Op.iLike]: `%${search}%` } }
      ];
    }
    const { count, rows } = await News.findAndCountAll({
      where,
      include: [{ model: Category, as: 'category', attributes: ['id', 'name', 'slug'] }],
      order: [['publishedAt', 'DESC']],
      offset,
      limit: lim
    });
    res.json({
      success: true,
      data: rows,
      pagination: { total: count, page: p, limit: lim, pages: Math.ceil(count / lim) }
    });
  } catch (err) {
    next(err);
  }
}

async function getNewsBySlugOrId(req, res, next) {
  try {
    const idOrSlug = req.params.idOrSlug;
    const where = isNaN(idOrSlug) ? { slug: idOrSlug } : { id: idOrSlug };
    where.status = 'published';
    const news = await News.findOne({
      where,
      include: [
        { model: Category, as: 'category' },
        { model: NewsImage, as: 'images' },
        { model: Comment, as: 'comments', where: { isApproved: true }, required: false }
      ]
    });
    if (!news) return res.status(404).json({ success: false, message: 'News not found' });

    // Increment views
    await news.increment('views');
    news.views += 1;

    res.json({ success: true, data: news });
  } catch (err) {
    next(err);
  }
}

// Admin
async function adminList(req, res, next) {
  try {
    const { page, limit, status, search } = req.query;
    const { offset, limit: lim, page: p } = paginate(null, page, limit || 20);
    const where = {};
    if (status) where.status = status;
    if (search) {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { shortDescription: { [Op.iLike]: `%${search}%` } }
      ];
    }
    const { count, rows } = await News.findAndCountAll({
      where,
      include: [{ model: Category, as: 'category', attributes: ['id', 'name'] }],
      order: [['createdAt', 'DESC']],
      offset,
      limit: lim
    });
    res.json({
      success: true,
      data: rows,
      pagination: { total: count, page: p, limit: lim, pages: Math.ceil(count / lim) }
    });
  } catch (err) {
    next(err);
  }
}

async function adminGet(req, res, next) {
  try {
    const news = await News.findByPk(req.params.id, {
      include: [
        { model: Category, as: 'category' },
        { model: NewsImage, as: 'images' }
      ]
    });
    if (!news) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: news });
  } catch (err) {
    next(err);
  }
}

async function createNews(req, res, next) {
  try {
    const {
      title,
      shortDescription,
      content,
      categoryId,
      status = 'draft',
      featured = false,
      publishAndTelegram = false
    } = req.body;

    if (!title || !categoryId) {
      return res.status(400).json({ success: false, message: 'Title and category are required' });
    }

    let mainImage = null, mainImagePublicId = null, video = null, videoPublicId = null;

    if (req.files?.mainImage?.[0]) {
      const up = await uploadImage(req.files.mainImage[0]);
      mainImage = up.url;
      mainImagePublicId = up.publicId;
    }
    if (req.files?.video?.[0]) {
      const up = await uploadVideo(req.files.video[0]);
      video = up.url;
      videoPublicId = up.publicId;
    }

    const finalStatus = publishAndTelegram === 'true' || publishAndTelegram === true ? 'published' : status;
    const news = await News.create({
      title,
      slug: makeSlug(title),
      shortDescription: shortDescription || '',
      content: content || '',
      categoryId: parseInt(categoryId, 10),
      mainImage,
      mainImagePublicId,
      video,
      videoPublicId,
      status: finalStatus,
      featured: featured === 'true' || featured === true,
      publishedAt: finalStatus === 'published' ? new Date() : null,
      telegramStatus: finalStatus === 'published' ? 'pending' : 'skipped'
    });

    // Additional images
    if (req.files?.additionalImages) {
      for (let i = 0; i < req.files.additionalImages.length; i++) {
        const up = await uploadImage(req.files.additionalImages[i]);
        await NewsImage.create({
          newsId: news.id,
          url: up.url,
          publicId: up.publicId,
          sortOrder: i
        });
      }
    }

    // Telegram if publish
    if (finalStatus === 'published') {
      const tg = await sendToTelegram(news);
      await news.update({
        telegramStatus: tg.status,
        telegramMessageId: tg.messageId || null,
        telegramPublishedAt: tg.publishedAt || null,
        telegramError: tg.error || null
      });
    }

    const full = await News.findByPk(news.id, {
      include: [{ model: Category, as: 'category' }, { model: NewsImage, as: 'images' }]
    });

    res.status(201).json({ success: true, data: full });
  } catch (err) {
    next(err);
  }
}

async function updateNews(req, res, next) {
  try {
    const news = await News.findByPk(req.params.id, { include: [{ model: NewsImage, as: 'images' }] });
    if (!news) return res.status(404).json({ success: false, message: 'Not found' });

    const {
      title,
      shortDescription,
      content,
      categoryId,
      status,
      featured,
      publishAndTelegram
    } = req.body;

    if (title) news.title = title;
    if (shortDescription !== undefined) news.shortDescription = shortDescription;
    if (content !== undefined) news.content = content;
    if (categoryId) news.categoryId = parseInt(categoryId, 10);
    if (featured !== undefined) news.featured = featured === 'true' || featured === true;

    // Media updates
    if (req.files?.mainImage?.[0]) {
      if (news.mainImagePublicId) await deleteMedia(news.mainImagePublicId);
      const up = await uploadImage(req.files.mainImage[0]);
      news.mainImage = up.url;
      news.mainImagePublicId = up.publicId;
    }
    if (req.files?.video?.[0]) {
      if (news.videoPublicId) await deleteMedia(news.videoPublicId, 'video');
      const up = await uploadVideo(req.files.video[0]);
      news.video = up.url;
      news.videoPublicId = up.publicId;
    }

    const shouldPublish = publishAndTelegram === 'true' || publishAndTelegram === true;
    if (shouldPublish) {
      news.status = 'published';
      if (!news.publishedAt) news.publishedAt = new Date();
    } else if (status) {
      news.status = status;
      if (status === 'published' && !news.publishedAt) news.publishedAt = new Date();
    }

    await news.save();

    if (req.files?.additionalImages) {
      for (let i = 0; i < req.files.additionalImages.length; i++) {
        const up = await uploadImage(req.files.additionalImages[i]);
        await NewsImage.create({
          newsId: news.id,
          url: up.url,
          publicId: up.publicId,
          sortOrder: (news.images?.length || 0) + i
        });
      }
    }

    if (shouldPublish && news.telegramStatus !== 'published') {
      const tg = await sendToTelegram(news);
      await news.update({
        telegramStatus: tg.status,
        telegramMessageId: tg.messageId || null,
        telegramPublishedAt: tg.publishedAt || null,
        telegramError: tg.error || null
      });
    }

    const full = await News.findByPk(news.id, {
      include: [{ model: Category, as: 'category' }, { model: NewsImage, as: 'images' }]
    });
    res.json({ success: true, data: full });
  } catch (err) {
    next(err);
  }
}

async function deleteNews(req, res, next) {
  try {
    const news = await News.findByPk(req.params.id, { include: [{ model: NewsImage, as: 'images' }] });
    if (!news) return res.status(404).json({ success: false, message: 'Not found' });
    if (news.mainImagePublicId) await deleteMedia(news.mainImagePublicId);
    if (news.videoPublicId) await deleteMedia(news.videoPublicId, 'video');
    for (const img of news.images || []) {
      if (img.publicId) await deleteMedia(img.publicId);
    }
    await news.destroy();
    res.json({ success: true, message: 'Deleted' });
  } catch (err) {
    next(err);
  }
}

async function retryTelegram(req, res, next) {
  try {
    const news = await News.findByPk(req.params.id);
    if (!news) return res.status(404).json({ success: false, message: 'Not found' });
    if (news.status !== 'published') {
      return res.status(400).json({ success: false, message: 'News must be published first' });
    }
    const tg = await sendToTelegram(news);
    await news.update({
      telegramStatus: tg.status,
      telegramMessageId: tg.messageId || null,
      telegramPublishedAt: tg.publishedAt || null,
      telegramError: tg.error || null
    });
    res.json({ success: true, data: news, telegram: tg });
  } catch (err) {
    next(err);
  }
}

async function publishNews(req, res, next) {
  try {
    const news = await News.findByPk(req.params.id);
    if (!news) return res.status(404).json({ success: false, message: 'Not found' });
    news.status = 'published';
    if (!news.publishedAt) news.publishedAt = new Date();
    await news.save();
    const tg = await sendToTelegram(news);
    await news.update({
      telegramStatus: tg.status,
      telegramMessageId: tg.messageId || null,
      telegramPublishedAt: tg.publishedAt || null,
      telegramError: tg.error || null
    });
    res.json({ success: true, data: news });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listNews,
  getNewsBySlugOrId,
  adminList,
  adminGet,
  createNews,
  updateNews,
  deleteNews,
  retryTelegram,
  publishNews
};
