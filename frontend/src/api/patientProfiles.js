/**
 * FILE: patientProfiles.js
 * MÔ TẢ: API calls cho quản lý hồ sơ bệnh nhân
 * Cho phép bệnh nhân quản lý nhiều profile (bản thân, người thân)
 */

import { privateApi } from "./axios";

/**
 * Lấy danh sách tất cả hồ sơ bệnh nhân của user hiện tại
 * @returns {Promise<Object>} Response chứa danh sách hồ sơ
 */
export const getPatientProfiles = () => {
  console.log('API: Fetching patient profiles...');
  return privateApi.get('/patient-profiles');
};

/**
 * Thêm hồ sơ bệnh nhân mới
 * @param {Object} profileData - Dữ liệu hồ sơ bệnh nhân
 * @returns {Promise<Object>} Hồ sơ vừa tạo
 */
export const addPatientProfile = (profileData) => {
  console.log('API: Adding patient profile:', profileData);
  return privateApi.post('/patient-profiles', profileData);
};

/**
 * Cập nhật hồ sơ bệnh nhân
 * @param {string} id - ID của hồ sơ cần cập nhật
 * @param {Object} profileData - Dữ liệu mới
 * @returns {Promise<Object>} Hồ sơ đã cập nhật
 */
export const updatePatientProfile = (id, profileData) => {
  return privateApi.put(`/patient-profiles/${id}`, profileData);
};

/**
 * Xóa hồ sơ bệnh nhân
 * @param {string} id - ID của hồ sơ cần xóa
 * @returns {Promise<Object>} Response xác nhận đã xóa
 */
export const deletePatientProfile = (id) => {
  return privateApi.delete(`/patient-profiles/${id}`);
};
