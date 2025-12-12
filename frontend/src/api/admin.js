/**
 * FILE: admin.js
 * MÔ TẢ: API calls cho chức năng quản trị viên
 * Bao gồm thống kê đặt lịch và các báo cáo
 */

import { privateApi } from './axios';

/**
 * Lấy thống kê đặt lịch cho admin
 * @param {Object} params - Tham số truy vấn
 * @param {number} params.year - Năm cần thống kê
 * @param {number} params.month - Tháng cần thống kê (tùy chọn)
 * @param {number} params.top - Số lượng top bác sĩ/dịch vụ (tùy chọn)
 * @returns {Promise<Object>} Dữ liệu thống kê đặt lịch
 */
export const getAdminBookingStats = (params = {}) => privateApi.get('/admin/booking-stats', { params }).then(r => r.data);

export default { getAdminBookingStats };
