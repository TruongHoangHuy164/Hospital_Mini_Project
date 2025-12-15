const express = require('express');
const BacSi = require('../models/BacSi');
const BenhNhan = require('../models/BenhNhan');
const HoSoKham = require('../models/HoSoKham');
const DonThuoc = require('../models/DonThuoc');
// Dùng ThuocKho thay cho Thuoc để kê đơn trực tiếp từ kho (có đơn vị, giá)
const ThuocKho = require('../models/ThuocKho');
const DoctorSchedule = require('../models/DoctorSchedule');
const LichKham = require('../models/LichKham');
const SoThuTu = require('../models/SoThuTu');
const CanLamSang = require('../models/CanLamSang');

const router = express.Router();

// Helper middleware: load doctor by req.user.id and attach to req.doctor
async function loadDoctor(req, res, next){
  try{
    const userId = req.user?.id;
    if(!userId) return res.status(401).json({ message: 'Unauthorized' });
    const doc = await BacSi.findOne({ userId });
    if(!doc) return res.status(404).json({ message: 'Chưa liên kết hồ sơ bác sĩ với tài khoản này' });
    req.doctor = doc;
    return next();
  }catch(err){ return next(err); }
}

// Local date helpers (keep consistent with booking.js)
function startOfDay(d){ return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
function endOfDay(d){ return new Date(d.getFullYear(), d.getMonth(), d.getDate()+1); }

// ===== API cho Bác sĩ (tự thao tác) =====
// Mục tiêu: cho phép bác sĩ xem/cập nhật hồ sơ cá nhân, quản lý lịch làm việc,
// xử lý hàng đợi bệnh nhân theo lịch hẹn/số thứ tự, và thao tác hồ sơ khám.
// Lưu ý: tất cả các endpoint yêu cầu đã đăng nhập; `loadDoctor` kiểm tra và gắn `req.doctor`.

// GET /api/doctor/me - lấy hồ sơ bác sĩ gắn với tài khoản đăng nhập
router.get('/me', async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    const bs = await BacSi.findOne({ userId })
      .populate('phongKhamId', 'tenPhong chuyenKhoa')
      .populate('userId', 'email role');
    if (!bs) return res.status(404).json({ message: 'Chưa liên kết hồ sơ bác sĩ với tài khoản này' });
    return res.json(bs);
  } catch (err) { return next(err); }
});

// PUT /api/doctor/me - cập nhật thông tin cá nhân (giới hạn các trường cho phép)
router.put('/me', loadDoctor, async (req, res, next) => {
  try {
    // Body cho phép: hoTen, email, soDienThoai, diaChi, anhDaiDien, moTa, ngaySinh, gioiTinh
    // - Kiểm tra hợp lệ email/sđt/ngày sinh/giới tính
    // - Tránh trùng sđt với bác sĩ khác
    const allow = ['hoTen','email','soDienThoai','diaChi','anhDaiDien','moTa','ngaySinh','gioiTinh'];
    const body = req.body || {};
    const update = {};
    
    // Validation
    if(body.hoTen !== undefined) {
      if(typeof body.hoTen !== 'string' || body.hoTen.trim().length === 0) {
        return res.status(400).json({ message: 'Họ tên không được để trống' });
      }
      update.hoTen = body.hoTen.trim();
    }
    
    if(body.email !== undefined) {
      if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
        return res.status(400).json({ message: 'Email không hợp lệ' });
      }
      update.email = body.email.toLowerCase().trim();
    }
    
    if(body.soDienThoai !== undefined) {
      if(body.soDienThoai && !/^[0-9]{10,11}$/.test(body.soDienThoai.replace(/\D/g, ''))) {
        return res.status(400).json({ message: 'Số điện thoại không hợp lệ (10-11 chữ số)' });
      }
      const phone = body.soDienThoai?.trim() || '';
      
      // Check duplicate phone (not belong to current doctor)
      if(phone) {
        const existingDoctor = await BacSi.findOne({ 
          soDienThoai: phone,
          _id: { $ne: req.doctor._id }
        });
        if(existingDoctor) {
          return res.status(400).json({ message: 'Số điện thoại này đã được sử dụng' });
        }
      }
      
      update.soDienThoai = phone;
    }
    
    if(body.diaChi !== undefined) {
      update.diaChi = body.diaChi?.trim() || '';
    }
    
    if(body.moTa !== undefined) {
      const desc = body.moTa?.trim() || '';
      if(desc.length > 500) {
        return res.status(400).json({ message: 'Mô tả tối đa 500 ký tự' });
      }
      update.moTa = desc;
    }
    
    if(body.anhDaiDien !== undefined) {
      update.anhDaiDien = body.anhDaiDien;
    }
    
    if(body.ngaySinh !== undefined) {
      if(body.ngaySinh) {
        const dob = new Date(body.ngaySinh);
        if(isNaN(dob.getTime())) {
          return res.status(400).json({ message: 'Ngày sinh không hợp lệ' });
        }
        update.ngaySinh = dob;
      } else {
        update.ngaySinh = null;
      }
    }
    
    if(body.gioiTinh !== undefined) {
      if(!['nam','nu','khac'].includes(body.gioiTinh)) {
        return res.status(400).json({ message: 'Giới tính không hợp lệ' });
      }
      update.gioiTinh = body.gioiTinh;
    }
    
    const bs = await BacSi.findByIdAndUpdate(req.doctor._id, update, { new: true })
      .populate('phongKhamId', 'tenPhong chuyenKhoa')
      .populate('userId', 'email role');
    
    return res.json(bs);
  } catch (err) { return next(err); }
});

