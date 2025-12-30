const express = require('express'); // Import Express để tạo router HTTP
const mongoose = require('mongoose'); // Import Mongoose để làm việc với MongoDB/ObjectId
const crypto = require('crypto'); // Import crypto để ký/kiểm tra chữ ký HMAC (MoMo)
const BenhNhan = require('../models/BenhNhan'); // Model: Bệnh nhân gắn với user
const ChuyenKhoa = require('../models/ChuyenKhoa'); // Model: Chuyên khoa
const BacSi = require('../models/BacSi'); // Model: Bác sĩ
const LichKham = require('../models/LichKham'); // Model: Lịch khám
const SoThuTu = require('../models/SoThuTu'); // Model: Số thứ tự (hàng đợi)
const HoSoKham = require('../models/HoSoKham'); // Model: Hồ sơ khám bệnh
const CanLamSang = require('../models/CanLamSang'); // Model: Cận lâm sàng
const WorkSchedule = require('../models/WorkSchedule'); // Model: Lịch làm việc theo ca
const ScheduleConfig = require('../models/ScheduleConfig'); // Model: Cấu hình ca theo tháng
const PatientProfile = require('../models/PatientProfile'); // Model: Hồ sơ người thân
const auth = require('../middlewares/auth'); // Middleware xác thực người dùng

const router = express.Router(); // Khởi tạo một router Express


/*
TÓM TẮT API — Đặt lịch & MoMo (Booking)
- Mục tiêu: Đặt lịch khám (self/người thân/walk-in), tra cứu lịch/kết quả, hàng đợi (STT), và thanh toán MoMo.
- Quyền tổng quát:
  - Nhiều endpoint yêu cầu auth (user đăng nhập). Các thao tác quản trị/tiếp nhận giới hạn role: admin/reception.
  - Hạn chế đặt lịch: user KHÔNG đặt cho ngày hôm nay hoặc đã qua; tiếp nhận trực tiếp (walk-in) được phép trong giờ ca và khi bác sĩ có lịch làm việc.
- Mô hình liên quan: BenhNhan, PatientProfile, BacSi, ChuyenKhoa, LichKham, SoThuTu, HoSoKham, CanLamSang, WorkSchedule, ScheduleConfig.

Endpoints chính:
1) Bệnh nhân của user
  - POST /api/booking/patients: tạo/cập nhật hồ sơ BenhNhan cho user hiện tại.
  - GET  /api/booking/patients?phone=: liệt kê bệnh nhân thuộc user (khách có thể tra theo SĐT).

2) Lịch/kết quả của user
  - GET /api/booking/my-appointments?page&limit: lịch khám do user đặt (nguoiDatId).
  - GET /api/booking/my-results?page&limit: kết quả CLS thuộc các hồ sơ của user.
  - GET /api/booking/my-cases?page&limit: các hồ sơ khám (HoSoKham) của user.
  - GET /api/booking/my-cases/:id/detail: chi tiết hồ sơ + CLS + đơn thuốc.

3) Khám & lịch bác sĩ
  - GET  /api/booking/specialties: danh mục chuyên khoa.
  - GET  /api/booking/availability?chuyenKhoaId&date=YYYY-MM-DD: bác sĩ & khung giờ trống theo ngày/chuyên khoa (ẩn hôm nay và quá khứ cho user).
  - POST /api/booking/appointments: tạo lịch (self/relative/walk-in). Walk-in chỉ cho admin/reception, phải trong giờ ca và bác sĩ có WorkSchedule cùng ngày/ca.
  - POST /api/booking/appointments/:id/pay: xác nhận đã thanh toán và cấp STT.
  - GET  /api/booking/appointments?date&benhNhanId&bacSiId: liệt kê lịch theo bộ lọc.
  - GET  /api/booking/doctor-appointments?bacSiId&date: (auth) chỉ admin/reception xem lịch 1 bác sĩ theo ngày.
  - PUT  /api/booking/appointments/:id/time { khungGio?, date? }: (auth) admin/reception chỉnh ngày/giờ (không cho lịch đã khám).
  - PUT  /api/booking/appointments/:id/reassign { bacSiId, khungGio?, date? }: (auth) admin/reception đổi bác sĩ/giờ.
  - DELETE /api/booking/appointments/:id: (auth) người đặt tự hủy; chặn lịch đã khám; không hủy trong vòng 2 giờ trước giờ khám.
  - GET  /api/booking/queues?date&bacSiId: liệt kê STT theo ngày (kèm bác sĩ/phòng khám nếu có).
  - GET  /api/booking/doctor-available-days?bacSiId&month=YYYY-MM: ngày/ca bác sĩ có lịch, kèm shiftHours của tháng.
  - GET  /api/booking/appointments/:id/ticket: tra trạng thái lịch + STT.
  - GET  /api/booking/appointments/:id/detail-simple: thông tin cơ bản để hiển thị (bác sĩ/phòng khám).

4) Thanh toán MoMo
  - POST /api/booking/appointments/:id/momo: tạo phiên thanh toán; trả payUrl/deeplink.
  - POST /api/booking/momo/ipn: IPN xác nhận; đánh dấu da_thanh_toan và cấp STT (idempotent theo ngày khám).
  - POST /api/booking/momo/return: client POST từ redirect; xác minh chữ ký; set trạng thái & trả STT.
  - GET  /api/booking/momo/return-get: endpoint redirect GET; xác minh chữ ký; chuyển hướng về frontend kèm trạng thái.

Quy tắc/STT & Trạng thái:
- Trạng thái lịch: cho_thanh_toan → da_thanh_toan → (ngoài phạm vi file này) da_kham.
- Cấp số thứ tự (SoThuTu): theo tổng số STT đã cấp cho tất cả lịch trong cùng ngày khám (tăng dần 1,2,3,...), tránh trùng qua đếm tổng.

MoMo cấu hình (mặc định dev): MOMO_PARTNER_CODE, MOMO_ACCESS_KEY, MOMO_SECRET_KEY, MOMO_ENDPOINT, MOMO_RETURN_URL, MOMO_IPN_URL, SERVER_BASE_URL, FRONTEND_RETURN_URL, MOMO_AMOUNT.

Chỉ mục khuyến nghị:
- LichKham(bacSiId, ngayKham, khungGio) + unique theo (bacSiId, ngayKham, khungGio); LichKham(nguoiDatId, ngayKham).
- SoThuTu(lichKhamId), WorkSchedule(userId, role, day, shift), ScheduleConfig(month), CanLamSang(hoSoKhamId), HoSoKham(benhNhanId, createdAt).
*/


// Helpers: Hàm tiện ích xử lý ngày/giờ
function startOfDay(d){ return new Date(d.getFullYear(), d.getMonth(), d.getDate()); } // Trả về 00:00:00 của ngày d
function endOfDay(d){ return new Date(d.getFullYear(), d.getMonth(), d.getDate()+1); } // Trả về 00:00:00 của ngày kế tiếp
function normTimeStr(t){ // Chuẩn hoá chuỗi "HH:MM" về dạng an toàn so sánh chuỗi
  if(!t || typeof t !== 'string') return '';
  const m = /^(\d{1,2}):(\d{2})$/.exec(t.trim());
  if(!m) return t;
  const hh = String(Math.min(99, Math.max(0, parseInt(m[1],10)))).padStart(2,'0');
  const mm = String(Math.min(59, Math.max(0, parseInt(m[2],10)))).padStart(2,'0');
  return `${hh}:${mm}`;
}
function monthRangeStr(month){ // Trả về khoảng [start,end) dạng chuỗi cho tháng YYYY-MM
  const m = /^([0-9]{4})-([0-9]{2})$/.exec(month||'');
  if(!m) return null;
  const y = +m[1]; const mon = +m[2]; if(mon<1||mon>12) return null;
  const start = `${m[1]}-${m[2]}-01`;
  const nextMonth = new Date(Date.UTC(y, mon-1, 1)); nextMonth.setUTCMonth(nextMonth.getUTCMonth()+1);
  const ny = nextMonth.getUTCFullYear(); const nm = String(nextMonth.getUTCMonth()+1).padStart(2,'0');
  const end = `${ny}-${nm}-01`;
  return { start, end };
}

router.post('/patients', auth, async (req, res, next) => { // Endpoint tạo/cập nhật bệnh nhân cho user hiện tại
  try{ // Bọc trong try để xử lý lỗi
    const userId = req.user?.id || null; // Lấy id user từ token (có thể null)
    const { id, hoTen, ngaySinh, gioiTinh, soDienThoai, diaChi, maBHYT } = req.body || {}; // Lấy dữ liệu từ body
    const data = { userId, hoTen, ngaySinh, gioiTinh, soDienThoai, diaChi, maBHYT }; // Tạo object dữ liệu lưu DB
    let bn; // Biến kết quả hồ sơ bệnh nhân
    if(id){ // Nếu có id → cập nhật hồ sơ có sẵn
      bn = await BenhNhan.findOneAndUpdate({ _id: id, ...(userId? { userId } : {}) }, data, { new: true }); // Cập nhật và trả bản ghi mới
    } else { // Nếu không có id → tạo mới
      bn = await BenhNhan.create(data); // Tạo bản ghi bệnh nhân mới
    }
    return res.status(id?200:201).json(bn); // Trả 200 nếu cập nhật, 201 nếu tạo mới
  }catch(err){ return next(err); } // Chuyển lỗi cho middleware
});

router.get('/patients', auth, async (req, res, next) => { // Endpoint liệt kê bệnh nhân của user (hoặc theo SĐT)
  try{ // Bắt đầu xử lý
    const userId = req.user?.id || null; // Lấy id user
    const { phone } = req.query; // Lấy tham số phone nếu có
    const filter = userId ? { userId } : (phone? { soDienThoai: phone } : {}); // Xây filter: theo userId hoặc theo SĐT
    const items = await BenhNhan.find(filter).sort({ updatedAt: -1 }).limit(20); // Tìm tối đa 20 hồ sơ
    return res.json(items); // Trả danh sách hồ sơ
  }catch(err){ return next(err); } // Trả lỗi cho middleware
});

router.get('/my-appointments', auth, async (req, res, next) => { // Endpoint lấy danh sách lịch do user đã đặt
  try{ // Bắt đầu xử lý
    const page = Math.max(parseInt(req.query.page||'1',10),1); // Trang hiện tại (>=1)
    const limit = Math.min(Math.max(parseInt(req.query.limit||'10',10),1),50); // Số dòng mỗi trang (1..50)
    const skip = (page-1)*limit; // Số bản ghi bỏ qua

    const filter = { nguoiDatId: req.user.id }; // Lọc lịch theo người đặt là user hiện tại

    const [items, total] = await Promise.all([ // Truy vấn danh sách và tổng số song song
      LichKham.find(filter)
        .sort({ ngayKham: -1, createdAt: -1 }) // Sắp xếp mới nhất trước
        .skip(skip).limit(limit)
        .populate('bacSiId','hoTen chuyenKhoa') // Lấy thông tin bác sĩ
        .populate('chuyenKhoaId','ten') // Lấy tên chuyên khoa
        .populate('benhNhanId', 'hoTen') // Tên bệnh nhân khi đặt cho bản thân
        .populate('hoSoBenhNhanId', 'hoTen'), // Tên hồ sơ người thân khi đặt thay
      LichKham.countDocuments(filter) // Đếm tổng số dòng
    ]);

    const stts = await SoThuTu.find({ lichKhamId: { $in: items.map(i=>i._id) } }).select('lichKhamId soThuTu trangThai').lean(); // Lấy STT của các lịch
    const sttMap = stts.reduce((m,s)=>{ m[String(s.lichKhamId)] = s; return m; },{}); // Map lichKhamId -> STT

    const result = items.map(ap => ({ // Chuẩn hoá dữ liệu trả về
      _id: ap._id, // ID lịch
      ngayKham: ap.ngayKham, // Ngày khám
      khungGio: ap.khungGio, // Khung giờ
      trangThai: ap.trangThai, // Trạng thái lịch
      benhNhanId: ap.benhNhanId?._id || ap.benhNhanId || null, // ID bệnh nhân
      hoSoBenhNhanId: ap.hoSoBenhNhanId?._id || ap.hoSoBenhNhanId || null, // ID hồ sơ người thân
      benhNhan: { // Tên hiển thị của người khám (bản thân hoặc người thân)
        hoTen: ap.hoSoBenhNhanId ? ap.hoSoBenhNhanId.hoTen : (ap.benhNhanId ? ap.benhNhanId.hoTen : 'N/A')
      },
      bacSi: ap.bacSiId ? { id: ap.bacSiId._id, hoTen: ap.bacSiId.hoTen, chuyenKhoa: ap.bacSiId.chuyenKhoa } : null, // Thông tin bác sĩ
      chuyenKhoa: ap.chuyenKhoaId ? { id: ap.chuyenKhoaId._id, ten: ap.chuyenKhoaId.ten } : null, // Thông tin chuyên khoa
      soThuTu: sttMap[String(ap._id)]?.soThuTu || null, // Số thứ tự (nếu có)
      sttTrangThai: sttMap[String(ap._id)]?.trangThai || null, // Trạng thái của STT (nếu có)
    }));
    res.json({ items: result, total, page, limit, totalPages: Math.ceil(total/limit) }); // Trả về phân trang
  }catch(err){ return next(err); } // Xử lý lỗi chung
});





// GET /api/booking/my-results?page=1&limit=10
// Mô tả: Trả kết quả cận lâm sàng của các hồ sơ thuộc bệnh nhân của người dùng hiện tại
router.get('/my-results', auth, async (req, res, next) => { // Kết quả cận lâm sàng của bệnh nhân thuộc user
  try{
    const page = Math.max(parseInt(req.query.page||'1',10),1);
    const limit = Math.min(Math.max(parseInt(req.query.limit||'10',10),1),50);
    const skip = (page-1)*limit;
    // Bệnh nhân thuộc người dùng hiện tại
    const myPatients = await BenhNhan.find({ userId: req.user.id }).select('_id').lean();
    const pids = myPatients.map(p=>p._id);
    if(pids.length===0) return res.json({ items: [], total: 0, page, limit, totalPages: 0 });
    const hoSos = await HoSoKham.find({ benhNhanId: { $in: pids } }).select('_id').lean();
    const hsIds = hoSos.map(h=>h._id);
    if(hsIds.length===0) return res.json({ items: [], total: 0, page, limit, totalPages: 0 });
    const [labs, total] = await Promise.all([
      CanLamSang.find({ hoSoKhamId: { $in: hsIds } })
        .sort({ createdAt: -1 })
        .skip(skip).limit(limit)
        .populate({ path: 'hoSoKhamId', select: 'benhNhanId bacSiId ngayKham', populate: { path: 'bacSiId', select: 'hoTen chuyenKhoa' } }),
      CanLamSang.countDocuments({ hoSoKhamId: { $in: hsIds } })
    ]);
    const items = labs.map(l => ({
      _id: l._id,
      hoSoKhamId: l.hoSoKhamId?._id || null,
      benhNhanId: l.hoSoKhamId?.benhNhanId || null,
      loaiChiDinh: l.loaiChiDinh,
      trangThai: l.trangThai,
      ketQua: l.ketQua,
      ketQuaPdf: l.ketQuaPdf || null,
      ngayThucHien: l.ngayThucHien,
      createdAt: l.createdAt,
      bacSi: l.hoSoKhamId?.bacSiId ? { id: l.hoSoKhamId.bacSiId._id, hoTen: l.hoSoKhamId.bacSiId.hoTen, chuyenKhoa: l.hoSoKhamId.bacSiId.chuyenKhoa } : null,
      ngayKham: l.hoSoKhamId?.ngayKham || null,
    }));
    res.json({ items, total, page, limit, totalPages: Math.ceil(total/limit) });
  }catch(err){ return next(err); }
});

// ===== Bệnh nhân: liệt kê hồ sơ khám của mình =====
// GET /api/booking/my-cases?page=1&limit=20
router.get('/my-cases', auth, async (req, res, next) => { // Liệt kê hồ sơ khám thuộc user
  try {
    const page = Math.max(parseInt(req.query.page||'1',10),1);
    const limit = Math.min(Math.max(parseInt(req.query.limit||'20',10),1),50);
    const skip = (page-1)*limit;
    const myPatients = await BenhNhan.find({ userId: req.user.id }).select('_id').lean();
    const pids = myPatients.map(p=>p._id);
    if(!pids.length) return res.json({ items: [], total: 0, page, limit, totalPages: 0 });
    const [items, total] = await Promise.all([
      HoSoKham.find({ benhNhanId: { $in: pids } })
        .sort({ createdAt: -1 })
        .skip(skip).limit(limit)
        .populate('bacSiId','hoTen chuyenKhoa')
        .select('benhNhanId bacSiId chanDoan huongDieuTri trieuChung khamLamSang trangThai createdAt updatedAt'),
      HoSoKham.countDocuments({ benhNhanId: { $in: pids } })
    ]);
    const mapped = items.map(c => ({
      _id: c._id,
      benhNhanId: c.benhNhanId,
      chanDoan: c.chanDoan || '',
      huongDieuTri: c.huongDieuTri || '',
      trieuChung: c.trieuChung || '',
      khamLamSang: c.khamLamSang || '',
      trangThai: c.trangThai,
      createdAt: c.createdAt,
      bacSi: c.bacSiId ? { id: c.bacSiId._id, hoTen: c.bacSiId.hoTen, chuyenKhoa: c.bacSiId.chuyenKhoa } : null
    }));
    res.json({ items: mapped, total, page, limit, totalPages: Math.ceil(total/limit) });
  } catch(err){ return next(err); }
});

