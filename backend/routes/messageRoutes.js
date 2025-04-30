// routes/messageRoutes.js
const express = require('express');
const router = express.Router();
const { sendMessage , getAllMessages} = require('../controllers/messageController');

// Route to send a message
router.post('/send', sendMessage);

// Route to fetch all messages
router.get('/', getAllMessages);

module.exports = router;
