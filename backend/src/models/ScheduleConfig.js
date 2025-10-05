const mongoose = require('mongoose');

const ScheduleConfigSchema = new mongoose.Schema({
  month: { type: String, required: true, match: /^[0-9]{4}-[0-9]{2}$/, unique: true }, // YYYY-MM
  openFrom: { type: String, required: true, match: /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/ }, // YYYY-MM-DD
  note: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('ScheduleConfig', ScheduleConfigSchema);
