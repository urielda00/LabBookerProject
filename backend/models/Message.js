// models/Message.js
const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true },
  channel: {
    type: String,
    enum: ['all', 'admin'],
    default: 'all'
  },
  readBy: [
    { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  ]
}, { timestamps: true });

// models/Message.js
messageSchema.index({ channel: 1, readBy: 1, createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema);