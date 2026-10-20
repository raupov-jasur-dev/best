const { Category, News } = require('../models');
const slugify = require('slugify');
const { uploadImage } = require('../services/uploadService');
const { sequelize } = require('../models');
const { readPresentation, applyPresentation } = require('../services/presentationService');
const { text, id } = require('../utils/validation');

async function listCategories(req, res, next) {
  try {
    const cats = await Category.findAll({
      order: [['id', 'ASC']],
      raw: false
    });

    // postsCount ni alohida hisoblash (PostgreSQL mos)
    const counts = await News.findAll({
      attributes: [
        'categoryId',
        [sequelize.fn('COUNT', sequelize.col('id')), 'cnt']
      ],
      where: { status: 'published' },
      group: ['categoryId'],
      raw: true
    });
    const map = {};
    counts.forEach((r) => { map[r.categoryId] = parseInt(r.cnt, 10) || 0; });

    const data = applyPresentation(cats, await readPresentation()).map((c) => {
      const j = { ...c };
      j.postsCount = map[c.id] || 0;
      return j;
    });

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function getCategory(req, res, next) {
  try {
    const cat = /^\d+$/.test(req.params.id) ? await Category.findByPk(id(req.params.id)) : await Category.findOne({where:{slug:req.params.id}});
    if (!cat) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: cat });
  } catch (err) {
    next(err);
  }
}

async function createCategory(req, res, next) {
  try {
    const name = text(req.body.name, 'Nomi', 155, true);
    const description = text(req.body.description || '', 'Tavsif', 5000) || null;
    if (!name) return res.status(400).json({ success: false, message: 'Name required' });

    let icon = null;
    if (req.file) {
      const up = await uploadImage(req.file, 'bukhara-best/categories');
      icon = up.url;
    }

    const baseSlug = slugify(name, { lower: true, strict: true }) || 'category';
    let slug = baseSlug;
    let i = 1;
    while (await Category.findOne({ where: { slug } })) {
      slug = `${baseSlug}-${i++}`;
    }

    const cat = await Category.create({ name, slug, description, icon });
    res.status(201).json({ success: true, data: cat });
  } catch (err) {
    next(err);
  }
}

async function updateCategory(req, res, next) {
  try {
    const cat = await Category.findByPk(req.params.id);
    if (!cat) return res.status(404).json({ success: false, message: 'Not found' });
    const name = req.body.name !== undefined ? text(req.body.name, 'Nomi', 155, true) : null;
    const description = text(req.body.description, 'Tavsif', 5000);
    if (name) {
      cat.name = name;
      // Preserve published category URLs when the display name changes.
    }
    if (description !== undefined) cat.description = description || null;
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
      return res.status(400).json({
        success: false,
        message: `Bu kategoriyada ${count} ta yangilik bor. Avval yangiliklarni boshqa kategoriyaga o‘tkazing.`
      });
    }
    await cat.destroy();
    res.json({ success: true, message: 'Deleted' });
  } catch (err) {
    next(err);
  }
}

module.exports = { listCategories, getCategory, createCategory, updateCategory, deleteCategory };