// GET /api/doctor/patients - tìm kiếm bệnh nhân theo tên/sđt
router.get('/patients', loadDoctor, async (req, res, next) => {
  try{
    // Query: q (tên), phone (số điện thoại), phân trang (page/limit)
    const { q, phone } = req.query;
    const filter = {};
    if (q) filter.hoTen = { $regex: q, $options: 'i' };
    if (phone) filter.soDienThoai = { $regex: phone, $options: 'i' };
    const limit = Math.min(parseInt(req.query.limit || '10', 10), 50);
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const [items, total] = await Promise.all([
      BenhNhan.find(filter).sort({ createdAt: -1 }).skip((page-1)*limit).limit(limit),
      BenhNhan.countDocuments(filter)
    ]);
    res.json({ items, total, page, limit });
  }catch(err){ return next(err); }
});

// POST /api/doctor/patients - tạo bệnh nhân nhanh
router.post('/patients', loadDoctor, async (req, res, next) => {
  try{
    // Body: { hoTen, soDienThoai?, ngaySinh?, gioiTinh?, diaChi? }
    const { hoTen, soDienThoai, ngaySinh, gioiTinh, diaChi } = req.body || {};
    if(!hoTen) return res.status(400).json({ message: 'Thiếu họ tên' });
    const bn = await BenhNhan.create({ hoTen, soDienThoai, ngaySinh, gioiTinh, diaChi });
    res.status(201).json(bn);
  }catch(err){ return next(err); }
});

// GET /api/doctor/cases - danh sách hồ sơ khám của bác sĩ hiện tại (tùy chọn lọc theo ngày)
router.get('/cases', loadDoctor, async (req, res, next) => {
  try{
    // Query: date = 'today' hoặc 'YYYY-MM-DD' để lọc theo ngày tạo
    const bacSiId = req.doctor._id;
    const filter = { bacSiId };
    const { date } = req.query;
    if (date) {
      // date = 'today' hoặc 'YYYY-MM-DD'
      let start;
      if (date === 'today') {
        start = new Date();
      } else {
        start = new Date(date);
      }
      if (isNaN(start.getTime())) return res.status(400).json({ message: 'Ngày không hợp lệ' });
      const dayStart = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      const dayEnd = new Date(start.getFullYear(), start.getMonth(), start.getDate()+1);
      filter.createdAt = { $gte: dayStart, $lt: dayEnd };
    }
    const limit = Math.min(parseInt(req.query.limit || '10', 10), 100);
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const [items, total] = await Promise.all([
      HoSoKham.find(filter)
        .populate('benhNhanId', 'hoTen soDienThoai ngaySinh gioiTinh')
        .sort({ createdAt: -1 }).skip((page-1)*limit).limit(limit),
      HoSoKham.countDocuments(filter)
    ]);
    res.json({ items, total, page, limit });
  }catch(err){ return next(err); }
});

// POST /api/doctor/cases - tạo hồ sơ khám
router.post('/cases', loadDoctor, async (req, res, next) => {
  try{
    // Body: { benhNhanId, chanDoan?, huongDieuTri? }
    // - `huongDieuTri` một trong: ngoai_tru|noi_tru|chuyen_vien|ke_don
    // - Kiểm tra sự tồn tại của bệnh nhân trước khi tạo
    const bacSiId = req.doctor._id;
    const { benhNhanId, chanDoan, huongDieuTri } = req.body || {};
    if(!benhNhanId) return res.status(400).json({ message: 'Thiếu benhNhanId' });
    if (huongDieuTri && !['ngoai_tru','noi_tru','chuyen_vien','ke_don'].includes(huongDieuTri)) {
      return res.status(400).json({ message: 'huongDieuTri không hợp lệ' });
    }
    // ensure patient exists
    const bn = await BenhNhan.findById(benhNhanId);
    if(!bn) return res.status(404).json({ message: 'Bệnh nhân không tồn tại' });
    const hs = await HoSoKham.create({ benhNhanId, bacSiId, chanDoan, huongDieuTri });
    const populated = await hs.populate('benhNhanId', 'hoTen soDienThoai ngaySinh gioiTinh');
    res.status(201).json(populated);
  }catch(err){ return next(err); }
});

