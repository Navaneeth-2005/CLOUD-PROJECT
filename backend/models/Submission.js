const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const User = require('./User');
const Question = require('./Question');
const Contest = require('./Contest');

const Submission = sequelize.define('Submission', {
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
  questionId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  language: {
    type: DataTypes.ENUM('c++', 'java', 'python'),
    allowNull: false
  },
  code: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('pending', 'running', 'accepted', 'rejected', 'error'),
    defaultValue: 'pending'
  },
  score: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  executionTime: {
    type: DataTypes.FLOAT,
    defaultValue: 0
  },
  errorMessage: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  testCasesPassed: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  totalTestCases: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
}, {
  timestamps: true
});

Submission.belongsTo(User, { foreignKey: 'userId', as: 'candidate' });
Submission.belongsTo(Question, { foreignKey: 'questionId', as: 'question' });
Submission.belongsTo(Contest, { foreignKey: 'contestId', as: 'contest' });

module.exports = Submission;