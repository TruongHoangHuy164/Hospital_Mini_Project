import { privateApi } from './axios';

export const getPendingPrescriptions = () => privateApi.get('/pharmacy/prescriptions');
export const dispensePrescription = (id) => privateApi.post(`/pharmacy/prescriptions/${id}/dispense`);

export default {
  getPendingPrescriptions,
  dispensePrescription,
};
