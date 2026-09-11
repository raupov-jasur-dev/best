const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const slugify = require('slugify');

const News = sequelize.define('News', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  title: {
    type: DataTypes.STRING(1000),
    allowNull: false
  },
  slug: {
    type: DataTypes.STRING(1100),
    allowNull: false,
    unique: true
  },
  shortDescription: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'short_description'
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  categoryId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'category_id'
  },
  mainImage: {
    type: DataTypes.STRING(500),
    allowNull: true,
    field: 'main_image'
  },
  mainImagePublicId: {
    type: DataTypes.STRING(300),
    allowNull: true,
    field: 'main_image_public_id'
  },
  video: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  videoPublicId: {
    type: DataTypes.STRING(300),
    allowNull: true,
    field: 'video_public_id'
  },
  status: {
    type: DataTypes.ENUM('draft', 'published'),
    defaultValue: 'draft'
  },
  featured: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  views: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  publishedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'published_at'
  },
  telegramStatus: {
    type: DataTypes.ENUM('pending', 'published', 'failed', 'skipped'),
    defaultValue: 'pending',
    field: 'telegram_status'
  },
  telegramMessageId: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'telegram_message_id'
  },
  telegramPublishedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'telegram_published_at'
  },
  telegramError: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'telegram_error'
  }
}, {
  tableName: 'news',
  timestamps: true,
  underscored: true,
  hooks: {
    beforeValidate: (news) => {
      if (news.title && !news.slug) {
        news.slug = slugify(news.title, { lower: true, strict: true, locale: 'uz' }) + '-' + Date.now().toString(36);
      }
    }
  }
});

module.exports = News;