// GET /api/doctor/medicines - tìm thuốc
// Danh sách thuốc lấy từ kho (ThuocKho)
router.get('/medicines', loadDoctor, async (req, res, next) => {
  try {
    // Query: q (tìm kiếm), group (id loaiThuoc | 'NONE' | 'ALL'), priceOrder ('asc'|'desc')
    // - Ưu tiên text search; fallback regex nếu không có kết quả
    const { q, group, priceOrder } = req.query; // group = loaiThuoc id hoặc 'NONE' hoặc 'ALL'; priceOrder='asc'|'desc'
    const limit = Math.min(parseInt(req.query.limit || '10', 10), 50);
    const filter = {};
    if (group && group !== 'ALL') {
      if (group === 'NONE') filter.loaiThuoc = { $in: [null] }; else filter.loaiThuoc = group;
    }
    // Build query
    let query;
    if (q) {
      query = ThuocKho.find({ ...filter, $text: { $search: q } }, { score: { $meta: 'textScore' } });
      // If priceOrder specified, override text score sorting with price
      if (priceOrder === 'asc' || priceOrder === 'desc') {
        query = query.sort({ gia: priceOrder === 'asc' ? 1 : -1 });
      } else {
        query = query.sort({ score: { $meta: 'textScore' } });
      }
    } else {
      // No search term: sort by price if requested else updatedAt desc
      if (priceOrder === 'asc' || priceOrder === 'desc') {
        query = ThuocKho.find(filter).sort({ gia: priceOrder === 'asc' ? 1 : -1 });
      } else {
        query = ThuocKho.find(filter).sort({ updatedAt: -1 });
      }
    }
    query = query.limit(limit).populate('loaiThuoc','ten');
    let items = await query;
    // fallback regex nếu text search rỗng và không có kết quả
    if (q && !items.length) {
      let regexQuery = ThuocKho.find({ ...filter, ten_san_pham: { $regex: q, $options: 'i' } });
      if (priceOrder === 'asc' || priceOrder === 'desc') {
        regexQuery = regexQuery.sort({ gia: priceOrder === 'asc' ? 1 : -1 });
      } else {
        regexQuery = regexQuery.sort({ updatedAt: -1 });
      }
      items = await regexQuery.limit(limit).populate('loaiThuoc','ten');
    }
    console.log('[MEDICINES_API] filter=', filter, 'q=', q, 'priceOrder=', priceOrder, 'returned=', items.length);
    const mapped = items.map(it => ({
      _id: it._id,
      tenThuoc: it.ten_san_pham,
      donViTinh: it.don_vi_dang_chon || it.don_vi || '',
      gia: it.gia,
      loaiThuoc: it.loaiThuoc || null,
    }));
    res.json(mapped);
  } catch(err){ return next(err); }
});

