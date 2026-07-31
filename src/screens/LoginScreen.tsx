import { useState, useEffect } from 'react';
import { View, Text, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Mail, Lock, Smartphone, ArrowRight } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { useLogin } from '../hooks/useLogin';
import { isTwoFactorPending } from '../services/authService';
import { useAuth } from '../hooks/useAuth';
//import { useGoogleAuth } from '../hooks/useGoogleAuth';

export function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { mutate: login, isPending } = useLogin();
  const { signIn } = useAuth();

  // const { promptAsync, isReady, isPending: isGooglePending, data: googleData } = useGoogleAuth();

  // useEffect(() => {
  //   if (googleData) {
  //     if (isTwoFactorPending(googleData)) {
  //       navigation.navigate('TwoFactor', { tempToken: googleData.temp_token });
  //       return;
  //     }
  //     signIn(googleData.token);
  //   }
  // }, [googleData]);

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
          //isLoading={isGooglePending}
          //disabled={!isReady}
          onPress={() => {}}
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

        <Text className="text-center text-xs text-slate-400 mt-6">
          La connexion Google sera disponible prochainement
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}