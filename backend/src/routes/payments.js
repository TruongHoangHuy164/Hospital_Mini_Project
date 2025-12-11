// Router thanh toán (MoMo, tiền mặt) và tiện ích liên quan
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const auth = require('../middlewares/auth');
const authorize = require('../middlewares/authorize');
const ThanhToan = require('../models/ThanhToan');
const momoService = require('../services/momoService');
const DichVu = require('../models/DichVu');
const CanLamSang = require('../models/CanLamSang');
const DonThuoc = require('../models/DonThuoc');

// Lấy thông tin thanh toán theo id (chỉ người có quyền)
// Lưu ý: Hạn chế tham số :id theo ObjectId 24-hex để tránh bắt nhầm
// các đường dẫn literal như 'services'
router.get('/:id([0-9a-fA-F]{24})', auth, authorize('reception','pharmacy','admin'), async (req, res, next) => {
  try {
    const p = await ThanhToan.findById(req.params.id);
    if (!p) return res.status(404).json({ error: 'Not found' });
    return res.json(p);
  } catch (err) {
    next(err);
  }
});

// Dành cho UI lễ tân: trả về danh sách dịch vụ để lựa chọn khi thu tiền
router.get('/services', auth, authorize('reception','admin'), async (req, res, next) => {
  try {
    const q = (req.query.q || '').trim();
    const filter = { ...(q ? { ten: { $regex: q, $options: 'i' } } : {}) };
    const items = await DichVu.find(filter).sort({ ten: 1 }).lean();
    res.json(items);
  } catch (err) { next(err); }
});

// Tạo yêu cầu thanh toán qua MoMo (chỉ vai trò: reception, pharmacy, admin)
router.post('/momo/create', auth, authorize('reception','pharmacy','admin'), async (req, res, next) => {
  try {
    const { hoSoKhamId, amount, returnUrl, notifyUrl, orderInfo, orderRefs, targetType } = req.body;
    if (!hoSoKhamId || (amount === undefined || amount === null)) return res.status(400).json({ error: 'hoSoKhamId và amount là bắt buộc' });
    const amountNum = Number(amount);
    if (Number.isNaN(amountNum) || amountNum <= 0) return res.status(400).json({ error: 'amount phải là số dương' });

    // Tạo record thanh toán tạm (cho_xu_ly)
    const payment = await ThanhToan.create({
      hoSoKhamId,
      soTien: amount,
      hinhThuc: 'momo',
      status: 'cho_xu_ly',
      targetType: targetType || 'hosokham',
      orderRefs: Array.isArray(orderRefs) ? orderRefs : (orderRefs ? [orderRefs] : []),
    });

    const requestId = uuidv4();
    const orderId = String(payment._id);
    try{
      const baseUrl = process.env.SERVER_BASE_URL || `${req.protocol}://${req.get('host')}`;
      const returnUrlFinal = returnUrl || process.env.MOMO_RETURN_URL || `${baseUrl}/api/payments/momo/return`;
      const notifyUrlFinal = notifyUrl || process.env.MOMO_NOTIFY_URL || `${baseUrl}/api/payments/momo/notify`;

      const resp = await momoService.createPayment({
        amount: amountNum,
        orderId,
        orderInfo: orderInfo || `Thanh toan ho so ${orderId}`,
        returnUrl: returnUrlFinal,
        notifyUrl: notifyUrlFinal,
        requestId,
        extraData: JSON.stringify({ createdBy: req.user?._id }),
      });

      // Lưu transaction id/response để tham chiếu
      payment.momoTransactionId = resp.transId || resp.requestId || null;
      payment.rawResponse = resp;
      await payment.save();

      return res.json({ paymentId: payment._id, momo: resp });
    }catch(err){
      console.error('Error creating MoMo payment', { err: err?.message || err, stack: err?.stack });
      // Cố gắng lấy dữ liệu phản hồi từ axios nếu có
      const detail = err?.response?.data || err?.message || 'Unknown error';
      return res.status(500).json({ error: 'Tạo MoMo payment thất bại', detail });
    }
  } catch (err) {
    next(err);
  }
});

