import { useEffect, useRef } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';
import { getSimCards, sendSms } from 'expo-android-sms-sender';
import { jobService, PendingJob } from '../services/jobService';
import { deviceService } from '../services/deviceService';
import { deviceStorage } from '../lib/deviceStorage';

const POLL_INTERVAL_MS = 15_000;

export function useJobPolling(enabled: boolean) {
  const isProcessingRef = useRef(false);

  useEffect(() => {
    if (!enabled || Platform.OS !== 'android') return;

    const processJobs = async () => {
      if (isProcessingRef.current) return; // évite les exécutions qui se chevauchent
      isProcessingRef.current = true;

      try {
        const deviceId = await deviceStorage.getDeviceId();
        if (!deviceId) return;

        const jobs = await jobService.getPending();
        if (jobs.length === 0) return;

        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.SEND_SMS
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) return;

        // Récupère le device (avec ses sims: id + slot_index) pour savoir
        // quelle SIM PHYSIQUE correspond au device_sim_id choisi par le serveur
        const device = await deviceService.getMyDevice(deviceId);
        const nativeSims = await getSimCards();

        for (const job of jobs) {
          await processOneJob(job, device, nativeSims);
        }
      } catch (e) {
        // Erreur réseau ou autre : on retentera au prochain cycle de polling
      } finally {
        isProcessingRef.current = false;
      }
    };

    processJobs(); // premier passage immédiat
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

    await jobService.report(job.id, 'sent');
  } catch (error: any) {
    await jobService.report(job.id, 'failed', error?.message ?? 'Échec de l\'envoi natif');
  }
}