// ===== Bệnh nhân: chi tiết hồ sơ (kèm cận lâm sàng & đơn thuốc) =====
// GET /api/booking/my-cases/:id/detail
router.get('/my-cases/:id/detail', auth, async (req, res, next) => { // Chi tiết hồ sơ kèm labs và đơn thuốc
  try {
    const myPatients = await BenhNhan.find({ userId: req.user.id }).select('_id').lean();
    const pids = new Set(myPatients.map(p=>String(p._id)));
    const hs = await HoSoKham.findById(req.params.id).populate('bacSiId','hoTen chuyenKhoa');
    if(!hs || !pids.has(String(hs.benhNhanId))) return res.status(404).json({ message: 'Không tìm thấy hồ sơ' });
    const labs = await CanLamSang.find({ hoSoKhamId: hs._id })
      .sort({ createdAt: -1 })
      .populate({ path: 'dichVuId', select: 'ten gia chuyenKhoaId', populate: { path:'chuyenKhoaId', select:'ten'} });
    const prescriptions = await require('../models/DonThuoc').find({ hoSoKhamId: hs._id })
      .sort({ createdAt: -1 })
      .populate({ path: 'items.thuocId', select: 'ten_san_pham gia loaiThuoc don_vi don_vi_dang_chon', populate: { path:'loaiThuoc', select:'ten'} });
    const caseData = {
      _id: hs._id,
      chanDoan: hs.chanDoan || '',
      huongDieuTri: hs.huongDieuTri || '',
      trieuChung: hs.trieuChung || '',
      khamLamSang: hs.khamLamSang || '',
      trangThai: hs.trangThai,
      createdAt: hs.createdAt,
      bacSi: hs.bacSiId ? { id: hs.bacSiId._id, hoTen: hs.bacSiId.hoTen, chuyenKhoa: hs.bacSiId.chuyenKhoa } : null
    };
    const labsMapped = labs.map(l => ({
      _id: l._id,
      loaiChiDinh: l.loaiChiDinh,
      dichVu: l.dichVuId ? { ten: l.dichVuId.ten, gia: l.dichVuId.gia, chuyenKhoa: l.dichVuId.chuyenKhoaId?.ten || '' } : null,
      trangThai: l.trangThai,
      ketQua: l.ketQua || '',
      ketQuaPdf: l.ketQuaPdf || null,
      ngayThucHien: l.ngayThucHien || null,
      createdAt: l.createdAt,
    }));
    const rxMapped = prescriptions.map(r => ({
      _id: r._id,
      createdAt: r.createdAt,
      items: (r.items||[]).map(it => ({
        thuocId: it.thuocId?._id || it.thuocId,
        tenThuoc: it.tenThuoc || it.thuocId?.ten_san_pham || '',
        soLuong: it.soLuong,
        dosageMorning: it.dosageMorning,
        dosageNoon: it.dosageNoon,
        dosageEvening: it.dosageEvening,
        days: it.days,
        usageNote: it.usageNote || '',
        gia: it.thuocId?.gia || null,
        loaiThuoc: it.thuocId?.loaiThuoc?.ten || ''
      }))
    }));
    res.json({ case: caseData, labs: labsMapped, prescriptions: rxMapped });
  } catch(err){ return next(err); }
});

// GET /api/booking/specialties - Liệt kê chuyên khoa
router.get('/specialties', async (req, res, next) => { // Liệt kê chuyên khoa cho UI
  try{
    const items = await ChuyenKhoa.find().sort({ ten: 1 });
    res.json(items);
  }catch(err){ return next(err); }
});

// GET /api/booking/availability - Lấy danh sách bác sĩ & khung giờ trống theo chuyên khoa và ngày
// query: chuyenKhoaId, date=YYYY-MM-DD
router.get('/availability', async (req, res, next) => { // Lấy bác sĩ & khung giờ trống theo chuyên khoa/ngày
  try{
    const { chuyenKhoaId, date } = req.query;
    if(!chuyenKhoaId || !date) return res.status(400).json({ message: 'Thiếu chuyenKhoaId hoặc date' });
    const d = new Date(date);
    if(isNaN(d.getTime())) return res.status(400).json({ message: 'date không hợp lệ' });
    // Chặn hiển thị lịch trống cho ngày hôm nay hoặc ngày trong quá khứ
    // Mục tiêu: người dùng không thể đặt lịch cho hôm nay hoặc ngày đã qua
    const todayStart = startOfDay(new Date());
    const reqDayStart = startOfDay(d);
    if(reqDayStart.getTime() <= todayStart.getTime()){
      return res.json({ date, chuyenKhoaId, doctors: [], shiftHours: { sang:{}, chieu:{}, toi:{} } });
    }
    // Tải chuyên khoa
    const spec = await ChuyenKhoa.findById(chuyenKhoaId);
    if(!spec) return res.status(404).json({ message: 'Chuyên khoa không tồn tại' });
    // Lấy danh sách bác sĩ theo tên chuyên khoa
    const doctors = await BacSi.find({ chuyenKhoa: spec.ten }).select('hoTen chuyenKhoa phongKhamId userId');
    const doctorIds = doctors.map(x=>x._id);
    const doctorUserIds = doctors.map(x=>x.userId).filter(Boolean);
    const userToDoctor = doctors.reduce((m, d)=>{ if(d.userId) m[String(d.userId)] = d._id; return m; }, {});

    // Xác định khung giờ ca trong tháng ứng với ngày đã chọn
    const yearMonth = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    const cfg = await ScheduleConfig.findOne({ month: yearMonth }); // Lấy cấu hình khung ca của tháng
    const defaultShiftHours = {
      sang: { start: '07:30', end: '11:30' },
      chieu: { start: '13:00', end: '17:00' },
      toi: { start: '18:00', end: '22:00' }
    };
    const shiftHours = cfg?.shiftHours || defaultShiftHours; // Dùng mặc định nếu chưa cấu hình

    // Tìm ca làm việc của mỗi bác sĩ trong ngày từ WorkSchedule
    const dayStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const schedules = await WorkSchedule.find({ userId: { $in: doctorUserIds }, role: 'doctor', day: dayStr }).select('userId shift'); // Lịch làm việc trong ngày
    const shiftsByDoctor = schedules.reduce((m, s)=>{
      const did = userToDoctor[String(s.userId)];
      if(!did) return m;
      const k = String(did);
      m[k] = m[k] || new Set();
      m[k].add(s.shift);
      return m;
    }, {});

    // Tạo các slot trong mỗi khung ca với khoảng 10 phút
    // Ví dụ: 07:30–08:00 -> 07:30, 07:40, 07:50 (3 slot)
    function buildSlots(start, end){ // Tạo danh sách slot 10 phút trong khung ca
      const [sh, sm] = start.split(':').map(Number);
      const [eh, em] = end.split(':').map(Number);
      const base = new Date(d.getFullYear(), d.getMonth(), d.getDate(), sh, sm);
      const endDt = new Date(d.getFullYear(), d.getMonth(), d.getDate(), eh, em);
      const out = [];
      while(base < endDt){
        const hh = String(base.getHours()).padStart(2,'0');
        const mm = String(base.getMinutes()).padStart(2,'0');
        out.push(`${hh}:${mm}`);
        base.setMinutes(base.getMinutes()+10);
      }
      return out;
    }
    const slotsByShift = {
      sang: buildSlots(shiftHours.sang.start, shiftHours.sang.end),
      chieu: buildSlots(shiftHours.chieu.start, shiftHours.chieu.end),
      toi: buildSlots(shiftHours.toi.start, shiftHours.toi.end)
    };

    // Bản đồ các khung giờ đã bận trong ngày
    const dayStart = startOfDay(d), dayEnd = endOfDay(d);
    const busy = await LichKham.find({ bacSiId: { $in: doctorIds }, ngayKham: { $gte: dayStart, $lt: dayEnd } }) // Lịch đã đặt trong ngày
      .select('bacSiId khungGio');
    const busyMap = busy.reduce((m, x)=>{
      const k = String(x.bacSiId);
      m[k] = m[k] || new Set();
      m[k].add(x.khungGio);
      return m;
    }, {});

    // Tổng hợp lịch trống: chỉ hiển thị slot thuộc các ca bác sĩ làm việc
    const result = doctors.map(doc => { // Tổng hợp khung giờ trống theo ca bác sĩ làm việc
      const did = String(doc._id);
      const workedShifts = shiftsByDoctor[did] || new Set();
      // Nếu không có lịch làm việc, bác sĩ nghỉ ngày đó -> danh sách trống
      if(workedShifts.size === 0){
        return { bacSiId: doc._id, hoTen: doc.hoTen, chuyenKhoa: doc.chuyenKhoa, khungGioTrong: [], shiftHours };
      }
      // Gộp slot từ các ca bác sĩ làm việc
      const allSlots = [];
      for(const sh of ['sang','chieu','toi']){
        if(workedShifts.has(sh)) allSlots.push(...slotsByShift[sh]);
      }
      const taken = busyMap[did] || new Set();
      const free = allSlots.filter(s => !taken.has(s));
      return { bacSiId: doc._id, hoTen: doc.hoTen, chuyenKhoa: doc.chuyenKhoa, khungGioTrong: free, shiftHours };
    });
    res.json({ date, chuyenKhoaId, doctors: result, shiftHours });
  }catch(err){ return next(err); }
});