// Endpoint nhận notify từ MoMo (public)
router.post('/momo/notify', async (req, res, next) => {
  try {
    const payload = req.body || {};
    // Xác minh chữ ký (mức nỗ lực tốt nhất)
    const valid = momoService.verifyNotifySignature(payload);
    // Nếu không xác minh được, vẫn tiếp tục xử lý có kiểm tra resultCode

    const { orderId, resultCode, transId } = payload;
    if (!orderId) return res.status(400).json({ error: 'orderId missing' });

    const payment = await ThanhToan.findById(orderId);
    if (!payment) {
      // Không tìm thấy payment tương ứng
      return res.status(404).json({ error: 'Payment not found' });
    }

    payment.rawResponse = payload;
    payment.momoTransactionId = transId || payment.momoTransactionId;

    if (Number(resultCode) === 0) {
      payment.status = 'da_thanh_toan';
      payment.ngayThanhToan = new Date();
      await payment.save();

      // Khi thanh toán thành công, cập nhật các thực thể liên quan theo targetType + orderRefs
      try{
        if(payment.targetType === 'canlamsang' && Array.isArray(payment.orderRefs) && payment.orderRefs.length){
          const CanLamSang = require('../models/CanLamSang');
          await CanLamSang.updateMany({ _id: { $in: payment.orderRefs } }, { $set: { daThanhToan: true } });
        }
        if(payment.targetType === 'donthuoc' && Array.isArray(payment.orderRefs) && payment.orderRefs.length){
          const DonThuoc = require('../models/DonThuoc');
          await DonThuoc.updateMany({ _id: { $in: payment.orderRefs } }, { $set: { status: 'pending_pharmacy' } });
        }
      }catch(e){ console.error('Error updating related entities after payment', e); }

      return res.json({ status: 'ok' });
    }

    payment.status = 'that_bai';
    await payment.save();
    return res.json({ status: 'failed' });
  } catch (err) {
    next(err);
  }
});

// Xử lý trả về nhanh từ trang redirect (client POST params gửi vào đây)
// POST /api/payments/momo/return
router.post('/momo/return', express.json(), async (req, res) => {
  try{
    const accessKey = process.env.MOMO_ACCESS_KEY || 'F8BBA842ECF85';
    const secretKey = process.env.MOMO_SECRET_KEY || 'K951B6PE1waDMi640xX08PD3vg6EkVlz';
    const {
      partnerCode, orderId, requestId, amount, orderInfo, orderType,
      transId, resultCode, message, payType, responseTime, extraData, signature
    } = req.body || {};

    // Xác minh chữ ký
    const rawSignature = `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}&message=${message}&orderId=${orderId}&orderInfo=${orderInfo}&orderType=${orderType}&partnerCode=${partnerCode}&payType=${payType}&requestId=${requestId}&responseTime=${responseTime}&resultCode=${resultCode}&transId=${transId}`;
    const check = require('crypto').createHmac('sha256', secretKey).update(rawSignature).digest('hex');
    if(check !== signature){
      return res.status(400).json({ ok: false, message: 'Invalid signature' });
    }

    // Tìm bản ghi thanh toán và cập nhật
    if(!orderId) return res.status(400).json({ ok:false, message: 'orderId missing' });
    const payment = await ThanhToan.findById(orderId);
    if(!payment) return res.status(404).json({ ok:false, message: 'Payment not found' });

    if(Number(resultCode) === 0){
      payment.status = 'da_thanh_toan';
      payment.ngayThanhToan = new Date();
      payment.momoTransactionId = transId || payment.momoTransactionId;
      payment.rawResponse = req.body;
      await payment.save();
      // Cập nhật các thực thể liên quan
      try{
        if(payment.targetType === 'canlamsang' && Array.isArray(payment.orderRefs) && payment.orderRefs.length){
          await CanLamSang.updateMany({ _id: { $in: payment.orderRefs } }, { $set: { daThanhToan: true } });
        }
        if(payment.targetType === 'donthuoc' && Array.isArray(payment.orderRefs) && payment.orderRefs.length){
          await DonThuoc.updateMany({ _id: { $in: payment.orderRefs } }, { $set: { status: 'pending_pharmacy' } });
        }
      }catch(e){ console.error('Error updating related entities after return', e); }

      return res.json({ ok: true });
    }

    payment.status = 'that_bai';
    payment.rawResponse = req.body;
    await payment.save();
    return res.json({ ok: false, status: 'failed' });
  }catch(err){
    console.error('payments momo return error', err);
    return res.status(500).json({ ok:false, message: 'Server error' });
  }
});

