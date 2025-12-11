import { privateApi } from './axios';

// Lấy thống kê đặt lịch cho admin
// Tham số: { year, month?, top? }
// - year: Năm cần thống kê (bắt buộc)
// - month: Tháng cần thống kê (tuỳ chọn)
// - top: Số lượng mục xếp hạng (tuỳ chọn)
// Trả về: dữ liệu thống kê từ backend (đã .data)
export const getAdminBookingStats = (params = {}) =>
	privateApi.get('/admin/booking-stats', { params }).then(r => r.data);

export default { getAdminBookingStats };
