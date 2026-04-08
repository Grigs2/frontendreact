import React, { useState, useCallback, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import { View } from 'react-native';
import LoginScreen from "./src/screens/LoginScreen";
import {UserRole} from "./src/types";
import {RootStackParamList} from "./src/navigation";

// Mantenha seus imports de screens aqui...

SplashScreen.preventAutoHideAsync();

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [isClient, setIsClient] = useState(false); // NOVO: Controle de hidratação

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const handleLoginAction = (role: UserRole) => {
    setUserRole(role);
  };

  useEffect(() => {
    setIsClient(true); // Marca que o componente montou no cliente
    if (fontsLoaded) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded]);

  // Se as fontes não carregaram OU se ainda não confirmamos que estamos no cliente,
  // retornamos uma View vazia com a cor de fundo para não dar erro #527
  if (!fontsLoaded || !isClient) {
    return <View style={{ flex: 1, backgroundColor: '#FAFAFA' }} />;
  }

  return (
      <View style={{ flex: 1, backgroundColor: '#FAFAFA' }}>
        <NavigationContainer>
          <Stack.Navigator
              initialRouteName="Login"
              screenOptions={{ headerShown: false }}
          >
            <Stack.Screen name="Login">
              {(props) => <LoginScreen {...props} onLogin={handleLoginAction} />}
            </Stack.Screen>
            {/* Suas outras telas aqui... */}
          </Stack.Navigator>
        </NavigationContainer>
        <StatusBar style="dark" />
      </View>
  );
}