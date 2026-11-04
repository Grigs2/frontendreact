import { createNavigationContainerRef } from '@react-navigation/native';
import { DependenteParadaDTO } from '../types';

export type RegisterRole = 'driver' | 'guardian' | 'school';

export type RootStackParamList = {
  Login: undefined;
  Register: { role?: RegisterRole } | undefined;
  ForgotPassword: { email?: string } | undefined;
  ForgotPasswordCode: { email: string };
  ResetPassword: { token: string };
  DriverMain: undefined;
  DriverAttendance: { viagemDiaId: number };
  DriverAttendanceDetail: { tripId: number; stopId: number; stopDescription: string; students: DependenteParadaDTO[] };
  DriverTrips: undefined;
  DriverTripDetails: { viagemId: number };
  DriverAvailableDependents: { viagemId: number };
  DriverStudents: undefined;
  DriverProfile: undefined;
  DriverVehicle: undefined;
  DriverHistory: undefined;
  DriverHelp: undefined;
  DriverInvites: undefined;
  DriverSearchStudents: undefined;
  GuardianMain: undefined;
  GuardianTracking: undefined;
  GuardianInvites: undefined;
  GuardianDependents: undefined;
  GuardianDependentForm: { dependentId?: number } | undefined;
  GuardianPlans: undefined;
  GuardianProfile: undefined;
  GuardianHistory: undefined;
  GuardianHelp: undefined;
  GuardianSearchDriver: undefined;
  GuardianMonitoring: { dependenteId: number };
  NotificationList: undefined;
  NotificationCreate: undefined;
  SchoolMain: undefined;
  SchoolProfile: undefined;
};

/** Referência global usada fora de telas (ex.: sessão expirada → volta para o Login). */
export const navigationRef = createNavigationContainerRef<RootStackParamList>();

/** Tela inicial de cada perfil após o login. */
export const HOME_BY_ROLE = {
  MOTORISTA: 'DriverMain',
  RESPONSAVEL: 'GuardianMain',
  ESCOLA: 'SchoolMain',
} as const;
