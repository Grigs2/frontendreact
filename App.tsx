import React, { useState, useEffect, useCallback } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import { View } from 'react-native';

// Telas
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import DriverMainScreen from './src/screens/DriverMainScreen';
import PlaceholderScreen from './src/screens/PlaceholderScreen';
import DriverVehicleScreen from './src/screens/DriverVehicleScreen';
import DriverLayout from './src/components/DriverLayout';
import GuardianMainScreen from './src/screens/GuardianMainScreen';
import GuardianDependentsScreen from './src/screens/GuardianDependentsScreen';
import GuardianDependentFormScreen from './src/screens/GuardianDependentFormScreen';
import GuardianLayout from './src/components/GuardianLayout';

// Tipagens
import { UserRole } from './src/types';
import { RootStackParamList } from './src/navigation';

SplashScreen.preventAutoHideAsync();

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [isClient, setIsClient] = useState(false);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // Função para lidar com o login e resolver o erro TS2322
  const handleLogin = (role: UserRole) => {
    console.log("Perfil selecionado:", role);
    setUserRole(role);
  };

  useEffect(() => {
    // Esse delay de 50ms resolve o erro #527 no Docker/Nginx
    const timer = setTimeout(() => {
      setIsClient(true);
    }, 50);

    if (fontsLoaded) {
      SplashScreen.hideAsync().catch(() => {});
    }
    return () => clearTimeout(timer);
  }, [fontsLoaded]);

  // Enquanto as fontes carregam ou o cliente não estabilizou, mantemos o fundo neutro
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
            {/* LOGIN - Agora com a função handleLogin para garantir que o botão funcione */}
            <Stack.Screen name="Login">
              {(props) => <LoginScreen {...props} onLogin={handleLogin} />}
            </Stack.Screen>

            {/* CADASTRO */}
            <Stack.Screen name="Register" component={RegisterScreen} />

            {/* MOTORISTA */}
            <Stack.Screen name="DriverMain" component={DriverMainScreen} />
            <Stack.Screen name="DriverAttendance">
              {() => <DriverLayout><PlaceholderScreen title="Chamada em construção" /></DriverLayout>}
            </Stack.Screen>
            <Stack.Screen name="DriverRoute">
              {() => <DriverLayout><PlaceholderScreen title="Gerar Rota em construção" /></DriverLayout>}
            </Stack.Screen>
            <Stack.Screen name="DriverStudents">
              {() => <DriverLayout><PlaceholderScreen title="Gerenciar Alunos em construção" /></DriverLayout>}
            </Stack.Screen>
            <Stack.Screen name="DriverProfile">
              {() => <DriverLayout><PlaceholderScreen title="Meu Cadastro em construção" /></DriverLayout>}
            </Stack.Screen>
            <Stack.Screen name="DriverVehicle" component={DriverVehicleScreen} />
            <Stack.Screen name="DriverHistory">
              {() => <DriverLayout><PlaceholderScreen title="Histórico em construção" /></DriverLayout>}
            </Stack.Screen>
            <Stack.Screen name="DriverHelp">
              {() => <DriverLayout><PlaceholderScreen title="Ajuda em construção" /></DriverLayout>}
            </Stack.Screen>

            {/* RESPONSÁVEL */}
            <Stack.Screen name="GuardianMain" component={GuardianMainScreen} />
            <Stack.Screen name="GuardianTracking">
              {() => <GuardianLayout><PlaceholderScreen title="Rastreamento em construção" /></GuardianLayout>}
            </Stack.Screen>
            <Stack.Screen name="GuardianDependents" component={GuardianDependentsScreen} />
            <Stack.Screen name="GuardianDependentForm" component={GuardianDependentFormScreen} />
            <Stack.Screen name="GuardianPlans">
              {() => <GuardianLayout><PlaceholderScreen title="Planos em construção" /></GuardianLayout>}
            </Stack.Screen>
            <Stack.Screen name="GuardianProfile">
              {() => <GuardianLayout><PlaceholderScreen title="Meu Cadastro em construção" /></GuardianLayout>}
            </Stack.Screen>
            <Stack.Screen name="GuardianHistory">
              {() => <GuardianLayout><PlaceholderScreen title="Histórico em construção" /></GuardianLayout>}
            </Stack.Screen>
            <Stack.Screen name="GuardianHelp">
              {() => <GuardianLayout><PlaceholderScreen title="Ajuda em construção" /></GuardianLayout>}
            </Stack.Screen>

            {/* ESCOLA */}
            <Stack.Screen name="SchoolMain">
              {() => <PlaceholderScreen title="Painel da Escola" />}
            </Stack.Screen>
          </Stack.Navigator>
        </NavigationContainer>
        <StatusBar style="dark" />
      </View>
  );
}