const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const User = require('./User');
const Contest = require('./Contest');

const CheatingLog = sequelize.define('CheatingLog', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  contestId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  eventType: {
    type: DataTypes.ENUM(
      'tab_switch',
      'window_blur',
      'copy_paste',
      'right_click',
      'time_exceeded',
      'multiple_login'
    ),
    allowNull: false
  },
  eventCount: {
    type: DataTypes.INTEGER,
    defaultValue: 1
  },
  details: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  flagged: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  timestamps: true
});

CheatingLog.belongsTo(User, { foreignKey: 'userId', as: 'candidate' });
CheatingLog.belongsTo(Contest, { foreignKey: 'contestId', as: 'contest' });

module.exports = CheatingLog;