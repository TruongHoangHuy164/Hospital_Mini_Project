import { privateApi, publicApi } from './axios';

// Tạo yêu cầu thanh toán qua MoMo (gọi backend)
export async function createMomoPayment({ hoSoKhamId, amount, returnUrl, notifyUrl, orderInfo, orderRefs, targetType }) {
  const body = { hoSoKhamId, amount, returnUrl, notifyUrl, orderInfo };
  if (orderRefs) body.orderRefs = orderRefs;
  if (targetType) body.targetType = targetType;
  const resp = await privateApi.post('/payments/momo/create', body);
  return resp.data;
}

// (Tuỳ nhu cầu) endpoint kiểm tra trạng thái thanh toán
export async function getPayment(paymentId) {
  const resp = await privateApi.get(`/payments/${paymentId}`);
  return resp.data;
}

export async function createCashPayment({ hoSoKhamId, amount, orderRefs, targetType }){
  const resp = await privateApi.post('/payments/cash/create', { hoSoKhamId, amount, orderRefs, targetType });
  return resp.data;
}

export default { createMomoPayment, getPayment };
