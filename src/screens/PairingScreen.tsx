import { useState, useRef } from 'react';
import { View, Text, PermissionsAndroid, Platform, ScrollView } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Device from 'expo-device';
import { getSimCards, startBackgroundService } from 'expo-android-sms-sender';
import { QrCode, Phone } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { useMutation } from '@tanstack/react-query';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { pairingService } from '../services/pairingService';
import { deviceStorage } from '../lib/deviceStorage';
import { useAuth } from '../hooks/useAuth';
import { API_BASE_URL } from '../lib/config';

type SimDraft = { slot_index: number; operator?: string; phone_number: string };

type ScannedInfo = {
  pairingToken: string;
  deviceName: string;
  androidDeviceId?: string;
};

export function PairingScreen({ onPaired }: { onPaired: () => void }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [isScanning, setIsScanning] = useState(false);
  const [scanned, setScanned] = useState(false);
  const scannedRef = useRef(false);
  const { signOut } = useAuth();

  // Une fois le QR scanné, on passe par cet écran de confirmation avant de
  // pairer réellement : la lecture automatique du numéro de SIM est peu
  // fiable sur Android (beaucoup d'opérateurs/constructeurs ne l'exposent
  // pas), donc on demande à l'utilisateur de le confirmer ou de le saisir.
  const [scannedInfo, setScannedInfo] = useState<ScannedInfo | null>(null);
  const [simDrafts, setSimDrafts] = useState<SimDraft[]>([]);
  const [simErrors, setSimErrors] = useState<Record<number, string>>({});

  const { mutate: pair, isPending } = useMutation({
    mutationFn: pairingService.pair,
    onSuccess: async (data) => {
      await deviceStorage.setToken(data.device_token);
      await deviceStorage.setDeviceId(String(data.device.id));

      // Android 13+ exige cette permission pour afficher la notification
      // persistante du service au premier plan — sans elle le service peut
      // quand même tourner, mais silencieusement (moins rassurant pour
      // l'utilisateur). On la demande ici, une seule fois, juste après le
      // pairing plutôt qu'au lancement de l'app.
      if (Platform.OS === 'android' && Platform.Version >= 33) {
        await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
      }

      try {
        await startBackgroundService(data.device_token, String(data.device.id), API_BASE_URL);
      } catch (e) {
        // Le pairing reste valide même si le service natif échoue à démarrer
        // ici (ex: permission refusée) : useJobPolling/useHeartbeat côté JS
        // prendront le relais tant que l'app reste ouverte au premier plan.
        console.error('[PairingScreen] démarrage du service en arrière-plan impossible:', e);
      }

      Toast.show({ type: 'success', text1: 'Téléphone connecté !' });
      onPaired();
    },
    onError: () => {
      Toast.show({ type: 'error', text1: 'Code invalide ou expiré' });
      resetToIdle();
    },
  });

  const resetToIdle = () => {
    scannedRef.current = false;
    setScanned(false);
    setIsScanning(false);
    setScannedInfo(null);
    setSimDrafts([]);
    setSimErrors({});
  };

  const getRealSims = async (): Promise<{ slot_index: number; operator?: string }[]> => {
    if (Platform.OS !== 'android') return [{ slot_index: 0 }];

    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE
      );

      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        Toast.show({ type: 'error', text1: 'Permission SIM refusée, SIM générique utilisée' });
        return [{ slot_index: 0 }];
      }

      const sims = await getSimCards();

      if (!sims || sims.length === 0) {
        Toast.show({ type: 'error', text1: 'Aucune SIM détectée' });
        return [{ slot_index: 0 }];
      }

      return sims.map((sim, index) => ({
        slot_index: sim.slotIndex ?? index,
        operator: sim.carrierName,
      }));
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Impossible de lire les SIM' });
      return [{ slot_index: 0 }];
    }
  };

  const handleStartScan = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Toast.show({ type: 'error', text1: 'Autorisation caméra refusée' });
        return;
      }
    }
    setIsScanning(true);
  };

  const handleScan = async ({ data }: { data: string }) => {
    if (scannedRef.current) return;
    scannedRef.current = true;
    setScanned(true);

    try {
      const parsed = JSON.parse(data);
      const sims = await getRealSims();
      const deviceName =
        Device.deviceName ??
        `${Device.manufacturer ?? ''} ${Device.modelName ?? 'Android'}`.trim();

      // On ne pair pas tout de suite : on affiche d'abord un écran pour que
      // l'utilisateur confirme/saisisse le numéro de chaque SIM détectée,
      // requis pour un envoi fiable (le champ `phone_number` est utilisé
      // côté back pour l'identification et le reporting de chaque SIM).
      setScannedInfo({
        pairingToken: parsed.token,
        deviceName,
        androidDeviceId: Device.osBuildId ?? undefined,
      });
      setSimDrafts(sims.map((s) => ({ ...s, phone_number: '' })));
      setIsScanning(false);
    } catch {
      Toast.show({ type: 'error', text1: 'QR code invalide' });
      resetToIdle();
    }
  };

  const updateSimNumber = (index: number, value: string) => {
    setSimDrafts((prev) => prev.map((s, i) => (i === index ? { ...s, phone_number: value } : s)));
    setSimErrors((prev) => ({ ...prev, [index]: '' }));
  };

  const handleConfirmSims = () => {
    if (!scannedInfo) return;

    // Validation simple : un numéro de téléphone non vide par SIM. On reste
    // permissif sur le format (indicatifs internationaux variés en Afrique
    // de l'Ouest : +229, +225, 00229...), on vérifie juste qu'il reste au
    // moins 8 chiffres une fois les espaces/tirets retirés.
    const errors: Record<number, string> = {};
    simDrafts.forEach((sim, index) => {
      const digitsOnly = sim.phone_number.replace(/[^0-9]/g, '');
      if (digitsOnly.length < 8) {
        errors[index] = 'Numéro invalide';
      }
    });

    if (Object.keys(errors).length > 0) {
      setSimErrors(errors);
      return;
    }

    pair({
      pairing_token: scannedInfo.pairingToken,
      device_name: scannedInfo.deviceName,
      android_device_id: scannedInfo.androidDeviceId,
      sims: simDrafts.map((s) => ({
        slot_index: s.slot_index,
        operator: s.operator,
        phone_number: s.phone_number.trim(),
      })),
    });
  };

  if (isScanning) {
    return (
      <View className="flex-1 bg-black">
        <CameraView
          style={{ flex: 1 }}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={scanned ? undefined : handleScan}
        />
        <View className="absolute inset-0 items-center justify-center">
          <View className="w-64 h-64 border-4 border-indigo-500 rounded-2xl" />
        </View>
        <View className="absolute top-16 w-full items-center px-6">
          <Text className="text-white text-base font-semibold text-center bg-black/50 px-4 py-2 rounded-xl">
            Scannez le QR code de votre tableau de bord
          </Text>
        </View>
        <View className="absolute bottom-12 w-full items-center px-6">
          <Button label="Annuler" variant="outline" onPress={() => setIsScanning(false)} />
        </View>
      </View>
    );
  }

  // Étape de confirmation des numéros de SIM, avant l'appel réel au pairing.
  if (scannedInfo) {
    return (
      <ScrollView
        className="flex-1 bg-slate-50"
        contentContainerStyle={{ padding: 24, gap: 20, flexGrow: 1, justifyContent: 'center' }}
      >
        <View className="items-center gap-2 mb-2">
          <View className="h-16 w-16 rounded-3xl bg-indigo-600 items-center justify-center shadow-sm">
            <Phone size={28} color="white" />
          </View>
          <Text className="text-xl font-bold text-slate-900 text-center">
            Confirmez le numéro de vos SIM
          </Text>
          <Text className="text-sm text-slate-500 text-center leading-relaxed">
            Android ne permet pas toujours de lire automatiquement le numéro d'une carte SIM.
            Merci de le confirmer pour chaque SIM détectée sur "{scannedInfo.deviceName}".
          </Text>
        </View>

        {simDrafts.map((sim, index) => (
          <Input
            key={`${sim.slot_index}-${index}`}
            label={`SIM ${index + 1}${sim.operator ? ` — ${sim.operator}` : ''} (emplacement ${sim.slot_index + 1})`}
            icon={Phone}
            placeholder="Ex: +229 90 00 00 00"
            keyboardType="phone-pad"
            value={sim.phone_number}
            onChangeText={(value) => updateSimNumber(index, value)}
            error={simErrors[index]}
          />
        ))}

        <View className="gap-3 mt-2">
          <Button
            label="Connecter ce téléphone"
            onPress={handleConfirmSims}
            isLoading={isPending}
          />
          <Button label="Annuler" variant="outline" onPress={resetToIdle} />
        </View>
      </ScrollView>
    );
  }

  return (
    <View className="flex-1 bg-slate-50 items-center justify-center px-8 gap-6">
      <View className="h-20 w-20 rounded-3xl bg-indigo-600 items-center justify-center shadow-sm">
        <QrCode size={36} color="white" />
      </View>

      <View className="items-center gap-2">
        <Text className="text-xl font-bold text-slate-900 text-center">
          Connectez ce téléphone
        </Text>
        <Text className="text-sm text-slate-500 text-center leading-relaxed">
          Scannez le QR code affiché sur votre tableau de bord web pour transformer ce téléphone en passerelle SMS.
        </Text>
      </View>

      <View className="w-full gap-3">
        <Button label="Scanner le QR code" onPress={handleStartScan} />
        <Button label="Se déconnecter" variant="outline" onPress={signOut} />
      </View>
    </View>
  );
}
