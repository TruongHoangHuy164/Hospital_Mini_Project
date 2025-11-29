const mongoose = require('mongoose');

// Mô hình Lịch làm việc tổng hợp cho nhân sự (doctor, reception, lab, cashier, nurse)
// Mục tiêu: quản lý lịch theo ngày/ca và loại ca để hiển thị theo tháng
// Quy ước:
// - Ngày (day) lưu dạng chuỗi cố định 'YYYY-MM-DD' để tránh sai lệch múi giờ
// - Ca làm việc (shift): sang | chieu | toi
// - Loại ca (shiftType): lam_viec | truc | nghi
// - Ghi chú (note) + lý do (reason) cho ca nghỉ hoặc trực

const WorkScheduleSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    role: { type: String, enum: ['doctor','reception','lab','nurse'], required: true, index: true },
  // Lưu ngày dạng chuỗi cố định 'YYYY-MM-DD' để tránh vấn đề timezone
  day: { type: String, required: true, match: /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/, index: true },
    shift: { type: String, enum: ['sang','chieu','toi'], required: true },
    shiftType: { type: String, enum: ['lam_viec','truc','nghi'], default: 'lam_viec', index: true },
    clinicId: { type: mongoose.Schema.Types.ObjectId, ref: 'PhongKham' }, // Tùy chọn
    reason: { type: String },
    note: { type: String },
    // Metadata tùy chọn cho mở rộng về sau
    meta: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

// Ràng buộc: mỗi user chỉ có 1 bản ghi duy nhất cho cặp (day, shift)
WorkScheduleSchema.index({ userId: 1, day: 1, shift: 1 }, { unique: true });
// Tối ưu truy vấn theo vai trò + theo tháng
WorkScheduleSchema.index({ role: 1, day: 1 });

module.exports = mongoose.model('WorkSchedule', WorkScheduleSchema);