// GET /api/doctor/medicine-groups - liệt kê nhóm thuốc & số lượng
// Nhóm thuốc dựa trên loaiThuoc (Danh mục); thêm 'Khác' cho thuốc chưa phân loại
router.get('/medicine-groups', loadDoctor, async (req, res, next) => {
  try {
    // Gom nhóm theo `loaiThuoc`, trả về tên nhóm và số lượng
    const agg = await ThuocKho.aggregate([
      { $group: { _id: '$loaiThuoc', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    const ids = agg.filter(a => a._id).map(a => a._id);
    const categories = await require('../models/LoaiThuoc').find({ _id: { $in: ids } }).select('ten');
    const nameMap = categories.reduce((m,c)=>{ m[String(c._id)] = c.ten; return m; }, {});
    const result = agg.map(a => ({
      name: a._id ? (nameMap[String(a._id)] || 'Không tên') : 'Khác',
      value: a._id ? String(a._id) : 'NONE',
      count: a.count
    }));
    res.json(result);
  } catch(err){ return next(err); }
});


// ===== Lịch làm việc của bác sĩ =====
// GET /api/doctor/schedule?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get('/schedule', loadDoctor, async (req, res, next) => {
  try{
    // Query: from/to (YYYY-MM-DD) để lọc khoảng ngày
    const { from, to } = req.query;
    const filter = { bacSiId: req.doctor._id };
    if(from || to){
      const f = from ? new Date(from) : null;
      const t = to ? new Date(to) : null;
      if((from && isNaN(f)) || (to && isNaN(t))) return res.status(400).json({ message: 'Ngày không hợp lệ' });
      filter.ngay = {};
      if(f) filter.ngay.$gte = new Date(f.getFullYear(), f.getMonth(), f.getDate());
      if(t) filter.ngay.$lte = new Date(t.getFullYear(), t.getMonth(), t.getDate());
    }
    const items = await DoctorSchedule.find(filter).sort({ ngay: 1, ca: 1 });
    res.json(items);
  }catch(err){ return next(err); }
});

// POST /api/doctor/schedule
router.post('/schedule', loadDoctor, async (req, res, next) => {
  try{
    // Body: { ngay, ca, loaiCa='lam_viec', phongKhamId?, lyDo?, note? }
    // - Chuẩn hóa `ngay` về đầu ngày
    const { ngay, ca, loaiCa = 'lam_viec', phongKhamId, lyDo, note } = req.body || {};
    if(!ngay || !ca) return res.status(400).json({ message: 'Thiếu ngày/ca' });
    const d = new Date(ngay);
    if(isNaN(d)) return res.status(400).json({ message: 'Ngày không hợp lệ' });
    const doc = await DoctorSchedule.create({ bacSiId: req.doctor._id, ngay: new Date(d.getFullYear(), d.getMonth(), d.getDate()), ca, loaiCa, phongKhamId, lyDo, note });
    res.status(201).json(doc);
  }catch(err){
    if(err && err.code===11000){ return res.status(409).json({ message: 'Đã có lịch cho ngày/ca này' }); }
    return next(err);
  }
});

// PUT /api/doctor/schedule/:id
router.put('/schedule/:id', loadDoctor, async (req, res, next) => {
  try{
    // Cập nhật các trường cho phép; chuẩn hóa `ngay` (nếu có)
    const { id } = req.params;
    const allow = ['ca','loaiCa','phongKhamId','lyDo','note','ngay'];
    const body = req.body || {};
    const update = {};
    for(const k of allow){ if(typeof body[k] !== 'undefined') update[k] = body[k]; }
    if(update.ngay){ const d = new Date(update.ngay); if(isNaN(d)) return res.status(400).json({ message: 'Ngày không hợp lệ' }); update.ngay = new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
    const doc = await DoctorSchedule.findOneAndUpdate({ _id: id, bacSiId: req.doctor._id }, update, { new: true });
    if(!doc) return res.status(404).json({ message: 'Không tìm thấy lịch' });
    res.json(doc);
  }catch(err){
    if(err && err.code===11000){ return res.status(409).json({ message: 'Xung đột ngày/ca' }); }
    return next(err);
  }
});

// DELETE /api/doctor/schedule/:id
router.delete('/schedule/:id', loadDoctor, async (req, res, next) => {
  try{
    // Xóa lịch làm việc theo `id` (chỉ của chính bác sĩ)
    const { id } = req.params;
    const r = await DoctorSchedule.findOneAndDelete({ _id: id, bacSiId: req.doctor._id });
    if(!r) return res.status(404).json({ message: 'Không tìm thấy lịch' });
    res.json({ ok: true });
  }catch(err){ return next(err); }
});

// ===== Danh sách bệnh nhân trong ngày (theo lịch hẹn hoặc số thứ tự) =====
router.get('/today/patients', loadDoctor, async (req, res, next) => {
  try{
    // Danh sách bệnh nhân trong ngày: dựa trên lịch khám của bác sĩ
    // - Join với bảng số thứ tự (SoThuTu) để lấy thứ tự
    // - Sắp xếp theo số thứ tự, sau đó theo khung giờ
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const end = new Date(today.getFullYear(), today.getMonth(), today.getDate()+1);
    const appts = await LichKham.find({ bacSiId: req.doctor._id, ngayKham: { $gte: start, $lt: end } })
      .populate('benhNhanId', 'hoTen soDienThoai ngaySinh gioiTinh')
      .lean();

    // Lấy hồ sơ khám liên kết với các lịch hẹn trong ngày
    const apptIds = appts.map(a => a._id);
    const cases = await HoSoKham.find({ lichKhamId: { $in: apptIds } })
      .select('_id lichKhamId trangThai')
      .lean();
    const lkToCase = cases.reduce((m,c)=>{ m[String(c.lichKhamId)] = c; return m; }, {});

    // Kiểm tra đơn thuốc đã được tạo cho các hồ sơ
    const caseIds = cases.map(c => c._id);
    const dons = caseIds.length ? await DonThuoc.find({ hoSoKhamId: { $in: caseIds } })
      .select('hoSoKhamId')
      .lean() : [];
    const rxSet = new Set(dons.map(d => String(d.hoSoKhamId)));
    const stts = await SoThuTu.find({ lichKhamId: { $in: appts.map(a=>a._id) } }).select('lichKhamId soThuTu trangThai').lean();
    const sttMap = stts.reduce((m,s)=>{ m[String(s.lichKhamId)] = s; return m; },{});
    const items = appts.map(a=>{
      const caseDoc = lkToCase[String(a._id)];
      const hasPrescription = caseDoc ? rxSet.has(String(caseDoc._id)) : false;
      // Nếu đã có đơn thuốc hoặc trạng thái lịch/hồ sơ đã hoàn tất => hiển thị Khám xong
      const finalStatus = (a.trangThai === 'hoan_tat' || a.trangThai === 'da_kham' || caseDoc?.trangThai === 'hoan_tat' || hasPrescription)
        ? 'hoan_tat'
        : a.trangThai;
      return {
        _id: a._id,
        benhNhan: a.benhNhanId,
        khungGio: a.khungGio,
        trangThai: finalStatus,
        soThuTu: sttMap[String(a._id)]?.soThuTu || null,
      };
    });
    // sort by soThuTu then khungGio
    items.sort((x,y)=>{
      const sx = x.soThuTu ?? 1e9; const sy = y.soThuTu ?? 1e9;
      if(sx!==sy) return sx-sy;
      return (x.khungGio||'').localeCompare(y.khungGio||'');
    });
    res.json(items);
  }catch(err){ return next(err); }
});

// ===== GET TODAY'S STATISTICS =====
// GET /api/doctor/today/stats - lấy thống kê của ngày hôm nay
router.get('/today/stats', loadDoctor, async (req, res, next) => {
  try{
    // Thống kê trong ngày: số chỉ định chưa có kết quả, số đơn thuốc
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const end = new Date(today.getFullYear(), today.getMonth(), today.getDate()+1);
    
    // Lấy tất cả hồ sơ khám của bác sĩ trong ngày hôm nay
    const hoSoKhams = await HoSoKham.find({ 
      bacSiId: req.doctor._id, 
      ngayKham: { $gte: start, $lt: end } 
    }).select('_id').lean();
    
    const hoSoKhamIds = hoSoKhams.map(h => h._id);
    
    // Đếm chỉ định chưa có kết quả
    const pendingLabs = await CanLamSang.countDocuments({
      hoSoKhamId: { $in: hoSoKhamIds },
      ketQua: { $exists: false } // Chưa có kết quả
    });
    
    // Đếm đơn thuốc
    const prescriptions = await DonThuoc.countDocuments({
      hoSoKhamId: { $in: hoSoKhamIds }
    });
    
    res.json({ 
      chiDinhPending: pendingLabs,
      toaThuoc: prescriptions
    });
  }catch(err){ return next(err); }
});

// ===== Tiếp nhận bệnh nhân theo lịch (tạo hồ sơ khám từ STT) =====
// POST /api/doctor/appointments/:id/intake
router.post('/appointments/:id/intake', loadDoctor, async (req, res, next) => {
  try {
    // Tiếp nhận bệnh nhân theo lịch hẹn:
    // - Đảm bảo có STT (tạo nếu chưa có), chuyển trạng thái STT sang 'da_goi'
    // - Tạo (hoặc lấy) hồ sơ khám (HoSoKham) liên kết với lịch
    const { id } = req.params;
    // Lấy lịch khám thuộc bác sĩ hiện tại
    const appt = await LichKham.findOne({ _id: id, bacSiId: req.doctor._id }).populate('benhNhanId','hoTen soDienThoai ngaySinh gioiTinh');
    if(!appt) return res.status(404).json({ message: 'Không tìm thấy lịch khám cho bác sĩ này' });

    // Đảm bảo số thứ tự tồn tại và chuyển trạng thái sang đã gọi
    let stt = await SoThuTu.findOne({ lichKhamId: appt._id });
    if(!stt){
      const dayStart = startOfDay(appt.ngayKham);
      const dayEnd = endOfDay(appt.ngayKham);
      const count = await SoThuTu.countDocuments({ lichKhamId: { $exists: true }, createdAt: { $gte: dayStart, $lt: dayEnd }, benhNhanId: appt.benhNhanId });
      const so = count + 1;
      stt = await SoThuTu.create({ lichKhamId: appt._id, benhNhanId: appt.benhNhanId, soThuTu: so, trangThai: 'da_goi' });
    } else if(stt.trangThai === 'dang_cho') {
      stt.trangThai = 'da_goi';
      await stt.save();
    }

    // Tạo hoặc lấy hồ sơ khám liên kết lịch khám
    let caseDoc = await HoSoKham.findOne({ lichKhamId: appt._id, bacSiId: req.doctor._id });
    if(!caseDoc){
      caseDoc = await HoSoKham.create({ lichKhamId: appt._id, benhNhanId: appt.benhNhanId, bacSiId: req.doctor._id });
    }
    caseDoc = await caseDoc.populate('benhNhanId','hoTen soDienThoai ngaySinh gioiTinh');

    return res.json({ ok: true, case: caseDoc, soThuTu: stt.soThuTu, sttTrangThai: stt.trangThai });
  } catch(err){ return next(err); }
});

// ===== Bỏ qua bệnh nhân (đánh dấu bo_qua) =====
// POST /api/doctor/appointments/:id/skip
router.post('/appointments/:id/skip', loadDoctor, async (req, res, next) => {
  try {
    // Đánh dấu bỏ qua bệnh nhân trong hàng đợi của lịch hẹn
    const appt = await LichKham.findOne({ _id: req.params.id, bacSiId: req.doctor._id });
    if(!appt) return res.status(404).json({ message: 'Không tìm thấy lịch khám' });
    let stt = await SoThuTu.findOne({ lichKhamId: appt._id });
    if(!stt) return res.status(400).json({ message: 'Chưa có STT để bỏ qua' });
    if(stt.trangThai === 'bo_qua') return res.json({ ok:true, message: 'Đã ở trạng thái bỏ qua' });
    stt.trangThai = 'bo_qua';
    await stt.save();
    return res.json({ ok:true });
  } catch(err){ return next(err); }
});

// ===== Gọi bệnh nhân tiếp theo trong hàng đợi =====
// POST /api/doctor/queue/next
router.post('/queue/next', loadDoctor, async (req, res, next) => {
  try {
    // Gọi bệnh nhân tiếp theo:
    // - Tìm STT 'dang_cho' nhỏ nhất trong ngày
    // - Chuyển sang 'da_goi' và đảm bảo hồ sơ khám tồn tại
    const today = new Date();
    const start = startOfDay(today); const end = endOfDay(today);
    const appts = await LichKham.find({ bacSiId: req.doctor._id, ngayKham: { $gte: start, $lt: end } }).select('_id benhNhanId').lean();
    const stts = await SoThuTu.find({ lichKhamId: { $in: appts.map(a=>a._id) }, trangThai: 'dang_cho' }).sort({ soThuTu: 1 }).limit(1);
    const target = stts[0];
    if(!target) return res.status(404).json({ message: 'Không còn bệnh nhân chờ' });
    target.trangThai = 'da_goi';
    await target.save();
    // Ensure case exists
    let caseDoc = await HoSoKham.findOne({ lichKhamId: target.lichKhamId, bacSiId: req.doctor._id });
    if(!caseDoc){
      const appt = appts.find(a => String(a._id) === String(target.lichKhamId));
      if(appt){
        caseDoc = await HoSoKham.create({ lichKhamId: appt._id, benhNhanId: appt.benhNhanId, bacSiId: req.doctor._id });
      }
    }
    caseDoc = await caseDoc.populate('benhNhanId','hoTen soDienThoai ngaySinh gioiTinh');
    return res.json({ ok:true, case: caseDoc, soThuTu: target.soThuTu });
  } catch(err){ return next(err); }
});

// ===== Gửi thông báo mời vào (stub) =====
// POST /api/doctor/appointments/:id/notify
router.post('/appointments/:id/notify', loadDoctor, async (req, res, next) => {
  try {
    // Gửi thông báo mời vào (mô phỏng); nếu đang 'dang_cho' thì chuyển sang 'da_goi'
    const appt = await LichKham.findOne({ _id: req.params.id, bacSiId: req.doctor._id }).populate('benhNhanId','hoTen soDienThoai');
    if(!appt) return res.status(404).json({ message: 'Không tìm thấy lịch khám' });
    let stt = await SoThuTu.findOne({ lichKhamId: appt._id });
    if(!stt) return res.status(400).json({ message: 'Chưa có STT' });
    if(stt.trangThai === 'dang_cho'){ stt.trangThai = 'da_goi'; await stt.save(); }
    // TODO: integrate real notification channel (websocket/email/SMS)
    return res.json({ ok:true, message: 'Đã gửi thông báo (mô phỏng)', soThuTu: stt.soThuTu });
  } catch(err){ return next(err); }
});

// ===== Cập nhật trạng thái làm việc hiện tại của bác sĩ =====
// PUT /api/doctor/work-status { status }
router.put('/work-status', loadDoctor, async (req, res, next) => {
  try {
    // Cập nhật trạng thái làm việc hiện tại của bác sĩ: 'dang_kham' | 'nghi' | 'ban'
    const { status } = req.body || {};
    if(!['dang_kham','nghi','ban'].includes(status)) return res.status(400).json({ message: 'Status không hợp lệ' });
    req.doctor.trangThaiHienTai = status;
    await req.doctor.save();
    return res.json({ ok:true, status: req.doctor.trangThaiHienTai });
  } catch(err){ return next(err); }
});

// ===== Lịch sử bệnh nhân tổng hợp =====
// GET /api/doctor/patients/:id/history-full
router.get('/patients/:id/history-full', loadDoctor, async (req, res, next) => {
  try {
    const benhNhanId = req.params.id;
    const cases = await HoSoKham.find({ benhNhanId, bacSiId: req.doctor._id }).sort({ createdAt: -1 }).limit(10)
      .populate('benhNhanId','hoTen soDienThoai ngaySinh gioiTinh');
    const caseIds = cases.map(c=>c._id);
    const labs = await CanLamSang.find({ hoSoKhamId: { $in: caseIds } }).lean();
    const prescriptions = await DonThuoc.find({ hoSoKhamId: { $in: caseIds } }).lean();
    return res.json({ cases, labs, prescriptions });
  } catch(err){ return next(err); }
});

// ===== Tạo đơn thuốc (prescription) =====
// POST /api/doctor/cases/:id/prescriptions { items: [{thuocId, soLuong}] }
router.post('/cases/:id/prescriptions', loadDoctor, async (req, res, next) => {
  try {
    const hs = await HoSoKham.findOne({ _id: req.params.id, bacSiId: req.doctor._id });
    if(!hs) return res.status(404).json({ message: 'Không tìm thấy hồ sơ' });
    const { items } = req.body || {};
    if(!Array.isArray(items) || items.length===0) return res.status(400).json({ message: 'Danh sách thuốc trống' });
    const thuocIds = items.map(i=>i.thuocId);
    const thuocs = await ThuocKho.find({ _id: { $in: thuocIds } }).select('ten_san_pham don_vi don_vi_dang_chon gia');
    const map = thuocs.reduce((m,t)=>{ m[String(t._id)] = t; return m; },{});
    const normalized = items
      .filter(i=> i && i.thuocId && Number(i.soLuong) > 0)
      .map(i=>({
        thuocId: i.thuocId,
        tenThuoc: map[String(i.thuocId)]?.ten_san_pham||'',
        soLuong: Number(i.soLuong) || 0,
        dosageMorning: Number(i.dosageMorning)||0,
        dosageNoon: Number(i.dosageNoon)||0,
        dosageEvening: Number(i.dosageEvening)||0,
        days: Number(i.days)||0,
        usageNote: i.usageNote||''
      }));
    if(!normalized.length) return res.status(400).json({ message: 'Danh sách thuốc không hợp lệ' });
    const doc = await DonThuoc.create({ hoSoKhamId: hs._id, items: normalized });

    // Sau khi kê đơn: đánh dấu hồ sơ & lịch khám đã hoàn tất để UI "Gọi bệnh nhân" hiển thị "Khám xong"
    try {
      // Cập nhật trạng thái hồ sơ khám
      hs.trangThai = 'hoan_tat';
      hs.ketThucLuc = new Date();
      await hs.save();

      // Cập nhật lịch khám liên quan (nếu có)
      if (hs.lichKhamId) {
        const lk = await LichKham.findById(hs.lichKhamId);
        if (lk) {
          lk.trangThai = 'hoan_tat';
          await lk.save();
          // Cập nhật số thứ tự sang trạng thái hoàn tất
          await SoThuTu.updateOne(
            { lichKhamId: lk._id },
            { trangThai: 'hoan_tat' }
          );
        }
      }
    } catch (statusErr) {
      // Không chặn phản hồi kê đơn nếu lỗi cập nhật trạng thái; chỉ log để theo dõi
      console.warn('[PRESCRIPTIONS] Lỗi cập nhật trạng thái sau kê đơn:', statusErr);
    }

    // Trả về đơn thuốc kèm hồ sơ vừa cập nhật để frontend cập nhật ngay
    const populatedCase = await HoSoKham.findById(hs._id)
      .populate('benhNhanId','hoTen soDienThoai ngaySinh gioiTinh');
    return res.status(201).json({ prescription: doc, case: populatedCase });
  } catch(err){ return next(err); }
});

// ===== Danh sách đơn thuốc của hồ sơ (simple) =====
router.get('/cases/:id/prescriptions', loadDoctor, async (req, res, next) => {
  try {
    const hs = await HoSoKham.findOne({ _id: req.params.id, bacSiId: req.doctor._id });
    if(!hs) return res.status(404).json({ message: 'Không tìm thấy hồ sơ' });
    const dons = await DonThuoc.find({ hoSoKhamId: hs._id })
      .sort({ createdAt: -1 })
      .populate({ path: 'items.thuocId', select: 'ten_san_pham gia loaiThuoc don_vi don_vi_dang_chon', populate: { path: 'loaiThuoc', select: 'ten' } });
    return res.json(dons);
  } catch(err){ return next(err); }
});

// ===== Chi tiết hồ sơ, cập nhật lâm sàng, kết thúc ca =====
router.get('/cases/:id', loadDoctor, async (req, res, next) => {
  try{
    const hs = await HoSoKham.findOne({ _id: req.params.id, bacSiId: req.doctor._id })
      .populate('benhNhanId','hoTen soDienThoai ngaySinh gioiTinh');
    if(!hs) return res.status(404).json({ message: 'Không tìm thấy hồ sơ' });
    res.json(hs);
  }catch(err){ return next(err); }
});

router.put('/cases/:id', loadDoctor, async (req, res, next) => {
  try{
    const allow = ['chanDoan','huongDieuTri','trieuChung','khamLamSang','sinhHieu','trangThai'];
    const body = req.body || {};
    const update = {};
    for(const k of allow){ if(typeof body[k] !== 'undefined') update[k] = body[k]; }
    const hs = await HoSoKham.findOneAndUpdate({ _id: req.params.id, bacSiId: req.doctor._id }, update, { new: true })
      .populate('benhNhanId','hoTen soDienThoai ngaySinh gioiTinh');
    if(!hs) return res.status(404).json({ message: 'Không tìm thấy hồ sơ' });
    res.json(hs);
  }catch(err){ return next(err); }
});

router.post('/cases/:id/complete', loadDoctor, async (req, res, next) => {
  try{
    // Cập nhật HoSoKham
    const hs = await HoSoKham.findOneAndUpdate(
      { _id: req.params.id, bacSiId: req.doctor._id }, 
      { trangThai: 'hoan_tat', ketThucLuc: new Date() }, 
      { new: true }
    );
    if(!hs) return res.status(404).json({ message: 'Không tìm thấy hồ sơ' });
    
    // Cập nhật LichKham có HoSoKham này thành 'hoan_tat'
    const lk = await LichKham.findOne({ _id: hs.lichKhamId });
    if(lk) {
      lk.trangThai = 'hoan_tat';
      await lk.save();
    }
    
    // Cập nhật SoThuTu thành 'hoan_tat'
    if(lk) {
      await SoThuTu.updateOne(
        { lichKhamId: lk._id },
        { trangThai: 'hoan_tat' }
      );
    }
    
    res.json(hs);
  }catch(err){ return next(err); }
});

// ===== Chỉ định cận lâm sàng và xem kết quả =====
router.post('/cases/:id/labs', loadDoctor, async (req, res, next) => {
  try{
    const { dichVuId, loaiChiDinh } = req.body || {};
    if(!dichVuId) return res.status(400).json({ message: 'Thiếu dichVuId (dịch vụ cận lâm sàng)' });
    const hs = await HoSoKham.findOne({ _id: req.params.id, bacSiId: req.doctor._id });
    if(!hs) return res.status(404).json({ message: 'Không tìm thấy hồ sơ' });
    const DichVu = require('../models/DichVu');
    const dv = await DichVu.findById(dichVuId).populate('chuyenKhoaId','ten');
    if(!dv) return res.status(404).json({ message: 'Không tìm thấy dịch vụ' });
    const c = await CanLamSang.create({ hoSoKhamId: hs._id, dichVuId: dv._id, loaiChiDinh: loaiChiDinh || undefined });
    if(hs.trangThai !== 'cho_ket_qua') await HoSoKham.updateOne({ _id: hs._id }, { $set: { trangThai: 'cho_ket_qua' } });
    const populated = await CanLamSang.findById(c._id)
      .populate({ path:'dichVuId', select:'ten gia chuyenKhoaId', populate:{ path:'chuyenKhoaId', select:'ten'} });
    res.status(201).json(populated);
  }catch(err){ return next(err); }
});

router.get('/cases/:id/labs', loadDoctor, async (req, res, next) => {
  try{
    const hs = await HoSoKham.findOne({ _id: req.params.id, bacSiId: req.doctor._id });
    if(!hs) return res.status(404).json({ message: 'Không tìm thấy hồ sơ' });
    const items = await CanLamSang.find({ hoSoKhamId: hs._id }).sort({ createdAt: -1 })
      .populate({ path:'dichVuId', select:'ten gia chuyenKhoaId', populate:{ path:'chuyenKhoaId', select:'ten'} });
    res.json(items);
  }catch(err){ return next(err); }
});

// Update note for a lab order (only owning doctor, and not finished)
router.put('/labs/:id/note', loadDoctor, async (req, res, next) => {
  try{
    const { ghiChu } = req.body || {};
    const lab = await CanLamSang.findById(req.params.id);
    if(!lab) return res.status(404).json({ message: 'Không tìm thấy chỉ định' });
    const hs = await HoSoKham.findById(lab.hoSoKhamId);
    if(!hs || String(hs.bacSiId) !== String(req.doctor._id)) return res.status(403).json({ message: 'Forbidden' });
    if(lab.trangThai === 'da_xong') return res.status(400).json({ message: 'Đã hoàn tất, không thể ghi chú' });
    lab.ghiChu = (ghiChu||'').trim();
    await lab.save();
    const populated = await CanLamSang.findById(lab._id)
      .populate({ path:'dichVuId', select:'ten gia chuyenKhoaId', populate:{ path:'chuyenKhoaId', select:'ten'} });
    res.json(populated);
  }catch(err){ return next(err); }
});

// Delete a pending lab order
router.delete('/labs/:id', loadDoctor, async (req, res, next) => {
  try{
    const lab = await CanLamSang.findById(req.params.id);
    if(!lab) return res.status(404).json({ message: 'Không tìm thấy chỉ định' });
    const hs = await HoSoKham.findById(lab.hoSoKhamId);
    if(!hs || String(hs.bacSiId) !== String(req.doctor._id)) return res.status(403).json({ message: 'Forbidden' });
    if(lab.trangThai !== 'cho_thuc_hien') return res.status(400).json({ message: 'Chỉ xóa khi trạng thái chờ thực hiện' });
    await lab.deleteOne();
    // Return remaining list for convenience
    const items = await CanLamSang.find({ hoSoKhamId: hs._id }).sort({ createdAt: -1 })
      .populate({ path:'dichVuId', select:'ten gia chuyenKhoaId', populate:{ path:'chuyenKhoaId', select:'ten'} });
    res.json({ message:'Đã xóa', items });
  }catch(err){ return next(err); }
});

// (Removed duplicate simple prescriptions list route; populated route defined earlier)

// ===== Lịch sử khám của 1 bệnh nhân =====
router.get('/patients/:id/cases', loadDoctor, async (req, res, next) => {
  try{
    const limit = Math.min(parseInt(req.query.limit||'20',10), 50);
    const page = Math.max(parseInt(req.query.page||'1',10), 1);
    const [items, total] = await Promise.all([
      HoSoKham.find({ benhNhanId: req.params.id, bacSiId: req.doctor._id }).sort({ createdAt: -1 }).skip((page-1)*limit).limit(limit)
        .populate('benhNhanId','hoTen soDienThoai ngaySinh gioiTinh'),
      HoSoKham.countDocuments({ benhNhanId: req.params.id, bacSiId: req.doctor._id })
    ]);
    res.json({ items, total, page, limit });
  }catch(err){ return next(err); }
});

// ===== GET /api/doctor/patients/:id/history - Lịch sử khám của bệnh nhân (tất cả lần khám) =====
router.get('/patients/:id/history', loadDoctor, async (req, res, next) => {
  try{
    const benhNhanId = req.params.id;
    const limit = Math.min(parseInt(req.query.limit||'100',10), 100);
    const page = Math.max(parseInt(req.query.page||'1',10), 1);
    
    // Tìm tất cả hồ sơ khám của bệnh nhân (không giới hạn theo bác sĩ)
    const [cases, total] = await Promise.all([
      HoSoKham.find({ benhNhanId })
        .sort({ ngayKham: -1, createdAt: -1 })
        .skip((page-1)*limit)
        .limit(limit)
        .populate('benhNhanId', 'hoTen soDienThoai ngaySinh gioiTinh')
        .populate('bacSiId', 'hoTen chuyenKhoa')
        .lean(),
      HoSoKham.countDocuments({ benhNhanId })
    ]);

    // Nếu cần thêm chi tiết chỉ định và đơn thuốc
    const enriched = await Promise.all(cases.map(async (hs) => {
      const [chiDinh, donThuoc] = await Promise.all([
        CanLamSang.find({ hoSoKhamId: hs._id })
          .populate('dichVuId', 'ten gia chuyenKhoaId')
          .lean(),
        DonThuoc.find({ hoSoKhamId: hs._id })
          .populate('items.thuocId', 'tenThuoc donViTinh loaiThuoc gia')
          .lean()
      ]);
      return {
        ...hs,
        chiDinh,
        donThuoc: donThuoc.flatMap(dt => dt.items || [])
      };
    }));

    res.json(enriched);
  }catch(err){ return next(err); }
});

// ===== GET /api/patients?q=... - Tìm bệnh nhân theo tên/sđt (dùng cho lịch sử) =====
// Thêm vào routes/patients.js thay vì doctorSelf
// Vì frontend gọi /api/patients?q=...

module.exports = router;
