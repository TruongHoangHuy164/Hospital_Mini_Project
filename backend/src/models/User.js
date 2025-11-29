const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, unique: true, lowercase: true, trim: true, sparse: true },
    phone: { type: String, unique: true, trim: true, sparse: true },
    password: { type: String, required: true, minlength: 6 },
  role: { type: String, enum: ['user', 'doctor', 'admin', 'reception', 'lab', 'nurse', 'pharmacy'], default: 'user', index: true },
  permissions: { type: [String], default: [] },
  lastActive: { type: Date, index: true },
    // Trạng thái tài khoản
    isLocked: { type: Boolean, default: false, index: true },
    // Quản lý refresh token (lưu mã định danh, không lưu token thô)
    refreshTokenIds: { type: [String], default: [] },
    // Đặt lại mật khẩu
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
  },
  { timestamps: true }
);

// Index kết hợp hỗ trợ truy vấn theo vai trò + hoạt động gần đây
UserSchema.index({ role: 1, lastActive: -1 });

UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

UserSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model('User', UserSchema);
