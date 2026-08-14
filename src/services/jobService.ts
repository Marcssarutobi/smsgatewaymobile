import { deviceApi } from './deviceApi';

export interface PendingJob {
  id: number;
  device_sim_id: number;
  recipient: string;
  content: string;
}

export const jobService = {
  getPending: async (): Promise<PendingJob[]> => {
    const { data } = await deviceApi.get('/device/jobs/pending');
    return data.jobs as PendingJob[];
  },

  report: async (
    smsId: number,
    status: 'sent' | 'failed',
    errorMessage?: string,
    deviceSimId?: number
  ): Promise<void> => {
    await deviceApi.post(`/device/jobs/${smsId}/report`, {
      status,
      error_message: errorMessage,
      device_sim_id: deviceSimId,
    });
  },
};