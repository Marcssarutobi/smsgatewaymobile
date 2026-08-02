import { useEffect, useRef } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';
import { getSimCards, sendSms } from 'expo-android-sms-sender';
import Toast from 'react-native-toast-message';
import { jobService, PendingJob } from '../services/jobService';
import { deviceService } from '../services/deviceService';
import { deviceStorage } from '../lib/deviceStorage';

const POLL_INTERVAL_MS = 15_000;

export function useJobPolling(enabled: boolean) {
  const isProcessingRef = useRef(false);

  useEffect(() => {
    if (!enabled || Platform.OS !== 'android') return;

    const processJobs = async () => {
      if (isProcessingRef.current) return;
      isProcessingRef.current = true;

      try {
        const deviceId = await deviceStorage.getDeviceId();
        if (!deviceId) return;

        const jobs = await jobService.getPending();
        if (jobs.length === 0) return;

        const smsGranted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.SEND_SMS
        );
        if (smsGranted !== PermissionsAndroid.RESULTS.GRANTED) {
          Toast.show({ type: 'error', text1: 'Permission SMS refusée' });
          return;
        }

        const phoneStateGranted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE
        );
        if (phoneStateGranted !== PermissionsAndroid.RESULTS.GRANTED) {
          Toast.show({ type: 'error', text1: 'Permission SIM refusée' });
          return;
        }

        const device = await deviceService.getMyDevice(deviceId);
        const nativeSims = await getSimCards();

        for (const job of jobs) {
          await processOneJob(job, device, nativeSims);
        }
      } catch (e: any) {
        // On garde une trace visible pendant les tests, plutôt que d'avaler
        // l'erreur silencieusement comme avant.
        console.error('[useJobPolling] erreur:', e?.message ?? e);
      } finally {
        isProcessingRef.current = false;
      }
    };

    processJobs();
    const interval = setInterval(processJobs, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [enabled]);
}

async function processOneJob(job: PendingJob, device: any, nativeSims: any[]) {
  try {
    const matchingDbSim = device.sims?.find((s: any) => s.id === job.device_sim_id);

    if (!matchingDbSim) {
      await jobService.report(job.id, 'failed', 'SIM assignée introuvable sur ce device');
      return;
    }

    const nativeSim = nativeSims.find((s) => s.slotIndex === matchingDbSim.slot_index);

    await sendSms(job.recipient, job.content, nativeSim?.id);

    Toast.show({ type: 'success', text1: `SMS envoyé à ${job.recipient}` });
    await jobService.report(job.id, 'sent');
  } catch (error: any) {
    Toast.show({ type: 'error', text1: 'Échec envoi SMS', text2: error?.message });
    await jobService.report(job.id, 'failed', error?.message ?? "Échec de l'envoi natif");
  }
}