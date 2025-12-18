// Router quản lý hồ sơ người thân (PatientProfile) cho người dùng
const express = require('express');
const PatientProfile = require('../models/PatientProfile');
const auth = require('../middlewares/auth');
const asyncHandler = require('express-async-handler');

const router = express.Router();

// ===== Tóm tắt API Hồ sơ Người thân (patient-profiles) =====
// - GET    /api/patient-profiles            : Lấy tất cả hồ sơ người thân của người dùng đang đăng nhập
// - POST   /api/patient-profiles            : Tạo hồ sơ người thân mới (chuẩn hoá số điện thoại, kiểm tra trùng)
// - GET    /api/patient-profiles/:id        : Lấy chi tiết hồ sơ (chỉ khi thuộc về người dùng hiện tại)
// - PUT    /api/patient-profiles/:id        : Cập nhật hồ sơ (chuẩn hoá/kiểm tra trùng số điện thoại nếu đổi)
// - DELETE /api/patient-profiles/:id        : Xoá hồ sơ (chỉ khi thuộc về người dùng hiện tại)
// Ghi chú: Tất cả các route đều yêu cầu xác thực (auth middleware)

// Chuẩn hoá số điện thoại (cơ bản: bỏ khoảng trắng, giữ số và dấu + đầu)
function normalizePhone(raw){
  if(!raw) return '';
  const t = String(raw).trim();
  // Remove spaces and common formatting characters
  const cleaned = t.replace(/[\s\-\.]/g,'');
  return cleaned;
}

// @desc    Lấy tất cả hồ sơ người thân của người dùng đang đăng nhập
// @route   GET /api/patient-profiles
// @access  Private
router.get(
  '/',
  auth,
  asyncHandler(async (req, res) => {
    console.log('Backend: Fetching profiles for user:', req.user.id);
    const profiles = await PatientProfile.find({ id_nguoiTao: req.user.id });
    console.log('Backend: Found profiles:', profiles.length);
    res.json(profiles);
  })
);

// @desc    Tạo hồ sơ người thân mới
// @route   POST /api/patient-profiles
// @access  Private
router.post(
  '/',
  auth,
  asyncHandler(async (req, res) => {
    const {
      hoTen,
      ngaySinh,
      gioiTinh,
      soDienThoai,
      email,
      cccd,
      hoChieu,
      quocGia,
      danToc,
      ngheNghiep,
      tinhThanh,
      quanHuyen,
      phuongXa,
      diaChi,
      quanHe,
    } = req.body;

    console.log('Backend: Creating profile for user:', req.user.id);
    console.log('Backend: Profile data:', { hoTen, ngaySinh, gioiTinh, quanHe });
    
    const phoneNorm = normalizePhone(soDienThoai);
    if(!phoneNorm){ return res.status(400).json({ message: 'Số điện thoại là bắt buộc' }); }
    // Kiểm tra trùng trước khi tạo để trả lỗi rõ ràng (tránh lỗi E11000 khó đọc)
    const existed = await PatientProfile.findOne({ soDienThoai: phoneNorm, id_nguoiTao: { $ne: req.user.id } }) || await PatientProfile.findOne({ soDienThoai: phoneNorm, id_nguoiTao: req.user.id });
    if(existed){ return res.status(409).json({ message: 'Số điện thoại đã tồn tại ở một hồ sơ khác' }); }

    const profile = new PatientProfile({
      id_nguoiTao: req.user.id,
      hoTen,
      ngaySinh,
      gioiTinh,
      soDienThoai: phoneNorm,
      email,
      cccd,
      hoChieu,
      quocGia,
      danToc,
      ngheNghiep,
      tinhThanh,
      quanHuyen,
      phuongXa,
      diaChi,
      quanHe,
    });
    try {
      const createdProfile = await profile.save();
      console.log('Backend: Profile created successfully:', createdProfile._id);
      res.status(201).json(createdProfile);
    } catch(e){
      if(e?.code === 11000){
        return res.status(409).json({ message: 'Số điện thoại đã tồn tại' });
      }
      throw e;
    }
  })
);

// @desc    Lấy chi tiết hồ sơ người thân theo ID
// @route   GET /api/patient-profiles/:id
// @access  Private
router.get(
  '/:id',
  auth,
  asyncHandler(async (req, res) => {
    const profile = await PatientProfile.findById(req.params.id);

    if (profile && profile.id_nguoiTao.toString() === req.user.id.toString()) {
      res.json(profile);
    } else {
      res.status(404);
      throw new Error('Không tìm thấy hồ sơ hoặc bạn không có quyền truy cập');
    }
  })
);

// @desc    Cập nhật hồ sơ người thân
// @route   PUT /api/patient-profiles/:id
// @access  Private
router.put(
  '/:id',
  auth,
  asyncHandler(async (req, res) => {
    const profile = await PatientProfile.findById(req.params.id);

    if (profile && profile.id_nguoiTao.toString() === req.user.id.toString()) {
      const {
        hoTen,
        ngaySinh,
        gioiTinh,
        soDienThoai,
        email,
        cccd,
        hoChieu,
        quocGia,
        danToc,
        ngheNghiep,
        tinhThanh,
        quanHuyen,
        phuongXa,
        diaChi,
        quanHe,
      } = req.body;

      profile.hoTen = hoTen || profile.hoTen;
      profile.ngaySinh = ngaySinh || profile.ngaySinh;
      profile.gioiTinh = gioiTinh || profile.gioiTinh;
      if(soDienThoai){
        const phoneNorm = normalizePhone(soDienThoai);
        if(!phoneNorm){ return res.status(400).json({ message: 'Số điện thoại không hợp lệ' }); }
        if(phoneNorm !== profile.soDienThoai){
          const existed = await PatientProfile.findOne({ soDienThoai: phoneNorm, _id: { $ne: profile._id } });
          if(existed){ return res.status(409).json({ message: 'Số điện thoại đã tồn tại ở hồ sơ khác' }); }
          profile.soDienThoai = phoneNorm;
        }
      }
      profile.email = email || profile.email;
      profile.cccd = cccd || profile.cccd;
      profile.hoChieu = hoChieu || profile.hoChieu;
      profile.quocGia = quocGia || profile.quocGia;
      profile.danToc = danToc || profile.danToc;
      profile.ngheNghiep = ngheNghiep || profile.ngheNghiep;
      profile.tinhThanh = tinhThanh || profile.tinhThanh;
      profile.quanHuyen = quanHuyen || profile.quanHuyen;
      profile.phuongXa = phuongXa || profile.phuongXa;
      profile.diaChi = diaChi || profile.diaChi;
      profile.quanHe = quanHe || profile.quanHe;

      const updatedProfile = await profile.save();
      res.json(updatedProfile);
    } else {
      res.status(404);
      throw new Error('Không tìm thấy hồ sơ hoặc bạn không có quyền truy cập');
    }
  })
);

// @desc    Xóa hồ sơ người thân
// @route   DELETE /api/patient-profiles/:id
// @access  Private
router.delete(
  '/:id',
  auth,
  asyncHandler(async (req, res) => {
    const profile = await PatientProfile.findById(req.params.id);

    if (profile && profile.id_nguoiTao.toString() === req.user.id.toString()) {
      await profile.deleteOne(); // Using deleteOne() instead of remove()
      res.json({ message: 'Hồ sơ đã được xóa' });
    } else {
      res.status(404);
      throw new Error('Không tìm thấy hồ sơ hoặc bạn không có quyền truy cập');
    }
  })
);

module.exports = router;
