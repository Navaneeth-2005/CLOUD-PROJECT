const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const User = require('./User');
const PrepContribution = require('./PrepContribution');

const PrepDoubt = sequelize.define('PrepDoubt', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  prepId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  senderId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  parentDoubtId: {
    type: DataTypes.INTEGER,
    allowNull: true
  }
}, {
  timestamps: true
});

PrepDoubt.belongsTo(PrepContribution, { foreignKey: 'prepId', as: 'contribution' });
PrepContribution.hasMany(PrepDoubt, { foreignKey: 'prepId', as: 'doubts' });

PrepDoubt.belongsTo(User, { foreignKey: 'senderId', as: 'sender' });

PrepDoubt.belongsTo(PrepDoubt, { foreignKey: 'parentDoubtId', as: 'parent' });
PrepDoubt.hasMany(PrepDoubt, { foreignKey: 'parentDoubtId', as: 'replies' });

module.exports = PrepDoubt;