// Xử lý bằng GET cho đường dẫn MoMo redirect (dùng làm MOMO_RETURN_URL)
// GET /api/payments/momo/return-get
router.get('/momo/return-get', async (req, res) => {
  try{
    const accessKey = process.env.MOMO_ACCESS_KEY || 'F8BBA842ECF85';
    const secretKey = process.env.MOMO_SECRET_KEY || 'K951B6PE1waDMi640xX08PD3vg6EkVlz';
    const frontendReturn = process.env.FRONTEND_RETURN_URL || 'http://localhost:5173/reception';

    const {
      partnerCode, orderId, requestId, amount, orderInfo, orderType,
      transId, resultCode, message, payType, responseTime, extraData, signature
    } = req.query || {};

    const rawSignature = `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}&message=${message}&orderId=${orderId}&orderInfo=${orderInfo}&orderType=${orderType}&partnerCode=${partnerCode}&payType=${payType}&requestId=${requestId}&responseTime=${responseTime}&resultCode=${resultCode}&transId=${transId}`;
    const check = require('crypto').createHmac('sha256', secretKey).update(rawSignature).digest('hex');
    const url = new URL(frontendReturn);
    if(check !== signature){
      url.searchParams.set('status','fail');
      url.searchParams.set('msg','Invalid signature');
      return res.redirect(url.toString());
    }

    if(Number(resultCode) !== 0){
      url.searchParams.set('status','fail');
      url.searchParams.set('code', String(resultCode));
      url.searchParams.set('msg', message || 'Payment failed');
      return res.redirect(url.toString());
    }

    // Thành công
    url.searchParams.set('status','success');
    if(orderId) url.searchParams.set('paymentId', orderId);
    return res.redirect(url.toString());
  }catch(err){
    console.error('payments momo return-get error', err);
    return res.status(500).send('Server error');
  }
});

// Chấp nhận GET ở /momo/return (MoMo có thể redirect GET về URL đã cấu hình)
router.get('/momo/return', async (req, res) => {
  try{
    const accessKey = process.env.MOMO_ACCESS_KEY || 'F8BBA842ECF85';
    const secretKey = process.env.MOMO_SECRET_KEY || 'K951B6PE1waDMi640xX08PD3vg6EkVlz';
    const frontendReturn = process.env.FRONTEND_RETURN_URL || 'http://localhost:5173/reception';

    const {
      partnerCode, orderId, requestId, amount, orderInfo, orderType,
      transId, resultCode, message, payType, responseTime, extraData, signature
    } = req.query || {};

    const rawSignature = `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}&message=${message}&orderId=${orderId}&orderInfo=${orderInfo}&orderType=${orderType}&partnerCode=${partnerCode}&payType=${payType}&requestId=${requestId}&responseTime=${responseTime}&resultCode=${resultCode}&transId=${transId}`;
    const check = require('crypto').createHmac('sha256', secretKey).update(rawSignature).digest('hex');
    const url = new URL(frontendReturn);
    if(check !== signature){
      url.searchParams.set('status','fail');
      url.searchParams.set('msg','Invalid signature');
      return res.redirect(url.toString());
    }

    if(Number(resultCode) !== 0){
      url.searchParams.set('status','fail');
      url.searchParams.set('code', String(resultCode));
      url.searchParams.set('msg', message || 'Payment failed');
      return res.redirect(url.toString());
    }

    // Nếu tồn tại payment, đánh dấu đã thanh toán và cập nhật thực thể liên quan
    if(orderId){
      try{
        const payment = await ThanhToan.findById(orderId);
        if(payment){
          payment.status = 'da_thanh_toan';
          payment.ngayThanhToan = new Date();
          payment.momoTransactionId = transId || payment.momoTransactionId;
          payment.rawResponse = req.query;
          await payment.save();
          if(payment.targetType === 'canlamsang' && Array.isArray(payment.orderRefs) && payment.orderRefs.length){
            await CanLamSang.updateMany({ _id: { $in: payment.orderRefs } }, { $set: { daThanhToan: true } });
          }
          if(payment.targetType === 'donthuoc' && Array.isArray(payment.orderRefs) && payment.orderRefs.length){
            await DonThuoc.updateMany({ _id: { $in: payment.orderRefs } }, { $set: { status: 'pending_pharmacy' } });
          }
        }
      }catch(e){ console.error('Error updating payment on return GET', e); }
    }

    url.searchParams.set('status','success');
    if(orderId) url.searchParams.set('paymentId', orderId);
    return res.redirect(url.toString());
  }catch(err){
    console.error('payments momo return GET error', err);
    return res.status(500).send('Server error');
  }
});

