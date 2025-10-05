import { privateApi } from './axios';

export async function fetchWorkSchedules({ month, role, userId }) {
  const params = new URLSearchParams();
  if (month) params.append('month', month);
  if (role) params.append('role', role);
  if (userId) params.append('userId', userId);
  const { data } = await privateApi.get(`/work-schedules?${params.toString()}`);
  return data;
}

export async function createWorkSchedule(payload){
  const { data } = await privateApi.post('/work-schedules', payload);
  return data;
}

export async function updateWorkSchedule(id, payload){
  const { data } = await privateApi.put(`/work-schedules/${id}`, payload);
  return data;
}

export async function deleteWorkSchedule(id){
  const { data } = await privateApi.delete(`/work-schedules/${id}`);
  return data;
}

export async function bulkUpsertWorkSchedules(items){
  const { data } = await privateApi.post('/work-schedules/bulk', { items });
  return data;
}

export async function fetchMySchedule(month){
  const { data } = await privateApi.get(`/work-schedules/me/self?month=${month}`);
  return data;
}

export async function fetchWorkScheduleStats(month, role){
  const params = new URLSearchParams();
  if(month) params.append('month', month);
  if(role) params.append('role', role);
  const { data } = await privateApi.get(`/work-schedules/stats/summary?${params.toString()}`);
  return data;
}

export async function resetMyNextMonthSchedule(){
  const { data } = await privateApi.delete('/work-schedules/me/next');
  return data;
}
