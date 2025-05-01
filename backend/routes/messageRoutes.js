const express = require('express');
const router = express.Router();
const {
  sendMessage,
  getAllMessages,
  getChatSettings,
  updateChatSettings,
  markMessagesRead
} = require('../controllers/messageController');
const authMiddleware = require('../middleware/authMiddleware');  // <-- your JWT guard

// public chat routes
router.post('/send', authMiddleware.requireAuth, sendMessage);
router.get('/', authMiddleware.requireAuth, getAllMessages);


// admin‐only settings
router.get('/settings', authMiddleware.requireAuth, getChatSettings);
router.post('/settings', authMiddleware.requireAuth, updateChatSettings);

router.post('/mark-read', authMiddleware.requireAuth, markMessagesRead);


module.exports = router;
