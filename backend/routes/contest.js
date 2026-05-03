const express = require('express');
const router = express.Router();
const Contest = require('../models/Contest');
const Question = require('../models/Question');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

// Create a contest (only company or admin)
router.post('/create', authMiddleware, roleMiddleware('company', 'admin'), async (req, res) => {
  try {
    const { title, description, startTime, endTime } = req.body;

    const contest = await Contest.create({
      title,
      description,
      startTime,
      endTime,
      createdBy: req.user.id
    });

    res.status(201).json({ message: 'Contest created successfully', contest });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get all contests (any logged in user)
router.get('/all', authMiddleware, async (req, res) => {
  try {
    // Companies only see their own contests
    // Candidates and admins see all contests
    const whereClause = req.user.role === 'company'
      ? { createdBy: req.user.id }
      : {};

    const contests = await Contest.findAll({
      where: whereClause,
      include: [{
        model: Question,
        as: 'questions',
        separate: true,
        order: [['id', 'ASC']]
      }],
      order: [['createdAt', 'DESC']]
    });

    res.json({ contests });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get single contest by id
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const contest = await Contest.findByPk(req.params.id, {
      include: [{
        model: Question,
        as: 'questions',
        separate: true,
        order: [['id', 'ASC']]
      }]
    });

    if (!contest) {
      return res.status(404).json({ message: 'Contest not found' });
    }

    // Company can only view their own contests
    if (req.user.role === 'company' && contest.createdBy !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({ contest });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Add question to a contest (only company or admin)
router.post('/:id/questions', authMiddleware, roleMiddleware('company', 'admin'), async (req, res) => {
  try {
    const contest = await Contest.findByPk(req.params.id);

    if (!contest) {
      return res.status(404).json({ message: 'Contest not found' });
    }

    // Company can only add questions to their own contests
    if (req.user.role === 'company' && contest.createdBy !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { title, description, inputFormat, outputFormat, sampleInput, sampleOutput, difficulty, marks } = req.body;

    const question = await Question.create({
      contestId: contest.id,
      title,
      description,
      inputFormat,
      outputFormat,
      sampleInput,
      sampleOutput,
      difficulty,
      marks
    });

    res.status(201).json({ message: 'Question added successfully', question });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Delete a contest (only company or admin)
router.delete('/:id', authMiddleware, roleMiddleware('company', 'admin'), async (req, res) => {
  try {
    const contest = await Contest.findByPk(req.params.id);

    if (!contest) {
      return res.status(404).json({ message: 'Contest not found' });
    }

    // Company can only delete their own contests
    if (req.user.role === 'company' && contest.createdBy !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await contest.destroy();
    res.json({ message: 'Contest deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});
// Add test case to a question
router.post('/questions/:questionId/testcases', authMiddleware, roleMiddleware('company', 'admin'), async (req, res) => {
  try {
    const TestCase = require('../models/TestCase');
    const question = await Question.findByPk(req.params.questionId);

    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }

    const contest = await Contest.findByPk(question.contestId);
    if (req.user.role === 'company' && contest.createdBy !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { input, expectedOutput, isHidden, marks } = req.body;

    const testCase = await require('../models/TestCase').create({
      questionId: question.id,
      input,
      expectedOutput,
      isHidden: isHidden || false,
      marks: marks || 10
    });

    res.status(201).json({ message: 'Test case added!', testCase });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get test cases for a question (company only sees all, candidates see only non-hidden)
router.get('/questions/:questionId/testcases', authMiddleware, async (req, res) => {
  try {
    const TestCase = require('../models/TestCase');
    const whereClause = req.user.role === 'candidate'
      ? { questionId: req.params.questionId, isHidden: false }
      : { questionId: req.params.questionId };

    const testCases = await TestCase.findAll({ where: whereClause });
    res.json({ testCases });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;