import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import AdminLayout from '../components/AdminLayout';
import ChoiceChips from '../components/ChoiceChips';
import ConfirmDialog from '../components/ConfirmDialog';
import Pager from '../components/Pager';
import { Button, Card, Chip, ScreenHeader, SegmentedControl, StateView, TextField } from '../components/ui';
import { RootStackParamList } from '../navigation';
import { useAppContext } from '../context/AppContext';
import { adminService } from '../services/adminService';
import { categoriaLabel } from '../services/redeResponsaveisService';
import {
  AdminVinculoMotoristaEscolaDTO,
  AdminVinculoResponsavelDTO,
  DependenteResponsavelCriadorPendenteDTO,
  Page,
  StatusVinculoEscola,
} from '../types';
import { statusInfo } from '../utils/statusLabels';
import { formatDate } from '../utils/format';
import { onlyDigits } from '../utils/masks';
import { getApiErrorMessage } from '../utils/apiError';
import { colors, layout, maxFontSizeMultiplier, spacing, typography } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'AdminLinks'>;
type Aba = 'escola' | 'responsavel' | 'criador';

const num = (v: string) => (v ? Number(onlyDigits(v)) : undefined);

/** 10.3.5, 10.4.1 e atribuição do responsável criador — vínculos com IDs, estado e datas (sem contatos). */
export default function AdminLinksScreen({ navigation }: Props) {
  const { showToast } = useAppContext();
  const [aba, setAba] = useState<Aba>('escola');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Motorista–escola
  const [escolaId, setEscolaId] = useState('');
  const [motoristaId, setMotoristaId] = useState('');
  const [status, setStatus] = useState<StatusVinculoEscola | 'TODOS'>('TODOS');
  const [pageEscola, setPageEscola] = useState<Page<AdminVinculoMotoristaEscolaDTO> | null>(null);

  // Responsável–dependente
  const [dependenteId, setDependenteId] = useState('');
  const [responsavelId, setResponsavelId] = useState('');
  const [pageResp, setPageResp] = useState<Page<AdminVinculoResponsavelDTO> | null>(null);

  // Criador pendente
  const [pendentes, setPendentes] = useState<DependenteResponsavelCriadorPendenteDTO[] | null>(null);
  const [atribuir, setAtribuir] = useState<{ dependente: DependenteResponsavelCriadorPendenteDTO; responsavelId: number; nome: string } | null>(null);
  const [salvando, setSalvando] = useState(false);

  const buscar = useCallback(
    async (pagina = 0) => {
      setLoading(true);
      setErro(null);
      try {
        if (aba === 'escola') {
          setPageEscola(
            await adminService.vinculosMotoristaEscola({
              escolaId: num(escolaId),
              motoristaId: num(motoristaId),
              status: status === 'TODOS' ? undefined : status,
              pagina,
            }),
          );
        } else if (aba === 'responsavel') {
          setPageResp(await adminService.vinculosResponsavel({ dependenteId: num(dependenteId), responsavelId: num(responsavelId), pagina }));
        } else {
          setPendentes(await adminService.criadorPendentes());
        }
      } catch (e) {
        setErro(getApiErrorMessage(e, 'Não foi possível pesquisar.'));
      } finally {
        setLoading(false);
      }
    },
    [aba, escolaId, motoristaId, status, dependenteId, responsavelId],
  );

  useEffect(() => {
    buscar(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aba, status]);

  const confirmarAtribuicao = async () => {
    if (!atribuir) return;
    setSalvando(true);
    try {
      await adminService.atribuirCriador(atribuir.dependente.dependenteId, atribuir.responsavelId);
      showToast('Responsável criador atribuído.', 'success');
      setAtribuir(null);
      buscar(0);
    } catch (e) {
      showToast(getApiErrorMessage(e, 'Não foi possível atribuir.'), 'error');
    } finally {
      setSalvando(false);
    }
  };

  const estado = loading ? (
    <StateView kind="loading" />
  ) : erro ? (
    <StateView kind="error" message={erro} actionLabel="Tentar novamente" onAction={() => buscar(0)} />
  ) : null;

  return (
    <AdminLayout>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <ScreenHeader title="Vínculos" subtitle="Somente identificadores, estado e datas" />
        <SegmentedControl
          options={[
            { value: 'escola', label: 'Motorista–escola' },
            { value: 'responsavel', label: 'Responsável–aluno' },
            { value: 'criador', label: 'Criador pendente' },
          ]}
          value={aba}
          onChange={setAba}
        />

        {aba === 'escola' && (
          <>
            <Card style={styles.filters}>
              <View style={styles.row}>
                <TextField label="ID da escola" value={escolaId} onChangeText={(t) => setEscolaId(onlyDigits(t))} keyboardType="number-pad" containerStyle={styles.rowItem} />
                <TextField label="ID do motorista" value={motoristaId} onChangeText={(t) => setMotoristaId(onlyDigits(t))} keyboardType="number-pad" containerStyle={styles.rowItem} />
              </View>
              <ChoiceChips
                options={[
                  { value: 'TODOS', label: 'Todos' },
                  { value: 'PENDENTE_ESCOLA', label: 'Aguardando escola' },
                  { value: 'PENDENTE_MOTORISTA', label: 'Aguardando motorista' },
                  { value: 'ATIVO', label: 'Ativos' },
                  { value: 'SUSPENSO', label: 'Suspensos' },
                  { value: 'ENCERRADO', label: 'Encerrados' },
                  { value: 'RECUSADO', label: 'Recusados' },
                ]}
                value={status}
                onChange={setStatus}
                accessibilityLabel="Situação do vínculo"
              />
              <Button label="Pesquisar" icon="search" onPress={() => buscar(0)} loading={loading} fullWidth />
            </Card>
            {pageEscola && <Pager page={pageEscola.number} totalPages={pageEscola.totalPages} totalElements={pageEscola.totalElements} loading={loading} onChange={buscar} />}
            {estado ??
              (pageEscola?.content.length ? (
                pageEscola.content.map((v) => {
                  const s = statusInfo('vinculoEscola', v.status);
                  return (
                    <Card key={v.id} style={styles.card}>
                      <View style={styles.top}>
                        <Text style={styles.title} maxFontSizeMultiplier={maxFontSizeMultiplier}>
                          Vínculo #{v.id}
                        </Text>
                        <Chip label={s.label} tone={s.tone} size="sm" />
                      </View>
                      <Text style={styles.body} maxFontSizeMultiplier={maxFontSizeMultiplier}>
                        Escola #{v.escolaId} · Motorista #{v.motoristaId}
                      </Text>
                      <Text style={styles.caption} maxFontSizeMultiplier={maxFontSizeMultiplier}>
                        Criado em {formatDate(v.criadoEm)} · atualizado em {formatDate(v.atualizadoEm)}
                      </Text>
                    </Card>
                  );
                })
              ) : (
                <StateView kind="empty" icon="link" title="Nenhum vínculo encontrado" />
              ))}
          </>
        )}

        {aba === 'responsavel' && (
          <>
            <Card style={styles.filters}>
              <View style={styles.row}>
                <TextField label="ID do aluno" value={dependenteId} onChangeText={(t) => setDependenteId(onlyDigits(t))} keyboardType="number-pad" containerStyle={styles.rowItem} />
                <TextField label="ID do responsável" value={responsavelId} onChangeText={(t) => setResponsavelId(onlyDigits(t))} keyboardType="number-pad" containerStyle={styles.rowItem} />
              </View>
              <Button label="Pesquisar" icon="search" onPress={() => buscar(0)} loading={loading} fullWidth />
            </Card>
            {pageResp && <Pager page={pageResp.number} totalPages={pageResp.totalPages} totalElements={pageResp.totalElements} loading={loading} onChange={buscar} />}
            {estado ??
              (pageResp?.content.length ? (
                pageResp.content.map((v) => (
                  <Card key={`${v.dependenteId}-${v.responsavelId}`} style={styles.card}>
                    <View style={styles.top}>
                      <Text style={styles.title} maxFontSizeMultiplier={maxFontSizeMultiplier}>
                        Aluno #{v.dependenteId} · Responsável #{v.responsavelId}
                      </Text>
                      {v.responsavelCriador && <Chip label="Criador" tone="info" size="sm" />}
                    </View>
                    <Text style={styles.body} maxFontSizeMultiplier={maxFontSizeMultiplier}>
                      {categoriaLabel(v.categoria)} · {v.status}
                    </Text>
                    {v.vinculadoEm && <Text style={styles.caption} maxFontSizeMultiplier={maxFontSizeMultiplier}>Desde {formatDate(v.vinculadoEm)}</Text>}
                  </Card>
                ))
              ) : (
                <StateView kind="empty" icon="users" title="Nenhum vínculo encontrado" />
              ))}
          </>
        )}

        {aba === 'criador' &&
          (estado ??
            (pendentes?.length ? (
              pendentes.map((d) => (
                <Card key={d.dependenteId} style={styles.card}>
                  <Text style={styles.title} maxFontSizeMultiplier={maxFontSizeMultiplier}>
                    {d.dependenteNome} (#{d.dependenteId})
                  </Text>
                  <Text style={styles.caption} maxFontSizeMultiplier={maxFontSizeMultiplier}>
                    Escolha quem poderá convidar e remover responsáveis deste aluno.
                  </Text>
                  {d.responsaveis.map((r) => (
                    <Button
                      key={r.id}
                      label={`${r.nome} (#${r.id})`}
                      icon="user-check"
                      variant="secondary"
                      size="md"
                      onPress={() => setAtribuir({ dependente: d, responsavelId: r.id, nome: r.nome })}
                      fullWidth
                    />
                  ))}
                </Card>
              ))
            ) : (
              <StateView kind="empty" icon="check-circle" title="Nenhum aluno pendente" message="Todos os alunos têm responsável criador." />
            )))}

        <Button label="Ver escolas" icon="book" variant="tertiary" onPress={() => navigation.navigate('AdminSchools')} fullWidth />
      </ScrollView>

      <ConfirmDialog
        visible={!!atribuir}
        title="Atribuir responsável criador?"
        message={atribuir ? `${atribuir.nome} passará a ser o responsável criador de ${atribuir.dependente.dependenteNome}.` : ''}
        confirmLabel="Atribuir"
        destructive={false}
        loading={salvando}
        onConfirm={confirmarAtribuicao}
        onCancel={() => setAtribuir(null)}
      />
    </AdminLayout>
  );
}

const styles = StyleSheet.create({
  content: { padding: layout.screenMargin, paddingBottom: spacing.xxl, width: '100%', maxWidth: 1000, alignSelf: 'center', gap: spacing.lg },
  filters: { gap: spacing.md },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  rowItem: { flexGrow: 1, flexBasis: 160 },
  card: { gap: spacing.sm },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  title: { ...typography.label, color: colors.ink, flex: 1 },
  body: { ...typography.body, color: colors.slate700 },
  caption: { ...typography.caption, color: colors.slate500 },
});
