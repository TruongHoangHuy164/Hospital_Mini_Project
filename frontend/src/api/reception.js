import { privateApi as api } from './axios';

export async function getReceptionBookingStats({ year, month, top } = {}) {
  const params = {};
  if (year) params.year = year;
  if (month) params.month = month;
  if (top) params.top = top;
  const { data } = await api.get('/reception/booking-stats', { params });
  return data;
}

export async function getReceptionPharmacyStats({ year, month } = {}) {
  const params = {};
  if (year) params.year = year;
  if (month) params.month = month;
  const { data } = await api.get('/reception/pharmacy-stats', { params });
  return data;
}