// POST /api/booking/appointments - Tạo lịch khám (cho bản thân hoặc người thân)
// Tạo lịch khám (cho bản thân/ người thân/ tiếp nhận trực tiếp)
// Luồng xử lý tổng quát:
// 1) Đọc dữ liệu đầu vào, xác định chế độ walk-in (quầy) dựa trên `source` và role.
// 2) Kiểm tra đủ trường bắt buộc (bác sĩ, chuyên khoa, ngày/giờ đối với user thường).
// 3) Chuẩn hoá ngày khám: user thường không được đặt hôm nay/quá khứ; walk-in mặc định dùng hôm nay.
// 4) Với walk-in: kiểm tra giờ hiện tại nằm trong khung ca; bác sĩ có lịch làm việc đúng ca/ngày.
// 5) Xác định đặt cho bản thân (`benhNhanId`) hay người thân (`hoSoBenhNhanId`), có thể tạo `BenhNhan` tạm từ `PatientProfile`.
// 6) Tạo bản ghi `LichKham` với trạng thái `cho_thanh_toan`; trả về lịch.
router.post('/appointments', auth, async (req, res, next) => {
  try{
    // Lấy thông tin từ body: id bệnh nhân/ hồ sơ người thân, bác sĩ, chuyên khoa, ngày, giờ, và nguồn đặt
    const { benhNhanId, hoSoBenhNhanId, bacSiId, chuyenKhoaId, date, khungGio, source } = req.body || {};
    const nguoiDatId = req.user.id; // Người đặt chính là user hiện tại

    // Xác định đặt tại quầy (walk-in) khi nguồn là 'reception-direct' và role thuộc admin/reception
    const isWalkIn = source === 'reception-direct' && ['admin','reception'].includes(req.user.role);
    console.log('Booking request data:', { benhNhanId, hoSoBenhNhanId, bacSiId, chuyenKhoaId, date, khungGio, source, nguoiDatId, isWalkIn });

    // Phải cung cấp đúng 1 trong 2: benhNhanId (bản thân) hoặc hoSoBenhNhanId (người thân)
    if ((!benhNhanId && !hoSoBenhNhanId) || (benhNhanId && hoSoBenhNhanId)) {
      return res.status(400).json({ message: 'Cần cung cấp `benhNhanId` (cho bản thân) hoặc `hoSoBenhNhanId` (cho người thân).' });
    }
    // Bắt buộc có bác sĩ và chuyên khoa
    if(!bacSiId || !chuyenKhoaId){
      return res.status(400).json({ message: 'Thiếu dữ liệu bắt buộc (bác sĩ, chuyên khoa).' });
    }
    // Với user thường (không walk-in): bắt buộc có ngày và khung giờ
    if(!isWalkIn && (!date || !khungGio)){
      return res.status(400).json({ message: 'Thiếu dữ liệu bắt buộc (bác sĩ, chuyên khoa, ngày, giờ).' });
    }

    // Chuẩn hoá ngày khám: walk-in không truyền date thì dùng hôm nay
    const d = isWalkIn && !date ? new Date() : new Date(date);
    if(isNaN(d.getTime())) return res.status(400).json({ message: 'date không hợp lệ' });
    const dayStart = startOfDay(d); // Lưu ngày dưới dạng 00:00:00 để gom theo ngày

    // User thường: chặn đặt lịch hôm nay/ quá khứ
    const todayStart = startOfDay(new Date());
    if(!isWalkIn && dayStart.getTime() <= todayStart.getTime()){
      return res.status(400).json({ message: 'Không thể đặt lịch cho ngày hôm nay hoặc ngày đã qua.' });
    }

    // Dữ liệu lịch khám khởi tạo
    const appointmentData = {
      nguoiDatId,
      bacSiId,
      chuyenKhoaId,
      ngayKham: dayStart,
      // Với walk-in: tạo khungGio ngẫu nhiên (không chiếm slot chuẩn); còn lại dùng khungGio client gửi
      khungGio: (function(){
        if(!isWalkIn) return khungGio;
        const now = new Date();
        const hh = String(now.getHours()).padStart(2,'0');
        const mm = String(now.getMinutes()).padStart(2,'0');
        const ss = String(now.getSeconds()).padStart(2,'0');
        const rand = String(Math.floor(Math.random()*90)+10);
        return `${hh}:${mm}:${ss}-${rand}`; // ví dụ: 09:42:17-53
      })(),
      trangThai: 'cho_thanh_toan'
    };

    // Walk-in: kiểm tra giờ hiện tại nằm trong khung ca; bác sĩ có lịch làm đúng ca/ngày
    if(isWalkIn){
      const yearMonth = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; // YYYY-MM của tháng hiện tại
      const cfg = await ScheduleConfig.findOne({ month: yearMonth }); // Lấy cấu hình ca làm việc tháng
      const defaultShiftHours = {
        sang: { start: '07:30', end: '11:30' },
        chieu: { start: '13:00', end: '17:00' },
        toi: { start: '18:00', end: '22:00' }
      };
      const shiftHours = cfg?.shiftHours || defaultShiftHours; // Dùng mặc định nếu chưa cấu hình
      const now = new Date();
      const nowStr = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
      const within = (range)=> range && nowStr >= range.start && nowStr <= range.end; // Kiểm tra nằm trong khung ca
      let currentShift = null;
      if(within(shiftHours.sang)) currentShift = 'sang';
      else if(within(shiftHours.chieu)) currentShift = 'chieu';
      else if(within(shiftHours.toi)) currentShift = 'toi';
      if(!currentShift){
        // Trả thông tin các khung ca để người dùng biết giờ làm
        return res.status(400).json({ message: `Ngoài giờ làm. Khung ca hôm nay: ` +
          [shiftHours.sang?`Sáng ${shiftHours.sang.start}-${shiftHours.sang.end}`:null, shiftHours.chieu?`Chiều ${shiftHours.chieu.start}-${shiftHours.chieu.end}`:null, shiftHours.toi?`Tối ${shiftHours.toi.start}-${shiftHours.toi.end}`:null].filter(Boolean).join('; ') });
      }
      // Kiểm tra bác sĩ tồn tại và đã liên kết tài khoản User để có bản ghi WorkSchedule
      const bs = await BacSi.findById(bacSiId).select('userId hoTen chuyenKhoa');
      if(!bs) return res.status(404).json({ message: 'Bác sĩ không tồn tại' });
      if(!bs.userId){
        return res.status(400).json({ message: 'Bác sĩ chưa liên kết tài khoản để lập lịch' });
      }
      // Kiểm tra bác sĩ có lịch làm việc đúng ca trong ngày đó
      const dayStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      const hasSchedule = await WorkSchedule.exists({ userId: bs.userId, role: 'doctor', day: dayStr, shift: currentShift });
      if(!hasSchedule){
        return res.status(400).json({ message: `Bác sĩ không làm việc ca ${currentShift} hôm nay (${dayStr})` });
      }
    }

    // Đặt cho bản thân hay người thân
    if (benhNhanId) {
      console.log('Booking for self with benhNhanId:', benhNhanId);
      appointmentData.benhNhanId = benhNhanId; // Gán benhNhanId trực tiếp
    } else if (hoSoBenhNhanId) {
      console.log('Booking for relative with hoSoBenhNhanId:', hoSoBenhNhanId);
      appointmentData.hoSoBenhNhanId = hoSoBenhNhanId; // Đặt theo hồ sơ người thân

      // Tìm hồ sơ người thân
      const profile = await PatientProfile.findById(hoSoBenhNhanId);
      if (!profile) {
        console.error('PatientProfile not found:', hoSoBenhNhanId);
        return res.status(404).json({ message: 'Không tìm thấy hồ sơ người thân' });
      }

      console.log('Found PatientProfile:', {
        id: profile._id,
        hoTen: profile.hoTen,
        ngaySinh: profile.ngaySinh,
        gioiTinh: profile.gioiTinh
      });

      // Map giới tính từ biểu diễn văn bản sang mã hệ thống
      const gioiTinhMapping = { 'Nam': 'nam', 'Nữ': 'nu', 'Khác': 'khac' };

      // Tạo bản ghi BenhNhan tạm để liên kết lịch khám với người thân
      const benhNhanData = {
        userId: nguoiDatId,
        hoTen: profile.hoTen,
        ngaySinh: profile.ngaySinh,
        gioiTinh: gioiTinhMapping[profile.gioiTinh] || 'khac',
        soDienThoai: profile.soDienThoai,
        diaChi: profile.diaChi,
        maBHYT: profile.cccd // Dùng CCCD tạm như mã bảo hiểm
      };

      console.log('Creating BenhNhan with data:', benhNhanData);

      try {
        const benhNhan = await BenhNhan.create(benhNhanData); // Tạo bản ghi bệnh nhân tạm
        console.log('Created BenhNhan successfully:', benhNhan._id);
        appointmentData.benhNhanId = benhNhan._id; // Liên kết lịch khám tới bệnh nhân vừa tạo
        console.log('Assigned benhNhanId to appointmentData:', appointmentData.benhNhanId);
      } catch (createError) {
        console.error('Error creating BenhNhan:', createError);
        return res.status(500).json({ message: 'Lỗi tạo hồ sơ bệnh nhân', error: createError.message });
      }
    }

    console.log('Final appointment data:', appointmentData);

    // Lưu lịch khám (ngày ở dạng start-of-day, giờ nằm ở trường khungGio)
    const lk = await LichKham.create(appointmentData);
    console.log('Created appointment:', lk._id);

    // Walk-in: không cấp STT ngay; STT sẽ cấp khi thanh toán
    res.status(201).json(lk);
  }catch(err){
    console.error('Booking error:', err);
    if(err && err.code === 11000){
      return res.status(409).json({ message: 'Khung giờ đã được đặt' });
    }
    return next(err);
  }
});

