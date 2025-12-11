const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');

// Nạp các model để Mongoose đăng ký trước khi thao tác
require('../models/BenhNhan');
require('../models/SoThuTu');
require('../models/PhongKham');
require('../models/ChuyenKhoa');
require('../models/BacSi');
require('../models/HoSoKham');
require('../models/CanLamSang');
require('../models/ThanhToan');
require('../models/DonThuoc');
require('../models/CapThuoc');

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI not set in .env');
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  // Tạo collection rõ ràng để hiển thị trong MongoDB Compass
  const collections = [
    'benhnhans',
    'sothutus',
    'bhyts',
    'phongkhams',
    'chuyenkhoas',
    'bacsis',
    'hosokhams',
    'canlamsangs',
    'thanhtoans',
    'donthuocs',
    'thuocs',
    'capthuocs',
  ];

  for (const name of collections) {
    const exists = (await db.listCollections({ name }).toArray()).length > 0;
    if (!exists) {
      await db.createCollection(name);
      console.log('Đã tạo collection:', name);
    } else {
      console.log('Collection đã tồn tại:', name);
    }
  }

  await mongoose.disconnect();
  console.log('Hoàn tất.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
