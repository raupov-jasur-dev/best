const { Category, News } = require('../models');
const { makeSlug } = require('../utils/helpers');
const slugify = require('slugify');
const { uploadImage, deleteMedia } = require('../services/uploadService');

async function listCategories(req, res, next) {
  try {
    const cats = await Category.findAll({
      attributes: {
        include: [
          [
            require('sequelize').literal('(SELECT COUNT(*) FROM news WHERE news.category_id = "Category".id AND news.status = \'published\')'),
            'postsCount'
          ]
        ]
      },
      order: [['id', 'ASC']]
    });
    res.json({ success: true, data: cats });
  } catch (err) {
    next(err);
  }
}

async function getCategory(req, res, next) {
  try {
    const cat = await Category.findByPk(req.params.id);
    if (!cat) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: cat });
  } catch (err) {
    next(err);
  }
}

async function createCategory(req, res, next) {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Name required' });
    let icon = null;
    if (req.file) {
      const up = await uploadImage(req.file, 'bukhara-best/categories');
      icon = up.url;
    }
    const cat = await Category.create({
      name,
      slug: slugify(name, { lower: true, strict: true }),
      description: description || null,
      icon
    });
    res.status(201).json({ success: true, data: cat });
  } catch (err) {
    next(err);
  }
}

async function updateCategory(req, res, next) {
  try {
    const cat = await Category.findByPk(req.params.id);
    if (!cat) return res.status(404).json({ success: false, message: 'Not found' });
    const { name, description } = req.body;
    if (name) {
      cat.name = name;
      cat.slug = slugify(name, { lower: true, strict: true });
    }
    if (description !== undefined) cat.description = description;
    if (req.file) {
      const up = await uploadImage(req.file, 'bukhara-best/categories');
      cat.icon = up.url;
    }
    await cat.save();
    res.json({ success: true, data: cat });
  } catch (err) {
    next(err);
  }
}

async function deleteCategory(req, res, next) {
  try {
    const cat = await Category.findByPk(req.params.id);
    if (!cat) return res.status(404).json({ success: false, message: 'Not found' });
    const count = await News.count({ where: { categoryId: cat.id } });
    if (count > 0) {
      return res.status(400).json({ success: false, message: 'Category has news, cannot delete' });
    }
    await cat.destroy();
    res.json({ success: true, message: 'Deleted' });
  } catch (err) {
    next(err);
  }
}

module.exports = { listCategories, getCategory, createCategory, updateCategory, deleteCategory };
