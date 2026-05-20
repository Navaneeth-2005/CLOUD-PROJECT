const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const User = require('./User');

const PrepContribution = sequelize.define('PrepContribution', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  companyName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  companyType: {
    type: DataTypes.ENUM('product', 'service', 'startup'),
    allowNull: false
  },
  tips: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  resources: {
    type: DataTypes.TEXT,
    allowNull: false
  }
}, {
  timestamps: true
});

PrepContribution.belongsTo(User, { foreignKey: 'userId', as: 'contributor' });
User.hasMany(PrepContribution, { foreignKey: 'userId', as: 'contributions' });

module.exports = PrepContribution;