// POST /api/booking/appointments/:id/pay - Xác nhận đã thanh toán và cấp số thứ tự
// Xác nhận thanh toán và cấp số thứ tự (STT) cho lịch
router.post('/appointments/:id/pay', async (req, res, next) => {
  try{
    const { id } = req.params;
    const appt = await LichKham.findById(id);
    if(!appt) return res.status(404).json({ message: 'Không tìm thấy lịch khám' });
    
    // Ensure we have a benhNhanId for queue generation
    if (!appt.benhNhanId) {
      return res.status(400).json({ message: 'Lịch khám thiếu thông tin bệnh nhân' });
    }
    
    appt.trangThai = 'da_thanh_toan';
    await appt.save();

    // Generate queue number strictly by registration order on the appointment day
    const dayStart = startOfDay(appt.ngayKham);
    const dayEnd = endOfDay(appt.ngayKham);
    // Count existing queue numbers for all appointments of this day (any doctor)
    const apptIdsInDay = await LichKham.find({ ngayKham: { $gte: dayStart, $lt: dayEnd } }).select('_id').lean(); // Tất cả lịch trong ngày
    const idSet = apptIdsInDay.map(a => a._id);
    const existingCount = idSet.length
      ? await SoThuTu.countDocuments({ lichKhamId: { $in: idSet } })
      : 0;
    const so = existingCount + 1;
    const stt = await SoThuTu.create({ // Cấp số thứ tự theo thứ tự thanh toán
      lichKhamId: appt._id, 
      benhNhanId: appt.benhNhanId, 
      soThuTu: so, 
      trangThai: 'dang_cho' 
    });
    res.json({ lichKham: appt, soThuTu: stt });
  }catch(err){ return next(err); }
});

// GET /api/booking/appointments - Liệt kê lịch khám (có bộ lọc tùy chọn)
// query: date=YYYY-MM-DD, benhNhanId, bacSiId
router.get('/appointments', async (req, res, next) => { // Liệt kê lịch khám (lọc tuỳ chọn)
  try{
    const { date, benhNhanId, bacSiId } = req.query; // Lấy tham số lọc từ query
    const filter = {}; // Khởi tạo điều kiện lọc
    if(date){ // Nếu có ngày -> lọc trong khoảng ngày đó
      const d = new Date(date); if(isNaN(d)) return res.status(400).json({ message: 'date không hợp lệ' }); // Kiểm tra ngày hợp lệ
      filter.ngayKham = { $gte: startOfDay(d), $lt: endOfDay(d) }; // Lọc theo mốc đầu/cuối ngày
    }
    if(benhNhanId) filter.benhNhanId = new mongoose.Types.ObjectId(benhNhanId); // Lọc theo bệnh nhân
    if(bacSiId) filter.bacSiId = new mongoose.Types.ObjectId(bacSiId); // Lọc theo bác sĩ
    const items = await LichKham.find(filter).sort({ ngayKham: -1, khungGio: 1 }); // Truy vấn danh sách lịch theo điều kiện
    res.json(items); // Trả về kết quả cho client
  }catch(err){ return next(err); } // Bắt lỗi chung
});

// GET /api/booking/doctor-appointments?bacSiId=...&date=YYYY-MM-DD
// Mô tả: Trả về danh sách lịch khám của 1 bác sĩ theo ngày (dành cho reception/admin; có thể mở rộng cho bác sĩ)
router.get('/doctor-appointments', auth, async (req, res, next) => { // Lịch của 1 bác sĩ theo ngày
  try {
    const { bacSiId, date } = req.query; // Nhận bácSiId và ngày cần xem
    if(!bacSiId) return res.status(400).json({ message: 'Thiếu bacSiId' }); // Bắt buộc có bácSiId
    const doctorId = new mongoose.Types.ObjectId(bacSiId); // Chuẩn hoá sang ObjectId
    let dayFilter = {}; // Điều kiện lọc ngày
    if(date){ // Nếu có ngày -> giới hạn theo ngày
      const d = new Date(date); if(isNaN(d)) return res.status(400).json({ message: 'date không hợp lệ' }); // Kiểm tra
      dayFilter = { ngayKham: { $gte: startOfDay(d), $lt: endOfDay(d) } }; // Khoảng ngày
    }
    // Kiểm tra quyền: chỉ admin/reception (có thể mở rộng cho bác sĩ)
    if(!['admin','reception'].includes(req.user.role)){
      // Nếu muốn cho bác sĩ xem lịch của mình cần mapping user -> bacSi.userId
      return res.status(403).json({ message: 'Không có quyền xem lịch bác sĩ' });
    }
    const appts = await LichKham.find({ bacSiId: doctorId, ...dayFilter }) // Tìm lịch theo bác sĩ và ngày
      .sort({ khungGio: 1 }) // Sắp xếp theo khung giờ tăng dần
      .populate('benhNhanId','hoTen') // Lấy tên bệnh nhân
      .populate('hoSoBenhNhanId','hoTen'); // Lấy tên hồ sơ người thân
    const result = appts.map(a => ({ // Chuẩn hoá dữ liệu trả về
      _id: a._id,
      ngayKham: a.ngayKham,
      khungGio: a.khungGio,
      trangThai: a.trangThai,
      benhNhanHoTen: a.hoSoBenhNhanId ? a.hoSoBenhNhanId.hoTen : (a.benhNhanId ? a.benhNhanId.hoTen : 'N/A') // Ưu tiên hiển thị người thân nếu có
    }));
    res.json(result); // Trả dữ liệu
  } catch(err){ return next(err); } // Bắt lỗi
});

// PUT /api/booking/appointments/:id/time  { khungGio, date }
// Mô tả: Chỉnh sửa khung giờ hoặc ngày khám (chỉ admin/reception)
router.put('/appointments/:id/time', auth, async (req,res,next)=>{ // Sửa ngày/giờ khám (admin/reception)
  try {
    if(!['admin','reception'].includes(req.user.role)) return res.status(403).json({ message: 'Không có quyền sửa lịch khám' }); // Chỉ admin/quầy
    const { id } = req.params; // ID lịch cần sửa
    const { khungGio, date } = req.body || {}; // Nhận khung giờ và/hoặc ngày mới
    if(!khungGio && !date) return res.status(400).json({ message: 'Cần cung cấp khungGio hoặc date để sửa' }); // Phải có ít nhất một trường
    const appt = await LichKham.findById(id); // Tải lịch
    if(!appt) return res.status(404).json({ message: 'Không tìm thấy lịch khám' }); // Không tồn tại
    if(appt.trangThai === 'da_kham') return res.status(400).json({ message: 'Không thể sửa lịch đã khám' }); // Không sửa lịch đã hoàn tất
    if(date){ // Nếu có ngày mới -> chuẩn hoá
      const d = new Date(date); if(isNaN(d)) return res.status(400).json({ message: 'date không hợp lệ' }); // Kiểm tra
      appt.ngayKham = startOfDay(d); // Lưu ở mốc 00:00
    }
    if(khungGio){ appt.khungGio = khungGio; } // Cập nhật khung giờ
    try {
      await appt.save(); // Lưu thay đổi
    } catch(err){
      if(err && err.code === 11000) return res.status(409).json({ message: 'Trùng bác sĩ/ngày/khung giờ' }); // Unique index trùng
      throw err; // Ném lỗi khác
    }
    res.json({ ok: true, appointment: appt }); // Trả về bản ghi sau chỉnh sửa
  } catch(err){ return next(err); } // Xử lý lỗi chung
});

