const mongoose = require('mongoose');

// Mô hình OTP: lưu mã OTP theo người dùng/email để xác thực các hành động nhạy cảm
const OtpSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  email: {
    type: String,
    required: true,
    index: true
  },
  otp: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['change_password', 'forgot_password', 'verify_email'], // loại OTP: đổi mật khẩu, quên mật khẩu, xác minh email
    default: 'change_password'
  },
  isUsed: {
    type: Boolean,
    default: false
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expireAfterSeconds: 0 } // MongoDB tự động xóa tài liệu khi hết hạn
  }
}, {
  timestamps: true
});

// Index hỗ trợ dọn dẹp OTP đã sử dụng
OtpSchema.index({ isUsed: 1, expiresAt: 1 });

module.exports = mongoose.model('Otp', OtpSchema);