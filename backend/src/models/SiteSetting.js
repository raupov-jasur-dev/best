const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
module.exports = sequelize.define('SiteSetting', {
  key: { type: DataTypes.STRING(80), primaryKey: true },
  value: { type: DataTypes.JSONB, allowNull: false }
}, { tableName: 'site_settings', timestamps: true, underscored: true });
