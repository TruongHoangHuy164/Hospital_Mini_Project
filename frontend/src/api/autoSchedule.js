/**
 * FILE: autoSchedule.js
 * MÔ TẢ: API calls cho chức năng tự động tạo lịch làm việc
 */

import { privateApi } from './axios';

/**
 * Tự động tạo lịch làm việc cho nhân viên
 * @param {Object} params - Tham số tạo lịch
 * @param {boolean} params.dryRun - Chế độ thử nghiệm (không lưu vào DB), mặc định true
 * @param {boolean} params.replaceExisting - Có thay thế lịch cũ không, mặc định false
 * @param {Array<string>} params.roles - Danh sách vai trò cần tạo lịch (tùy chọn)
 * @returns {Promise<Object>} Kết quả tạo lịch (preview hoặc đã lưu)
 */
export async function autoGenerateSchedules({ dryRun = true, replaceExisting = false, roles }){
  const payload = { dryRun, replaceExisting };
  if(roles && roles.length) payload.roles = roles;
  const { data } = await privateApi.post('/work-schedules/auto-generate', payload);
  return data;
}
