/**
 * FILE: payments.js
 * MÔ TẢ: API calls cho chức năng thanh toán
 * Hỗ trợ thanh toán qua MoMo và tiền mặt
 */

import { privateApi, publicApi } from './axios';

/**
 * Tạo yêu cầu thanh toán qua MoMo
 * @param {Object} params - Thông tin thanh toán
 * @param {string} params.hoSoKhamId - ID hồ sơ khám
 * @param {number} params.amount - Số tiền cần thanh toán
 * @param {string} params.returnUrl - URL redirect sau khi thanh toán
 * @param {string} params.notifyUrl - URL nhận thông báo từ MoMo
 * @param {string} params.orderInfo - Thông tin đơn hàng
 * @param {Array} params.orderRefs - Danh sách tham chiếu đơn hàng (tùy chọn)
 * @param {string} params.targetType - Loại thanh toán (tùy chọn)
 * @returns {Promise<Object>} Thông tin thanh toán MoMo (chứa payUrl để redirect)
 */
export async function createMomoPayment({ hoSoKhamId, amount, returnUrl, notifyUrl, orderInfo, orderRefs, targetType }) {
  const body = { hoSoKhamId, amount, returnUrl, notifyUrl, orderInfo };
  if (orderRefs) body.orderRefs = orderRefs;
  if (targetType) body.targetType = targetType;
  const resp = await privateApi.post('/payments/momo/create', body);
  return resp.data;
}

/**
 * Lấy thông tin chi tiết một thanh toán
 * @param {string} paymentId - ID của thanh toán cần tra cứu
 * @returns {Promise<Object>} Thông tin thanh toán
 */
export async function getPayment(paymentId) {
  const resp = await privateApi.get(`/payments/${paymentId}`);
  return resp.data;
}

/**
 * Tạo thanh toán tiền mặt
 * @param {Object} params - Thông tin thanh toán
 * @param {string} params.hoSoKhamId - ID hồ sơ khám
 * @param {number} params.amount - Số tiền thanh toán
 * @param {Array} params.orderRefs - Danh sách tham chiếu đơn hàng (tùy chọn)
 * @param {string} params.targetType - Loại thanh toán (tùy chọn)
 * @returns {Promise<Object>} Thông tin thanh toán tiền mặt
 */
export async function createCashPayment({ hoSoKhamId, amount, orderRefs, targetType }){
  const resp = await privateApi.post('/payments/cash/create', { hoSoKhamId, amount, orderRefs, targetType });
  return resp.data;
}

export default { createMomoPayment, getPayment };
