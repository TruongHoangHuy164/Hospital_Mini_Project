const axios = require('axios');
const crypto = require('crypto');

const MOMO = {
  partnerCode: process.env.MOMO_PARTNER_CODE || 'MOMO',
  accessKey: process.env.MOMO_ACCESS_KEY || 'F8BBA842ECF85',
  secretKey: process.env.MOMO_SECRET_KEY || 'K951B6PE1waDMi640xX08PD3vg6EkVlz',
  endpoint: process.env.MOMO_ENDPOINT || 'https://test-payment.momo.vn/v2/gateway/api/create',
};

function signRaw(raw, secret) {
  return crypto.createHmac('sha256', secret).update(raw).digest('hex');
}

// Tạo yêu cầu thanh toán MoMo
async function createPayment({ amount, orderId, orderInfo = 'Thanh toan', returnUrl, notifyUrl, requestId, extraData = '' }) {
  const partnerCode = MOMO.partnerCode;
  const accessKey = MOMO.accessKey;
  const secretKey = MOMO.secretKey;
  const requestType = 'captureWallet';
  // Kiểm tra cấu hình bắt buộc
  if(!partnerCode || !accessKey || !secretKey) {
    throw new Error('MoMo config missing (MOMO_PARTNER_CODE / MOMO_ACCESS_KEY / MOMO_SECRET_KEY).');
  }

  // Chuẩn hóa số tiền
  const amountNum = Number(amount);
  if (Number.isNaN(amountNum) || amountNum <= 0) throw new Error('Invalid amount for MoMo createPayment');
  const amountStr = String(amountNum);

  // Đảm bảo extraData ở dạng base64 (MoMo thường kỳ vọng base64)
  let extraDataB64 = extraData || '';
  if (extraDataB64 && !/^[A-Za-z0-9+/=]+$/.test(extraDataB64)) {
    try{ extraDataB64 = Buffer.from(String(extraDataB64)).toString('base64'); }catch(e){ extraDataB64 = '' }
  }

  const rawSignature = `accessKey=${accessKey}&amount=${amountStr}&extraData=${extraDataB64}&ipnUrl=${notifyUrl}&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${partnerCode}&redirectUrl=${returnUrl}&requestId=${requestId}&requestType=${requestType}`;
  const signature = signRaw(rawSignature, secretKey);

  const body = {
    partnerCode,
    accessKey,
    requestId,
    amount: amountNum,
    orderId,
    orderInfo,
    redirectUrl: returnUrl,
    ipnUrl: notifyUrl,
    extraData: extraDataB64,
    requestType,
    signature,
    orderType: 'momo_wallet',
    lang: 'vi'
  };

  try{
    const resp = await axios.post(MOMO.endpoint, body, { timeout: 10000 });
    return resp.data;
  }catch(err){
    // Ghi log chi tiết để debug khi lỗi
    console.error('MoMo createPayment error:', {
      endpoint: MOMO.endpoint,
      status: err?.response?.status,
      data: err?.response?.data,
      message: err?.message,
      requestBody: body,
    });
    // rethrow so caller can handle and include detail
    throw err;
  }
}

// Xác minh chữ ký notify (cơ bản): dựng chuỗi thô và so sánh
function verifyNotifySignature(payload) {
  // payload cần bao gồm chữ ký và các trường đã dùng để ký
  const secret = MOMO.secretKey;
  const {
    partnerCode, accessKey, requestId, amount, orderId, orderInfo, orderType, transId, message, localMessage, responseTime, resultCode, payType,
  } = payload;

  // Dựng chuỗi thô tương tự tài liệu MoMo (notify có thể khác trường; nỗ lực tốt nhất)
  const raw = `partnerCode=${partnerCode}&accessKey=${accessKey}&requestId=${requestId}&amount=${amount}&orderId=${orderId}&orderInfo=${orderInfo}&orderType=${orderType || ''}&transId=${transId || ''}&message=${message || ''}&responseTime=${responseTime || ''}&resultCode=${resultCode || ''}`;
  const expected = signRaw(raw, secret);
  return expected === payload.signature;
}

module.exports = {
  createPayment,
  verifyNotifySignature,
};
