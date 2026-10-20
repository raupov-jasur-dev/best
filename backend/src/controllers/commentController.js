const { Comment, News } = require('../models');
const { paginate } = require('../utils/helpers');
const { text, id, bool } = require('../utils/validation');

async function createComment(req, res, next) {
  try {
    const content = text(req.body.content, 'Izoh', 5000, true);
    const authorName = text(req.body.authorName || 'Mehmon', 'Ism', 120, true);
    const newsId = id(req.params.newsId);
    if (!content || content.trim().length < 2) {
      return res.status(400).json({ success: false, message: 'Comment too short' });
    }
    const news = await News.findByPk(newsId);
    if (!news || news.status !== 'published') {
      return res.status(404).json({ success: false, message: 'News not found' });
    }
    const comment = await Comment.create({
      newsId,
      authorName: (authorName || 'Mehmon').trim().slice(0, 120),
      content: content.trim(),
      isApproved: false
    });
    res.status(201).json({ success: true, data: comment });
  } catch (err) {
    next(err);
  }
}

async function adminListComments(req, res, next) {
  try {
    const { page, limit } = req.query;
    const { offset, limit: lim, page: p } = paginate(null, page, limit || 20);
    const { count, rows } = await Comment.findAndCountAll({
      include: [{ model: News, as: 'news', attributes: ['id', 'title'] }],
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

async function moderateComment(req, res, next) {
  try {
    const comment = await Comment.findByPk(req.params.id);
    if (!comment) return res.status(404).json({ success: false, message: 'Not found' });
    const { isApproved } = req.body;
    comment.isApproved = bool(isApproved);
    await comment.save();
    res.json({ success: true, data: comment });
  } catch (err) {
    next(err);
  }
}

async function deleteComment(req, res, next) {
  try {
    const comment = await Comment.findByPk(req.params.id);
    if (!comment) return res.status(404).json({ success: false, message: 'Not found' });
    await comment.destroy();
    res.json({ success: true, message: 'Deleted' });
  } catch (err) {
    next(err);
  }
}

module.exports = { createComment, adminListComments, moderateComment, deleteComment };
