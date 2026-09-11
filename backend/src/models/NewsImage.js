const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const NewsImage = sequelize.define('NewsImage', {
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
  url: {
    type: DataTypes.STRING(500),
    allowNull: false
  },
  publicId: {
    type: DataTypes.STRING(300),
    allowNull: true,
    field: 'public_id'
  },
  sortOrder: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'sort_order'
  }
}, {
  tableName: 'news_images',
  timestamps: true,
  underscored: true
});

module.exports = NewsImage;
