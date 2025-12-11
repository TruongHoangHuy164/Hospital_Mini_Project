const mongoose = require('mongoose');

const ChatMessageSchema = new mongoose.Schema({
  roomId: { type: String, required: true, index: true },
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  senderRole: { type: String, enum: ['user','reception','doctor','admin','nurse','lab','cashier'], required: true },
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, index: true },
}, { versionKey: false });

module.exports = mongoose.model('ChatMessage', ChatMessageSchema);
