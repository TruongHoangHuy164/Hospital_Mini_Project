// API quầy thuốc: luồng xử lý đơn, tồn kho, danh mục và truy vấn công khai
import { privateApi, publicApi } from './axios';

// Luồng xử lý đơn thuốc tại quầy (workflow)
export const getPharmacyOrders = (params = {}) => privateApi.get('/pharmacy/orders', { params });
export const getPharmacyStats = (params = {}) => privateApi.get('/pharmacy/stats', { params });
export const payOrder = (id, data = {}) => privateApi.patch(`/pharmacy/orders/${id}/pay`, data);
export const prepareOrder = (id, data = {}) => privateApi.patch(`/pharmacy/orders/${id}/prepare`, data);
export const dispenseOrder = (id, data = {}) => privateApi.patch(`/pharmacy/orders/${id}/dispense`, data);

// API legacy (giữ để tương thích)
export const getPendingPrescriptions = () => privateApi.get('/pharmacy/prescriptions');
export const dispensePrescription = (id) => privateApi.post(`/pharmacy/prescriptions/${id}/dispense`);
export const payPrescription = (id) => privateApi.post(`/pharmacy/prescriptions/${id}/pay`);

// API tồn kho thuốc
export const getInventory = (params = {}) => privateApi.get('/pharmacy/inventory', { params });
export const createMedicine = (data) => privateApi.post('/pharmacy/inventory', data);
export const updateMedicine = (id, data) => privateApi.put(`/pharmacy/inventory/${id}`, data);
export const deleteMedicine = (id) => privateApi.delete(`/pharmacy/inventory/${id}`);
export const importInventory = (items, params = {}) => privateApi.post('/pharmacy/inventory/import', items, { params });

// API danh mục thuốc
export const getCategories = () => privateApi.get('/pharmacy/categories');
export const createCategory = (payload) => privateApi.post('/pharmacy/categories', payload);
export const updateCategory = (id, payload) => privateApi.put(`/pharmacy/categories/${id}`, payload);
export const deleteCategory = (id) => privateApi.delete(`/pharmacy/categories/${id}`);
export const importToCategory = (id, items) => privateApi.post(`/pharmacy/categories/${id}/import`, items);

// API công khai (không cần đăng nhập) để duyệt thuốc
export const getPublicMedicines = (params = {}) => publicApi.get('/public/medicines', { params });
export const getPublicMedicine = (id) => publicApi.get(`/public/medicines/${id}`);
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
