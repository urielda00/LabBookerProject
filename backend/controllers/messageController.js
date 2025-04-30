// controllers/messageController.js
const Message = require("../models/Message");
const User = require("../models/User");

const sendMessage = async (req, res) => {
  const { senderId, content } = req.body;
  const io = req.app.get("io"); // Access the socket.io instance from the request object

  try {
    // Check if the sender exists
    const sender = await User.findById(senderId);
    if (!sender) {
      return res.status(404).json({ message: "Sender not found" });
    }

    // Create a new message for the global chat
    const newMessage = new Message({
      sender: senderId,
      content,
    });

    // Save the message
    await newMessage.save();

    // Emit the new message to all users
    io.emit("newMessage", newMessage);

    return res.status(201).json({ message: newMessage });
  } catch (error) {
    console.error("Error sending message:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
const getAllMessages = async (req, res) => {
  try {
    const messages = await Message.find()
      .sort({ createdAt: 1 }) // oldest first
      .populate("sender", "username"); // populate sender username only

    return res.status(200).json({ messages });
  } catch (error) {
    console.error("Error fetching messages:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
  sendMessage,
  getAllMessages,
};
