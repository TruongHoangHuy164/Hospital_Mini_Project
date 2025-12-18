/*
TÓM TẮT API — Phòng khám (Clinics)
- Mục tiêu: CRUD danh mục phòng khám; hỗ trợ tìm kiếm và phân trang.
- Quyền: Router này không gắn `auth/authorize` trực tiếp; tuỳ quyền được áp ở router cha.
- Mô hình: `PhongKham` (có trường liên kết `chuyenKhoaId`).

Endpoints chính:
1) GET /api/clinics?q=&chuyenKhoaId=&page=1&limit=50
  - Tìm kiếm theo tên phòng (`tenPhong`) hoặc chuyên khoa dạng text (`chuyenKhoa`, regex i).
  - Lọc theo `chuyenKhoaId` khi có; sắp xếp theo `tenPhong` tăng dần.
  - Phân trang: `page>=1`, `limit` 1..200 (mặc định 50).
  - Trả về: { items (populate `chuyenKhoaId.ten`), total, page, limit, totalPages }.

2) POST /api/clinics
  - Body: { tenPhong (bắt buộc), chuyenKhoa (bắt buộc), chuyenKhoaId? }.
  - 400 nếu thiếu tên phòng/chuyên khoa. Trả về bản ghi đã tạo (201).

3) PUT /api/clinics/:id
  - Body: { tenPhong?, chuyenKhoa?, chuyenKhoaId? }.
  - Cập nhật các trường cung cấp; `chuyenKhoaId` có thể bỏ trống để xoá liên kết.
  - 404 nếu không tìm thấy.

4) DELETE /api/clinics/:id
  - Xoá phòng khám theo id; 404 nếu không tìm thấy.

Ghi chú:
- Khuyến nghị index: `PhongKham(tenPhong)`, `PhongKham(chuyenKhoaId)` để tối ưu lọc/sắp xếp.
*/
// Router quản lý phòng khám (Clinics)
const express = require('express');
const PhongKham = require('../models/PhongKham');

const router = express.Router();

// GET /api/clinics?q=&limit=&page=
// Mô tả: Liệt kê phòng khám với phân trang, tìm kiếm theo tên phòng/chuyên khoa, lọc theo chuyenKhoaId.
router.get('/', async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || '50', 10), 1), 200);
    const skip = (page - 1) * limit;
  const q = (req.query.q || '').trim();
  const chuyenKhoaId = (req.query.chuyenKhoaId || '').trim();
  const filter = q ? { $or: [ { tenPhong: { $regex: q, $options: 'i' } }, { chuyenKhoa: { $regex: q, $options: 'i' } } ] } : {};
  if (chuyenKhoaId) filter.chuyenKhoaId = chuyenKhoaId;
    const [items, total] = await Promise.all([
      PhongKham.find(filter).populate('chuyenKhoaId', 'ten').sort({ tenPhong: 1 }).skip(skip).limit(limit),
      PhongKham.countDocuments(filter)
    ]);
    res.json({ items, total, page, limit, totalPages: Math.ceil(total/limit) });
  } catch (err) { next(err); }
});

// POST /api/clinics
// Mô tả: Tạo phòng khám mới với tên phòng và chuyên khoa.
router.post('/', async (req, res, next) => {
  try {
    const { tenPhong, chuyenKhoa, chuyenKhoaId } = req.body || {};
    if (!tenPhong || !chuyenKhoa) return res.status(400).json({ message: 'Thiếu tên phòng/chuyên khoa' });
    const created = await PhongKham.create({ tenPhong, chuyenKhoa, chuyenKhoaId: chuyenKhoaId || undefined });
    res.status(201).json(created);
  } catch (err) { next(err); }
});

// PUT /api/clinics/:id
// Mô tả: Cập nhật thông tin phòng khám theo id.
router.put('/:id', async (req, res, next) => {
  try {
    const { tenPhong, chuyenKhoa, chuyenKhoaId } = req.body || {};
    const update = { tenPhong, chuyenKhoa };
    if (typeof chuyenKhoaId !== 'undefined') update.chuyenKhoaId = chuyenKhoaId || undefined;
    const updated = await PhongKham.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!updated) return res.status(404).json({ message: 'Không tìm thấy' });
    res.json(updated);
  } catch (err) { next(err); }
});

// DELETE /api/clinics/:id
// Mô tả: Xóa phòng khám theo id.
router.delete('/:id', async (req, res, next) => {
  try {
    const deleted = await PhongKham.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Không tìm thấy' });
    res.json({ message: 'Đã xóa' });
  } catch (err) { next(err); }
});

module.exports = router;
