import { privateApi } from './axios'

export const getRevenueSummary = (year) => privateApi.get('/revenue/summary', { params: { year } }).then(r => r.data)
export const getRevenueByMonth = (year, month) => privateApi.get('/revenue/month', { params: { year, month } }).then(r => r.data)
export const getRevenueDayDetail = (date) => privateApi.get('/revenue/day', { params: { date } }).then(r => r.data)
export const getTopMedicines = (year, month, limit=10) => privateApi.get('/revenue/top/medicines', { params: { year, month, limit } }).then(r => r.data)
export const getTopServices = (year, month, limit=10) => privateApi.get('/revenue/top/services', { params: { year, month, limit } }).then(r => r.data)
