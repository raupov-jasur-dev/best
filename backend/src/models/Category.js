const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Category = sequelize.define('Category', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(155),
    allowNull: false
  },
  slug: {
    type: DataTypes.STRING(200),
    allowNull: false,
    unique: true
  },
  icon: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  createdAt: {
    type: DataTypes.DATEONLY,
    field: 'created_at',
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'categories',
  timestamps: false,
  underscored: true
});

module.exports = Category;