// PUT /api/booking/appointments/:id/reassign { bacSiId, khungGio?, date? }
// Mô tả: Đổi bác sĩ và/hoặc giờ khám (admin/reception)
router.put('/appointments/:id/reassign', auth, async (req,res,next)=>{ // Đổi bác sĩ/giờ khám
  try {
    if(!['admin','reception'].includes(req.user.role)) return res.status(403).json({ message: 'Không có quyền đổi bác sĩ/giờ' }); // Chỉ admin/quầy
    const { id } = req.params; // ID lịch cần đổi
    const { bacSiId, khungGio, date } = req.body || {}; // Bác sĩ mới, khung giờ, ngày
    if(!bacSiId) return res.status(400).json({ message: 'Thiếu bacSiId mới' }); // Bắt buộc có bác sĩ mới
    const appt = await LichKham.findById(id); // Tải lịch hiện tại
    if(!appt) return res.status(404).json({ message: 'Không tìm thấy lịch khám' }); // Không tồn tại
    if(appt.trangThai === 'da_kham') return res.status(400).json({ message: 'Không thể đổi lịch đã khám' }); // Không đổi nếu đã khám
    // Kiểm tra bác sĩ tồn tại
    const doctor = await BacSi.findById(bacSiId).select('_id chuyenKhoa'); // Tải bác sĩ mới
    if(!doctor) return res.status(404).json({ message: 'Bác sĩ mới không tồn tại' }); // Không tồn tại
    appt.bacSiId = doctor._id; // Gán bác sĩ mới
    if(date){ // Nếu đổi ngày
      const d = new Date(date); if(isNaN(d)) return res.status(400).json({ message: 'date không hợp lệ' }); // Kiểm tra
      appt.ngayKham = startOfDay(d); // Cập nhật ngày
    }
    if(khungGio){ appt.khungGio = khungGio; } // Cập nhật giờ nếu có
    try {
      await appt.save(); // Lưu
    } catch(err){
      if(err && err.code === 11000) return res.status(409).json({ message: 'Trùng bác sĩ/ngày/khung giờ' }); // Xung đột unique
      throw err; // Ném lỗi khác
    }
    res.json({ ok: true, appointment: appt }); // Trả về lịch sau khi đổi
  } catch(err){ return next(err); } // Bắt lỗi
});



// DELETE /api/booking/appointments/:id - hủy lịch khám
router.delete('/appointments/:id', auth, async (req, res, next) => { // Hủy lịch khám (người đặt)
  try{
    const userId = req.user.id; // ID người dùng hiện tại
    
    // Tìm lịch và kiểm tra quyền sở hữu
    const appointment = await LichKham.findById(req.params.id); // Lấy lịch theo id
    if(!appointment) return res.status(404).json({ message: 'Không tìm thấy lịch khám' }); // Không tồn tại
    
    if(String(appointment.nguoiDatId) !== String(userId)) { // So khớp người đặt và user hiện tại
      return res.status(403).json({ message: 'Bạn không có quyền hủy lịch khám này' }); // Không phải chủ lịch
    }
    
    // Kiểm tra trạng thái cho phép hủy
    if(appointment.trangThai === 'da_kham') { // Đã khám thì không hủy
      return res.status(400).json({ message: 'Không thể hủy lịch khám đã hoàn thành' });
    }
    
    // Ràng buộc thời gian: không hủy trong vòng 2 giờ trước giờ khám
    const appointmentTime = new Date(appointment.ngayKham); // Mốc thời gian lịch (00:00 của ngày)
    const now = new Date(); // Hiện tại
    const timeDiff = appointmentTime.getTime() - now.getTime(); // Chênh lệch ms
    const hoursDiff = timeDiff / (1000 * 3600); // Đổi sang giờ
    
    if(hoursDiff < 2 && hoursDiff > 0) { // Trong khoảng 0..2h trước lịch
      return res.status(400).json({ message: 'Không thể hủy lịch khám trong vòng 2 tiếng trước giờ khám' });
    }
    
    // Xoá số thứ tự liên quan nếu có
    await SoThuTu.deleteMany({ lichKhamId: req.params.id }); // Xoá STT
    
    // Xoá lịch khám
    await LichKham.findByIdAndDelete(req.params.id); // Xoá lịch
    
    res.json({ message: 'Hủy lịch khám thành công' }); // Trả thông báo thành công
  }catch(err){
    return next(err); // Bắt lỗi
  }
});

// GET /api/booking/queues - liệt kê số thứ tự theo ngày (tùy chọn lọc theo bác sĩ)
router.get('/queues', async (req, res, next) => { // Liệt kê số thứ tự theo ngày
  try{
    const { date, bacSiId } = req.query;
    const d = date ? new Date(date) : new Date();
    if(isNaN(d)) return res.status(400).json({ message: 'date không hợp lệ' });
    const dayStart = startOfDay(d), dayEnd = endOfDay(d);
    // find appts in date range
    const appts = await LichKham.find({ 
      ngayKham: { $gte: dayStart, $lt: dayEnd }, 
      ...(bacSiId? { bacSiId } : {}) 
    })
    .populate({
      path: 'bacSiId',
      select: 'hoTen chuyenKhoa phongKhamId',
      populate: {
        path: 'phongKhamId',
        select: 'tenPhong'
      }
    })
    .populate('benhNhanId', 'hoTen soDienThoai')
    .populate('hoSoBenhNhanId', 'hoTen soDienThoai')
    .select('_id benhNhanId hoSoBenhNhanId bacSiId khungGio ngayKham')
    .lean();
    
    const stts = await SoThuTu.find({ lichKhamId: { $in: appts.map(a=>a._id) } }).select('lichKhamId soThuTu trangThai').lean();
    const sttMap = stts.reduce((m,s)=>{ m[String(s.lichKhamId)] = s; return m; },{});
    
    const items = appts.map(a => {
      // Debug: log toàn bộ data để kiểm tra
      console.log('📋 Appointment data:', {
        bacSiId: a.bacSiId,
        phongKhamId: a.bacSiId?.phongKhamId,
        hasPhongKham: !!a.bacSiId?.phongKhamId
      });
      
      return {
        lichKhamId: a._id,
        benhNhanId: a.benhNhanId?._id,
        hoSoBenhNhanId: a.hoSoBenhNhanId?._id,
        benhNhan: a.benhNhanId || a.hoSoBenhNhanId || null,
        bacSi: a.bacSiId ? {
          _id: a.bacSiId._id,
          hoTen: a.bacSiId.hoTen,
          chuyenKhoa: a.bacSiId.chuyenKhoa,
          phongKham: a.bacSiId.phongKhamId || null
        } : null,
        khungGio: a.khungGio,
        ngayKham: a.ngayKham,
        soThuTu: sttMap[String(a._id)]?.soThuTu || null,
        trangThai: sttMap[String(a._id)]?.trangThai || 'dang_cho',
      };
    }).sort((x,y)=>{
      const sx = x.soThuTu ?? 1e9; const sy = y.soThuTu ?? 1e9;
      if(sx!==sy) return sx-sy; return (x.khungGio||'').localeCompare(y.khungGio||'');
    });
    res.json(items);
  }catch(err){ return next(err); }
});

module.exports = router;

