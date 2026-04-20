const express = require('express');
const announcementRouter = express.Router();
const notificationRouter = express.Router();
const adminRouter = express.Router();

const { Announcement, Notification, AuditLog } = require('../models/AuditLog');
const { protect, adminOnly } = require('../middleware/auth');

// ═══════════════════════════════════════════════
// ANNOUNCEMENTS
// ═══════════════════════════════════════════════

announcementRouter.get('/', protect, async (req, res) => {
  try {
    const query = { isActive: true };
    if (req.user.role !== 'admin') {
      query.$or = [{ expiresAt: { $gt: new Date() } }, { expiresAt: null }];
    }
    const announcements = await Announcement.find(query)
      .populate('postedBy', 'name')
      .sort({ createdAt: -1 })
      .limit(50);
    res.json({ success: true, announcements });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

announcementRouter.post('/', protect, adminOnly, async (req, res) => {
  try {
    const ann = await Announcement.create({ ...req.body, postedBy: req.user._id });
    res.status(201).json({ success: true, announcement: ann });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

announcementRouter.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    await Announcement.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ success: true, message: 'Announcement removed.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════════════
// NOTIFICATIONS
// ═══════════════════════════════════════════════

notificationRouter.get('/', protect, async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient: req.user._id })
      .sort({ createdAt: -1 })
      .limit(30);
    const unreadCount = await Notification.countDocuments({ recipient: req.user._id, isRead: false });
    res.json({ success: true, notifications, unreadCount });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

notificationRouter.patch('/read-all', protect, async (req, res) => {
  try {
    await Notification.updateMany({ recipient: req.user._id, isRead: false }, { isRead: true });
    res.json({ success: true, message: 'All marked as read.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

notificationRouter.patch('/:id/read', protect, async (req, res) => {
  try {
    await Notification.findOneAndUpdate({ _id: req.params.id, recipient: req.user._id }, { isRead: true });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════════════
// ADMIN — audit logs
// ═══════════════════════════════════════════════

adminRouter.get('/audit-logs', protect, adminOnly, async (req, res) => {
  try {
    const { page = 1, limit = 30 } = req.query;
    const total = await AuditLog.countDocuments();
    const logs = await AuditLog.find()
      .populate('performedBy', 'name studentId')
      .populate('targetUser', 'name studentId')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    res.json({ success: true, logs, total, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = { announcementRouter, notificationRouter, adminRouter };
