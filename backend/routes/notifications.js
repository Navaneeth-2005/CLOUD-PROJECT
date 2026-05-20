const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const notificationService = require('../services/notificationService');

// Fetch all notifications for the current user
router.get('/', authMiddleware, async (req, res) => {
  try {
    const notifications = await notificationService.getNotifications(req.user.id);
    res.json(notifications);
  } catch (err) {
    console.error('Error fetching notifications:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Mark a specific notification as read
router.post('/:id/read', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await notificationService.markNotificationAsRead(req.user.id, id);
    res.json({ message: 'Notification marked as read', notification: updated });
  } catch (err) {
    console.error('Error marking notification as read:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
