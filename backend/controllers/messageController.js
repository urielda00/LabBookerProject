// controllers/messageController.js
const Message     = require('../models/Message');
const User        = require('../models/User');
const ChatSetting = require('../models/ChatSetting');

const sendMessage = async (req, res) => {
  const { content, channel = 'all' } = req.body;
  const io = req.app.get('io');

  // 1. We trust the JWT-populated req.user now
  const sender = req.user;
  if (!sender) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  // 2. Load the chat-enabled flag
  const { enabled } = await ChatSetting.findOne() || {};

  // 3. Block normal users when chat is disabled
  if (!enabled && sender.role !== 'admin') {
    return res.status(403).json({ message: 'Chat is currently disabled.' });
  }

  // 4. Enforce admin-only on the admin channel
  if (channel === 'admin' && sender.role !== 'admin') {
    return res.status(403).json({ message: 'Only admins can post here.' });
  }

   // 5a) Save the raw message
   const raw = new Message({ sender: sender._id, content, channel });
   await raw.save();
  
    // 5b) Populate the sender so the client can render username, avatar, etc.
    const message = await raw.populate('sender', 'username role profilePicture');
  
    // 5c) Broadcast the fully populated message
    io.emit('chatMessage', message);
    return res.status(201).json({ message });
};

// (Other methods unchanged…)
// controllers/messageController.js
const getAllMessages = async (req, res) => {
  const { limit = 50, before, channel = 'all' } = req.query;
  const query = { channel };
  if (before) query.createdAt = { $lt: new Date(before) };

  // fetch the latest `limit` messages (newest first)
  const raw = await Message.find(query)
    .sort({ createdAt: -1 })
    .limit(+limit)
    .populate('sender', 'username role profilePicture');

  // reverse so they become oldest→newest
  const messages = raw.reverse();

  return res.status(200).json({ messages });
};


const getChatSettings = async (req, res) => {
  const settings = await ChatSetting.findOne();
  return res.status(200).json({ enabled: settings?.enabled ?? true });
};

const updateChatSettings = async (req, res) => {
  const { enabled } = req.body;
  const user = req.user;
  if (!user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  if (user.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden' });
  }
  const settings = await ChatSetting.findOneAndUpdate(
    {}, { enabled }, { new: true, upsert: true }
  );
  return res.status(200).json({ enabled: settings.enabled });
};

module.exports = {
  sendMessage,
  getAllMessages,
  getChatSettings,
  updateChatSettings
};
