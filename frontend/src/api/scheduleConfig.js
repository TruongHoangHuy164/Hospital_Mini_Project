import { privateApi } from './axios';

export async function fetchNextScheduleConfig(){
  const { data } = await privateApi.get('/work-schedules/config/next');
  return data;
}

export async function updateNextScheduleConfig(payload){
  const { data } = await privateApi.put('/work-schedules/config/next', payload);
  return data;
}
