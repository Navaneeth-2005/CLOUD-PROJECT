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
    const contests = await Contest.findAll({
      include: [{ association: 'questions' }],
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
      include: [{ association: 'questions' }]
    });

    if (!contest) {
      return res.status(404).json({ message: 'Contest not found' });
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

    await contest.destroy();
    res.json({ message: 'Contest deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;