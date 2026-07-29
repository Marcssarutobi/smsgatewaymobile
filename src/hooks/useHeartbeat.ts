import { useEffect } from 'react';
import * as Battery from 'expo-battery';
import { deviceService } from '../services/deviceService';

export function useHeartbeat(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;

    const sendHeartbeat = async () => {
      try {
        const level = await Battery.getBatteryLevelAsync();
        await deviceService.heartbeat({ battery_level: Math.round(level * 100) });
      } catch (e) {
        // silencieux : le prochain heartbeat réessaiera
      }
    };

    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, 30_000); // toutes les 30s

    return () => clearInterval(interval);
  }, [enabled]);
}