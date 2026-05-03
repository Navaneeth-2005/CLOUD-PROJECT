const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const Question = require('./Question');

const TestCase = sequelize.define('TestCase', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  questionId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  input: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  expectedOutput: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  isHidden: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  marks: {
    type: DataTypes.INTEGER,
    defaultValue: 10
  }
}, { timestamps: true });

TestCase.belongsTo(Question, { foreignKey: 'questionId', as: 'question' });
Question.hasMany(TestCase, { foreignKey: 'questionId', as: 'testCases' });

module.exports = TestCase;