const mongoose = require('mongoose');

// Mô hình tin nhắn chat trong hệ thống
// - roomId: mã phòng chat (chuỗi), dùng để nhóm các tin nhắn theo phiên/đối thoại
// - senderId: người gửi (tham chiếu tới User)
// - senderRole: vai trò của người gửi (giới hạn trong tập cho phép)
// - text: nội dung tin nhắn
// - createdAt: thời điểm gửi, mặc định theo thời gian hệ thống, có index để truy vấn theo thời gian
// Tắt versionKey để tránh trường __v mặc định của Mongoose
const ChatMessageSchema = new mongoose.Schema({
  roomId: { type: String, required: true, index: true },
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  senderRole: { type: String, enum: ['user','reception','doctor','admin','nurse','lab','cashier'], required: true },
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, index: true },
}, { versionKey: false });

module.exports = mongoose.model('ChatMessage', ChatMessageSchema);