// ===== Ngày làm việc theo lịch bác sĩ =====
// GET /api/booking/doctor-available-days?bacSiId=...&month=YYYY-MM
// Trả về danh sách ngày trong tháng mà bác sĩ có lịch làm việc (sáng/chiều/tối)
router.get('/doctor-available-days', async (req, res, next) => { // Ngày bác sĩ có ca làm việc trong tháng
  try{
    const { bacSiId, month } = req.query;
    if(!bacSiId || !month) return res.status(400).json({ message: 'Thiếu bacSiId hoặc month' });
    const range = monthRangeStr(month);
    if(!range) return res.status(400).json({ message: 'month phải dạng YYYY-MM' });
    const bs = await BacSi.findById(bacSiId).select('userId hoTen chuyenKhoa');
    if(!bs) return res.status(404).json({ message: 'Không tìm thấy bác sĩ' });
    if(!bs.userId) return res.status(400).json({ message: 'Bác sĩ chưa liên kết tài khoản User' });

    // Fetch schedules in the month for this doctor (by userId)
    const scheds = await WorkSchedule.find({ // Lấy tất cả ca làm. việc trong tháng
      userId: bs.userId,
      role: 'doctor',
      day: { $gte: range.start, $lt: range.end }
    }).select('day shift').lean();

    const byDay = scheds.reduce((m,s)=>{
      (m[s.day] = m[s.day] || new Set()).add(s.shift);
      return m;
    }, {});
    const days = Object.keys(byDay).sort().map(day => ({ day, shifts: Array.from(byDay[day]) }));

    // Include shift hours for that month
    const cfg = await ScheduleConfig.findOne({ month }); // Khung giờ ca trong tháng
    const defaultShiftHours = {
      sang: { start: '07:30', end: '11:30' },
      chieu: { start: '13:00', end: '17:00' },
      toi: { start: '18:00', end: '22:00' }
    };
    const shiftHours = cfg?.shiftHours || defaultShiftHours;

    res.json({ bacSiId, month, days, shiftHours }); // Trả về danh sách ngày + giờ ca
  }catch(err){ return next(err); }
});

// ====== Tích hợp thanh toán MoMo (Test) ======
// Tạo thanh toán MoMo cho một lịch khám
// POST /api/booking/appointments/:id/momo
router.post('/appointments/:id/momo', async (req, res, next) => { // Tạo yêu cầu thanh toán MoMo
  try{
    const { id } = req.params;
    const { returnUrl } = req.body; // Nhận returnUrl từ frontend
    const appt = await LichKham.findById(id);
    if(!appt) return res.status(404).json({ message: 'Không tìm thấy lịch khám' });
    if(appt.trangThai === 'da_thanh_toan') return res.status(400).json({ message: 'Đã thanh toán' });

  // Cấu hình từ biến môi trường hoặc dùng mặc định cho môi trường phát triển local
  const partnerCode = process.env.MOMO_PARTNER_CODE || 'MOMO';
  const accessKey = process.env.MOMO_ACCESS_KEY || 'F8BBA842ECF85';
  const secretKey = process.env.MOMO_SECRET_KEY || 'K951B6PE1waDMi640xX08PD3vg6EkVlz';
  const endpoint = process.env.MOMO_ENDPOINT || 'https://test-payment.momo.vn/v2/gateway/api/create';
  // Xây dựng URL callback về backend để cập nhật trạng thái ngay sau khi redirect
  const baseUrl = process.env.SERVER_BASE_URL || `${req.protocol}://${req.get('host')}`;
  const redirectUrl = process.env.MOMO_RETURN_URL || `${baseUrl}/api/booking/momo/return-get`;
  // Lưu ý: Khi thử nghiệm local, IPN của MoMo không thể gọi vào localhost. Sử dụng cho URL public/production.
  const ipnUrl = process.env.MOMO_IPN_URL || `${baseUrl}/api/booking/momo/ipn`;
    const requestType = 'captureWallet';
    const orderType = 'momo_wallet'; // theo đặc tả API v2 của MoMo

    // Số tiền (VND) - mặc định 150000; có thể thay đổi qua biến môi trường
    const amountNum = Number(process.env.MOMO_AMOUNT || 150000);
    const amountStr = String(amountNum);
    const orderId = `APPT_${id}_${Date.now()}`;
    const requestId = `${Date.now()}`;
    const orderInfo = 'Thanh toán lịch khám';
    // Lưu returnUrl trong extraData để backend biết redirect về đâu
    const extraDataObj = { lichKhamId: id, returnUrl: returnUrl || null };
    const extraData = Buffer.from(JSON.stringify(extraDataObj)).toString('base64');

    const rawSignature = `accessKey=${accessKey}&amount=${amountStr}&extraData=${extraData}&ipnUrl=${ipnUrl}&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${partnerCode}&redirectUrl=${redirectUrl}&requestId=${requestId}&requestType=${requestType}`;
    const signature = crypto.createHmac('sha256', secretKey).update(rawSignature).digest('hex'); // Tạo chữ ký HMAC theo MoMo

    const payload = {
      partnerCode,
      accessKey,
      requestId,
      amount: amountNum,
      orderId,
      orderInfo,
      redirectUrl,
      ipnUrl,
      orderType,
      extraData,
      requestType,
      signature,
      lang: 'vi'
    };

    const resp = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); // Gửi yêu cầu tạo thanh toán
    const data = await resp.json().catch(()=>({}));
    if(!resp.ok || !data || data.resultCode !== 0){
      // Log hỗ trợ debug trong môi trường phát triển
      console.error('MoMo create payment failed:', {
        status: resp.status,
        resultCode: data?.resultCode,
        message: data?.message,
        payUrl: data?.payUrl,
        endpoint
      });
      return res.status(400).json({ message: data?.message || 'Tạo thanh toán thất bại', detail: data });
    }
    // Trả về payUrl để client điều hướng (redirect)
    return res.json({ payUrl: data.payUrl, deeplink: data.deeplink, orderId, requestId }); // Trả về link thanh toán cho client
  }catch(err){ return next(err); }
});

// IPN callback từ MoMo
// POST /api/booking/momo/ipn
router.post('/momo/ipn', express.json(), async (req, res) => { // IPN MoMo gọi về backend
  try{
    const accessKey = process.env.MOMO_ACCESS_KEY || 'F8BBA842ECF85';
    const secretKey = process.env.MOMO_SECRET_KEY || 'K951B6PE1waDMi640xX08PD3vg6EkVlz';
    const {
      partnerCode, orderId, requestId, amount, orderInfo, orderType,
      transId, resultCode, message, payType, responseTime, extraData, signature
    } = req.body || {};

    // Xác minh chữ ký (theo đặc tả IPN của MoMo)
    const rawSignature = `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}&message=${message}&orderId=${orderId}&orderInfo=${orderInfo}&orderType=${orderType}&partnerCode=${partnerCode}&payType=${payType}&requestId=${requestId}&responseTime=${responseTime}&resultCode=${resultCode}&transId=${transId}`;
    const check = crypto.createHmac('sha256', secretKey).update(rawSignature).digest('hex'); // Kiểm tra chữ ký IPN
    if(check !== signature){
      return res.json({ resultCode: 5, message: 'Invalid signature' });
    }

    if(Number(resultCode) === 0){
      // Giải mã extraData để lấy id lịch khám
      let lichKhamId = null;
      try{
        const j = JSON.parse(Buffer.from(extraData||'', 'base64').toString('utf8')||'{}');
        lichKhamId = j.lichKhamId;
      }catch{}
      if(lichKhamId){
        // Đánh dấu đã thanh toán và cấp số thứ tự (cố gắng đảm bảo idempotent)
        const appt = await LichKham.findById(lichKhamId);
        if(appt && appt.trangThai !== 'da_thanh_toan'){
          appt.trangThai = 'da_thanh_toan';
          await appt.save();
          const dayStart = startOfDay(appt.ngayKham);
          const dayEnd = endOfDay(appt.ngayKham);
          const exists = await SoThuTu.findOne({ lichKhamId: appt._id });
          if(!exists){
            // STT theo thứ tự đăng ký trong ngày khám: số tiếp theo dựa trên tổng số thứ tự đã cấp trong ngày đó
            const apptIdsInDay = await LichKham.find({ ngayKham: { $gte: dayStart, $lt: dayEnd } }).select('_id').lean();
            const idSet = apptIdsInDay.map(a => a._id);
            const existingCount = idSet.length
              ? await SoThuTu.countDocuments({ lichKhamId: { $in: idSet } })
              : 0;
            const so = existingCount + 1;
            await SoThuTu.create({ lichKhamId: appt._id, benhNhanId: appt.benhNhanId, soThuTu: so, trangThai: 'dang_cho' }); // Cấp STT nếu chưa có
          }
        }
      }
    }

    return res.json({ resultCode: 0, message: 'OK' }); // Phản hồi cho MoMo
  }catch(err){
    return res.json({ resultCode: 6, message: 'Server error' });
  }
});

