const { Op } = require('sequelize');
const { News, Category, Comment } = require('../models');
const config = require('../config');
const { paginate } = require('../utils/helpers');

function baseLocals(extra = {}) {
  return {
    SITE_BASE_URL: config.siteBaseUrl,
    OPENWEATHER_API_KEY: config.openWeatherApiKey,
    ...extra
  };
}

async function home(req, res, next) {
  try {
    const categories = await Category.findAll({
      limit: 4,
      order: [['id', 'ASC']]
    });
    const list_categories = await Promise.all(categories.map(async (c) => {
      const count = await News.count({ where: { categoryId: c.id, status: 'published' } });
      return {
        id: c.id,
        name: c.name,
        icon: c.icon,
        description: c.description,
        count_post: count,
        date: c.createdAt
      };
    }));

    const latest = await News.findAll({
      where: { status: 'published' },
      include: [{ model: Category, as: 'category' }],
      order: [['publishedAt', 'DESC']],
      limit: 12
    });

    const last_post = latest[0] || null;
    const last_carousel = await News.findAll({
      where: {
        status: 'published',
        categoryId: { [Op.in]: config.homeCarouselCategoryIds }
      },
      include: [{ model: Category, as: 'category' }],
      order: [['publishedAt', 'DESC']],
      limit: 6
    });
    if (!last_carousel.length) last_carousel.push(...latest.slice(0, 6));

    const usedIds = new Set(latest.map(p => p.id));
    async function firstFrom(ids) {
      const p = await News.findOne({
        where: {
          status: 'published',
          categoryId: { [Op.in]: ids },
          id: { [Op.notIn]: Array.from(usedIds) }
        },
        include: [{ model: Category, as: 'category' }],
        order: [['publishedAt', 'DESC']]
      });
      if (p) usedIds.add(p.id);
      return p;
    }

    const trand_new = await firstFrom(config.homeTrendingCategoryIds);
    const trand_option_1 = await firstFrom(config.homeTrendingCategoryIds);
    const trand_option_2 = await firstFrom(config.homeTrendingCategoryIds);
    const trand_option_3 = await firstFrom(config.homeTrendingCategoryIds);
    const buxoro = await firstFrom(config.homeBuxoroCategoryIds);
    const buxoro_1 = await firstFrom(config.homeBuxoroCategoryIds);
    const buxoro_2 = await firstFrom(config.homeBuxoroCategoryIds);
    const buxoro_3 = await firstFrom(config.homeBuxoroCategoryIds);

    const allCats = await Category.findAll({ order: [['id', 'ASC']] });

    res.render('home', baseLocals({
      list_categories,
      last_post,
      last_carousel,
      random_seven_posts: latest.slice(1, 4),
      random_three_posts: latest.slice(4, 7),
      random_posts: latest.slice(0, 7),
      trand_new,
      trand_option_1,
      trand_option_2,
      trand_option_3,
      buxoro,
      buxoro_1,
      buxoro_2,
      buxoro_3,
      last_four_posts: latest.slice(0, 6),
      last_five_posts: latest.slice(0, 5),
      categories: allCats
    }));
  } catch (err) {
    next(err);
  }
}

async function allPosts(req, res, next) {
  try {
    const { page } = req.query;
    const { offset, limit, page: p } = paginate(null, page, 9);
    const { count, rows } = await News.findAndCountAll({
      where: { status: 'published' },
      include: [{ model: Category, as: 'category' }],
      order: [['id', 'DESC']],
      offset,
      limit
    });
    const allCats = await Category.findAll();
    res.render('post', baseLocals({
      page_obj: {
        object_list: rows,
        number: p,
        has_previous: p > 1,
        has_next: p * limit < count,
        previous_page_number: p - 1,
        next_page_number: p + 1,
        paginator: { num_pages: Math.ceil(count / limit) }
      },
      categories: allCats
    }));
  } catch (err) {
    next(err);
  }
}

async function detailPost(req, res, next) {
  try {
    const news = await News.findOne({
      where: { id: req.params.id, status: 'published' },
      include: [
        { model: Category, as: 'category' },
        { model: require('../models').NewsImage, as: 'images' },
        { model: Comment, as: 'comments', where: { isApproved: true }, required: false }
      ]
    });
    if (!news) return res.status(404).render('404', baseLocals());
    await news.increment('views');
    news.views += 1;
    const allCats = await Category.findAll();
    res.render('detail-page', baseLocals({
      queryset: news,
      comments: news.comments || [],
      categories: allCats
    }));
  } catch (err) {
    next(err);
  }
}

async function categoryPosts(req, res, next) {
  try {
    const cat = await Category.findByPk(req.params.id);
    if (!cat) return res.status(404).render('404', baseLocals());
    const { page } = req.query;
    const { offset, limit, page: p } = paginate(null, page, 9);
    const { count, rows } = await News.findAndCountAll({
      where: { categoryId: cat.id, status: 'published' },
      include: [{ model: Category, as: 'category' }],
      order: [['publishedAt', 'DESC']],
      offset,
      limit
    });
    const allCats = await Category.findAll();
    res.render('detail-category', baseLocals({
      queryset: cat,
      page_obj: {
        object_list: rows,
        number: p,
        has_previous: p > 1,
        has_next: p * limit < count,
        previous_page_number: p - 1,
        next_page_number: p + 1,
        paginator: { num_pages: Math.ceil(count / limit) }
      },
      categories: allCats
    }));
  } catch (err) {
    next(err);
  }
}

async function search(req, res, next) {
  try {
    const query = (req.query.q || '').trim();
    const { page } = req.query;
    const { offset, limit, page: p } = paginate(null, page, 9);
    let rows = [], count = 0;
    if (query) {
      const result = await News.findAndCountAll({
        where: {
          status: 'published',
          [Op.or]: [
            { title: { [Op.iLike]: `%${query}%` } },
            { shortDescription: { [Op.iLike]: `%${query}%` } },
            { content: { [Op.iLike]: `%${query}%` } }
          ]
        },
        include: [{ model: Category, as: 'category' }],
        order: [['publishedAt', 'DESC']],
        offset,
        limit
      });
      rows = result.rows;
      count = result.count;
    }
    const allCats = await Category.findAll();
    res.render('search', baseLocals({
      query,
      page_obj: {
        object_list: rows,
        number: p,
        has_previous: p > 1,
        has_next: p * limit < count,
        previous_page_number: p - 1,
        next_page_number: p + 1,
        paginator: { num_pages: Math.ceil(count / limit) || 1 }
      },
      categories: allCats
    }));
  } catch (err) {
    next(err);
  }
}

module.exports = { home, allPosts, detailPost, categoryPosts, search };
