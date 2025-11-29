const mongoose = require('mongoose');

// Trạng thái kết nối cơ sở dữ liệu MongoDB (tiếng Việt)
let dbStatus = 'mất_kết_nối';

// Ánh xạ trạng thái từ mongoose sang chuỗi tiếng Việt
function mapState(state) {
  switch (state) {
    case 0: return 'mất_kết_nối';
    case 1: return 'đã_kết_nối';
    case 2: return 'đang_kết_nối';
    case 3: return 'đang_ngắt_kết_nối';
    default: return 'không_xác_định';
  }
}

// Kết nối MongoDB với URI cung cấp
async function connectMongo(uri) {
  if (!uri) throw new Error('Thiếu biến môi trường MONGODB_URI');
  try {
    dbStatus = 'đang_kết_nối';
    await mongoose.connect(uri);
    dbStatus = 'đã_kết_nối';
    // Lắng nghe sự kiện kết nối để cập nhật trạng thái
    mongoose.connection.on('disconnected', () => { dbStatus = 'mất_kết_nối'; });
    mongoose.connection.on('reconnected', () => { dbStatus = 'đã_kết_nối'; });
    mongoose.connection.on('error', (err) => { console.error('Lỗi Mongo:', err); dbStatus = mapState(mongoose.connection.readyState); });
    return mongoose.connection;
  } catch (err) {
    dbStatus = 'lỗi';
    console.error('Kết nối MongoDB thất bại:', err.message);
    throw err;
  }
}

function getDbStatus() {
  return dbStatus;
}

module.exports = { connectMongo, getDbStatus };
