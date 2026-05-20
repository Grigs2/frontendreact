import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Modal, FlatList, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation';
import { useAppContext } from '../context/AppContext';
import { responsavelService } from '../services/responsavelService';
import { dependenteService } from '../services/dependenteService';
import { EscolaDTO, ResponsavelDTO, DependenteDTO } from '../types';
import PasswordConfirmationModal from '../components/PasswordConfirmationModal';

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
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Feather name="arrow-left" size={24} color="#1D1D1F" /></TouchableOpacity>
        <Text style={styles.title}>{dependentId ? 'Editar Dependente' : 'Novo Dependente'}</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Nome Completo:</Text>
        <TextInput style={styles.input} value={nome} onChangeText={setNome} placeholder="Ex: Enzo Silva" editable={!loading} />

        <View style={styles.row}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={styles.label}>CPF:</Text>
            <TextInput style={styles.input} value={cpf} onChangeText={setCpf} placeholder="000.000.000-00" keyboardType="numeric" editable={!loading} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Nascimento:</Text>
            <TextInput style={styles.input} value={dataNascimento} onChangeText={setDataNascimento} placeholder="YYYY-MM-DD" editable={!loading} />
          </View>
        </View>

        <Text style={styles.label}>Endereço de Embarque:</Text>
        <TextInput style={styles.input} value={endereco} onChangeText={setEndereco} placeholder="Rua, Número, Bairro" editable={!loading} />

        <Text style={styles.label}>Escola de Destino (Obrigatório):</Text>
        <TouchableOpacity style={styles.dropdown} onPress={() => setShowSchoolModal(true)} disabled={loading}>
          <Text style={styles.dropdownValue}>{selectedSchoolName}</Text>
          <Feather name="chevron-down" size={20} color="#1976D2" />
        </TouchableOpacity>

        <Text style={styles.label}>Período de Aula:</Text>
        <View style={styles.radioRow}>
          {['MANHA', 'TARDE', 'NOITE'].map(p => (
            <TouchableOpacity key={p} style={[styles.radio, periodo === p && styles.radioActive]} onPress={() => setPeriodo(p as any)} disabled={loading}>
              <Text style={[styles.radioText, periodo === p && styles.radioTextActive]}>{p}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity 
          style={[styles.saveBtn, loading && { opacity: 0.7 }]} 
          onPress={handlePreSave}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>Salvar Alterações</Text>}
        </TouchableOpacity>
      </View>

      <Modal visible={showSchoolModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Lista de Escolas</Text>
            <FlatList
              data={schools}
              keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={styles.schoolItem} 
                  onPress={() => { setIdEscola(item.id!); setShowSchoolModal(false); }}
                >
                  <Text style={styles.schoolName}>{item.nome}</Text>
                  <Text style={styles.schoolAddr}>{item.usuarioDTO?.endereco || ''}</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 20 }}>Nenhuma escola cadastrada.</Text>}
            />
            <TouchableOpacity style={styles.closeBtn} onPress={() => setShowSchoolModal(false)}>
              <Text style={styles.closeBtnText}>Cancelar</Text>
            </TouchableOpacity>
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
  container: { flex: 1, backgroundColor: '#FFF' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 20, paddingTop: 50 },
  title: { fontSize: 20, fontFamily: 'Inter_700Bold' },
  form: { padding: 20 },
  label: { fontSize: 13, color: '#86868B', marginBottom: 8, marginTop: 16 },
  input: { height: 52, backgroundColor: '#F5F5F7', borderRadius: 12, paddingHorizontal: 16, fontSize: 15 },
  row: { flexDirection: 'row' },
  radioRow: { flexDirection: 'row', gap: 10 },
  radio: { flex: 1, height: 44, backgroundColor: '#F5F5F7', borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  radioActive: { backgroundColor: '#1976D2' },
  radioText: { color: '#666', fontFamily: 'Inter_600SemiBold' },
  radioTextActive: { color: '#FFF' },
  dropdown: { height: 52, backgroundColor: '#F5F5F7', borderRadius: 12, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dropdownValue: { fontSize: 15, color: '#1D1D1F' },
  saveBtn: { backgroundColor: '#1976D2', height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 40 },
  saveBtnText: { color: '#FFF', fontSize: 16, fontFamily: 'Inter_700Bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#FFF', borderRadius: 24, padding: 24, maxHeight: '70%' },
  modalTitle: { fontSize: 18, fontFamily: 'Inter_700Bold', marginBottom: 20 },
  schoolItem: { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#F2F2F7' },
  schoolName: { fontSize: 15, fontFamily: 'Inter_700Bold', color: '#1D1D1F' },
  schoolAddr: { fontSize: 12, color: '#86868B', marginTop: 2 },
  closeBtn: { marginTop: 20, alignItems: 'center' },
  closeBtnText: { color: '#FF3B30', fontFamily: 'Inter_600SemiBold' },
});
