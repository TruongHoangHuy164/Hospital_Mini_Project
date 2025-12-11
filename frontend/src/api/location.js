// Bộ trợ giúp đơn giản cho danh sách Tỉnh/Quận/Phường Việt Nam sử dụng https://provinces.open-api.vn
const BASE = 'https://provinces.open-api.vn/api';

export async function fetchProvinces() {
  const res = await fetch(`${BASE}/?depth=1`);
  if (!res.ok) throw new Error('Không tải được danh sách tỉnh');
  return res.json();
}

export async function fetchDistricts(provinceCode) {
  // Lấy danh sách quận theo mã tỉnh; trả về [] nếu không có provinceCode
  if (!provinceCode) return [];
  const res = await fetch(`${BASE}/p/${provinceCode}?depth=2`);
  if (!res.ok) throw new Error('Không tải được danh sách quận');
  const data = await res.json();
  return data.districts || [];
}

export async function fetchWards(districtCode) {
  // Lấy danh sách phường theo mã quận; trả về [] nếu không có districtCode
  if (!districtCode) return [];
  const res = await fetch(`${BASE}/d/${districtCode}?depth=2`);
  if (!res.ok) throw new Error('Không tải được danh sách phường');
  const data = await res.json();
  return data.wards || [];
}
