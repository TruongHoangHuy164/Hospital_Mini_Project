const mongoose = require('mongoose');

// Require all models so they are registered
require('../models/BenhNhan');
require('../models/SoThuTu');
require('../models/PhongKham');
require('../models/BacSi');
require('../models/HoSoKham');
require('../models/CanLamSang');
require('../models/ThanhToan');
require('../models/DonThuoc');
require('../models/CapThuoc');

async function syncAllIndexes() {
  const modelNames = mongoose.modelNames();
  for (const name of modelNames) {
    try {
      const Model = mongoose.model(name);
      await Model.syncIndexes();
      // console.log(`Indexes synced for ${name}`);
    } catch (e) {
      console.error(`Failed to sync indexes for ${name}:`, e.message);
    }
  }
}

module.exports = { syncAllIndexes };
