const mongoose = require('mongoose');

const DonThuocSchema = new mongoose.Schema(
  {
    hoSoKhamId: { type: mongoose.Schema.Types.ObjectId, ref: 'HoSoKham', required: true, index: true },
    ngayKeDon: { type: Date, default: Date.now },
    // Trạng thái đơn thuốc để workflow với nhà thuốc
    status: { type: String, enum: ['draft','issued','pending_pharmacy','dispensing','dispensed','closed','cancelled'], default: 'issued', index: true },
    // Ai và khi nào nhà thuốc phát
    pharmacyIssuedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    pharmacyIssuedAt: { type: Date },
    // Optionally keep simple list of items (can be derived from CapThuoc)
    items: [
      {
        // Chuyển tham chiếu sang kho thuốc (ThuocKho) để đồng nhất với inventory
        thuocId: { type: mongoose.Schema.Types.ObjectId, ref: 'ThuocKho' },
        tenThuoc: { type: String },
        soLuong: { type: Number }, // tổng số đơn vị (ví, hộp...) cần phát
        // Chi tiết liều dùng
        dosageMorning: { type: Number, min: 0 },
        dosageNoon: { type: Number, min: 0 },
        dosageEvening: { type: Number, min: 0 },
        days: { type: Number, min: 0 }, // số ngày dùng
        usageNote: { type: String }, // ghi chú hướng dẫn (sau ăn, trước ngủ...)
      }
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('DonThuoc', DonThuocSchema);
