import { privateApi } from './axios';

// Lấy cấu hình lịch làm việc cho tháng kế tiếp
export async function fetchNextScheduleConfig(){
  const { data } = await privateApi.get('/work-schedules/config/next');
  return data;
}

// Cập nhật cấu hình lịch làm việc cho tháng kế tiếp
export async function updateNextScheduleConfig(payload){
  const { data } = await privateApi.put('/work-schedules/config/next', payload);
  return data;
}
