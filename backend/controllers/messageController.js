// controllers/messageController.js
const Message = require('../models/Message');
const User = require('../models/User');
const ChatSetting = require('../models/ChatSetting');
const notificationsController = require('./notificationsController');

const sendMessage = async (req, res) => {
  const { content, channel = 'all' } = req.body;
  const io = req.app.get('io');
  const sender = req.user;
  if (!sender) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  // 1) check chat enabled
  const { enabled } = (await ChatSetting.findOne()) || {};
  if (!enabled && sender.role !== 'admin') {
    return res.status(403).json({ message: 'Chat is currently disabled.' });
  }
  if (channel === 'admin' && sender.role !== 'admin') {
    return res.status(403).json({ message: 'Only admins can post here.' });
  }

  // 2) create message with sender already in readBy
  const raw = new Message({
    sender: sender._id,
    content,
    channel,
    readBy: [sender._id],
  });
  await raw.save();

  // 3) populate sender for the client
  await raw.populate('sender', 'username role profilePicture');
  const message = raw; // now populated

  // 4) handle @-mentions
  const mentionPattern = /@([A-Za-z0-9_]+)/g;
  let match;
  while ((match = mentionPattern.exec(content))) {
    const username = match[1];
    const userMentioned = await User.findOne({ username }).select('_id');
    if (userMentioned) {
      await notificationsController.createNotification(
        userMentioned._id,               // recipient
        'chat.notify.mention',           // i18n key
        { from: sender.username, snippet: content.slice(0, 50) },
        'mention',                       // type
        message._id.toString()           // related ID
      );
    }
  }

  // 5) broadcast to all clients
  io.emit('chatMessage', message);
  return res.status(201).json({ message });
};


const getAllMessages = async (req, res) => {
  const { limit = 50, before, channel = 'all' } = req.query;
  const query = { channel };
  if (before) {
    query.createdAt = { $lt: new Date(before) };
  }

  const raw = await Message.find(query)
    .sort({ createdAt: -1 })
    .limit(+limit)
    .populate('sender', 'username role profilePicture');

  const messages = raw.reverse(); // oldest → newest
  return res.status(200).json({ messages });
};


const getChatSettings = async (req, res) => {
  const settings = await ChatSetting.findOne();
  return res
    .status(200)
    .json({ enabled: settings?.enabled ?? true });
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
    {}, { enabled },
    { new: true, upsert: true }
  );
  return res.status(200).json({ enabled: settings.enabled });
};


// POST /message/mark-read
const markMessagesRead = async (req, res) => {
  const userId = req.user._id;
  const { channel } = req.body;

  // Only update messages that are actually unread
  await Message.updateMany(
    { 
      channel,
      readBy: { $ne: userId },
      createdAt: { $lte: new Date() } // Only existing messages
    },
    { $addToSet: { readBy: userId } }
  );

  return res.sendStatus(204);
};


module.exports = {
  sendMessage,
  getAllMessages,
  getChatSettings,
  updateChatSettings,
  markMessagesRead,
};
