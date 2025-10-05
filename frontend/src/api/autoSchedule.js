import { privateApi } from './axios';

export async function autoGenerateSchedules({ dryRun = true, replaceExisting = false, roles }){
  const payload = { dryRun, replaceExisting };
  if(roles && roles.length) payload.roles = roles;
  const { data } = await privateApi.post('/work-schedules/auto-generate', payload);
  return data;
}
