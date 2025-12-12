/**
 * FILE: location.js
 * MÔ TẢ: API calls cho dữ liệu địa lý Việt Nam (Tỉnh/Quận/Phường)
 * Sử dụng API công khai từ https://provinces.open-api.vn
 */

const BASE = 'https://provinces.open-api.vn/api';

/**
 * Lấy danh sách tất cả tỉnh/thành phố
 * @returns {Promise<Array>} Danh sách các tỉnh/thành phố
 */
export async function fetchProvinces() {
  const res = await fetch(`${BASE}/?depth=1`);
  if (!res.ok) throw new Error('Không tải được danh sách tỉnh');
  return res.json();
}

/**
 * Lấy danh sách quận/huyện theo mã tỉnh
 * @param {string} provinceCode - Mã tỉnh/thành phố
 * @returns {Promise<Array>} Danh sách các quận/huyện
 */
export async function fetchDistricts(provinceCode) {
  if (!provinceCode) return [];
  const res = await fetch(`${BASE}/p/${provinceCode}?depth=2`);
  if (!res.ok) throw new Error('Không tải được danh sách quận');
  const data = await res.json();
  return data.districts || [];
}

/**
 * Lấy danh sách phường/xã theo mã quận
 * @param {string} districtCode - Mã quận/huyện
 * @returns {Promise<Array>} Danh sách các phường/xã
 */
export async function fetchWards(districtCode) {
  if (!districtCode) return [];
  const res = await fetch(`${BASE}/d/${districtCode}?depth=2`);
  if (!res.ok) throw new Error('Không tải được danh sách phường');
  const data = await res.json();
  return data.wards || [];
}
