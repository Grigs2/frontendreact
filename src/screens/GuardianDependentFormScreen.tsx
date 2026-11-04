import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Modal, FlatList } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation';
import { useAppContext } from '../context/AppContext';
import { responsavelService } from '../services/responsavelService';
import { dependenteService } from '../services/dependenteService';
import { EscolaDTO, ResponsavelDTO, DependenteDTO } from '../types';
import PasswordConfirmationModal from '../components/PasswordConfirmationModal';
import { Button, ScreenHeader, StateView, TextField } from '../components/ui';
import { borders, colors, layout, radius, spacing, typography } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'GuardianDependentForm'>;

export default function GuardianDependentFormScreen({ route, navigation }: Props) {
  const { dependentId } = route.params || {};
  const { currentUser, setCurrentUser, showToast } = useAppContext();
  const guardian = currentUser as ResponsavelDTO;

  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [endereco, setEndereco] = useState('');
  const [idEscola, setIdEscola] = useState<number | null>(null);
  const [periodo, setPeriodo] = useState<any>('MANHA');

  const [schools, setSchools] = useState<EscolaDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSchoolModal, setShowSchoolModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  useEffect(() => {
    loadSchools();
    if (dependentId && guardian?.dependentes) {
      const dep = guardian.dependentes.find(d => d.id === dependentId);
      if (dep) {
        setNome(dep.nome);
        setCpf(dep.cpf);
        setDataNascimento(dep.dataNascimento);
        setEndereco(dep.endereco);
        setPeriodo(dep.periodo);
        if (dep.escola) setIdEscola(dep.escola.id);
      }
    }
  }, [dependentId, guardian]);

  const loadSchools = async () => {
    try {
      const list = await responsavelService.listarEscolas();
      setSchools(list);
    } catch (error) {
      console.error('Error loading schools:', error);
    }
  };

  const handlePreSave = () => {
    if (!nome.trim() || !cpf.trim() || !dataNascimento.trim() || !endereco.trim() || !idEscola) {
      showToast('Por favor, preencha todos os campos e selecione uma escola.', 'error');
      return;
    }

    if (dependentId) {
      setShowPasswordModal(true);
    } else {
      handleSave();
    }
  };

  const handleSave = async (password?: string) => {
    if (!guardian?.id) return;

    setLoading(true);
    try {
      if (dependentId) {
        // Alterar Dependente
        const updatedDep = await dependenteService.alterarInfos({
          id: dependentId,
          nome: nome.trim(),
          cpf: cpf.trim(),
          dataNascimento: dataNascimento.trim(),
          periodo,
          endereco: endereco.trim(),
          senha: password, // The API expects the guardian's password
        });

        // 2. Vincular Escola (The update endpoint might not update school, so we do it explicitly if needed)
        const finalGuardian = await responsavelService.vincularEscola(guardian.id, idEscola!, dependentId);
        setCurrentUser(finalGuardian, 'RESPONSAVEL');
        showToast('Dependente atualizado!', 'success');
      } else {
        // Cadastrar Novo
        const updatedGuardian = await responsavelService.cadastrarDependente(guardian.id, {
          nome: nome.trim(),
          cpf: cpf.trim(),
          dataNascimento: dataNascimento.trim(),
          periodo,
          endereco: endereco.trim(),
        });

        const newDep = updatedGuardian.dependentes?.find(d => d.cpf === cpf.trim());
        if (newDep?.id) {
          const finalGuardian = await responsavelService.vincularEscola(guardian.id, idEscola!, newDep.id);
          setCurrentUser(finalGuardian, 'RESPONSAVEL');
          showToast('Dependente cadastrado!', 'success');
        }
      }
      setShowPasswordModal(false);
      navigation.navigate('GuardianDependents');
    } catch (error: any) {
      console.error('Save Dependent Error:', error);
      showToast(error.response?.data?.mensagem || 'Não foi possível salvar o dependente.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const selectedSchoolName = schools.find(s => s.id === idEscola)?.nome || 'Selecionar Escola...';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <ScreenHeader title={dependentId ? 'Editar Dependente' : 'Novo Dependente'} onBack={() => navigation.goBack()} />

      <View style={styles.form}>
        <TextField label="Nome Completo" value={nome} onChangeText={setNome} placeholder="Ex: Enzo Silva" editable={!loading} />

        <View style={styles.row}>
          <TextField
            label="CPF"
            value={cpf}
            onChangeText={setCpf}
            placeholder="000.000.000-00"
            keyboardType="numeric"
            editable={!loading}
            containerStyle={styles.rowItem}
          />
          <TextField
            label="Nascimento"
            value={dataNascimento}
            onChangeText={setDataNascimento}
            placeholder="YYYY-MM-DD"
            editable={!loading}
            containerStyle={styles.rowItem}
          />
        </View>

        <TextField label="Endereço de Embarque" value={endereco} onChangeText={setEndereco} placeholder="Rua, Número, Bairro" editable={!loading} />

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Escola de Destino (Obrigatório)</Text>
          <TouchableOpacity
            style={styles.dropdown}
            onPress={() => setShowSchoolModal(true)}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel={`Escola de destino: ${selectedSchoolName}`}
          >
            <Text style={[styles.dropdownValue, !idEscola && styles.dropdownPlaceholder]}>{selectedSchoolName}</Text>
            <Feather name="chevron-down" size={20} color={colors.ink} />
          </TouchableOpacity>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Período de Aula</Text>
          <View style={styles.radioRow} accessibilityRole="radiogroup">
            {['MANHA', 'TARDE', 'NOITE'].map(p => (
              <TouchableOpacity
                key={p}
                style={[styles.radio, periodo === p && styles.radioActive]}
                onPress={() => setPeriodo(p as any)}
                disabled={loading}
                accessibilityRole="radio"
                accessibilityState={{ selected: periodo === p }}
              >
                <Text style={[styles.radioText, periodo === p && styles.radioTextActive]}>{p}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <Button label="Salvar Alterações" onPress={handlePreSave} loading={loading} fullWidth style={styles.saveBtn} />
      </View>

      <Modal visible={showSchoolModal} transparent animationType="slide" onRequestClose={() => setShowSchoolModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Lista de Escolas</Text>
            <FlatList
              data={schools}
              keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.schoolItem, idEscola === item.id && styles.schoolItemActive]}
                  onPress={() => { setIdEscola(item.id!); setShowSchoolModal(false); }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: idEscola === item.id }}
                >
                  <Text style={styles.schoolName}>{item.nome}</Text>
                  <Text style={styles.schoolAddr}>{item.usuarioDTO?.endereco || ''}</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={<StateView kind="empty" icon="book" title="Nenhuma escola cadastrada." />}
            />
            <Button label="Cancelar" variant="tertiary" onPress={() => setShowSchoolModal(false)} fullWidth style={styles.closeBtn} />
          </View>
        </View>
      </Modal>

      <PasswordConfirmationModal
        visible={showPasswordModal}
        onConfirm={handleSave}
        onCancel={() => setShowPasswordModal(false)}
        loading={loading}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: layout.screenMargin, paddingTop: 48, paddingBottom: spacing.xxl, width: '100%', maxWidth: 600, alignSelf: 'center' },
  form: { gap: spacing.lg },
  fieldGroup: { gap: spacing.sm },
  label: { ...typography.captionBold, color: colors.slate700 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  rowItem: { flexGrow: 1, flexBasis: 140 },
  radioRow: { flexDirection: 'row', gap: spacing.sm },
  radio: { flex: 1, minHeight: layout.minTouch, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: borders.hairline, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  radioActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  radioText: { ...typography.label, color: colors.slate700 },
  radioTextActive: { color: colors.onPrimary },
  dropdown: { minHeight: layout.buttonLg, backgroundColor: colors.surface, borderRadius: radius.input, borderWidth: borders.hairline, borderColor: colors.border, paddingHorizontal: spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  dropdownValue: { ...typography.body, color: colors.ink, flexShrink: 1 },
  dropdownPlaceholder: { color: colors.slate500 },
  saveBtn: { marginTop: spacing.lg },
  modalOverlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', padding: layout.screenMargin },
  modalContent: { backgroundColor: colors.surface, borderRadius: 24, padding: spacing.xl, maxHeight: '70%', width: '100%', maxWidth: 480, alignSelf: 'center' },
  modalTitle: { ...typography.heading, color: colors.ink, marginBottom: spacing.lg },
  schoolItem: { minHeight: layout.buttonLg, justifyContent: 'center', paddingVertical: spacing.md, paddingHorizontal: spacing.sm, borderBottomWidth: borders.hairline, borderBottomColor: colors.border },
  schoolItemActive: { backgroundColor: colors.primaryTint },
  schoolName: { ...typography.label, color: colors.ink },
  schoolAddr: { ...typography.caption, color: colors.slate500, marginTop: spacing.xs },
  closeBtn: { marginTop: spacing.lg },
});
