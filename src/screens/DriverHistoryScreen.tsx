import React, { useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAppContext } from '../context/AppContext';
import { periodoLabel, viagemService } from '../services/viagemService';
import { DependenteParadaDTO, ViagemDiaResumoDTO } from '../types';
import DriverLayout from '../components/DriverLayout';
import StatusBadge from '../components/StatusBadge';
import { ScreenHeader, SegmentedControl, StateView } from '../components/ui';
import { borders, colors, layout, radius, spacing, typography } from '../theme';

type Faixa = '30' | '90' | '365';

const FAIXAS: { value: Faixa; label: string }[] = [
  { value: '30', label: '30 dias' },
  { value: '90', label: '3 meses' },
  { value: '365', label: '1 ano' },
];

const isoDia = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const hora = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--';

/** "yyyy-MM-dd" sem converter fuso (evita mostrar o dia anterior). */
export const dataCurta = (data: string) => {
  const [a, m, d] = data.split('-').map(Number);
  return new Date(a, m - 1, d).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' });
};

const STATUS_VARIANT: Record<string, 'success' | 'error' | 'info' | 'warning' | 'default'> = {
  FINALIZADA: 'success',
  CANCELADA: 'error',
  EM_ANDAMENTO: 'info',
  PLANEJADA: 'warning',
};

