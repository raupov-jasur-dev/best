const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Comment = sequelize.define('Comment', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  newsId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'news_id'
  },
  authorName: {
    type: DataTypes.STRING(120),
    defaultValue: 'Mehmon',
    field: 'author_name'
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  isApproved: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_approved'
  },
  publishedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'published_at'
  }
}, {
  tableName: 'comments',
  timestamps: false,
  underscored: true
});

module.exports = Comment;
