const express = require('express');
const router = express.Router();
const ContestRegistration = require('../models/ContestRegistration');
const Contest = require('../models/Contest');
const Question = require('../models/Question');
const User = require('../models/User');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');
const { sendContestCredentials } = require('../config/email');

// Register for a contest
router.post('/register', authMiddleware, roleMiddleware('candidate'), async (req, res) => {
  try {
    const { contestId, phone, college, experience } = req.body;

    const contest = await Contest.findByPk(contestId, {
      include: [{
        model: Question,
        as: 'questions',
        separate: true
      }]
    });

    if (!contest) {
      return res.status(404).json({ message: 'Contest not found' });
    }

    // Block registration if contest has already started
    const now = new Date();
    const startTime = new Date(contest.startTime);
    if (now >= startTime) {
      return res.status(400).json({
        message: 'Registration is closed. This contest has already started!'
      });
    }

    // Check if already registered
    const existing = await ContestRegistration.findOne({
      where: { userId: req.user.id, contestId }
    });
    if (existing) {
      return res.status(400).json({ message: 'Already registered for this contest' });
    }

    // Get candidate details
    const candidate = await User.findByPk(req.user.id);

    // Create registration
    const registration = await ContestRegistration.create({
      userId: req.user.id,
      contestId,
      phone,
      college,
      experience
    });

    // Send email with credentials
    try {
      await sendContestCredentials(
        candidate.email,
        candidate.name,
        contest.title,
        {
          password: 'Use your CodeStorm password',
          startTime: new Date(contest.startTime).toLocaleString(),
          endTime: new Date(contest.endTime).toLocaleString(),
          questionCount: contest.questions?.length || 0
        }
      );
    } catch (emailErr) {
      console.error('Email sending failed:', emailErr.message);
      // Don't fail registration if email fails
    }

    res.status(201).json({
      message: 'Registered successfully! Check your email for contest details.',
      registration
    });

  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Check if candidate is registered for a contest
router.get('/check/:contestId', authMiddleware, roleMiddleware('candidate'), async (req, res) => {
  try {
    const registration = await ContestRegistration.findOne({
      where: {
        userId: req.user.id,
        contestId: req.params.contestId
      }
    });

    res.json({ isRegistered: !!registration });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get all registered candidates for a contest (company/admin)
router.get('/contest/:contestId', authMiddleware, roleMiddleware('company', 'admin'), async (req, res) => {
  try {
    const registrations = await ContestRegistration.findAll({
      where: { contestId: req.params.contestId },
      include: [{ association: 'candidate', attributes: ['id', 'name', 'email'] }],
      order: [['registeredAt', 'ASC']]
    });

    res.json({
      total: registrations.length,
      registrations
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;