const express = require('express');
const router = express.Router();
const Submission = require('../models/Submission');
const User = require('../models/User');
const Contest = require('../models/Contest');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');
const { fn, col, literal } = require('sequelize');

// Get leaderboard for a contest
router.get('/:contestId', authMiddleware, async (req, res) => {
  try {
    const contest = await Contest.findByPk(req.params.contestId);
    if (!contest) {
      return res.status(404).json({ message: 'Contest not found' });
    }

    const leaderboard = await Submission.findAll({
      where: {
        contestId: req.params.contestId,
        status: 'accepted'
      },
      attributes: [
        'userId',
        [fn('SUM', col('Submission.score')), 'totalScore'],
        [fn('SUM', col('Submission.testCasesPassed')), 'totalPassed'],
        [fn('MIN', col('Submission.executionTime')), 'bestTime'],
        [fn('COUNT', col('Submission.id')), 'totalSubmissions']
      ],
      include: [
        {
          model: User,
          as: 'candidate',
          attributes: ['id', 'name', 'email']
        }
      ],
      group: [
        'Submission.userId',
        'candidate.id',
        'candidate.name',
        'candidate.email'
      ],
      order: [[literal('totalScore'), 'DESC']],
      raw: false,
      subQuery: false
    });

    res.json({
      contest: { id: contest.id, title: contest.title },
      leaderboard: leaderboard.map((entry, index) => ({
        rank: index + 1,
        candidate: entry.candidate,
        totalScore: entry.dataValues.totalScore || 0,
        totalPassed: entry.dataValues.totalPassed || 0,
        bestTime: entry.dataValues.bestTime || 0,
        totalSubmissions: entry.dataValues.totalSubmissions || 0
      }))
    });

  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get shortlisted candidates (top N) — company/admin only
router.get('/:contestId/shortlist/:topN', authMiddleware, roleMiddleware('company', 'admin'), async (req, res) => {
  try {
    const contest = await Contest.findByPk(req.params.contestId);
    if (!contest) {
      return res.status(404).json({ message: 'Contest not found' });
    }

    const topN = parseInt(req.params.topN) || 10;

    const shortlisted = await Submission.findAll({
      where: {
        contestId: req.params.contestId,
        status: 'accepted'
      },
      attributes: [
        'userId',
        [fn('SUM', col('Submission.score')), 'totalScore'],
        [fn('SUM', col('Submission.testCasesPassed')), 'totalPassed']
      ],
      include: [
        {
          model: User,
          as: 'candidate',
          attributes: ['id', 'name', 'email']
        }
      ],
      group: [
        'Submission.userId',
        'candidate.id',
        'candidate.name',
        'candidate.email'
      ],
      order: [[literal('totalScore'), 'DESC']],
      limit: topN,
      raw: false,
      subQuery: false
    });

    res.json({
      contest: { id: contest.id, title: contest.title },
      topN,
      shortlisted: shortlisted.map((entry, index) => ({
        rank: index + 1,
        candidate: entry.candidate,
        totalScore: entry.dataValues.totalScore || 0,
        totalPassed: entry.dataValues.totalPassed || 0
      }))
    });

  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;