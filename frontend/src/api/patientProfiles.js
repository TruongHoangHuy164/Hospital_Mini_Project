// API quản lý hồ sơ người thân (PatientProfile)
import { privateApi } from "./axios";

// Lấy danh sách hồ sơ người thân của người dùng
export const getPatientProfiles = () => {
  console.log('API: Fetching patient profiles...');
  return privateApi.get('/patient-profiles');
};

// Thêm hồ sơ người thân mới
export const addPatientProfile = (profileData) => {
  console.log('API: Adding patient profile:', profileData);
  return privateApi.post('/patient-profiles', profileData);
};

// Cập nhật hồ sơ người thân
export const updatePatientProfile = (id, profileData) => {
  return privateApi.put(`/patient-profiles/${id}`, profileData);
};

// Xoá hồ sơ người thân
export const deletePatientProfile = (id) => {
  return privateApi.delete(`/patient-profiles/${id}`);
};
