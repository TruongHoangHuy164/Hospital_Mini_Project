const mongoose = require('mongoose');
const YeuCauThayDoiLichHen = require('./src/models/YeuCauThayDoiLichHen');
const LichKham = require('./src/models/LichKham');
const BacSi = require('./src/models/BacSi');
const ChuyenKhoa = require('./src/models/ChuyenKhoa');
require('dotenv').config();

async function testChangeAppointment() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // 1. Kiểm tra số lượng yêu cầu hiện tại
    const count = await YeuCauThayDoiLichHen.countDocuments();
    console.log('Total change requests:', count);

    // 2. Lấy sample requests
    const requests = await YeuCauThayDoiLichHen.find()
      .populate('bacSiCu', 'hoTen')
      .populate('bacSiMoi', 'hoTen')
      .populate('chuyenKhoaCu', 'ten')
      .populate('chuyenKhoaMoi', 'ten')
      .limit(3);

    console.log('\nSample requests:');
    requests.forEach((req, index) => {
      console.log(`\nRequest ${index + 1}:`);
      console.log('- ID:', req._id);
      console.log('- tenBenhNhan:', req.tenBenhNhan);
      console.log('- trangThai:', req.trangThai);
      console.log('- bacSiCu:', req.bacSiCu);
      console.log('- bacSiMoi:', req.bacSiMoi);
      console.log('- chuyenKhoaCu:', req.chuyenKhoaCu);
      console.log('- chuyenKhoaMoi:', req.chuyenKhoaMoi);
    });

    // 3. Kiểm tra dữ liệu bác sĩ và chuyên khoa
    const doctorCount = await BacSi.countDocuments();
    const specialtyCount = await ChuyenKhoa.countDocuments();
    console.log('\nDatabase stats:');
    console.log('- Doctors:', doctorCount);
    console.log('- Specialties:', specialtyCount);

    // 4. Lấy sample doctors và specialties
    const sampleDoctor = await BacSi.findOne();
    const sampleSpecialty = await ChuyenKhoa.findOne();
    console.log('\nSample data:');
    console.log('- Sample doctor:', sampleDoctor ? { _id: sampleDoctor._id, hoTen: sampleDoctor.hoTen } : 'None');
    console.log('- Sample specialty:', sampleSpecialty ? { _id: sampleSpecialty._id, ten: sampleSpecialty.ten } : 'None');

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testChangeAppointment();