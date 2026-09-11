const sequelize = require('../config/database');
const User = require('./User');
const Category = require('./Category');
const News = require('./News');
const NewsImage = require('./NewsImage');
const Comment = require('./Comment');

// Associations
Category.hasMany(News, { foreignKey: 'categoryId', as: 'posts' });
News.belongsTo(Category, { foreignKey: 'categoryId', as: 'category' });

News.hasMany(NewsImage, { foreignKey: 'newsId', as: 'images', onDelete: 'CASCADE' });
NewsImage.belongsTo(News, { foreignKey: 'newsId', as: 'news' });

News.hasMany(Comment, { foreignKey: 'newsId', as: 'comments', onDelete: 'CASCADE' });
Comment.belongsTo(News, { foreignKey: 'newsId', as: 'news' });

module.exports = {
  sequelize,
  User,
  Category,
  News,
  NewsImage,
  Comment
};
