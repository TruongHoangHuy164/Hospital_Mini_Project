import { privateApi } from './axios';

// Lấy thống kê đặt lịch cho admin
// Params: { year, month?, top? }
export const getAdminBookingStats = (params = {}) => privateApi.get('/admin/booking-stats', { params }).then(r => r.data);

export default { getAdminBookingStats };