// Xử lý trả về nhanh từ trang redirect (client POST các query params vào đây)
// POST /api/booking/momo/return
router.post('/momo/return', express.json(), async (req, res) => { // Client POST từ trang redirect của MoMo
  try{
    const accessKey = process.env.MOMO_ACCESS_KEY || 'F8BBA842ECF85';
    const secretKey = process.env.MOMO_SECRET_KEY || 'K951B6PE1waDMi640xX08PD3vg6EkVlz';
    const {
      partnerCode, orderId, requestId, amount, orderInfo, orderType,
      transId, resultCode, message, payType, responseTime, extraData, signature
    } = req.body || {};

    // Xác minh chữ ký (tương tự đặc tả IPN)
    const rawSignature = `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}&message=${message}&orderId=${orderId}&orderInfo=${orderInfo}&orderType=${orderType}&partnerCode=${partnerCode}&payType=${payType}&requestId=${requestId}&responseTime=${responseTime}&resultCode=${resultCode}&transId=${transId}`;
    const check = crypto.createHmac('sha256', secretKey).update(rawSignature).digest('hex'); // Kiểm tra chữ ký
    if(check !== signature){
      return res.status(400).json({ ok: false, message: 'Invalid signature' });
    }

    if(Number(resultCode) !== 0){
      return res.status(400).json({ ok: false, message: 'Thanh toán thất bại', resultCode });
    }

    let lichKhamId = null;
    try{
      const j = JSON.parse(Buffer.from(extraData||'', 'base64').toString('utf8')||'{}');
      lichKhamId = j.lichKhamId;
    }catch{}
    if(!lichKhamId){
      return res.status(400).json({ ok: false, message: 'Thiếu mã lịch khám' });
    }

    const appt = await LichKham.findById(lichKhamId);
    if(!appt) return res.status(404).json({ ok: false, message: 'Không tìm thấy lịch khám' });
    if(appt.trangThai !== 'da_thanh_toan'){
      appt.trangThai = 'da_thanh_toan';
      await appt.save();
    }
    let stt = await SoThuTu.findOne({ lichKhamId: appt._id });
    if(!stt){
      const dayStart = startOfDay(appt.ngayKham);
      const dayEnd = endOfDay(appt.ngayKham);
      const apptIdsInDay = await LichKham.find({ ngayKham: { $gte: dayStart, $lt: dayEnd } }).select('_id').lean();
      const idSet = apptIdsInDay.map(a => a._id);
      const existingCount = idSet.length
        ? await SoThuTu.countDocuments({ lichKhamId: { $in: idSet } })
        : 0;
      const so = existingCount + 1;
      stt = await SoThuTu.create({ lichKhamId: appt._id, benhNhanId: appt.benhNhanId, soThuTu: so, trangThai: 'dang_cho' });
    }
    return res.json({ ok: true, soThuTu: stt.soThuTu, sttTrangThai: stt.trangThai }); // Trả về STT cho frontend
  }catch(err){
    return res.status(500).json({ ok: false, message: 'Server error' });
  }
});

// Xử lý GET cho đường dẫn MoMo redirect (dùng làm MOMO_RETURN_URL)
// GET /api/booking/momo/return-get
router.get('/momo/return-get', async (req, res) => { // Xử lý khi MoMo redirect bằng GET
  try{
    const accessKey = process.env.MOMO_ACCESS_KEY || 'F8BBA842ECF85';
    const secretKey = process.env.MOMO_SECRET_KEY || 'K951B6PE1waDMi640xX08PD3vg6EkVlz';
    const frontendReturnDefault = process.env.FRONTEND_RETURN_URL || 'http://localhost:5173/reception/direct-booking';

    const {
      partnerCode, orderId, requestId, amount, orderInfo, orderType,
      transId, resultCode, message, payType, responseTime, extraData, signature
    } = req.query || {};

    // Giải mã extraData để lấy returnUrl
    let lichKhamId = null;
    let frontendReturn = frontendReturnDefault;
    try{
      const j = JSON.parse(Buffer.from(extraData||'', 'base64').toString('utf8')||'{}');
      lichKhamId = j.lichKhamId;
      if(j.returnUrl) frontendReturn = j.returnUrl; // Sử dụng returnUrl từ frontend nếu có
    }catch{}

    // Xác minh chữ ký (tương tự đặc tả IPN)
    const rawSignature = `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}&message=${message}&orderId=${orderId}&orderInfo=${orderInfo}&orderType=${orderType}&partnerCode=${partnerCode}&payType=${payType}&requestId=${requestId}&responseTime=${responseTime}&resultCode=${resultCode}&transId=${transId}`;
    const check = crypto.createHmac('sha256', secretKey).update(rawSignature).digest('hex'); // Xác minh chữ ký
    if(check !== signature){
      const url = new URL(frontendReturn);
      url.searchParams.set('status', 'fail');
      url.searchParams.set('code', '5');
      url.searchParams.set('msg', 'Invalid signature');
      return res.redirect(url.toString());
    }

    if(Number(resultCode) !== 0){
      const url = new URL(frontendReturn);
      url.searchParams.set('status', 'fail');
      url.searchParams.set('code', String(resultCode));
      url.searchParams.set('msg', message || 'Thanh toán thất bại');
      return res.redirect(url.toString());
    }

    if(!lichKhamId){
      const url = new URL(frontendReturn);
      url.searchParams.set('status', 'fail');
      url.searchParams.set('msg', 'Thiếu mã lịch khám');
      return res.redirect(url.toString());
    }

    const appt = await LichKham.findById(lichKhamId);
    if(!appt){
      const url = new URL(frontendReturn);
      url.searchParams.set('status', 'fail');
      url.searchParams.set('msg', 'Không tìm thấy lịch khám');
      return res.redirect(url.toString());
    }
    if(appt.trangThai !== 'da_thanh_toan'){
      appt.trangThai = 'da_thanh_toan';
      await appt.save();
    }
    let stt = await SoThuTu.findOne({ lichKhamId: appt._id });
    if(!stt){
      const dayStart = startOfDay(appt.ngayKham);
      const dayEnd = endOfDay(appt.ngayKham);
      // Đếm số thứ tự đã cấp cho các lịch khám trong cùng ngày của lịch này
      const apptIdsInDay = await LichKham.find({ ngayKham: { $gte: dayStart, $lt: dayEnd } }).select('_id').lean();
      const idSet = apptIdsInDay.map(a => a._id);
      const existingCount = idSet.length
        ? await SoThuTu.countDocuments({ lichKhamId: { $in: idSet } })
        : 0;
      const so = existingCount + 1;
      stt = await SoThuTu.create({ lichKhamId: appt._id, benhNhanId: appt.benhNhanId, soThuTu: so, trangThai: 'dang_cho' });
    }

    const url = new URL(frontendReturn);
    url.searchParams.set('status', 'success');
    url.searchParams.set('id', String(lichKhamId));
    url.searchParams.set('stt', String(stt.soThuTu));
    return res.redirect(url.toString()); // Redirect về frontend kèm trạng thái
  }catch(err){
    const frontendReturn = process.env.FRONTEND_RETURN_URL || 'http://localhost:5173/reception/direct-booking';
    const url = new URL(frontendReturn);
    url.searchParams.set('status', 'fail');
    url.searchParams.set('msg', 'Server error');
    return res.redirect(url.toString());
  }
});

// Kiểm tra trạng thái vé/số thứ tự của một lịch khám
// GET /api/booking/appointments/:id/ticket
router.get('/appointments/:id/ticket', async (req, res, next) => { // Trạng thái vé/số thứ tự của lịch khám
  try{
    const { id } = req.params;
    const appt = await LichKham.findById(id).select('trangThai ngayKham benhNhanId');
    if(!appt) return res.status(404).json({ message: 'Không tìm thấy lịch khám' });
    const stt = await SoThuTu.findOne({ lichKhamId: id }).select('soThuTu trangThai');
    res.json({ trangThai: appt.trangThai, soThuTu: stt?.soThuTu || null, sttTrangThai: stt?.trangThai || null });
  }catch(err){ return next(err); }
});

// GET /api/booking/appointments/:id/detail-simple
// Mô tả: Trả thông tin cơ bản của lịch khám kèm bác sĩ và phòng khám để hiển thị cho người dùng
router.get('/appointments/:id/detail-simple', async (req, res, next) => { // Thông tin đơn giản để hiển thị cho user
  try{
    const { id } = req.params;
    const appt = await LichKham.findById(id)
      .populate({
        path: 'bacSiId',
        select: 'hoTen chuyenKhoa phongKhamId',
        populate: { path: 'phongKhamId', select: 'tenPhong' }
      })
      .select('_id ngayKham khungGio bacSiId chuyenKhoaId');
    if(!appt) return res.status(404).json({ message: 'Không tìm thấy lịch khám' });
    const out = {
      _id: appt._id,
      ngayKham: appt.ngayKham,
      khungGio: appt.khungGio,
      bacSi: appt.bacSiId ? {
        _id: appt.bacSiId._id,
        hoTen: appt.bacSiId.hoTen,
        chuyenKhoa: appt.bacSiId.chuyenKhoa,
        phongKham: appt.bacSiId.phongKhamId || null
      } : null
    };
    res.json(out);
  }catch(err){ return next(err); }
});
