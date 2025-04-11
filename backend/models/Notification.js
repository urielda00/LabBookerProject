const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  user   : { type: mongoose.Types.ObjectId, ref: 'User', required: true },

  /* ❶  NEW  —  i18next key + params  */
  key    : { type: String,  required: true },   // e.g. "booking.notify.deleted"
  params : { type: Object,  default: {} },      // e.g. { room:"Lab 1" }

  type   : { type: String,  required: true },   // "bookingDeletion", …
  isRead : { type: Boolean, default: false },
  readAt : { type: Date,    default: null },
  createdAt: { type: Date,  default: Date.now }
});

/* TTL: remove 3 days after readAt is set */
NotificationSchema.index({ readAt: 1 }, { expireAfterSeconds: 3 * 24 * 60 * 60 });

module.exports = mongoose.model('Notification', NotificationSchema);
