const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const Contest = require('./Contest');

const Question = sequelize.define('Question', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  contestId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  inputFormat: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  outputFormat: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  sampleInput: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  sampleOutput: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  difficulty: {
    type: DataTypes.ENUM('easy', 'medium', 'hard'),
    defaultValue: 'medium'
  },
  marks: {
    type: DataTypes.INTEGER,
    defaultValue: 100
  }
}, {
  timestamps: true
});

// A contest has many questions
Question.belongsTo(Contest, { foreignKey: 'contestId', as: 'contest' });
Contest.hasMany(Question, { foreignKey: 'contestId', as: 'questions' });

module.exports = Question;