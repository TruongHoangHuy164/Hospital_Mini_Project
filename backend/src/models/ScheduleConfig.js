const mongoose = require('mongoose');

// Cấu hình mở lịch theo tháng: kiểm soát khung thời gian cho phép tạo lịch
const ScheduleConfigSchema = new mongoose.Schema({
  month: { type: String, required: true, match: /^[0-9]{4}-[0-9]{2}$/, unique: true }, // Định dạng tháng: YYYY-MM
  openFrom: { type: String, required: true, match: /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/ }, // Ngày bắt đầu mở: YYYY-MM-DD
  note: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('ScheduleConfig', ScheduleConfigSchema);
