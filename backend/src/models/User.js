const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6 },
  role: { type: String, enum: ['user', 'doctor', 'admin', 'reception', 'lab', 'cashier', 'nurse', 'pharmacy'], default: 'user', index: true },
  permissions: { type: [String], default: [] },
  lastActive: { type: Date, index: true },
    // Account status
    isLocked: { type: Boolean, default: false, index: true },
    // Refresh token management (store identifiers, not raw tokens)
    refreshTokenIds: { type: [String], default: [] },
    // Password reset
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
  },
  { timestamps: true }
);

// Helpful compound index for role + recent activity
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
