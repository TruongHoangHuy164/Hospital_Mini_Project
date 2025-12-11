import { privateApi } from './axios'

// Tổng quan doanh thu theo năm
export const getRevenueSummary = (year) =>
	privateApi.get('/revenue/summary', { params: { year } }).then(r => r.data)

// Doanh thu theo tháng trong năm
export const getRevenueByMonth = (year, month) =>
	privateApi.get('/revenue/month', { params: { year, month } }).then(r => r.data)

// Chi tiết doanh thu theo ngày (định dạng date: yyyy-mm-dd)
export const getRevenueDayDetail = (date) =>
	privateApi.get('/revenue/day', { params: { date } }).then(r => r.data)

// Top thuốc bán chạy
export const getTopMedicines = (year, month, limit=10) =>
	privateApi.get('/revenue/top/medicines', { params: { year, month, limit } }).then(r => r.data)

// Top dịch vụ doanh thu cao
export const getTopServices = (year, month, limit=10) =>
	privateApi.get('/revenue/top/services', { params: { year, month, limit } }).then(r => r.data)
