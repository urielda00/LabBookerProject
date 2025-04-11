// controllers/notificationsController.js
const mongoose      = require('mongoose');
const Notification   = require('../models/Notification');
const { isValidObjectId } = mongoose;

/* -------------------------------------------------------------- */
/* Helper — use from any other controller                          */
/* -------------------------------------------------------------- */
const createNotification = async (userId, key, params = {}, type = '') => {
  return Notification.create({ user: userId, key, params, type, isRead: false });
};

/* -------------------------------------------------------------- */
/* Controller                                                      */
/* -------------------------------------------------------------- */
const notificationsController = {
  /* keep helper available as notificationsController.createNotification */
  createNotification,

  /* GET /notifications */
  async getNotifications(req, res) {
    try {
      const notes = await Notification.find({ user: req.user._id })
                                      .sort({ createdAt: -1 });

      const out = notes.map(n => ({
        id        : n._id,
        type      : n.type,
        createdAt : n.createdAt,
        readAt    : n.readAt,
        isRead    : n.isRead,
        message   : req.t(n.key, n.params)      // translate here
      }));

      return res.status(200).json(out);
    } catch (err) {
      console.error('Get notifications error:', err);
      return res.status(500).json({ message: 'Failed to get notifications' });
    }
  },

  /* PUT /notifications/:id/read */
  async markAsRead(req, res) {
    const id = req.params.id;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid notification id' });
    }

    try {
      const n = await Notification.findOneAndUpdate(
        { _id: id, user: req.user._id },
        { isRead: true, readAt: new Date() },
        { new: true }
      );
      if (!n) return res.status(404).json({ message: 'Notification not found' });

      return res.status(200).json({
        id        : n._id,
        type      : n.type,
        createdAt : n.createdAt,
        readAt    : n.readAt,
        isRead    : n.isRead,
        message   : req.t(n.key, n.params)
      });
    } catch (err) {
      console.error('Mark as read error:', err);
      return res.status(500).json({ message: 'Failed to mark as read' });
    }
  },

  /* PUT /notifications/read-all */
  async markAllAsRead(req, res) {
    try {
      await Notification.updateMany(
        { user: req.user._id, isRead: false },
        { isRead: true, readAt: new Date() }
      );
      return res.status(200).json({ message: 'All notifications marked as read' });
    } catch (err) {
      console.error('Mark all as read error:', err);
      return res.status(500).json({ message: 'Failed to mark all as read' });
    }
  },

  /* DELETE /notifications/:id */
  async deleteNotification(req, res) {
    const id = req.params.id;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid notification id' });
    }

    try {
      const n = await Notification.findOneAndDelete({
        _id : id,
        user: req.user._id
      });
      if (!n) return res.status(404).json({ message: 'Notification not found' });

      return res.status(200).json({ message: 'Notification deleted.' });
    } catch (err) {
      console.error('Delete notification error:', err);
      return res.status(500).json({ message: 'Failed to delete notification' });
    }
  },

  /* DELETE /notifications/clear-all */
  async deleteAllNotifications(req, res) {
    try {
      await Notification.deleteMany({ user: req.user._id });
      return res.status(200).json({ message: 'All notifications deleted.' });
    } catch (err) {
      console.error('Delete all notifications error:', err);
      return res.status(500).json({ message: 'Failed to delete notifications' });
    }
  }
};

module.exports = notificationsController;
