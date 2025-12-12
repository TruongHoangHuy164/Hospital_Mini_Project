// API quầy thuốc: luồng xử lý đơn, tồn kho, danh mục và truy vấn công khai
import { privateApi, publicApi } from './axios';

// Luồng xử lý đơn thuốc tại quầy (workflow)
export const getPharmacyOrders = (params = {}) => privateApi.get('/pharmacy/orders', { params });

/**
 * Lấy thống kê nhà thuốc (doanh thu, số đơn, v.v.)
 * @param {Object} params - Tham số lọc theo thời gian
 * @returns {Promise} Dữ liệu thống kê
 */
export const getPharmacyStats = (params = {}) => privateApi.get('/pharmacy/stats', { params });

/**
 * Thanh toán đơn thuốc
 * @param {string} id - ID đơn thuốc
 * @param {Object} data - Thông tin thanh toán
 * @returns {Promise} Đơn thuốc đã thanh toán
 */
export const payOrder = (id, data = {}) => privateApi.patch(`/pharmacy/orders/${id}/pay`, data);

/**
 * Chuẩn bị thuốc (soạn đơn)
 * @param {string} id - ID đơn thuốc
 * @param {Object} data - Thông tin chuẩn bị
 * @returns {Promise} Đơn thuốc đang chuẩn bị
 */
export const prepareOrder = (id, data = {}) => privateApi.patch(`/pharmacy/orders/${id}/prepare`, data);

/**
 * Xuất thuốc (hoàn tất đơn)
 * @param {string} id - ID đơn thuốc
 * @param {Object} data - Thông tin xuất thuốc
 * @returns {Promise} Đơn thuốc đã xuất
 */
export const dispenseOrder = (id, data = {}) => privateApi.patch(`/pharmacy/orders/${id}/dispense`, data);

// API legacy (giữ để tương thích)
export const getPendingPrescriptions = () => privateApi.get('/pharmacy/prescriptions');

/**
 * Cấp thuốc cho đơn (API cũ)
 */
export const dispensePrescription = (id) => privateApi.post(`/pharmacy/prescriptions/${id}/dispense`);

/**
 * Thanh toán đơn thuốc (API cũ)
 */
export const payPrescription = (id) => privateApi.post(`/pharmacy/prescriptions/${id}/pay`);

// API tồn kho thuốc
export const getInventory = (params = {}) => privateApi.get('/pharmacy/inventory', { params });

/**
 * Thêm thuốc mới vào kho
 * @param {Object} data - Thông tin thuốc (tên, giá, số lượng, v.v.)
 * @returns {Promise} Thuốc vừa tạo
 */
export const createMedicine = (data) => privateApi.post('/pharmacy/inventory', data);

/**
 * Cập nhật thông tin thuốc
 * @param {string} id - ID thuốc
 * @param {Object} data - Thông tin cập nhật
 * @returns {Promise} Thuốc đã cập nhật
 */
export const updateMedicine = (id, data) => privateApi.put(`/pharmacy/inventory/${id}`, data);

/**
 * Xóa thuốc khỏi kho
 * @param {string} id - ID thuốc
 * @returns {Promise} Xác nhận đã xóa
 */
export const deleteMedicine = (id) => privateApi.delete(`/pharmacy/inventory/${id}`);

/**
 * Nhập thuốc hàng loạt từ file Excel
 * @param {Array} items - Danh sách thuốc cần nhập
 * @param {Object} params - Tham số bổ sung
 * @returns {Promise} Kết quả nhập kho
 */
export const importInventory = (items, params = {}) => privateApi.post('/pharmacy/inventory/import', items, { params });

// API danh mục thuốc
export const getCategories = () => privateApi.get('/pharmacy/categories');

/**
 * Tạo danh mục thuốc mới
 * @param {Object} payload - Tên và mô tả danh mục
 * @returns {Promise} Danh mục vừa tạo
 */
export const createCategory = (payload) => privateApi.post('/pharmacy/categories', payload);

/**
 * Cập nhật danh mục thuốc
 * @param {string} id - ID danh mục
 * @param {Object} payload - Thông tin cập nhật
 * @returns {Promise} Danh mục đã cập nhật
 */
export const updateCategory = (id, payload) => privateApi.put(`/pharmacy/categories/${id}`, payload);

/**
 * Xóa danh mục thuốc
 * @param {string} id - ID danh mục
 * @returns {Promise} Xác nhận đã xóa
 */
export const deleteCategory = (id) => privateApi.delete(`/pharmacy/categories/${id}`);

/**
 * Nhập thuốc vào danh mục
 * @param {string} id - ID danh mục
 * @param {Array} items - Danh sách thuốc cần nhập
 * @returns {Promise} Kết quả nhập
 */
export const importToCategory = (id, items) => privateApi.post(`/pharmacy/categories/${id}/import`, items);

// API công khai (không cần đăng nhập) để duyệt thuốc
export const getPublicMedicines = (params = {}) => publicApi.get('/public/medicines', { params });

/**
 * Xem chi tiết một loại thuốc
 * @param {string} id - ID thuốc
 * @returns {Promise} Thông tin thuốc
 */
export const getPublicMedicine = (id) => publicApi.get(`/public/medicines/${id}`);

/**
 * Xem danh mục thuốc công khai
 * @returns {Promise} Danh sách danh mục
 */
export const getPublicMedicineCategories = () => publicApi.get('/public/medicine-categories');

export default {
  getPharmacyOrders,
  getPharmacyStats,
  payOrder,
  prepareOrder,
  dispenseOrder,
  getPendingPrescriptions,
  dispensePrescription,
  getInventory,
  createMedicine,
  updateMedicine,
  deleteMedicine,
  importInventory,
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  importToCategory,
  getPublicMedicines,
  getPublicMedicine,
  getPublicMedicineCategories,
};
