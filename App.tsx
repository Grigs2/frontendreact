import React, { useState, useCallback } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import { View } from 'react-native';

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
import { UserRole } from './src/types';
import { RootStackParamList } from './src/navigation';

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

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Login"
          screenOptions={{ headerShown: false }}
        >
          <Stack.Screen name="Login">
            {(props) => <LoginScreen {...props} onLogin={setUserRole} />}
          </Stack.Screen>
          <Stack.Screen name="Register" component={RegisterScreen} />
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
          <Stack.Screen name="SchoolMain">
            {() => <PlaceholderScreen title="Painel da Escola" />}
          </Stack.Screen>
        </Stack.Navigator>
      </NavigationContainer>
      <StatusBar style="dark" />
    </View>
  );
}
