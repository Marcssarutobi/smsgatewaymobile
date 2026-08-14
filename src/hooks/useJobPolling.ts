import { useEffect, useRef } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';
import { getSimCards, sendSms } from 'expo-android-sms-sender';
import Toast from 'react-native-toast-message';
import { jobService, PendingJob } from '../services/jobService';
import { deviceService } from '../services/deviceService';
import { deviceStorage } from '../lib/deviceStorage';

const POLL_INTERVAL_MS = 15_000;

// Nombre de tentatives sur une même SIM avant de basculer sur la suivante.
// Les échecs "RIL SMS send failed" sont souvent transitoires (modem occupé,
// pas encore enregistré sur le réseau...) : 3 essais rapprochés suffisent
// généralement à distinguer un problème passager d'un vrai problème de SIM.
const MAX_ATTEMPTS_PER_SIM = 3;
const RETRY_DELAY_MS = 1500;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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
  const assignedSim = device.sims?.find((s: any) => s.id === job.device_sim_id);

  if (!assignedSim) {
    await jobService.report(job.id, 'failed', 'SIM assignée introuvable sur ce device');
    return;
  }

  // Ordre d'essai : la SIM assignée par le backend d'abord, puis les autres SIM
  // actives de CE téléphone qui ont encore du quota journalier, de la moins
  // sollicitée à la plus sollicitée. On ne bascule jamais vers un autre device :
  // l'envoi natif ne peut se faire que via une SIM physiquement présente ici.
  const fallbackSims = (device.sims ?? [])
    .filter((s: any) => s.id !== assignedSim.id && s.is_active && s.sent_today < s.daily_quota)
    .sort((a: any, b: any) => a.sent_today - b.sent_today);

  const simsToTry = [assignedSim, ...fallbackSims];

  const attemptErrors: string[] = [];

  for (const dbSim of simsToTry) {
    const nativeSim = nativeSims.find((s) => s.slotIndex === dbSim.slot_index);

    for (let attempt = 1; attempt <= MAX_ATTEMPTS_PER_SIM; attempt++) {
      try {
        await sendSms(job.recipient, job.content, nativeSim?.id);

        Toast.show({ type: 'success', text1: `SMS envoyé à ${job.recipient}` });
        // On ne renvoie le device_sim_id que si on a dû basculer sur une autre
        // SIM que celle initialement assignée, pour que le backend recrédite
        // le quota journalier sur la bonne SIM.
        await jobService.report(
          job.id,
          'sent',
          undefined,
          dbSim.id !== job.device_sim_id ? dbSim.id : undefined
        );
        return;
      } catch (error: any) {
        const message = error?.message ?? "Échec de l'envoi natif";
        attemptErrors.push(`SIM #${dbSim.id} (essai ${attempt}/${MAX_ATTEMPTS_PER_SIM}): ${message}`);

        // Dernier essai sur cette SIM : pas la peine d'attendre avant de
        // passer à la SIM suivante (ou de conclure à un échec total).
        if (attempt < MAX_ATTEMPTS_PER_SIM) {
          await sleep(RETRY_DELAY_MS);
        }
      }
    }
  }

  // Toutes les SIM disponibles ont été essayées MAX_ATTEMPTS_PER_SIM fois chacune, sans succès.
  const summary = simsToTry.length > 1
    ? `Échec sur ${simsToTry.length} SIM après ${MAX_ATTEMPTS_PER_SIM} tentatives chacune`
    : `Échec après ${MAX_ATTEMPTS_PER_SIM} tentatives`;

  Toast.show({ type: 'error', text1: 'Échec envoi SMS', text2: summary });
  await jobService.report(job.id, 'failed', `${summary}. Détails : ${attemptErrors.join(' | ')}`);
}
