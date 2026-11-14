import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { useFonts, Inter_400Regular, Inter_700Bold } from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import { View, Platform } from 'react-native';

import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import DriverMainScreen from './src/screens/DriverMainScreen';
import DriverVehicleScreen from './src/screens/DriverVehicleScreen';
import DriverInvitesScreen from './src/screens/DriverInvitesScreen';
import DriverAttendanceDetailScreen from './src/screens/DriverAttendanceDetailScreen';
import DriverStudentsScreen from './src/screens/DriverStudentsScreen';
import DriverSearchStudentsScreen from './src/screens/DriverSearchStudentsScreen';
import GuardianInvitesScreen from './src/screens/GuardianInvitesScreen';
import GuardianMainScreen from './src/screens/GuardianMainScreen';
import GuardianDependentsScreen from './src/screens/GuardianDependentsScreen';
import GuardianDependentFormScreen from './src/screens/GuardianDependentFormScreen';
import GuardianSearchDriverScreen from './src/screens/GuardianSearchDriverScreen';
import GuardianMonitoringScreen from './src/screens/GuardianMonitoringScreen';
import NotificationListScreen from './src/screens/NotificationListScreen';
import NotificationCreateScreen from './src/screens/NotificationCreateScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import { UserRole } from './src/types';
import { RootStackParamList, navigationRef } from './src/navigation';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import ForgotPasswordCodeScreen from './src/screens/ForgotPasswordCodeScreen';
import ResetPasswordScreen from './src/screens/ResetPasswordScreen';
import SessionExpiryHandler from './src/components/SessionExpiryHandler';
import TermsReacceptGate from './src/components/TermsReacceptGate';
import PushNotificationsHandler from './src/components/PushNotificationsHandler';
import { colors } from './src/theme';

SplashScreen.preventAutoHideAsync();

import SchoolMainScreen from './src/screens/SchoolMainScreen';

import DriverAttendanceScreen from './src/screens/DriverAttendanceScreen';
import DriverTripsScreen from './src/screens/DriverTripsScreen';
import DriverTripDetailsScreen from './src/screens/DriverTripDetailsScreen';
import DriverAvailableDependentsScreen from './src/screens/DriverAvailableDependentsScreen';
import DriverHistoryScreen from './src/screens/DriverHistoryScreen';
import GuardianPlansScreen from './src/screens/GuardianPlansScreen';
// Implementação 1111
import DriverDocumentsScreen from './src/screens/DriverDocumentsScreen';
import DriverSchoolsScreen from './src/screens/DriverSchoolsScreen';
import SchoolLinkDetailScreen from './src/screens/SchoolLinkDetailScreen';
import DriverTripDayScreen from './src/screens/DriverTripDayScreen';
import DriverRouteOrderScreen from './src/screens/DriverRouteOrderScreen';
import DriverFocusScreen from './src/screens/DriverFocusScreen';
import DriverMapScreen from './src/screens/DriverMapScreen';
import GuardianDependentDetailScreen from './src/screens/GuardianDependentDetailScreen';
import GuardianDependentAddressesScreen from './src/screens/GuardianDependentAddressesScreen';
import GuardianDependentGuardiansScreen from './src/screens/GuardianDependentGuardiansScreen';
import SchoolDriversScreen from './src/screens/SchoolDriversScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import AdminMainScreen from './src/screens/AdminMainScreen';
import AdminDocumentsScreen from './src/screens/AdminDocumentsScreen';
import AdminUsersScreen from './src/screens/AdminUsersScreen';
import AdminSchoolsScreen from './src/screens/AdminSchoolsScreen';
import AdminLinksScreen from './src/screens/AdminLinksScreen';
import AdminAuditScreen from './src/screens/AdminAuditScreen';
import { ConnectivityProvider } from './src/context/ConnectivityContext';

const Stack = createNativeStackNavigator<RootStackParamList>();

import { AppProvider } from './src/context/AppContext';
import Toast from './src/components/Toast';

