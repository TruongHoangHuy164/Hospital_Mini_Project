const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI not set in .env');
  await mongoose.connect(uri);

  const BacSi = require('../models/BacSi');

  // Đảm bảo index cho các trường mới (unique + sparse cho maSo, email)
  await BacSi.collection.createIndex({ maSo: 1 }, { unique: true, sparse: true });
  await BacSi.collection.createIndex({ email: 1 }, { unique: true, sparse: true });
  await BacSi.collection.createIndex({ chuyenKhoa: 1 });
  await BacSi.collection.createIndex({ phongKhamId: 1 });
  await BacSi.collection.createIndex({ trangThai: 1 });

  // Cập nhật các hồ sơ hiện có: đặt giá trị mặc định cho trường còn thiếu
  const updates = [
    { filter: { gioiTinh: { $exists: false } }, set: { gioiTinh: 'khac' } },
    { filter: { trangThai: { $exists: false } }, set: { trangThai: 'dang_cong_tac' } },
    { filter: { namKinhNghiem: { $exists: false } }, set: { namKinhNghiem: 0 } },
  ];

  for (const u of updates) {
    const res = await BacSi.updateMany(u.filter, { $set: u.set });
    console.log('Updated BacSi', u.set, '=>', res.modifiedCount);
  }

  // Tuỳ chọn: nếu chưa có bác sĩ nào, seed một bản ghi mẫu
  const count = await BacSi.countDocuments();
  if (count === 0) {
    // Cần một PhongKham để tham chiếu; nếu chưa có, tạo mặc định
    const PhongKham = require('../models/PhongKham');
    let pk = await PhongKham.findOne();
    if (!pk) {
      pk = await PhongKham.create({ tenPhong: 'Phòng Khám Nội Tổng Quát', chuyenKhoa: 'Nội tổng quát' });
    }
    await BacSi.create({
      maSo: 'BS0001',
      hoTen: 'BS. Nguyễn Văn A',
      gioiTinh: 'nam',
      chuyenKhoa: 'Nội tổng quát',
      phongKhamId: pk._id,
      hocVi: 'BSCKI',
      chucDanh: 'Bác sĩ điều trị',
      namKinhNghiem: 5,
      trangThai: 'dang_cong_tac',
      soDienThoai: '0901234567',
      email: 'bsa@example.com',
      diaChi: 'TP. HCM',
      moTa: 'Chuyên nội tổng quát, khám và điều trị bệnh lý thường gặp.',
    });
    console.log('Seeded sample BacSi + PhongKham');
  }

  await mongoose.disconnect();
  console.log('Migration completed.');
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
