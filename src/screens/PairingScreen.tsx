import { useState, useRef } from 'react';
import { View, Text } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { QrCode } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { useMutation } from '@tanstack/react-query';
import { Button } from '../components/Button';
import { pairingService } from '../services/pairingService';
import { deviceStorage } from '../lib/deviceStorage';
import { useAuth } from '../hooks/useAuth';

export function PairingScreen({ onPaired }: { onPaired: () => void }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [isScanning, setIsScanning] = useState(false);
  const [scanned, setScanned] = useState(false);
  const scannedRef = useRef(false);
  const { signOut } = useAuth();

  const { mutate: pair, isPending } = useMutation({
    mutationFn: pairingService.pair,
    onSuccess: async (data) => {
      await deviceStorage.setToken(data.device_token);
      await deviceStorage.setDeviceId(String(data.device.id));
      Toast.show({ type: 'success', text1: 'Téléphone connecté !' });
      onPaired();
    },
    onError: () => {
      Toast.show({ type: 'error', text1: 'Code invalide ou expiré' });
      scannedRef.current = false;
      setScanned(false);
      setIsScanning(false);
    },
  });

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

  const handleScan = ({ data }: { data: string }) => {
    if (scannedRef.current) return;
    scannedRef.current = true;
    setScanned(true);

    try {
      const parsed = JSON.parse(data);
      pair({
        pairing_token: parsed.token,
        device_name: 'Téléphone Android',
        sims: [{ slot_index: 0 }],
      });
    } catch {
      Toast.show({ type: 'error', text1: 'QR code invalide' });
      scannedRef.current = false;
      setScanned(false);
      setIsScanning(false);
    }
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
            {isPending ? 'Connexion en cours...' : 'Scannez le QR code de votre tableau de bord'}
          </Text>
        </View>
        <View className="absolute bottom-12 w-full items-center px-6">
          <Button label="Annuler" variant="outline" onPress={() => setIsScanning(false)} />
        </View>
      </View>
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