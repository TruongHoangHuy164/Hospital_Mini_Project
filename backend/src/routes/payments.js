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

// Lấy thông tin thanh toán theo id (chỉ auth)
// Restrict :id to 24-hex ObjectId to avoid catching literal paths like 'services'
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

// Tạo payment request qua MoMo (chỉ cho các role có quyền tạo thu tiền: reception, pharmacy, admin)
router.post('/momo/create', auth, authorize('reception','pharmacy','admin'), async (req, res, next) => {
  try {
    const { hoSoKhamId, amount, returnUrl, notifyUrl, orderInfo, orderRefs, targetType } = req.body;
    if (!hoSoKhamId || (amount === undefined || amount === null)) return res.status(400).json({ error: 'hoSoKhamId và amount là bắt buộc' });
    const amountNum = Number(amount);
    if (Number.isNaN(amountNum) || amountNum <= 0) return res.status(400).json({ error: 'amount phải là số dương' });

    // Tạo record thanh toán tạm (PENDING)
    const payment = await ThanhToan.create({
      hoSoKhamId,
      soTien: amount,
      hinhThuc: 'momo',
      status: 'PENDING',
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
      // Try to extract axios response data if available
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
    // verify signature (best-effort)
    const valid = momoService.verifyNotifySignature(payload);
    // Nếu không verify được, vẫn tiếp tục xử lý có kiểm tra resultCode

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
      payment.status = 'PAID';
      payment.ngayThanhToan = new Date();
      await payment.save();

      // Khi payment thành công, cập nhật các entity liên quan theo targetType + orderRefs
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

    payment.status = 'FAILED';
    await payment.save();
    return res.json({ status: 'failed' });
  } catch (err) {
    next(err);
  }
});

// Fast return handler from redirect page (client posts query params here)
// POST /api/payments/momo/return
router.post('/momo/return', express.json(), async (req, res) => {
  try{
    const accessKey = process.env.MOMO_ACCESS_KEY || 'F8BBA842ECF85';
    const secretKey = process.env.MOMO_SECRET_KEY || 'K951B6PE1waDMi640xX08PD3vg6EkVlz';
    const {
      partnerCode, orderId, requestId, amount, orderInfo, orderType,
      transId, resultCode, message, payType, responseTime, extraData, signature
    } = req.body || {};

    // Verify signature
    const rawSignature = `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}&message=${message}&orderId=${orderId}&orderInfo=${orderInfo}&orderType=${orderType}&partnerCode=${partnerCode}&payType=${payType}&requestId=${requestId}&responseTime=${responseTime}&resultCode=${resultCode}&transId=${transId}`;
    const check = require('crypto').createHmac('sha256', secretKey).update(rawSignature).digest('hex');
    if(check !== signature){
      return res.status(400).json({ ok: false, message: 'Invalid signature' });
    }

    // Find payment record and update
    if(!orderId) return res.status(400).json({ ok:false, message: 'orderId missing' });
    const payment = await ThanhToan.findById(orderId);
    if(!payment) return res.status(404).json({ ok:false, message: 'Payment not found' });

    if(Number(resultCode) === 0){
      payment.status = 'PAID';
      payment.ngayThanhToan = new Date();
      payment.momoTransactionId = transId || payment.momoTransactionId;
      payment.rawResponse = req.body;
      await payment.save();
      // update related entities
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

    payment.status = 'FAILED';
    payment.rawResponse = req.body;
    await payment.save();
    return res.json({ ok: false, status: 'failed' });
  }catch(err){
    console.error('payments momo return error', err);
    return res.status(500).json({ ok:false, message: 'Server error' });
  }
});

// GET handler for MoMo redirect (use this as MOMO_RETURN_URL)
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

    // success
    url.searchParams.set('status','success');
    if(orderId) url.searchParams.set('paymentId', orderId);
    return res.redirect(url.toString());
  }catch(err){
    console.error('payments momo return-get error', err);
    return res.status(500).send('Server error');
  }
});

// Also accept GET on /momo/return since MoMo may redirect with GET to the configured return URL
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

    // If payment exists, mark it paid and update related entities
    if(orderId){
      try{
        const payment = await ThanhToan.findById(orderId);
        if(payment){
          payment.status = 'PAID';
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

// Create cash payment (reception collects money directly)
router.post('/cash/create', auth, authorize('reception','admin'), async (req, res, next) => {
  try {
    const { hoSoKhamId, amount, orderRefs, targetType } = req.body || {};
    if (!hoSoKhamId || !amount) return res.status(400).json({ error: 'hoSoKhamId và amount là bắt buộc' });

    const payment = await ThanhToan.create({
      hoSoKhamId,
      soTien: amount,
      hinhThuc: 'tien_mat',
      status: 'PAID',
      ngayThanhToan: new Date(),
      targetType: targetType || 'canlamsang',
      orderRefs: Array.isArray(orderRefs) ? orderRefs : (orderRefs ? [orderRefs] : []),
      rawResponse: { collectedBy: req.user?._id }
    });

    // Update related entities immediately
    try{
      if(payment.targetType === 'canlamsang' && payment.orderRefs.length){
        await CanLamSang.updateMany({ _id: { $in: payment.orderRefs } }, { $set: { daThanhToan: true } });
      }
      if(payment.targetType === 'donthuoc' && payment.orderRefs.length){
        await DonThuoc.updateMany({ _id: { $in: payment.orderRefs } }, { $set: { status: 'pending_pharmacy' } });
      }
    }catch(e){ console.error('Error updating related entities for cash payment', e); }

    res.json(payment);
  } catch (err) { next(err); }
});

// For reception UI: list CanLamSang (lab orders) for a given hoSoKhamId (unpaid only)
router.get('/canlamsang', auth, authorize('reception','admin'), async (req, res, next) => {
  try{
    const { hoSoKhamId } = req.query;
    if(!hoSoKhamId) return res.status(400).json({ message: 'hoSoKhamId is required' });
    const items = await CanLamSang.find({ hoSoKhamId, daThanhToan: false }).populate({ path: 'dichVuId', select: 'ten gia' }).lean();
    res.json(items);
  }catch(err){ next(err); }
});

// List HoSoKham that have unpaid CanLamSang (for reception overview)
router.get('/unpaid-cases', auth, authorize('reception','admin'), async (req, res, next) => {
  try{
    const q = (req.query.q || '').trim();
    // aggregate unpaid canlamsang grouped by hoSoKhamId
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

