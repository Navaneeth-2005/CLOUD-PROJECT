const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const User = require('./User');
const Contest = require('./Contest');

const ProctorSnapshot = sequelize.define('ProctorSnapshot', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  contestId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: Contest, key: 'id' }
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: User, key: 'id' }
  },
  s3Key: {
    type: DataTypes.STRING,
    allowNull: false
  },
  timestamp: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
});

User.hasMany(ProctorSnapshot, { foreignKey: 'userId' });
ProctorSnapshot.belongsTo(User, { foreignKey: 'userId' });

Contest.hasMany(ProctorSnapshot, { foreignKey: 'contestId' });
ProctorSnapshot.belongsTo(Contest, { foreignKey: 'contestId' });

module.exports = ProctorSnapshot;
