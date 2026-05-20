const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const PrepContribution = require('../models/PrepContribution');
const PrepDoubt = require('../models/PrepDoubt');
const User = require('../models/User');
const notificationService = require('../services/notificationService');
const sequelize = require('../config/db');

// 1. Submit a preparation experience contribution
router.post('/contribute', authMiddleware, async (req, res) => {
  try {
    const { companyName, companyType, tips, resources } = req.body;

    if (!companyName || !companyType || !tips || !resources) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    if (!['product', 'service', 'startup'].includes(companyType)) {
      return res.status(400).json({ message: 'Invalid company type category' });
    }

    // Clean and normalize company name (e.g. "google" -> "Google", "goldman sachs" -> "Goldman Sachs")
    const formattedCompanyName = companyName
      .trim()
      .split(/\s+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');

    const contribution = await PrepContribution.create({
      userId: req.user.id,
      companyName: formattedCompanyName,
      companyType,
      tips: tips.trim(),
      resources: resources.trim()
    });

    res.status(201).json({
      message: 'Interview preparation experience contributed successfully!',
      contribution
    });

  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// 2. Fetch list of unique companies grouped by category
router.get('/companies', authMiddleware, async (req, res) => {
  try {
    const companies = await PrepContribution.findAll({
      attributes: [
        'companyName',
        'companyType',
        [sequelize.fn('COUNT', sequelize.col('id')), 'contributionCount']
      ],
      group: ['companyName', 'companyType'],
      order: [['companyName', 'ASC']]
    });

    res.json(companies);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// 3. Get all contributions for a specific company name (case-insensitive query)
router.get('/company/:companyName', authMiddleware, async (req, res) => {
  try {
    const { companyName } = req.params;

    // Normalizing matching logic
    const formattedCompanyName = companyName
      .trim()
      .split(/\s+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');

    const contributions = await PrepContribution.findAll({
      where: { companyName: formattedCompanyName },
      include: [
        {
          model: User,
          as: 'contributor',
          attributes: ['id', 'name', 'email']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json(contributions);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// 4. Get full details of a specific contribution and its Q&A doubts (nested replies format)
router.get('/contribution/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const contribution = await PrepContribution.findByPk(id, {
      include: [
        {
          model: User,
          as: 'contributor',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    if (!contribution) {
      return res.status(404).json({ message: 'Preparation card not found' });
    }

    // Fetch all doubts for this prep post
    const allDoubts = await PrepDoubt.findAll({
      where: { prepId: id },
      include: [
        {
          model: User,
          as: 'sender',
          attributes: ['id', 'name', 'email']
        }
      ],
      order: [['createdAt', 'ASC']]
    });

    // Build the nested reply tree in JS
    const doubts = [];
    const replyMap = {};

    // Group doubts and replies
    allDoubts.forEach(doubt => {
      const doubtData = doubt.toJSON();
      doubtData.replies = [];

      if (!doubt.parentDoubtId) {
        doubts.push(doubtData);
        replyMap[doubt.id] = doubtData;
      } else {
        if (!replyMap[doubt.parentDoubtId]) {
          // Fallback if parent not registered yet (shouldn't happen with chronological order)
          replyMap[doubt.parentDoubtId] = { replies: [] };
        }
        replyMap[doubt.parentDoubtId].replies.push(doubtData);
      }
    });

    res.json({
      contribution,
      doubts
    });

  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// 5. Submit a doubt or a reply to a doubt
router.post('/contribution/:id/doubt', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { content, parentDoubtId } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'Comment content cannot be empty' });
    }

    const contribution = await PrepContribution.findByPk(id);
    if (!contribution) {
      return res.status(404).json({ message: 'Preparation card not found' });
    }

    if (parentDoubtId) {
      const parentDoubt = await PrepDoubt.findByPk(parentDoubtId);
      if (!parentDoubt) {
        return res.status(404).json({ message: 'Parent doubt not found' });
      }
    }

    const doubt = await PrepDoubt.create({
      prepId: id,
      senderId: req.user.id,
      content: content.trim(),
      parentDoubtId: parentDoubtId || null
    });

    // Look up the sender's name from DB (JWT only has id + role)
    const senderUser = await User.findByPk(req.user.id, { attributes: ['name'] });
    const senderName = senderUser ? senderUser.name : 'Someone';

    // Create notification
    if (parentDoubtId) {
      // This is a reply to an existing doubt
      const parentDoubt = await PrepDoubt.findByPk(parentDoubtId);
      if (parentDoubt && parentDoubt.senderId !== req.user.id) {
        await notificationService.createNotification({
          userId: parentDoubt.senderId,
          type: 'reply_received',
          entityId: id,
          message: `${senderName} replied to your doubt.`
        });
      }
    } else {
      // New doubt on a contribution – notify the contribution owner
      if (contribution.userId !== req.user.id) {
        await notificationService.createNotification({
          userId: contribution.userId,
          type: 'doubt_received',
          entityId: id,
          message: `${senderName} asked a doubt on your contribution.`
        });
      }
    }

    const populatedDoubt = await PrepDoubt.findByPk(doubt.id, {
      include: [
        {
          model: User,
          as: 'sender',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    res.status(201).json({
      message: 'Doubt/Reply posted successfully!',
      doubt: populatedDoubt
    });

  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
