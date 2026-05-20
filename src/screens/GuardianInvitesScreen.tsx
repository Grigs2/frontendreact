import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import { useAppContext } from '../context/AppContext';
import GuardianLayout from '../components/GuardianLayout';
import StatusBadge from '../components/StatusBadge';
import { responsavelService } from '../services/responsavelService';
import { viagemService } from '../services/viagemService';
import { ResponsavelDTO, SolicitacaoDTO } from '../types';

import ConfirmDialog from '../components/ConfirmDialog';

export default function GuardianInvitesScreen() {
  const isFocused = useIsFocused();
  const { currentUser, pendingSolicitations, updateSolicitations, showToast } = useAppContext();
  
  const [activeTab, setActiveTab] = useState<'TRIP' | 'DRIVER'>('TRIP');
  const [loading, setLoading] = useState(false);
  const [loadingPeriods, setLoadingPeriods] = useState(false);
  const [showConfirmUnlink, setShowConfirmUnlink] = useState(false);
  const [selectedSolId, setSelectedSolId] = useState<number | null>(null);
  
  const tripCache = useRef<Record<number, string>>({});

  const guardian = currentUser as ResponsavelDTO;

  const enrichSolicitations = useCallback(async (sols: SolicitacaoDTO[]) => {
    const uniqueViagemIds = Array.from(new Set(sols.map(s => s.viagemId)));
    const neededIds = uniqueViagemIds.filter(id => !tripCache.current[id]);

    if (neededIds.length > 0) {
      setLoadingPeriods(true);
      try {
        await Promise.all(neededIds.map(async (id) => {
          try {
            const trip = await viagemService.visualizar(id);
            if (trip?.periodo) {
              tripCache.current[id] = trip.periodo;
            }
          } catch (e) {
            console.warn(`Failed to fetch period for trip ${id}`, e);
          }
        }));
      } finally {
        setLoadingPeriods(false);
      }
    }

    const enriched = sols.map(s => ({
      ...s,
      periodo: s.periodo || tripCache.current[s.viagemId] || 'N/A'
    }));
    updateSolicitations(enriched);
  }, [updateSolicitations]);

  const loadData = async () => {
    if (!guardian?.id) return;
    setLoading(true);
    try {
      const sols = await responsavelService.listarSolicitacoes(guardian.id);
      await enrichSolicitations(sols);
    } catch (error) {
      console.error('Error loading solicitations:', error);
      showToast('Erro ao carregar solicitações.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isFocused && guardian?.id) {
      loadData();
    }
  }, [isFocused]);

  const handleTripResponse = async (solId: number, accept: boolean) => {
    setLoading(true);
    try {
      await responsavelService.responderSolicitacao(solId, accept);
      showToast(accept ? 'Solicitação aceita!' : 'Solicitação recusada.', 'success');
      loadData();
    } catch (error) {
      showToast('Não foi possível registrar a resposta.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUnlink = async () => {
    if (selectedSolId === null) return;
    setLoading(true);
    try {
      await responsavelService.encerrarVinculo(selectedSolId);
      showToast('Vínculo encerrado com sucesso!', 'success');
      setShowConfirmUnlink(false);
      setSelectedSolId(null);
      loadData();
    } catch (error) {
      showToast('Não foi possível encerrar o vínculo.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const tripInvites = pendingSolicitations.filter(s => !s.respondido);
  const linkedDrivers = pendingSolicitations.filter(s => s.aceito && !s.dataFim);

  const getStatusVariant = (status: string) => {
    const s = status.toUpperCase();
    if (s.includes('ACEITA') || s.includes('ATIVA')) return 'success';
    if (s.includes('PENDENTE')) return 'warning';
    if (s.includes('ENCERRADA') || s.includes('CANCELADA')) return 'error';
    return 'default';
  };

  return (
    <GuardianLayout>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Convites & Associações</Text>
          <Text style={styles.subtitle}>Gerencie profissionais e viagens</Text>
        </View>

        <View style={styles.tabs}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'TRIP' && styles.tabActive]}
            onPress={() => setActiveTab('TRIP')}
          >
            <Text style={[styles.tabText, activeTab === 'TRIP' && styles.tabTextActive]}>Convites</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'DRIVER' && styles.tabActive]}
            onPress={() => setActiveTab('DRIVER')}
          >
            <Text style={[styles.tabText, activeTab === 'DRIVER' && styles.tabTextActive]}>Vínculos Ativos</Text>
          </TouchableOpacity>
        </View>

        {loading && <ActivityIndicator color="#1976D2" style={{ marginBottom: 20 }} />}

        {activeTab === 'TRIP' ? (
          <FlatList
            data={tripInvites}
            keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => {
              const student = guardian.dependentes?.find(d => d.id === item.dependenteId);
              return (
                <View style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={styles.tripIcon}>
                      <Feather name="truck" size={20} color="#1976D2" />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.driverName}>{item.motoristaNome || `Motorista Viagem #${item.viagemId}`}</Text>
                      <View style={styles.periodRow}>
                        <Feather name="clock" size={12} color="#86868B" />
                        {loadingPeriods && !item.periodo ? (
                          <ActivityIndicator size="small" color="#1976D2" style={{ marginLeft: 4 }} />
                        ) : (
                          <Text style={styles.periodText}>{item.periodo?.replace('_', ' ') || 'Carregando...'}</Text>
                        )}
                      </View>
                    </View>
                  </View>
                  <Text style={styles.inviteText}>
                    Solicitou transportar <Text style={styles.bold}>{item.dependenteNome || student?.nome || 'Dependente #' + item.dependenteId}</Text>.
                  </Text>
                  <View style={styles.actions}>
                    <TouchableOpacity 
                      style={[styles.btn, styles.btnDeny]} 
                      onPress={() => handleTripResponse(item.id!, false)}
                      disabled={loading}
                    >
                      <Text style={styles.btnTextDeny}>Recusar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.btn, styles.btnApprove]} 
                      onPress={() => handleTripResponse(item.id!, true)}
                      disabled={loading}
                    >
                      <Text style={styles.btnTextApprove}>Aceitar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            }}
            ListEmptyComponent={!loading ? <Text style={styles.emptyText}>Nenhum convite pendente.</Text> : null}
          />
        ) : (
          <FlatList
            data={linkedDrivers}
            keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => {
              const student = guardian.dependentes?.find(d => d.id === item.dependenteId);
              return (
                <View style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={styles.avatar}><Text style={styles.avatarText}>{item.motoristaNome?.charAt(0) || 'M'}</Text></View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.driverName}>{item.motoristaNome || `Motorista Viagem #${item.viagemId}`}</Text>
                      {item.motoristaTelefone && <Text style={styles.driverPhone}>{item.motoristaTelefone}</Text>}
                    </View>
                    <StatusBadge status={item.status || 'ATIVA'} variant={getStatusVariant(item.status || 'ATIVA')} />
                  </View>
                  
                  <View style={styles.detailsList}>
                    <View style={styles.detailRow}>
                      <Feather name="user" size={14} color="#86868B" />
                      <Text style={styles.detailText}>Aluno: <Text style={styles.bold}>{item.dependenteNome || student?.nome || 'Dependente #' + item.dependenteId}</Text></Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Feather name="book-open" size={14} color="#86868B" />
                      <Text style={styles.detailText}>Escola: <Text style={styles.bold}>{item.escolaNome || student?.escola?.nome || 'Não informada'}</Text></Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Feather name="clock" size={14} color="#86868B" />
                      <Text style={styles.detailText}>Período: <Text style={styles.bold}>{item.periodo?.replace('_', ' ') || 'Não informado'}</Text></Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Feather name="calendar" size={14} color="#86868B" />
                      <Text style={styles.detailText}>Início: <Text style={styles.bold}>{new Date(item.dataInicio).toLocaleDateString()}</Text></Text>
                    </View>
                  </View>

                  <TouchableOpacity 
                    style={styles.btnUnlink} 
                    onPress={() => {
                      setSelectedSolId(item.id!);
                      setShowConfirmUnlink(true);
                    }}
                    disabled={loading}
                  >
                    <Feather name="user-x" size={16} color="#FF3B30" />
                    <Text style={styles.btnUnlinkText}>Encerrar Vínculo</Text>
                  </TouchableOpacity>
                </View>
              );
            }}
            ListEmptyComponent={!loading ? <Text style={styles.emptyText}>Você não possui vínculos ativos.</Text> : null}
          />
        )}

        <ConfirmDialog
          visible={showConfirmUnlink}
          title="Encerrar Vínculo"
          message="Tem certeza que deseja encerrar o transporte com este motorista? Esta ação é irreversível."
          confirmLabel="Encerrar Vínculo"
          cancelLabel="Cancelar"
          onConfirm={handleUnlink}
          onCancel={() => {
            setShowConfirmUnlink(false);
            setSelectedSolId(null);
          }}
          destructive={true}
          loading={loading}
        />
      </View>
    </GuardianLayout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  header: { marginBottom: 24, marginTop: 10 },
  title: { fontSize: 24, fontFamily: 'Inter_700Bold', color: '#1D1D1F' },
  subtitle: { fontSize: 14, color: '#86868B', marginTop: 4 },
  tabs: { flexDirection: 'row', backgroundColor: '#F2F2F7', borderRadius: 12, padding: 4, marginBottom: 24 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  tabActive: { backgroundColor: '#FFF', elevation: 2 },
  tabText: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#86868B' },
  tabTextActive: { color: '#1976D2' },
  list: { paddingBottom: 20 },
  card: { backgroundColor: '#FFF', borderRadius: 20, padding: 20, marginBottom: 16, elevation: 3, borderWidth: 1, borderColor: '#F2F2F7' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  tripIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#E3F2FD', alignItems: 'center', justifyContent: 'center' },
  driverName: { fontSize: 16, fontFamily: 'Inter_700Bold', color: '#1D1D1F' },
  periodRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4 },
  periodText: { fontSize: 12, color: '#86868B', fontFamily: 'Inter_600SemiBold' },
  driverPhone: { fontSize: 12, color: '#86868B', marginTop: 2 },
  inviteText: { fontSize: 14, color: '#3A3A3C', lineHeight: 20, marginBottom: 20 },
  detailsList: { gap: 8, marginBottom: 20, backgroundColor: '#F9F9FB', padding: 12, borderRadius: 12 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailText: { fontSize: 13, color: '#48484A' },
  bold: { fontFamily: 'Inter_700Bold' },
  actions: { flexDirection: 'row', gap: 12 },
  btn: { flex: 1, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  btnApprove: { backgroundColor: '#34C759' },
  btnDeny: { borderWidth: 1, borderColor: '#FF3B30' },
  btnTextApprove: { color: '#FFF', fontFamily: 'Inter_700Bold', fontSize: 13 },
  btnTextDeny: { color: '#FF3B30', fontFamily: 'Inter_700Bold', fontSize: 13 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#E3F2FD', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#1976D2', fontFamily: 'Inter_700Bold', fontSize: 18 },
  btnUnlink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#F2F2F7', marginTop: 4 },
  btnUnlinkText: { color: '#FF3B30', fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  emptyText: { textAlign: 'center', marginTop: 40, color: '#86868B' }
});