export default function App() {
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [isClient, setIsClient] = useState(false);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
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
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }

  return (
      <AppProvider>
        <ConnectivityProvider>
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          <NavigationContainer ref={navigationRef}>
            <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
              <Stack.Screen name="Login">
                {(props) => <LoginScreen {...props} onLogin={(role: UserRole) => setUserRole(role)} />}
              </Stack.Screen>
              <Stack.Screen name="Register" component={RegisterScreen} />
              <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
              <Stack.Screen name="ForgotPasswordCode" component={ForgotPasswordCodeScreen} />
              <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
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
              <Stack.Screen name="DriverHelp" component={SettingsScreen as any} />
              <Stack.Screen name="DriverDocuments" component={DriverDocumentsScreen} />
              <Stack.Screen name="DriverSchools" component={DriverSchoolsScreen} />
              <Stack.Screen name="DriverSchoolLinkDetail" component={SchoolLinkDetailScreen} />
              <Stack.Screen name="DriverTripDay" component={DriverTripDayScreen} />
              <Stack.Screen name="DriverRouteOrder" component={DriverRouteOrderScreen} />
              <Stack.Screen name="DriverFocus" component={DriverFocusScreen} />
              <Stack.Screen name="DriverMap" component={DriverMapScreen} />
              <Stack.Screen name="GuardianMain" component={GuardianMainScreen} />
              <Stack.Screen name="GuardianTracking" component={GuardianMonitoringScreen} />
              <Stack.Screen name="GuardianInvites" component={GuardianInvitesScreen} />
              <Stack.Screen name="GuardianSearchDriver" component={GuardianSearchDriverScreen} />
              <Stack.Screen name="GuardianMonitoring" component={GuardianMonitoringScreen} />
              <Stack.Screen name="NotificationList" component={NotificationListScreen} />
              <Stack.Screen name="NotificationCreate" component={NotificationCreateScreen} />
              <Stack.Screen name="GuardianDependents" component={GuardianDependentsScreen} />
              <Stack.Screen name="GuardianDependentForm" component={GuardianDependentFormScreen} />
              <Stack.Screen name="GuardianPlans" component={GuardianPlansScreen} />
              <Stack.Screen name="GuardianProfile" component={ProfileScreen} />
              <Stack.Screen name="GuardianHistory" component={HistoryScreen} />
              <Stack.Screen name="GuardianHelp" component={SettingsScreen as any} />
              <Stack.Screen name="GuardianDependentDetail" component={GuardianDependentDetailScreen} />
              <Stack.Screen name="GuardianDependentAddresses" component={GuardianDependentAddressesScreen} />
              <Stack.Screen name="GuardianDependentGuardians" component={GuardianDependentGuardiansScreen} />
              <Stack.Screen name="SchoolMain" component={SchoolMainScreen} />
              <Stack.Screen name="SchoolProfile" component={ProfileScreen} />
              <Stack.Screen name="SchoolDrivers" component={SchoolDriversScreen} />
              <Stack.Screen name="SchoolDriverLinkDetail" component={SchoolLinkDetailScreen} />
              <Stack.Screen name="Settings" component={SettingsScreen} />
              <Stack.Screen name="AdminMain" component={AdminMainScreen} />
              <Stack.Screen name="AdminDocuments" component={AdminDocumentsScreen} />
              <Stack.Screen name="AdminUsers" component={AdminUsersScreen} />
              <Stack.Screen name="AdminSchools" component={AdminSchoolsScreen} />
              <Stack.Screen name="AdminLinks" component={AdminLinksScreen} />
              <Stack.Screen name="AdminAudit" component={AdminAuditScreen} />
            </Stack.Navigator>
          </NavigationContainer>
          <SessionExpiryHandler />
          <TermsReacceptGate />
          <PushNotificationsHandler />
          <Toast />
          <StatusBar style="dark" />
        </View>
        </ConnectivityProvider>
      </AppProvider>
  );
}