import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, ActivityIndicator } from 'react-native';
import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { deviceStorage } from '../lib/deviceStorage';
import { LoginScreen } from '../screens/LoginScreen';
import { DashboardScreen } from '../screens/DashboardScreen';
import { PairingScreen } from '../screens/PairingScreen';
import { TwoFactorScreen } from '../screens/TwoFactorScreen';

const Stack = createNativeStackNavigator();

export function RootNavigator() {
  const { token, isLoading } = useAuth();
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [checkingDevice, setCheckingDevice] = useState(true);

  useEffect(() => {
    deviceStorage.getDeviceId().then((id) => {
      setDeviceId(id);
      setCheckingDevice(false);
    });
  }, []);

  if (isLoading || checkingDevice) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!token ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="TwoFactor" component={TwoFactorScreen} />
          </>
        ) : !deviceId ? (
          <Stack.Screen name="Pairing">
            {(props) => (
              <PairingScreen
                {...props}
                onPaired={() => deviceStorage.getDeviceId().then(setDeviceId)}
              />
            )}
          </Stack.Screen>
        ) : (
          <Stack.Screen name="Dashboard">
            {(props) => (
              <DashboardScreen
                {...props}
                onNeedsPairing={() => setDeviceId(null)}
              />
            )}
          </Stack.Screen>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}