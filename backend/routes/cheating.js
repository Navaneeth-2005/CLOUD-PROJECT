const express = require('express');
const router = express.Router();
const CheatingLog = require('../models/CheatingLog');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');
const { fn, col } = require('sequelize');

// Candidate logs a cheating event from frontend
router.post('/log', authMiddleware, roleMiddleware('candidate'), async (req, res) => {
  try {
    const { contestId, eventType, details } = req.body;

    // Check if event already logged — increment count if so
    const existing = await CheatingLog.findOne({
      where: {
        userId: req.user.id,
        contestId,
        eventType
      }
    });

    if (existing) {
      existing.eventCount += 1;

      // Flag candidate if tab switch exceeds 3 times
      if (eventType === 'tab_switch' && existing.eventCount >= 3) {
        existing.flagged = true;
      }

      await existing.save();
      return res.json({
        message: 'Event updated',
        eventCount: existing.eventCount,
        flagged: existing.flagged
      });
    }

    // Create new log entry
    const log = await CheatingLog.create({
      userId: req.user.id,
      contestId,
      eventType,
      details,
      flagged: false
    });

    res.status(201).json({
      message: 'Event logged',
      eventCount: log.eventCount,
      flagged: log.flagged
    });

  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Company/admin — get cheating logs for a contest
router.get('/contest/:contestId', authMiddleware, roleMiddleware('company', 'admin'), async (req, res) => {
  try {
    const logs = await CheatingLog.findAll({
      where: { contestId: req.params.contestId },
      include: [
        {
          association: 'candidate',
          attributes: ['id', 'name', 'email']
        }
      ],
      order: [['eventCount', 'DESC']]
    });

    res.json({ logs });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Company/admin — get only flagged candidates for a contest
router.get('/contest/:contestId/flagged', authMiddleware, roleMiddleware('company', 'admin'), async (req, res) => {
  try {
    const flagged = await CheatingLog.findAll({
      where: {
        contestId: req.params.contestId,
        flagged: true
      },
      include: [
        {
          association: 'candidate',
          attributes: ['id', 'name', 'email']
        }
      ],
      order: [['eventCount', 'DESC']]
    });

    res.json({
      totalFlagged: flagged.length,
      flagged
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Company/admin — get summary of cheating per candidate
router.get('/contest/:contestId/summary', authMiddleware, roleMiddleware('company', 'admin'), async (req, res) => {
  try {
    const summary = await CheatingLog.findAll({
      where: { contestId: req.params.contestId },
      attributes: [
        'userId',
        'flagged',
        [fn('SUM', col('eventCount')), 'totalEvents'],
        [fn('COUNT', col('eventType')), 'uniqueEventTypes']
      ],
      include: [
        {
          association: 'candidate',
          attributes: ['id', 'name', 'email']
        }
      ],
      group: ['userId', 'flagged', 'candidate.id', 'candidate.name', 'candidate.email'],
      order: [[fn('SUM', col('eventCount')), 'DESC']],
      raw: false,
      subQuery: false
    });

    res.json({
      summary: summary.map(s => ({
        candidate: s.candidate,
        totalEvents: s.dataValues.totalEvents,
        uniqueEventTypes: s.dataValues.uniqueEventTypes,
        flagged: s.flagged
      }))
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;