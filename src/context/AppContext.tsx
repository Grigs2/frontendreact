import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { 
  MotoristaDTO, 
  ResponsavelDTO, 
  EscolaDTO, 
  ViagemDTO, 
  SolicitacaoDTO, 
  NotificacaoDTO,
  ViagemDiaDTO,
  ParadaViagemDTO
} from '../types';
import { notificacaoService } from '../services/notificacaoService';
import type { AppRole, AppUser } from '../services/authService';

export interface ToastConfig {
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  visible: boolean;
}

interface AppContextType {
  // Global State (Synced with API)
  currentUser: AppUser | null;
  userRole: AppRole | null;
  
  // Specific Data for active role
  activeTrips: ViagemDTO[];
  myDependents: any[]; // Depends on ResponsavelDTO.dependentes
  pendingSolicitations: SolicitacaoDTO[];
  notifications: NotificacaoDTO[];
  /** Contador do sino (GET /Notificacao/NaoLidas/Contagem). */
  unreadCount: number;
  
  // Active Session Data (Trip in progress)
  activeViagemDia: ViagemDiaDTO | null;
  currentStops: ParadaViagemDTO[];

  // Toast
  toast: ToastConfig;

  // Actions (State setters)
  setCurrentUser: (user: AppUser | null, role: AppRole | null) => void;
  setActiveViagemDia: (viagemDia: ViagemDiaDTO | null) => void;
  setCurrentStops: (stops: ParadaViagemDTO[]) => void;
  updateNotifications: (notifs: NotificacaoDTO[]) => void;
  refreshUnreadCount: () => Promise<void>;
  setUnreadCount: (n: number) => void;
  updateSolicitations: (sols: SolicitacaoDTO[]) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  hideToast: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUserInternal] = useState<AppUser | null>(null);
  const [userRole, setUserRole] = useState<AppRole | null>(null);
  
  const [activeTrips, setActiveTrips] = useState<ViagemDTO[]>([]);
  const [pendingSolicitations, setPendingSolicitations] = useState<SolicitacaoDTO[]>([]);
  const [notifications, setNotifications] = useState<NotificacaoDTO[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  
  const [activeViagemDia, setActiveViagemDia] = useState<ViagemDiaDTO | null>(null);
  const [currentStops, setCurrentStops] = useState<ParadaViagemDTO[]>([]);

  const [toast, setToast] = useState<ToastConfig>({ message: '', type: 'info', visible: false });

  const setCurrentUser = useCallback((user: AppUser | null, role: AppRole | null) => {
    setCurrentUserInternal(user);
    setUserRole(role);
    if (!user) setUnreadCount(0);
  }, []);

  const updateNotifications = useCallback((notifs: NotificacaoDTO[]) => setNotifications(notifs), []);
  const refreshUnreadCount = useCallback(async () => {
    try {
      setUnreadCount(await notificacaoService.contarNaoLidas());
    } catch {
      // Sem contador (rede ou backend antigo): o sino continua funcionando sem o número.
    }
  }, []);
  const updateSolicitations = useCallback((sols: SolicitacaoDTO[]) => setPendingSolicitations(sols), []);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') => {
    setToast({ message, type, visible: true });
  }, []);

  const hideToast = useCallback(() => setToast(prev => ({ ...prev, visible: false })), []);

  const contextValue = React.useMemo(() => ({
    currentUser, userRole,
    activeTrips, myDependents: (currentUser as ResponsavelDTO)?.dependentes || [],
    pendingSolicitations, notifications, unreadCount,
    activeViagemDia, currentStops,
    toast,
    setCurrentUser, setActiveViagemDia, setCurrentStops, updateNotifications, updateSolicitations,
    refreshUnreadCount, setUnreadCount,
    showToast, hideToast
  }), [
    currentUser, userRole, activeTrips, pendingSolicitations, notifications, unreadCount, refreshUnreadCount,
    activeViagemDia, currentStops, toast, 
    setCurrentUser, updateNotifications, updateSolicitations, showToast, hideToast
  ]);

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within an AppProvider');
  return context;
};
