const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const InterviewSession = require('../models/InterviewSession');
const User = require('../models/User');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');
const { sendInterviewInvitation } = require('../config/email');

// 1. Create a new scheduled interview session (Company / Admin only)
router.post('/create', authMiddleware, roleMiddleware('company', 'admin'), async (req, res) => {
  try {
    const { title, candidateName, candidateEmail, scheduledStart, scheduledEnd } = req.body;

    if (!title || !candidateName || !candidateEmail || !scheduledStart || !scheduledEnd) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Generate secure unique join token
    const joinToken = crypto.randomUUID();

    const session = await InterviewSession.create({
      title,
      companyId: req.user.id,
      candidateName,
      candidateEmail,
      scheduledStart: new Date(scheduledStart),
      scheduledEnd: new Date(scheduledEnd),
      joinToken
    });

    // Generate the live join link
    const frontendURL = process.env.FRONTEND_URL || 'http://localhost:5173';
    const joinUrl = `${frontendURL}/interview/${joinToken}`;

    // Send beautiful email invitation to the candidate
    try {
      const interviewer = await User.findByPk(req.user.id);
      await sendInterviewInvitation(
        candidateEmail,
        candidateName,
        interviewer.name,
        title,
        new Date(scheduledStart).toLocaleString(),
        joinUrl
      );
    } catch (emailErr) {
      console.error('Failed to send email invite:', emailErr.message);
    }

    res.status(201).json({
      message: 'Interview session created and invitation sent successfully!',
      session,
      joinUrl
    });

  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// 2. Get list of scheduled interviews for active company interviewer
router.get('/list', authMiddleware, roleMiddleware('company', 'admin'), async (req, res) => {
  try {
    const sessions = await InterviewSession.findAll({
      where: { companyId: req.user.id },
      order: [['scheduledStart', 'ASC']]
    });
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// 3. Get session metadata using the unique join token (Anonymous allowed to allow candidates to enter)
router.get('/session/:token', async (req, res) => {
  try {
    const session = await InterviewSession.findOne({
      where: { joinToken: req.params.token },
      include: [{ model: User, as: 'interviewer', attributes: ['name', 'email'] }]
    });

    if (!session) {
      return res.status(404).json({ message: 'Interview session not found or invalid link' });
    }

    res.json(session);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// 4. Update status of the interview session (Company / Admin only)
router.post('/session/:token/status', authMiddleware, roleMiddleware('company', 'admin'), async (req, res) => {
  try {
    const { status } = req.body;

    if (!['scheduled', 'active', 'completed'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const session = await InterviewSession.findOne({
      where: { joinToken: req.params.token }
    });

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    if (session.companyId !== req.user.id) {
      return res.status(403).json({ message: 'Access denied: You are not the owner of this session' });
    }

    await session.update({ status });
    res.json({ message: `Session status updated to ${status}`, session });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// 5. Extend interview session end time (Company / Admin only)
router.post('/session/:token/extend', authMiddleware, roleMiddleware('company', 'admin'), async (req, res) => {
  try {
    const { minutes } = req.body;

    if (!minutes || isNaN(minutes) || minutes <= 0) {
      return res.status(400).json({ message: 'Valid extension minutes required' });
    }

    const session = await InterviewSession.findOne({
      where: { joinToken: req.params.token }
    });

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    if (session.companyId !== req.user.id) {
      return res.status(403).json({ message: 'Access denied: You are not the owner of this session' });
    }

    const currentEnd = new Date(session.scheduledEnd);
    const newEnd = new Date(currentEnd.getTime() + minutes * 60 * 1000);

    await session.update({ scheduledEnd: newEnd });
    res.json({ message: `Session extended successfully by ${minutes} minutes`, session });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
