const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');

// Require models to register them with Mongoose
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

  // Explicitly create collections so they appear in Compass
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
      console.log('Created collection:', name);
    } else {
      console.log('Collection exists:', name);
    }
  }

  await mongoose.disconnect();
  console.log('Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
