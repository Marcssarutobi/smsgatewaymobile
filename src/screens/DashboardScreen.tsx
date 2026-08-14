import { useEffect, useState } from 'react';
import { View, Text, ScrollView, RefreshControl, Dimensions } from 'react-native';
import { BarChart } from 'react-native-chart-kit';
import { Wifi, WifiOff, Battery as BatteryIcon } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { Button } from '../components/Button';
import { deviceService } from '../services/deviceService';
import { deviceStorage } from '../lib/deviceStorage';
import { useHeartbeat } from '../hooks/useHeartbeat';
import { useJobPolling } from '../hooks/useJobPolling';
import { useAuth } from '../hooks/useAuth';
import { useCurrentSubscription } from '../hooks/useSubscribe';
import { api } from '../services/api';

export function DashboardScreen({ onNeedsPairing }: { onNeedsPairing: () => void }) {
  const { signOut } = useAuth();
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [checkingStorage, setCheckingStorage] = useState(true);

  useEffect(() => {
    deviceStorage.getDeviceId().then((id) => {
      setDeviceId(id);
      setCheckingStorage(false);
    });
  }, []);

  const { data: device, isLoading, refetch, isRefetching, isError, error } = useQuery({
    queryKey: ['my-device', deviceId],
    queryFn: () => deviceService.getMyDevice(deviceId!),
    enabled: !!deviceId,
    refetchInterval: 15_000,
    retry: false,
  });

  const { data: smsLogs = [] } = useQuery({
    queryKey: ['sms-logs-chart'],
    queryFn: async () => (await api.get('/sms-logs')).data,
    enabled: !!device,
  });

  // Quota mensuel du plan souscrit (Feda/abonnement), affiché en complément
  // du quota journalier par SIM déjà géré ci-dessous.
  const { data: currentSubscription } = useCurrentSubscription();

  useHeartbeat(!!deviceId && !isError);
  useJobPolling(!!deviceId && !isError);

  // Ne réinitialise le pairing QUE si le serveur confirme explicitement que
  // ce device n'existe plus ou ne t'appartient plus (404/403) — jamais sur
  // une simple coupure réseau, un timeout, ou un serveur temporairement injoignable.
  useEffect(() => {
    const status = (error as any)?.response?.status;

    if (isError && deviceId && (status === 404 || status === 403)) {
      deviceStorage.clearDeviceId();
      deviceStorage.clearToken();
      onNeedsPairing();
    }
  }, [isError, deviceId, error]);

  const chartData = (() => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d;
    });

    const counts = days.map((day) =>
      smsLogs.filter((log: any) => {
        const logDate = new Date(log.created_at);
        return logDate.toDateString() === day.toDateString();
      }).length
    );

    return {
      labels: days.map((d) => d.toLocaleDateString('fr-FR', { weekday: 'short' })),
      datasets: [{ data: counts }],
    };
  })();

  if (checkingStorage || (!!deviceId && isLoading)) {
    return (
      <View className="flex-1 bg-slate-50 items-center justify-center">
        <Text className="text-slate-500">Chargement...</Text>
      </View>
    );
  }

  if (!deviceId) {
    return (
      <View className="flex-1 bg-slate-50 items-center justify-center px-6">
        <Text className="text-slate-500">Redirection vers l'appairage...</Text>
      </View>
    );
  }

  // Erreur réseau/serveur temporaire : on affiche un état clair sans
  // effacer le pairing ni renvoyer vers le scan.
  if (isError && !device) {
    return (
      <View className="flex-1 bg-slate-50 items-center justify-center px-6 gap-4">
        <Text className="text-slate-700 font-semibold text-center">
          Impossible de joindre le serveur
        </Text>
        <Text className="text-slate-500 text-sm text-center">
          Vérifie ta connexion ou que le serveur est bien démarré.
        </Text>
        <Button label="Réessayer" onPress={() => refetch()} />
        <Button label="Déconnexion" variant="outline" onPress={signOut} />
      </View>
    );
  }

  const totalSentToday = device?.sims?.reduce((s: number, sim: any) => s + sim.sent_today, 0) ?? 0;
  const totalQuota = device?.sims?.reduce((s: number, sim: any) => s + sim.daily_quota, 0) ?? 0;
  const remaining = Math.max(0, totalQuota - totalSentToday);

  return (
    <ScrollView
      className="flex-1 bg-slate-50"
      contentContainerClassName="p-5 gap-4"
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
    >
      <View className="flex-row items-center justify-between mt-4">
        <Text className="text-xl font-bold text-slate-900">{device?.name}</Text>
        <View className={`flex-row items-center gap-1.5 px-2.5 py-1 rounded-full ${
          device?.status === 'online' ? 'bg-emerald-50' : 'bg-slate-200'
        }`}>
          {device?.status === 'online' ? (
            <Wifi size={14} color="#059669" />
          ) : (
            <WifiOff size={14} color="#64748B" />
          )}
          <Text className={`text-xs font-semibold ${
            device?.status === 'online' ? 'text-emerald-700' : 'text-slate-600'
          }`}>
            {device?.status === 'online' ? 'En ligne' : 'Hors ligne'}
          </Text>
        </View>
      </View>

      <View className="bg-white rounded-2xl border border-slate-200 p-4 flex-row items-center gap-3">
        <BatteryIcon size={20} color={device?.battery_level < 20 ? '#DC2626' : '#334155'} />
        <Text className="text-slate-700 font-medium">{device?.battery_level ?? '--'}% de batterie</Text>
      </View>

      <View className="bg-indigo-600 rounded-2xl p-5">
        <Text className="text-indigo-100 text-xs font-semibold uppercase">SMS restants aujourd'hui</Text>
        <Text className="text-white text-3xl font-extrabold mt-1">{remaining}</Text>
        <Text className="text-indigo-200 text-xs mt-1">{totalSentToday} / {totalQuota} envoyés</Text>
      </View>

      {currentSubscription?.plan && (
        <View className="bg-white rounded-2xl border border-slate-200 p-4">
          <View className="flex-row items-center justify-between">
            <Text className="text-xs font-bold text-slate-700">
              Plan {currentSubscription.plan.name} — quota mensuel
            </Text>
            <Text className="text-xs font-mono text-slate-500">
              {currentSubscription.sms_used}/{currentSubscription.plan.sms_quota_monthly}
            </Text>
          </View>
          <View className="h-1.5 rounded-full bg-slate-100 mt-2 overflow-hidden">
            <View
              className="h-full rounded-full bg-indigo-500"
              style={{
                width: `${Math.min(
                  100,
                  Math.round(
                    (currentSubscription.sms_used / Math.max(1, currentSubscription.plan.sms_quota_monthly)) * 100
                  )
                )}%`,
              }}
            />
          </View>
        </View>
      )}

      <View className="gap-2">
        <Text className="text-sm font-bold text-slate-900">SIM détectées</Text>
        {device?.sims?.map((sim: any) => (
          <View key={sim.id} className="bg-white rounded-xl border border-slate-200 p-3 flex-row justify-between items-center">
            <View>
              <Text className="text-xs font-semibold text-slate-700">SIM {sim.slot_index} • {sim.operator ?? '—'}</Text>
              <Text className="text-[11px] text-slate-400">{sim.phone_number ?? 'Numéro non détecté'}</Text>
            </View>
            <Text className="text-xs font-mono text-slate-600">{sim.sent_today}/{sim.daily_quota}</Text>
          </View>
        ))}
      </View>

      <View className="bg-white rounded-2xl border border-slate-200 p-3">
        <Text className="text-sm font-bold text-slate-900 mb-2">SMS envoyés (7 derniers jours)</Text>
        <BarChart
          data={chartData}
          width={Dimensions.get('window').width - 56}
          height={180}
          yAxisLabel=""
          yAxisSuffix=""
          chartConfig={{
            backgroundColor: '#ffffff',
            backgroundGradientFrom: '#ffffff',
            backgroundGradientTo: '#ffffff',
            decimalPlaces: 0,
            color: () => '#4F46E5',
            labelColor: () => '#64748B',
            barPercentage: 0.6,
          }}
          style={{ borderRadius: 12 }}
          fromZero
        />
      </View>

      <Button label="Déconnexion" variant="outline" onPress={signOut} />
    </ScrollView>
  );
}