export default function DriverHistoryScreen() {
  const { currentUser, showToast } = useAppContext();
  const [faixa, setFaixa] = useState<Faixa>('30');
  const [trips, setTrips] = useState<ViagemDiaResumoDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(false);
  const [aberta, setAberta] = useState<number | null>(null);
  const [passageiros, setPassageiros] = useState<Record<number, DependenteParadaDTO[] | 'carregando'>>({});
  const cache = useRef<Record<number, DependenteParadaDTO[]>>({});

  const loadHistory = useCallback(async () => {
    if (!currentUser?.id) return;
    setLoading(true);
    try {
      const ate = new Date();
      const de = new Date();
      de.setDate(de.getDate() - Number(faixa));
      setTrips(await viagemService.historico(currentUser.id, isoDia(de), isoDia(ate)));
      setErro(false);
    } catch (error) {
      console.error('Error loading history:', error);
      setErro(true);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id, faixa]);

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [loadHistory]),
  );

  /** Abre o detalhe da viagem e carrega a lista de alunos uma vez. */
  const alternar = async (id: number) => {
    if (aberta === id) {
      setAberta(null);
      return;
    }
    setAberta(id);
    if (cache.current[id]) return;
    setPassageiros((p) => ({ ...p, [id]: 'carregando' }));
    try {
      const paradas = await viagemService.buscarParadasViagemDia(id);
      const mapa = new Map<number, DependenteParadaDTO>();
      paradas.forEach((parada) => parada.listaDependentes.forEach((dep) => mapa.set(dep.id, dep)));
      cache.current[id] = Array.from(mapa.values());
      setPassageiros((p) => ({ ...p, [id]: cache.current[id] }));
    } catch {
      setPassageiros((p) => ({ ...p, [id]: [] }));
      showToast('Não foi possível carregar a lista de alunos.', 'error');
    }
  };

  const renderItem = ({ item }: { item: ViagemDiaResumoDTO }) => {
    const expandida = aberta === item.id;
    const lista = passageiros[item.id];
    const nome = item.viagemNome || `Viagem ${periodoLabel(item.periodo)}`;
    return (
      <View style={styles.card}>
        <Pressable
          onPress={() => alternar(item.id)}
          accessibilityRole="button"
          accessibilityState={{ expanded: expandida }}
          accessibilityLabel={`${nome}, ${dataCurta(item.data)}, ${item.status}. ${item.embarcados} de ${item.totalAlunos} embarcaram, ${item.faltas} faltas`}
          style={styles.cardHeader}
        >
          <View style={styles.iconContainer}>
            <Feather name="calendar" size={22} color={colors.ink} />
          </View>
          <View style={{ flex: 1, gap: spacing.xs }}>
            <View style={styles.row}>
              <Text style={styles.date}>{dataCurta(item.data)}</Text>
              <StatusBadge status={item.status} variant={STATUS_VARIANT[item.status] ?? 'default'} />
            </View>
            <Text style={styles.nome} numberOfLines={2}>
              {nome}
            </Text>
            <View style={styles.details}>
              {item.periodo ? <Text style={styles.detailText}>{periodoLabel(item.periodo)}</Text> : null}
              {item.inicio || item.fim ? (
                <Text style={styles.detailText}>
                  {hora(item.inicio)} – {hora(item.fim)}
                </Text>
              ) : null}
            </View>
          </View>
          <Feather name={expandida ? 'chevron-up' : 'chevron-down'} size={20} color={colors.slate500} />
        </Pressable>

        <View style={styles.contagens}>
          <Contagem icone="log-in" valor={item.embarcados} total={item.totalAlunos} rotulo="embarcaram" />
          <Contagem icone="log-out" valor={item.desembarcados} total={item.totalAlunos} rotulo="entregues" />
          <Contagem icone="user-x" valor={item.faltas} rotulo={item.faltas === 1 ? 'falta' : 'faltas'} alerta={item.faltas > 0} />
        </View>

        {item.motivo ? (
          <View style={styles.motivo}>
            <Feather name="info" size={14} color={colors.danger} />
            <Text style={styles.motivoText}>Motivo: {item.motivo}</Text>
          </View>
        ) : null}

        {expandida && (
          <View style={styles.passengerSection}>
            <Text style={styles.passengerTitle}>Alunos</Text>
            {lista === 'carregando' || lista === undefined ? (
              <ActivityIndicator color={colors.ink} />
            ) : lista.length === 0 ? (
              <Text style={styles.detailText}>Nenhum aluno registrado nesta viagem.</Text>
            ) : (
              lista.map((p) => (
                <View key={p.id} style={styles.passengerRow}>
                  <Text style={styles.passengerName}>{p.nomeDependente}</Text>
                  <StatusBadge
                    status={p.statusEmbarque}
                    size="small"
                    variant={
                      p.statusEmbarque === 'EMBARCADO' || p.statusEmbarque === 'DESEMBARCADO'
                        ? 'success'
                        : p.statusEmbarque === 'FALTOU'
                          ? 'error'
                          : 'default'
                    }
                  />
                </View>
              ))
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <DriverLayout>
      <View style={styles.container}>
        <ScreenHeader title="Histórico de viagens" />
        <SegmentedControl<Faixa> options={FAIXAS} value={faixa} onChange={setFaixa} style={styles.segment} />

        {loading && trips.length === 0 ? (
          <StateView kind="loading" title="Carregando histórico..." style={styles.center} />
        ) : erro ? (
          <StateView
            kind="error"
            title="Não foi possível carregar o histórico"
            actionLabel="Tentar de novo"
            onAction={loadHistory}
            style={styles.center}
          />
        ) : (
          <FlatList
            data={trips}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <StateView kind="empty" icon="clock" title="Nenhuma viagem nesse período." message="As viagens realizadas aparecem aqui." />
            }
            refreshing={loading}
            onRefresh={loadHistory}
          />
        )}
      </View>
    </DriverLayout>
  );
}

function Contagem({ icone, valor, total, rotulo, alerta }: {
  icone: React.ComponentProps<typeof Feather>['name'];
  valor: number;
  total?: number;
  rotulo: string;
  alerta?: boolean;
}) {
  return (
    <View style={styles.contagem}>
      <Feather name={icone} size={14} color={alerta ? colors.danger : colors.slate700} />
      <Text style={[styles.contagemText, alerta && { color: colors.danger }]}>
        {total !== undefined ? `${valor}/${total}` : valor} {rotulo}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: layout.screenMargin, backgroundColor: colors.background, width: '100%', maxWidth: 800, alignSelf: 'center' },
  center: { flex: 1 },
  segment: { marginBottom: spacing.md },
  list: { paddingBottom: spacing.xl },
  card: {
    backgroundColor: colors.surface,
    padding: layout.cardPadding,
    borderRadius: radius.card,
    marginBottom: spacing.md,
    borderWidth: borders.hairline,
    borderColor: colors.border,
    gap: spacing.md,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  iconContainer: {
    width: layout.iconSlot,
    height: layout.iconSlot,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm },
  date: { ...typography.label, color: colors.ink },
  nome: { ...typography.body, color: colors.ink },
  details: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  detailText: { ...typography.caption, color: colors.slate500 },
  contagens: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  contagem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  contagemText: { ...typography.caption, color: colors.slate700 },
  motivo: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  motivoText: { ...typography.caption, color: colors.danger, flex: 1 },
  passengerSection: { borderTopWidth: borders.hairline, borderTopColor: colors.border, paddingTop: spacing.md, gap: spacing.sm },
  passengerTitle: { ...typography.captionBold, color: colors.slate700 },
  passengerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  passengerName: { ...typography.body, color: colors.ink, flexShrink: 1 },
});
