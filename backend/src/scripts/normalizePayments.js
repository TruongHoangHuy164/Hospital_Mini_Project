require('dotenv').config()
const mongoose = require('mongoose')
const ThanhToan = require('../models/ThanhToan')

// Bảng alias phương thức thanh toán
const METHOD_ALIAS = {
  cash: 'tien_mat',
  tienmat: 'tien_mat',
  momo: 'momo',
  insurance: 'BHYT',
  bhyt: 'BHYT',
  bank: 'chuyen_khoan',
  transfer: 'chuyen_khoan',
}

// Bảng alias loại thanh toán
const CATEGORY_ALIAS = {
  appointment: 'hosokham',
  lichkham: 'hosokham',
  hosokham: 'hosokham',
  clinical: 'canlamsang',
  cls: 'canlamsang',
  canlamsang: 'canlamsang',
  prescription: 'donthuoc',
  donthuoc: 'donthuoc',
}

// Chuẩn hóa phương thức thanh toán
function normMethod(m) {
  if (!m) return 'tien_mat'
  const key = String(m).toLowerCase()
  return METHOD_ALIAS[key] || (['BHYT','tien_mat','momo','chuyen_khoan'].includes(m) ? m : 'tien_mat')
}

// Chuẩn hóa loại thanh toán
function normCategory(c) {
  if (!c) return 'hosokham'
  const key = String(c).toLowerCase()
  return CATEGORY_ALIAS[key] || (['hosokham','canlamsang','donthuoc'].includes(c) ? c : 'hosokham')
}

// Chương trình chính: chuẩn hóa các bản ghi ThanhToan
async function main() {
  const uri = process.env.MONGODB_URI
  if (!uri) throw new Error('MONGODB_URI not set')
  await mongoose.connect(uri)
  const cursor = ThanhToan.find({}).cursor() // cursor để duyệt từng bản ghi
  let updated = 0
  for await (const p of cursor) {
    const hinhThuc = normMethod(p.hinhThuc)
    const targetType = normCategory(p.targetType)
    const ngayThanhToan = p.ngayThanhToan || p.createdAt || new Date()
    const status = p.status || 'PAID'
    const needsUpdate = (hinhThuc !== p.hinhThuc) || (targetType !== p.targetType) || !p.ngayThanhToan || !p.status // xác định cần cập nhật
    if (needsUpdate) {
      await ThanhToan.updateOne({ _id: p._id }, { $set: { hinhThuc, targetType, ngayThanhToan, status } })
      updated++
    }
  }
  console.log('Số bản ghi đã chuẩn hóa:', updated)
  await mongoose.disconnect()
}

main().catch(err => { console.error(err); process.exit(1) })
