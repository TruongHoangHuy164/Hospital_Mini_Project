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
        thuocId: { type: mongoose.Schema.Types.ObjectId, ref: 'Thuoc' },
        tenThuoc: { type: String },
        soLuong: { type: Number }
      }
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('DonThuoc', DonThuocSchema);
