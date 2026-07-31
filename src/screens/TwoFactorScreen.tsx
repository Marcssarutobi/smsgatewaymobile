import { useState } from 'react';
import { View, Text, KeyboardAvoidingView, Platform } from 'react-native';
import { ShieldCheck } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { Button } from '../components/Button';
import { useVerifyTwoFactor } from '../hooks/useTwoFactor';
import { useAuth } from '../hooks/useAuth';

export function TwoFactorScreen({ route, navigation }: any) {
  const { tempToken } = route.params;
  const [code, setCode] = useState('');
  const { mutate: verify, isPending } = useVerifyTwoFactor();
  const { signIn } = useAuth();

  const handleVerify = () => {
    if (code.length !== 6) {
      Toast.show({ type: 'error', text1: 'Entre les 6 chiffres du code' });
      return;
    }

    verify(
      { tempToken, code },   // <-- renommé : tempToken (pas temp_token) pour matcher le service
      {
        onSuccess: (data) => {
          signIn(data.token);
        },
        onError: () => {
          Toast.show({ type: 'error', text1: 'Code invalide, réessaie' });
          setCode('');
        },
      }
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-slate-50"
    >
      <View className="flex-1 items-center justify-center px-8 gap-6">
        <View className="h-16 w-16 rounded-3xl bg-indigo-600 items-center justify-center shadow-sm">
          <ShieldCheck size={28} color="white" />
        </View>

        <View className="items-center gap-2">
          <Text className="text-xl font-bold text-slate-900 text-center">
            Double authentification
          </Text>
          <Text className="text-sm text-slate-500 text-center leading-relaxed">
            Entre le code à 6 chiffres généré par ton application d'authentification.
          </Text>
        </View>

        <View className="w-full bg-white rounded-2xl border border-slate-200 p-5 gap-4">
          <View className="h-14 rounded-xl border border-slate-200 items-center justify-center">
            <Text
              className="text-2xl font-bold tracking-[8px] text-slate-900"
              onPress={() => {}}
            >
              {code || '••••••'}
            </Text>
          </View>

          {/* Champ invisible qui capte le clavier numérique */}
          <TextInputHidden value={code} onChangeText={setCode} />

          <Button
            label={isPending ? 'Vérification...' : 'Vérifier'}
            isLoading={isPending}
            onPress={handleVerify}
          />
        </View>

        <Button
          label="Retour à la connexion"
          variant="outline"
          onPress={() => navigation.goBack()}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

// Petit input texte natif dédié à la saisie du code (numérique, 6 chiffres)
import { TextInput } from 'react-native';

function TextInputHidden({ value, onChangeText }: { value: string; onChangeText: (v: string) => void }) {
  return (
    <TextInput
      value={value}
      onChangeText={(v) => onChangeText(v.replace(/[^0-9]/g, '').slice(0, 6))}
      keyboardType="number-pad"
      maxLength={6}
      autoFocus
      className="h-12 rounded-xl border border-slate-200 px-4 text-center text-lg font-bold tracking-widest text-slate-900"
      placeholder="000000"
    />
  );
}