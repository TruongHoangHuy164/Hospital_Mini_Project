// API thanh toán: gọi backend để tạo/check thanh toán (MoMo, tiền mặt)
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
// Kiểm tra trạng thái thanh toán (tuỳ nhu cầu)
  const resp = await privateApi.get(`/payments/${paymentId}`);
  return resp.data;
}

export async function createCashPayment({ hoSoKhamId, amount, orderRefs, targetType }){
// Tạo thanh toán tiền mặt
  const resp = await privateApi.post('/payments/cash/create', { hoSoKhamId, amount, orderRefs, targetType });
  return resp.data;
}

export default { createMomoPayment, getPayment };
