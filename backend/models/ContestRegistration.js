const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const User = require('./User');
const Contest = require('./Contest');

const ContestRegistration = sequelize.define('ContestRegistration', {
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
  phone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  college: {
    type: DataTypes.STRING,
    allowNull: true
  },
  experience: {
    type: DataTypes.STRING,
    allowNull: true
  },
  registeredAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  timestamps: true
});

ContestRegistration.belongsTo(User, { foreignKey: 'userId', as: 'candidate' });
ContestRegistration.belongsTo(Contest, { foreignKey: 'contestId', as: 'contest' });

module.exports = ContestRegistration;