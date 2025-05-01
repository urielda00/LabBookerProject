// models/ChatSetting.js
const mongoose = require('mongoose');

const chatSettingSchema = new mongoose.Schema({
  enabled: { type: Boolean, default: true }
});

module.exports = mongoose.model('ChatSetting', chatSettingSchema);
