const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const User = require('./User');

const InterviewSession = sequelize.define('InterviewSession', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  companyId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  candidateName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  candidateEmail: {
    type: DataTypes.STRING,
    allowNull: false
  },
  scheduledStart: {
    type: DataTypes.DATE,
    allowNull: false
  },
  scheduledEnd: {
    type: DataTypes.DATE,
    allowNull: false
  },
  joinToken: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  status: {
    type: DataTypes.ENUM('scheduled', 'active', 'completed'),
    defaultValue: 'scheduled'
  },
  notepadContent: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: ''
  },
  codeContent: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: ''
  },
  codeLanguage: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'javascript'
  }
}, {
  timestamps: true
});

InterviewSession.belongsTo(User, { foreignKey: 'companyId', as: 'interviewer' });

module.exports = InterviewSession;
