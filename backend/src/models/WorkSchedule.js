const mongoose = require('mongoose');

// Tổng hợp lịch làm việc cho mọi loại nhân sự (doctor, reception, lab, cashier, nurse)
// Mục tiêu: quản lý lịch theo ngày/ca và loại ca để hiển thị theo tháng
// Quy ước: ngày (day) luôn lưu ở mốc 00:00 UTC của ngày đó (theo server) để dễ query.
// Ca làm việc (shift): sang | chieu | toi (có thể mở rộng sau)
// Loại ca (shiftType): lam_viec | truc | nghi
// Ghi chú (note) + lý do (reason) cho ca nghỉ hoặc trực.

const WorkScheduleSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    role: { type: String, enum: ['doctor','reception','lab','cashier','nurse'], required: true, index: true },
  // Store date-only as fixed string 'YYYY-MM-DD' to avoid timezone issues
  day: { type: String, required: true, match: /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/, index: true },
    shift: { type: String, enum: ['sang','chieu','toi'], required: true },
    shiftType: { type: String, enum: ['lam_viec','truc','nghi'], default: 'lam_viec', index: true },
    clinicId: { type: mongoose.Schema.Types.ObjectId, ref: 'PhongKham' }, // tùy chọn
    reason: { type: String },
    note: { type: String },
    // optional metadata for future expansion
    meta: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

// Một user chỉ có 1 record duy nhất cho day+shift
WorkScheduleSchema.index({ userId: 1, day: 1, shift: 1 }, { unique: true });
// Query theo role + month hiệu quả
WorkScheduleSchema.index({ role: 1, day: 1 });

module.exports = mongoose.model('WorkSchedule', WorkScheduleSchema);
