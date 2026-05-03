const express = require('express');
const router = express.Router();
const Submission = require('../models/Submission');
const Contest = require('../models/Contest');
const Question = require('../models/Question');
const User = require('../models/User');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');
const { fn, col, literal } = require('sequelize');

// Candidate — get their own performance summary
router.get('/my-performance', authMiddleware, roleMiddleware('candidate'), async (req, res) => {
  try {
    const userId = req.user.id;

    const totalSubmissions = await Submission.count({ where: { userId } });
    const accepted = await Submission.count({ where: { userId, status: 'accepted' } });
    const rejected = await Submission.count({ where: { userId, status: 'rejected' } });
    const pending = await Submission.count({ where: { userId, status: 'pending' } });

    const totalScore = await Submission.sum('score', { where: { userId, status: 'accepted' } });

    const byLanguage = await Submission.findAll({
      where: { userId },
      attributes: [
        'language',
        [fn('COUNT', col('id')), 'count']
      ],
      group: ['language'],
      raw: true
    });

    const recentSubmissions = await Submission.findAll({
      where: { userId },
      include: [
        { association: 'question', attributes: ['title', 'difficulty'] },
        { association: 'contest', attributes: ['title'] }
      ],
      order: [['createdAt', 'DESC']],
      limit: 5
    });

    res.json({
      summary: {
        totalSubmissions,
        accepted,
        rejected,
        pending,
        totalScore: totalScore || 0,
        acceptanceRate: totalSubmissions > 0
          ? ((accepted / totalSubmissions) * 100).toFixed(1) + '%'
          : '0%'
      },
      byLanguage,
      recentSubmissions
    });

  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Company — get analytics for a specific contest
router.get('/contest/:contestId', authMiddleware, roleMiddleware('company', 'admin'), async (req, res) => {
  try {
    const contest = await Contest.findByPk(req.params.contestId);
    if (!contest) {
      return res.status(404).json({ message: 'Contest not found' });
    }

    const totalSubmissions = await Submission.count({
      where: { contestId: req.params.contestId }
    });

    const accepted = await Submission.count({
      where: { contestId: req.params.contestId, status: 'accepted' }
    });

    const rejected = await Submission.count({
      where: { contestId: req.params.contestId, status: 'rejected' }
    });

    // Unique candidates who submitted
    const uniqueCandidates = await Submission.count({
      where: { contestId: req.params.contestId },
      distinct: true,
      col: 'userId'
    });

    // Submissions by language
    const byLanguage = await Submission.findAll({
      where: { contestId: req.params.contestId },
      attributes: [
        'language',
        [fn('COUNT', col('id')), 'count']
      ],
      group: ['language'],
      raw: true
    });

    // Submissions by question
    const byQuestion = await Submission.findAll({
      where: { contestId: req.params.contestId },
      attributes: [
        'questionId',
        [fn('COUNT', col('Submission.id')), 'totalSubmissions'],
        [fn('SUM',
          literal("CASE WHEN Submission.status = 'accepted' THEN 1 ELSE 0 END")),
          'acceptedCount'
        ]
      ],
      include: [
        {
          model: Question,
          as: 'question',
          attributes: ['title', 'difficulty']
        }
      ],
      group: ['questionId', 'question.id', 'question.title', 'question.difficulty'],
      raw: false,
      subQuery: false
    });

    res.json({
      contest: { id: contest.id, title: contest.title },
      summary: {
        totalSubmissions,
        accepted,
        rejected,
        uniqueCandidates,
        acceptanceRate: totalSubmissions > 0
          ? ((accepted / totalSubmissions) * 100).toFixed(1) + '%'
          : '0%'
      },
      byLanguage,
      byQuestion: byQuestion.map(q => ({
        question: q.question,
        totalSubmissions: q.dataValues.totalSubmissions,
        acceptedCount: q.dataValues.acceptedCount || 0
      }))
    });

  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Admin — platform wide analytics
router.get('/platform', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  try {
    const totalUsers = await User.count();
    const totalContests = await Contest.count();
    const totalSubmissions = await Submission.count();
    const totalAccepted = await Submission.count({ where: { status: 'accepted' } });

    const usersByRole = await User.findAll({
      attributes: [
        'role',
        [fn('COUNT', col('id')), 'count']
      ],
      group: ['role'],
      raw: true
    });

    res.json({
      summary: {
        totalUsers,
        totalContests,
        totalSubmissions,
        totalAccepted,
        acceptanceRate: totalSubmissions > 0
          ? ((totalAccepted / totalSubmissions) * 100).toFixed(1) + '%'
          : '0%'
      },
      usersByRole
    });

  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;