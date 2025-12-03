const mongoose = require('mongoose');

// Cấu hình mở lịch theo tháng: kiểm soát khung thời gian cho phép tạo lịch
const ScheduleConfigSchema = new mongoose.Schema({
  month: { type: String, required: true, match: /^[0-9]{4}-[0-9]{2}$/, unique: true }, // Định dạng tháng: YYYY-MM
  openFrom: { type: String, required: true, match: /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/ }, // Ngày bắt đầu mở: YYYY-MM-DD
  // Khung giờ ca làm việc (tuỳ chỉnh theo tháng). Nếu không set, dùng mặc định ở API.
  // Định dạng: { sang: { start: 'HH:MM', end: 'HH:MM' }, chieu: { start, end }, toi: { start, end } }
  shiftHours: {
    type: new mongoose.Schema({
      sang: { type: new mongoose.Schema({ start: String, end: String }, { _id: false }), default: undefined },
      chieu: { type: new mongoose.Schema({ start: String, end: String }, { _id: false }), default: undefined },
      toi: { type: new mongoose.Schema({ start: String, end: String }, { _id: false }), default: undefined }
    }, { _id: false }),
    default: undefined
  },
  note: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('ScheduleConfig', ScheduleConfigSchema);