// Tạo thanh toán tiền mặt (lễ tân / nhà thuốc thu trực tiếp)
// Cho phép targetType = 'canlamsang' | 'donthuoc' | 'hosokham'
router.post('/cash/create', auth, authorize('reception','pharmacy','admin'), async (req, res, next) => {
  try {
    const { hoSoKhamId, amount, orderRefs, targetType } = req.body || {};
    if (!hoSoKhamId || amount == null) return res.status(400).json({ error: 'hoSoKhamId và amount là bắt buộc' });
    const soTien = Number(amount);
    if (!Number.isFinite(soTien) || soTien <= 0) return res.status(400).json({ error: 'amount phải > 0' });

    const tType = ['canlamsang','donthuoc','hosokham'].includes(targetType) ? targetType : 'hosokham';

    const payment = await ThanhToan.create({
      hoSoKhamId,
      soTien,
      hinhThuc: 'tien_mat',
      status: 'da_thanh_toan',
      ngayThanhToan: new Date(),
      targetType: tType,
      orderRefs: Array.isArray(orderRefs) ? orderRefs : (orderRefs ? [orderRefs] : []),
      rawResponse: { collectedBy: req.user?._id, method: 'cash' }
    });

    // Cập nhật thực thể liên quan
    try {
      if (payment.targetType === 'canlamsang' && payment.orderRefs.length) {
        await CanLamSang.updateMany({ _id: { $in: payment.orderRefs } }, { $set: { daThanhToan: true } });
      }
      if (payment.targetType === 'donthuoc' && payment.orderRefs.length) {
        await DonThuoc.updateMany({ _id: { $in: payment.orderRefs } }, { $set: { status: 'pending_pharmacy' } });
      }
    } catch (e) { console.error('Error updating related entities for cash payment', e); }

    return res.json(payment);
  } catch (err) { next(err); }
});

// Thanh toán toa thuốc (đơn thuốc) bằng MoMo: tạo payment cho DonThuoc
// POST /api/payments/prescription/:id/momo
router.post('/prescription/:id/momo', auth, authorize('pharmacy','reception','admin'), async (req,res,next)=>{
  try {
    const { id } = req.params;
    const { amount, returnUrl, notifyUrl, orderInfo } = req.body || {};
    if (!amount) return res.status(400).json({ error: 'amount là bắt buộc' });
    const don = await DonThuoc.findById(id).populate('hoSoKhamId');
    if (!don) return res.status(404).json({ error: 'Đơn thuốc không tồn tại' });
    const hoSoKhamId = don.hoSoKhamId?._id;
    if (!hoSoKhamId) return res.status(400).json({ error: 'Đơn thuốc thiếu hoSoKhamId' });

    // Tạo trước bản ghi thanh toán
    const payment = await ThanhToan.create({
      hoSoKhamId,
      soTien: Number(amount),
      hinhThuc: 'momo',
      status: 'cho_xu_ly',
      targetType: 'donthuoc',
      orderRefs: [don._id],
    });

    const requestId = uuidv4();
    const orderId = String(payment._id);
    try {
      const baseUrl = process.env.SERVER_BASE_URL || `${req.protocol}://${req.get('host')}`;
      const returnUrlFinal = returnUrl || process.env.MOMO_RETURN_URL || `${baseUrl}/api/payments/momo/return`;
      const notifyUrlFinal = notifyUrl || process.env.MOMO_NOTIFY_URL || `${baseUrl}/api/payments/momo/notify`;
      const resp = await momoService.createPayment({
        amount: Number(amount),
        orderId,
        orderInfo: orderInfo || `Thanh toan don thuoc ${don._id}`,
        returnUrl: returnUrlFinal,
        notifyUrl: notifyUrlFinal,
        requestId,
        extraData: JSON.stringify({ prescriptionId: don._id, createdBy: req.user?._id })
      });
      payment.momoTransactionId = resp.transId || resp.requestId || null;
      payment.rawResponse = resp;
      await payment.save();
      return res.json({ paymentId: payment._id, momo: resp });
    } catch (err) {
      console.error('MoMo prescription create error', err);
      return res.status(500).json({ error: 'Tạo giao dịch MoMo thất bại', detail: err?.response?.data || err.message });
    }
  } catch (err) { next(err); }
});

