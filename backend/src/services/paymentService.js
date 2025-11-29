const ThanhToan = require('../models/ThanhToan')

const METHOD_MAP = {
  cash: 'tien_mat',
  momo: 'momo',
  insurance: 'BHYT',
  bank: 'chuyen_khoan',
}

const CATEGORY_MAP = {
  appointment: 'hosokham',
  clinical: 'canlamsang',
  prescription: 'donthuoc',
}

function normalizeMethod(m) {
  if (!m) return 'tien_mat'
  const key = String(m).toLowerCase()
  return METHOD_MAP[key] || (METHOD_MAP[m] || 'tien_mat')
}

function normalizeCategory(c) {
  if (!c) return 'hosokham'
  const key = String(c).toLowerCase()
  return CATEGORY_MAP[key] || (['hosokham','canlamsang','donthuoc'].includes(c) ? c : 'hosokham')
}

async function createPayment({ hoSoKhamId, amount, method, category, orderRefs = [], paidAt, status = 'PAID', momoTransactionId, rawResponse }) {
  if (!hoSoKhamId) throw new Error('hoSoKhamId is required')
  if (typeof amount !== 'number' || amount < 0) throw new Error('amount must be a non-negative number')
  const doc = await ThanhToan.create({
    hoSoKhamId,
    soTien: amount,
    hinhThuc: normalizeMethod(method),
    status,
    ngayThanhToan: paidAt || new Date(),
    targetType: normalizeCategory(category),
    orderRefs,
    momoTransactionId,
    rawResponse,
  })
  return doc
}

async function markPaid(id, { paidAt = new Date(), momoTransactionId, rawResponse } = {}) {
  const doc = await ThanhToan.findByIdAndUpdate(id, {
    status: 'PAID',
    ngayThanhToan: paidAt,
    ...(momoTransactionId ? { momoTransactionId } : {}),
    ...(rawResponse ? { rawResponse } : {}),
  }, { new: true })
  return doc
}

module.exports = {
  createPayment,
  markPaid,
}
