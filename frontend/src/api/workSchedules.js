import { privateApi } from './axios';

// Lấy danh sách lịch làm việc theo tháng/vai trò/nhân sự
export async function fetchWorkSchedules({ month, role, userId }) {
  const params = new URLSearchParams();
  if (month) params.append('month', month);
  if (role) params.append('role', role);
  if (userId) params.append('userId', userId);
  const { data } = await privateApi.get(`/work-schedules?${params.toString()}`);
  return data;
}

// Tạo mới lịch làm việc
export async function createWorkSchedule(payload){
  const { data } = await privateApi.post('/work-schedules', payload);
  return data;
}

// Cập nhật lịch làm việc
export async function updateWorkSchedule(id, payload){
  const { data } = await privateApi.put(`/work-schedules/${id}`, payload);
  return data;
}

// Xoá lịch làm việc
export async function deleteWorkSchedule(id){
  const { data } = await privateApi.delete(`/work-schedules/${id}`);
  return data;
}

// Thêm/cập nhật hàng loạt lịch làm việc
export async function bulkUpsertWorkSchedules(items){
  const { data } = await privateApi.post('/work-schedules/bulk', { items });
  return data;
}

// Lịch làm việc của chính tôi theo tháng
export async function fetchMySchedule(month){
  const { data } = await privateApi.get(`/work-schedules/me/self?month=${month}`);
  return data;
}

// Thống kê tóm tắt lịch làm việc theo tháng/vai trò
export async function fetchWorkScheduleStats(month, role){
  const params = new URLSearchParams();
  if(month) params.append('month', month);
  if(role) params.append('role', role);
  const { data } = await privateApi.get(`/work-schedules/stats/summary?${params.toString()}`);
  return data;
}

// Reset lịch của tôi cho tháng kế tiếp
export async function resetMyNextMonthSchedule(){
  const { data } = await privateApi.delete('/work-schedules/me/next');
  return data;
}
