import React, { useState, useCallback, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import { View, Platform } from 'react-native';

// ... seus imports de screens continuam os mesmos ...

SplashScreen.preventAutoHideAsync();

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const [userRole, setUserRole] = useState<UserRole>(null);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // Efeito para esconder a splash screen de forma segura
  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null; // Evita qualquer renderização parcial que causa o erro 527
  }

  return (
      <View style={{ flex: 1, backgroundColor: '#FAFAFA' }}>
        <NavigationContainer>
          <Stack.Navigator
              initialRouteName="Login"
              screenOptions={{ headerShown: false }}
          >
            <Stack.Screen name="Login">
              {(props) => <LoginScreen {...props} onLogin={setUserRole} />}
            </Stack.Screen>
            {/* Mantenha todas as suas outras screens aqui como estavam */}
          </Stack.Navigator>
        </NavigationContainer>
        <StatusBar style="dark" />
      </View>
  );
}