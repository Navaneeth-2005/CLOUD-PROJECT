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

    const submissions = await Submission.findAll({
      where: {
        contestId: req.params.contestId,
        status: 'accepted'
      },
      include: [
        {
          model: User,
          as: 'candidate',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    const userStats = {};

    submissions.forEach(sub => {
      const uId = sub.userId;
      if (!userStats[uId]) {
        userStats[uId] = {
          candidate: sub.candidate,
          questions: {},
          totalSubmissions: 0
        };
      }
      
      userStats[uId].totalSubmissions++;

      const qId = sub.questionId;
      if (!userStats[uId].questions[qId]) {
        userStats[uId].questions[qId] = {
          score: sub.score,
          passed: sub.testCasesPassed || 0,
          time: sub.executionTime || 0
        };
      } else {
        if (sub.score > userStats[uId].questions[qId].score) {
          userStats[uId].questions[qId].score = sub.score;
          userStats[uId].questions[qId].passed = sub.testCasesPassed || 0;
          userStats[uId].questions[qId].time = sub.executionTime || 0;
        } else if (sub.score === userStats[uId].questions[qId].score) {
          if (sub.executionTime < userStats[uId].questions[qId].time) {
            userStats[uId].questions[qId].time = sub.executionTime;
          }
        }
      }
    });

    const leaderboard = Object.values(userStats).map(stat => {
      let totalScore = 0;
      let totalPassed = 0;
      let bestTime = 0;

      Object.values(stat.questions).forEach(q => {
        totalScore += q.score;
        totalPassed += q.passed;
        bestTime += q.time;
      });

      return {
        candidate: stat.candidate,
        totalScore,
        totalPassed,
        bestTime,
        totalSubmissions: stat.totalSubmissions
      };
    });

    leaderboard.sort((a, b) => {
      if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
      return a.bestTime - b.bestTime;
    });

    res.json({
      contest: { id: contest.id, title: contest.title },
      leaderboard: leaderboard.map((entry, index) => ({
        rank: index + 1,
        ...entry
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

    const submissions = await Submission.findAll({
      where: {
        contestId: req.params.contestId,
        status: 'accepted'
      },
      include: [
        {
          model: User,
          as: 'candidate',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    const userStats = {};

    submissions.forEach(sub => {
      const uId = sub.userId;
      if (!userStats[uId]) {
        userStats[uId] = {
          candidate: sub.candidate,
          questions: {}
        };
      }
      
      const qId = sub.questionId;
      if (!userStats[uId].questions[qId] || sub.score > userStats[uId].questions[qId].score) {
        userStats[uId].questions[qId] = {
          score: sub.score,
          passed: sub.testCasesPassed || 0
        };
      }
    });

    const shortlisted = Object.values(userStats).map(stat => {
      let totalScore = 0;
      let totalPassed = 0;

      Object.values(stat.questions).forEach(q => {
        totalScore += q.score;
        totalPassed += q.passed;
      });

      return {
        candidate: stat.candidate,
        totalScore,
        totalPassed
      };
    });

    shortlisted.sort((a, b) => b.totalScore - a.totalScore);
    const topShortlisted = shortlisted.slice(0, topN);

    res.json({
      contest: { id: contest.id, title: contest.title },
      topN,
      shortlisted: topShortlisted.map((entry, index) => ({
        rank: index + 1,
        ...entry
      }))
    });

  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;