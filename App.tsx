import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import { View, Platform } from 'react-native';

import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import DriverMainScreen from './src/screens/DriverMainScreen';
import PlaceholderScreen from './src/screens/PlaceholderScreen';
import DriverVehicleScreen from './src/screens/DriverVehicleScreen';
import DriverInvitesScreen from './src/screens/DriverInvitesScreen';
import DriverRouteViewScreen from './src/screens/DriverRouteViewScreen';
import DriverAttendanceDetailScreen from './src/screens/DriverAttendanceDetailScreen';
import DriverStudentsScreen from './src/screens/DriverStudentsScreen';
import DriverSearchStudentsScreen from './src/screens/DriverSearchStudentsScreen';
import GuardianInvitesScreen from './src/screens/GuardianInvitesScreen';
import DriverLayout from './src/components/DriverLayout';
import GuardianMainScreen from './src/screens/GuardianMainScreen';
import GuardianDependentsScreen from './src/screens/GuardianDependentsScreen';
import GuardianDependentFormScreen from './src/screens/GuardianDependentFormScreen';
import GuardianSearchDriverScreen from './src/screens/GuardianSearchDriverScreen';
import GuardianMonitoringScreen from './src/screens/GuardianMonitoringScreen';
import NoticeBoardScreen from './src/screens/NoticeBoardScreen';
import GuardianLayout from './src/components/GuardianLayout';
import ProfileScreen from './src/screens/ProfileScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import { UserRole } from './src/types';
import { RootStackParamList } from './src/navigation';

SplashScreen.preventAutoHideAsync();

import SchoolMainScreen from './src/screens/SchoolMainScreen';

import DriverAttendanceScreen from './src/screens/DriverAttendanceScreen';
import DriverTripsScreen from './src/screens/DriverTripsScreen';
import DriverTripDetailsScreen from './src/screens/DriverTripDetailsScreen';
import DriverAvailableDependentsScreen from './src/screens/DriverAvailableDependentsScreen';
import DriverHistoryScreen from './src/screens/DriverHistoryScreen';
import GuardianPlansScreen from './src/screens/GuardianPlansScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

import { AppProvider } from './src/context/AppContext';
import Toast from './src/components/Toast';

export default function App() {
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [isClient, setIsClient] = useState(false);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsClient(true);
    }, 50);

    if (fontsLoaded) {
      SplashScreen.hideAsync().catch(() => {});
    }
    return () => clearTimeout(timer);
  }, [fontsLoaded]);

  if (!fontsLoaded || !isClient) {
    return <View style={{ flex: 1, backgroundColor: '#FAFAFA' }} />;
  }

  return (
      <AppProvider>
        <View style={{ flex: 1, backgroundColor: '#FAFAFA' }}>
          <NavigationContainer>
            <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
              <Stack.Screen name="Login">
                {(props) => <LoginScreen {...props} onLogin={(role: UserRole) => setUserRole(role)} />}
              </Stack.Screen>
              <Stack.Screen name="Register" component={RegisterScreen} />
              <Stack.Screen name="DriverMain" component={DriverMainScreen} />
              <Stack.Screen name="DriverAttendance" component={DriverAttendanceScreen} />
              <Stack.Screen name="DriverTrips" component={DriverTripsScreen} />
              <Stack.Screen name="DriverTripDetails" component={DriverTripDetailsScreen} />
              <Stack.Screen name="DriverAvailableDependents" component={DriverAvailableDependentsScreen} />
              <Stack.Screen name="DriverAttendanceDetail" component={DriverAttendanceDetailScreen} />
              <Stack.Screen name="DriverStudents" component={DriverStudentsScreen} />
              <Stack.Screen name="DriverInvites" component={DriverInvitesScreen} />
              <Stack.Screen name="DriverSearchStudents" component={DriverSearchStudentsScreen} />
              <Stack.Screen name="DriverProfile" component={ProfileScreen} />
              <Stack.Screen name="DriverVehicle" component={DriverVehicleScreen} />
              <Stack.Screen name="DriverHistory" component={DriverHistoryScreen} />
              <Stack.Screen name="DriverHelp">
                {() => <DriverLayout><PlaceholderScreen /></DriverLayout>}
              </Stack.Screen>
              <Stack.Screen name="GuardianMain" component={GuardianMainScreen} />
              <Stack.Screen name="GuardianTracking" component={GuardianMonitoringScreen} />
              <Stack.Screen name="GuardianInvites" component={GuardianInvitesScreen} />
              <Stack.Screen name="GuardianSearchDriver" component={GuardianSearchDriverScreen} />
              <Stack.Screen name="GuardianMonitoring" component={GuardianMonitoringScreen} />
              <Stack.Screen name="NoticeBoard" component={NoticeBoardScreen} />
              <Stack.Screen name="GuardianDependents" component={GuardianDependentsScreen} />
              <Stack.Screen name="GuardianDependentForm" component={GuardianDependentFormScreen} />
              <Stack.Screen name="GuardianPlans" component={GuardianPlansScreen} />
              <Stack.Screen name="GuardianProfile" component={ProfileScreen} />
              <Stack.Screen name="GuardianHistory" component={HistoryScreen} />
              <Stack.Screen name="GuardianHelp">
                {() => <GuardianLayout><PlaceholderScreen /></GuardianLayout>}
              </Stack.Screen>
              <Stack.Screen name="SchoolMain" component={SchoolMainScreen} />
            </Stack.Navigator>
          </NavigationContainer>
          <Toast />
          <StatusBar style="dark" />
        </View>
      </AppProvider>
  );
}