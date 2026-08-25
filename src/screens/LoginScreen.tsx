import { useState, useEffect } from 'react';
import { View, Text, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Mail, Lock, Smartphone, ArrowRight } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { useLogin } from '../hooks/useLogin';
import { isTwoFactorPending } from '../services/authService';
import { useAuth } from '../hooks/useAuth';
import { useGoogleAuth, getGoogleAuthErrorMessage } from '../hooks/useGoogleAuth';

export function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { mutate: login, isPending } = useLogin();
  const { signIn } = useAuth();

  const {
    promptAsync,
    isReady,
    isConfigured,
    isPending: isGooglePending,
    data: googleData,
    error: googleError,
    debugInfo: googleDebugInfo,
  } = useGoogleAuth();

  useEffect(() => {
    if (googleData) {
      if (isTwoFactorPending(googleData)) {
        navigation.navigate('TwoFactor', { tempToken: googleData.temp_token });
        return;
      }
      signIn(googleData.token);
    }
  }, [googleData]);

  useEffect(() => {
    if (googleError) {
      // On affiche le message EXACT de l'erreur (natif GoogleSignin ou
      // réponse backend) en text2 : un message générique masquait la vraie
      // cause, notamment les cas "ça marche en local, pas en build signé"
      // (SHA-1 non enregistré pour ce build → DEVELOPER_ERROR).
      console.error('[GoogleAuth] Erreur connexion Google:', googleError);
      Toast.show({
        type: 'error',
        text1: 'Connexion Google impossible',
        text2: getGoogleAuthErrorMessage(googleError),
        autoHide: false,
      });
    }
  }, [googleError]);

  const handleSubmit = () => {
    if (!email || !password) {
      Toast.show({ type: 'error', text1: 'Remplis tous les champs' });
      return;
    }

    login(
      { email, password },
      {
        onSuccess: (data) => {
          if (isTwoFactorPending(data)) {
            navigation.navigate('TwoFactor', { tempToken: data.temp_token });
            return;
          }
          signIn(data.token);
        },
        onError: () => {
          Toast.show({ type: 'error', text1: 'Identifiants incorrects' });
        },
      }
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-slate-50"
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          paddingHorizontal: 24,
          paddingVertical: 48,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="items-center mb-10 gap-3">
          <View className="h-14 w-14 rounded-2xl bg-indigo-600 items-center justify-center shadow-sm">
            <Smartphone size={26} color="white" />
          </View>
          <Text className="text-2xl font-bold text-slate-900">SMS Gateway</Text>
          <Text className="text-sm text-slate-500">Connectez-vous pour gérer votre passerelle</Text>
        </View>

        <Button
          label="Continuer avec Google"
          variant="outline"
          isLoading={isGooglePending}
          disabled={!isReady || isGooglePending}
          onPress={() => promptAsync()}
        />

        <View className="bg-white rounded-2xl border border-slate-200 mt-4 p-5 gap-4 shadow-sm">
          <Input
            label="Adresse e-mail"
            icon={Mail}
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
            placeholder="nom@entreprise.com"
          />
          <Input
            label="Mot de passe"
            icon={Lock}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
          />

          <Button
            label={isPending ? 'Connexion...' : 'Se connecter'}
            isLoading={isPending}
            onPress={handleSubmit}
          />
        </View>

        {(googleError || googleDebugInfo) && (
          <View className="bg-rose-50 border border-rose-200 rounded-2xl mt-4 p-4 gap-1">
            {googleError && (
              <Text className="text-xs font-medium text-rose-700">{getGoogleAuthErrorMessage(googleError)}</Text>
            )}
            {googleDebugInfo && (
              <Text className="text-[11px] text-rose-500">{googleDebugInfo}</Text>
            )}
          </View>
        )}

        {!isConfigured && (
          <Text className="text-center text-xs text-amber-600 mt-6">
            Connexion Google non configurée (EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID manquant dans .env)
          </Text>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}