import { privateApi } from './axios';

export const getPendingPrescriptions = () => privateApi.get('/pharmacy/prescriptions');
export const dispensePrescription = (id) => privateApi.post(`/pharmacy/prescriptions/${id}/dispense`);

// Inventory APIs
export const getInventory = (params = {}) => privateApi.get('/pharmacy/inventory', { params });
export const createMedicine = (data) => privateApi.post('/pharmacy/inventory', data);
export const updateMedicine = (id, data) => privateApi.put(`/pharmacy/inventory/${id}`, data);
export const deleteMedicine = (id) => privateApi.delete(`/pharmacy/inventory/${id}`);
export const importInventory = (items, params = {}) => privateApi.post('/pharmacy/inventory/import', items, { params });

// Categories APIs
export const getCategories = () => privateApi.get('/pharmacy/categories');
export const createCategory = (payload) => privateApi.post('/pharmacy/categories', payload);
export const updateCategory = (id, payload) => privateApi.put(`/pharmacy/categories/${id}`, payload);
export const deleteCategory = (id) => privateApi.delete(`/pharmacy/categories/${id}`);
export const importToCategory = (id, items) => privateApi.post(`/pharmacy/categories/${id}/import`, items);

export default {
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
};