// Thanh toán toa thuốc bằng tiền mặt
// POST /api/payments/prescription/:id/cash
router.post('/prescription/:id/cash', auth, authorize('pharmacy','reception','admin'), async (req,res,next)=>{
  try {
    const { id } = req.params; const { amount } = req.body || {};
    if(!amount) return res.status(400).json({ error: 'amount là bắt buộc' });
    const don = await DonThuoc.findById(id).populate('hoSoKhamId');
    if(!don) return res.status(404).json({ error: 'Đơn thuốc không tồn tại' });
    const hoSoKhamId = don.hoSoKhamId?._id;
    if(!hoSoKhamId) return res.status(400).json({ error: 'Đơn thuốc thiếu hoSoKhamId' });
    const payment = await ThanhToan.create({
      hoSoKhamId,
      soTien: Number(amount),
      hinhThuc: 'tien_mat',
      status: 'da_thanh_toan',
      ngayThanhToan: new Date(),
      targetType: 'donthuoc',
      orderRefs: [don._id],
      rawResponse: { collectedBy: req.user?._id, method: 'cash' }
    });
    try { await DonThuoc.updateOne({ _id: don._id }, { $set: { status: 'pending_pharmacy' } }); } catch(e){ console.error('Update DonThuoc after cash payment error', e); }
    return res.json(payment);
  } catch (err) { next(err); }
});

// UI lễ tân: liệt kê chỉ định cận lâm sàng (CanLamSang) của một hồ sơ khám chưa thanh toán
router.get('/canlamsang', auth, authorize('reception','admin'), async (req, res, next) => {
  try{
    const { hoSoKhamId } = req.query;
    if(!hoSoKhamId) return res.status(400).json({ message: 'hoSoKhamId is required' });
    const items = await CanLamSang.find({ hoSoKhamId, daThanhToan: false }).populate({ path: 'dichVuId', select: 'ten gia' }).lean();
    res.json(items);
  }catch(err){ next(err); }
});

// Liệt kê Hồ Sơ Khám có CanLamSang chưa thanh toán (tổng quan cho lễ tân)
router.get('/unpaid-cases', auth, authorize('reception','admin'), async (req, res, next) => {
  try{
    const q = (req.query.q || '').trim();
    // Tổng hợp các chỉ định chưa thanh toán, gom nhóm theo hoSoKhamId
    const pipeline = [
      { $match: { daThanhToan: false } },
      { $group: { _id: '$hoSoKhamId', count: { $sum: 1 }, orderIds: { $push: '$_id' } } },
      { $lookup: { from: 'hosokhams', localField: '_id', foreignField: '_id', as: 'hosokham' } },
      { $unwind: '$hosokham' },
      { $lookup: { from: 'benhnhans', localField: 'hosokham.benhNhanId', foreignField: '_id', as: 'benhnhan' } },
      { $unwind: '$benhnhan' },
      { $project: { hoSoKhamId: '$_id', count: 1, orderIds: 1, 'benhNhan._id': '$benhnhan._id', 'benhNhan.hoTen': '$benhnhan.hoTen', 'benhNhan.soDienThoai': '$benhnhan.soDienThoai', 'hoSoKhamNgay': '$hosokham.ngayKham' } }
    ];
    let results = await CanLamSang.aggregate(pipeline).allowDiskUse(true);
    if(q){
      const qlow = q.toLowerCase();
      results = results.filter(r => (r.benhNhan && ((r.benhNhan.hoTen||'').toLowerCase().includes(qlow) || (r.benhNhan.soDienThoai||'').includes(qlow))));
    }
    res.json(results);
  }catch(err){ next(err); }
});

  module.exports = router;

