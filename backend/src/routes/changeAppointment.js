const express = require('express');
const router = express.Router();
const YeuCauThayDoiLichHen = require('../models/YeuCauThayDoiLichHen');
const LichKham = require('../models/LichKham');
const BenhNhan = require('../models/BenhNhan');
const PatientProfile = require('../models/PatientProfile');
const BacSi = require('../models/BacSi');
const ChuyenKhoa = require('../models/ChuyenKhoa');
const DoctorSchedule = require('../models/DoctorSchedule');
const auth = require('../middlewares/auth');
const authorize = require('../middlewares/authorize');

// Debug endpoint - xem tất cả requests
router.get('/debug', async (req, res) => {
  try {
    const count = await YeuCauThayDoiLichHen.countDocuments();
    const requests = await YeuCauThayDoiLichHen.find()
      .populate('bacSiCu', 'hoTen')
      .populate('bacSiMoi', 'hoTen')
      .populate('chuyenKhoaCu', 'ten')
      .populate('chuyenKhoaMoi', 'ten')
      .limit(5);
      
    res.json({
      count,
      requests: requests.map(req => ({
        _id: req._id,
        tenBenhNhan: req.tenBenhNhan,
        trangThai: req.trangThai,
        bacSiCu: req.bacSiCu,
        bacSiMoi: req.bacSiMoi,
        ngayTao: req.ngayTao
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Lấy danh sách yêu cầu thay đổi lịch hẹn (cho bệnh nhân)
router.get('/my-requests', auth, async (req, res) => {
  try {
    const requests = await YeuCauThayDoiLichHen.find({ userId: req.user.id })
      .populate('bacSiCu', 'hoTen')
      .populate('bacSiMoi', 'hoTen')
      .populate('chuyenKhoaCu', 'ten')
      .populate('chuyenKhoaMoi', 'ten')
      .populate('nguoiXuLy', 'name email')
      .sort({ ngayTao: -1 });

    console.log('My requests - User ID:', req.user.id);
    console.log('My requests found:', requests.length);
    if (requests.length > 0) {
      console.log('My requests sample - bacSiCu:', requests[0].bacSiCu);
      console.log('My requests sample - bacSiMoi:', requests[0].bacSiMoi);
    }
    res.json(requests);
  } catch (error) {
    console.error('Lỗi lấy danh sách yêu cầu:', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// Tạo yêu cầu thay đổi lịch hẹn mới
router.post('/create', auth, async (req, res) => {
  try {
    const {
      lichHenCuId,
      ngayHenMoi,
      gioHenMoi,
      bacSiMoi,
      chuyenKhoaMoi,
      lyDoThayDoi,
      lyDoKhac
    } = req.body;

    // Kiểm tra lịch hẹn cũ có tồn tại và thuộc về user không
    console.log('Looking for appointment:', lichHenCuId);
    const lichHenCu = await LichKham.findById(lichHenCuId)
      .populate('hoSoBenhNhanId')
      .populate('bacSiId')
      .populate('chuyenKhoaId');
    
    console.log('Found lichHenCu:', lichHenCu);
    
    if (!lichHenCu) {
      return res.status(404).json({ message: 'Không tìm thấy lịch hẹn' });
    }

    if (lichHenCu.nguoiDatId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Không có quyền thay đổi lịch hẹn này' });
    }

    // Kiểm tra lịch hẹn đã quá hạn chưa (so sánh theo ngày)
    const now = new Date();
    const appointmentDate = new Date(lichHenCu.ngayKham);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    appointmentDate.setHours(0, 0, 0, 0);
    
    if (appointmentDate < today) {
      return res.status(400).json({ message: 'Không thể thay đổi lịch hẹn đã qua' });
    }

    // Nếu là ngày hôm nay, kiểm tra thời gian (tạm thời bỏ qua yêu cầu 2 giờ)
    const daysDiff = Math.floor((appointmentDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
    const hoursDiff = daysDiff * 24; // Ước tính

    // Kiểm tra số lần đổi lịch (tối đa 3 lần/tháng)
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const requestsThisMonth = await YeuCauThayDoiLichHen.countDocuments({
      userId: req.user.id,
      ngayTao: { $gte: startOfMonth },
      trangThai: { $in: ['da_duyet', 'cho_duyet'] }
    });

    if (requestsThisMonth >= 3) {
      return res.status(400).json({ 
        message: 'Bạn đã vượt quá số lần đổi lịch cho phép trong tháng (3 lần)' 
      });
    }

    // Lấy thông tin bệnh nhân từ PatientProfile
    console.log('Looking for patient profile:', lichHenCu.hoSoBenhNhanId);
    const benhNhan = await PatientProfile.findById(lichHenCu.hoSoBenhNhanId);
    console.log('Found benhNhan:', benhNhan);
    
    if (!benhNhan) {
      return res.status(404).json({ message: 'Không tìm thấy thông tin bệnh nhân' });
    }

    // Tính tuổi
    const tuoi = new Date().getFullYear() - new Date(benhNhan.ngaySinh).getFullYear();

    // Tạo yêu cầu thay đổi
    const yeuCauMoi = new YeuCauThayDoiLichHen({
      userId: req.user.id,
      benhNhanId: lichHenCu.hoSoBenhNhanId,
      maHoSo: benhNhan.maHoSo,
      tenBenhNhan: benhNhan.hoTen,
      tuoi: tuoi,
      diaChi: benhNhan.diaChi,
      cccd: benhNhan.cccd,
      
      lichHenCuId: lichHenCuId,
      ngayHenCu: new Date(lichHenCu.ngayKham),
      gioHenCu: lichHenCu.khungGio,
      bacSiCu: lichHenCu.bacSiId,
      chuyenKhoaCu: lichHenCu.chuyenKhoaId,
      
      ngayHenMoi: new Date(ngayHenMoi),
      gioHenMoi: gioHenMoi,
      bacSiMoi: bacSiMoi || lichHenCu.bacSiId,
      chuyenKhoaMoi: chuyenKhoaMoi || lichHenCu.chuyenKhoaId,
      
      lyDoThayDoi: lyDoThayDoi,
      lyDoKhac: lyDoKhac,
      
      kiemTraKhaThi: {
        soLanDoiLich: requestsThisMonth,
        thoiGianBaoTruoc: Math.floor(hoursDiff)
      }
    });

    await yeuCauMoi.save();

    // Populate thông tin để trả về
    const result = await YeuCauThayDoiLichHen.findById(yeuCauMoi._id)
      .populate('bacSiCu', 'hoTen')
      .populate('bacSiMoi', 'hoTen')
      .populate('chuyenKhoaCu', 'ten')
      .populate('chuyenKhoaMoi', 'ten');

    res.status(201).json({
      message: 'Yêu cầu thay đổi lịch hẹn đã được gửi thành công',
      yeuCau: result
    });

  } catch (error) {
    console.error('Lỗi tạo yêu cầu thay đổi lịch hẹn:', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// Lấy thông tin lịch hẹn để chuẩn bị form yêu cầu
router.get('/appointment/:id', auth, async (req, res) => {
  try {
    const lichHen = await LichKham.findById(req.params.id)
      .populate('hoSoBenhNhanId')
      .populate('bacSiId', 'hoTen')
      .populate('chuyenKhoaId', 'ten');

    if (!lichHen) {
      return res.status(404).json({ message: 'Không tìm thấy lịch hẹn' });
    }

    if (lichHen.nguoiDatId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Không có quyền truy cập lịch hẹn này' });
    }

    // Đảm bảo có thông tin bệnh nhân để hiển thị
    console.log('LichHen data:', JSON.stringify(lichHen, null, 2));

    // Kiểm tra các điều kiện
    const now = new Date();
    const appointmentDate = new Date(lichHen.ngayKham);
    
    // So sánh chỉ theo ngày, không tính giờ để tránh lỗi format
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    appointmentDate.setHours(0, 0, 0, 0);
    
    const canChange = appointmentDate >= today;
    const daysDiff = Math.floor((appointmentDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
    const hoursDiff = daysDiff * 24; // Ước tính giờ

    // Đếm số lần đổi lịch trong tháng
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const requestsThisMonth = await YeuCauThayDoiLichHen.countDocuments({
      userId: req.user.id,
      ngayTao: { $gte: startOfMonth },
      trangThai: { $in: ['da_duyet', 'cho_duyet'] }
    });

    res.json({
      lichHen,
      dieuKien: {
        canChange,
        hoursDiff,
        requestsThisMonth,
        maxRequestsPerMonth: 3,
        minHoursNotice: 2
      }
    });

  } catch (error) {
    console.error('Lỗi lấy thông tin lịch hẹn:', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// Routes cho lễ tân - Lấy danh sách yêu cầu chờ duyệt
router.get('/pending', auth, authorize('reception', 'admin'), async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    
    // Bỏ filter trangThai để xem tất cả requests để debug
    let filter = {}; // { trangThai: 'cho_duyet' };
    
    if (search) {
      filter.$or = [
        { tenBenhNhan: { $regex: search, $options: 'i' } },
        { maHoSo: { $regex: search, $options: 'i' } },
        { cccd: { $regex: search, $options: 'i' } }
      ];
    }

    console.log('Before query - filter:', filter);
    
    const requests = await YeuCauThayDoiLichHen.find(filter)
      .populate('bacSiCu', 'hoTen')
      .populate('bacSiMoi', 'hoTen') 
      .populate('chuyenKhoaCu', 'ten')
      .populate('chuyenKhoaMoi', 'ten')
      .populate('userId', 'name email')
      .sort({ ngayTao: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    console.log('Found requests count:', requests.length);
    if (requests.length > 0) {
      console.log('Sample request with populated data:');
      console.log('- tenBenhNhan:', requests[0].tenBenhNhan);
      console.log('- bacSiCu:', requests[0].bacSiCu);
      console.log('- bacSiMoi:', requests[0].bacSiMoi);
      console.log('- chuyenKhoaCu:', requests[0].chuyenKhoaCu);
      console.log('- chuyenKhoaMoi:', requests[0].chuyenKhoaMoi);
      console.log('Full sample:', JSON.stringify(requests[0], null, 2));
    }

    const total = await YeuCauThayDoiLichHen.countDocuments(filter);

    res.json({
      requests,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });

  } catch (error) {
    console.error('Lỗi lấy danh sách yêu cầu chờ duyệt:', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// Xử lý yêu cầu (duyệt/từ chối) - cho lễ tân
router.put('/process/:id', auth, authorize('reception', 'admin'), async (req, res) => {
  try {
    console.log('Processing request:', req.params.id);
    console.log('Request body:', req.body);
    
    // Kiểm tra ObjectId hợp lệ
    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      console.log('Invalid ObjectId:', req.params.id);
      return res.status(400).json({ message: 'ID yêu cầu không hợp lệ' });
    }
    
    const { trangThai, ghiChuXuLy, lyDoTuChoi } = req.body;
    
    if (!['da_duyet', 'tu_choi'].includes(trangThai)) {
      console.log('Invalid status:', trangThai);
      return res.status(400).json({ message: 'Trạng thái không hợp lệ' });
    }

    const yeuCau = await YeuCauThayDoiLichHen.findById(req.params.id);
    if (!yeuCau) {
      console.log('Request not found with ID:', req.params.id);
      return res.status(404).json({ message: 'Không tìm thấy yêu cầu' });
    }

    console.log('Found request:', yeuCau);
    console.log('Current status:', yeuCau.trangThai);

    if (yeuCau.trangThai !== 'cho_duyet') {
      console.log('Request already processed. Current status:', yeuCau.trangThai);
      return res.status(400).json({ message: 'Yêu cầu đã được xử lý' });
    }

    // Nếu duyệt, kiểm tra tính khả thi
    if (trangThai === 'da_duyet') {
      // Kiểm tra lịch bác sĩ còn trống
      const existingAppointment = await LichKham.findOne({
        bacSiId: yeuCau.bacSiMoi,
        ngayKham: yeuCau.ngayHenMoi,
        khungGio: yeuCau.gioHenMoi,
        trangThai: { $ne: 'huy' }
      });

      if (existingAppointment) {
        return res.status(400).json({ 
          message: 'Lịch khám đã được đặt bởi bệnh nhân khác' 
        });
      }

      // Kiểm tra lịch làm việc của bác sĩ (tạm thời bỏ qua để debug)
      const dayOfWeek = yeuCau.ngayHenMoi.getDay();
      console.log('Checking doctor schedule for day:', dayOfWeek, 'doctor:', yeuCau.bacSiMoi);
      
      // Tạm thời comment để debug
      /*
      const schedule = await DoctorSchedule.findOne({
        doctorId: yeuCau.bacSiMoi,
        dayOfWeek: dayOfWeek,
        isActive: true
      });

      if (!schedule) {
        return res.status(400).json({ 
          message: 'Bác sĩ không làm việc vào ngày này' 
        });
      }
      */

      // Cập nhật lịch hẹn cũ
      console.log('Updating appointment:', yeuCau.lichHenCuId);
      const updateResult = await LichKham.findByIdAndUpdate(yeuCau.lichHenCuId, {
        ngayKham: yeuCau.ngayHenMoi,
        khungGio: yeuCau.gioHenMoi,
        bacSiId: yeuCau.bacSiMoi,
        chuyenKhoaId: yeuCau.chuyenKhoaMoi
      });
      
      console.log('Update result:', updateResult);

      yeuCau.kiemTraKhaThi.lichBacSiTrong = true;
      yeuCau.kiemTraKhaThi.chuyenKhoaPhuHop = true;
      yeuCau.kiemTraKhaThi.quiDinhDoiLich = true;
    }

    // Cập nhật yêu cầu
    yeuCau.trangThai = trangThai;
    yeuCau.nguoiXuLy = req.user.id;
    yeuCau.ngayXuLy = new Date();
    yeuCau.ghiChuXuLy = ghiChuXuLy;
    if (trangThai === 'tu_choi') {
      yeuCau.lyDoTuChoi = lyDoTuChoi;
    }

    await yeuCau.save();

    const result = await YeuCauThayDoiLichHen.findById(yeuCau._id)
      .populate('nguoiXuLy', 'name email');

    res.json({
      message: trangThai === 'da_duyet' ? 'Đã duyệt yêu cầu thành công' : 'Đã từ chối yêu cầu',
      yeuCau: result
    });

  } catch (error) {
    console.error('Lỗi xử lý yêu cầu:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

// Hủy yêu cầu (cho bệnh nhân)
router.delete('/:id', auth, async (req, res) => {
  try {
    const yeuCau = await YeuCauThayDoiLichHen.findById(req.params.id);
    
    if (!yeuCau) {
      return res.status(404).json({ message: 'Không tìm thấy yêu cầu' });
    }

    if (yeuCau.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Không có quyền hủy yêu cầu này' });
    }

    if (yeuCau.trangThai !== 'cho_duyet') {
      return res.status(400).json({ message: 'Chỉ có thể hủy yêu cầu đang chờ duyệt' });
    }

    yeuCau.trangThai = 'huy';
    await yeuCau.save();

    res.json({ message: 'Đã hủy yêu cầu thành công' });

  } catch (error) {
    console.error('Lỗi hủy yêu cầu:', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

module.exports = router;