import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import GuardianLayout from '../components/GuardianLayout';

export default function GuardianPlansScreen() {
  const navigation = useNavigation();

  return (
    <GuardianLayout>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Feather name="arrow-left" size={24} color="#1D1D1F" />
          </TouchableOpacity>
          <Text style={styles.title}>Planos</Text>
        </View>

        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Feather name="credit-card" size={64} color="#D1D1D6" />
          </View>
          <Text style={styles.messageTitle}>Em breve!</Text>
          <Text style={styles.messageText}>
            Funcionalidade ainda não implementada. Estamos trabalhando para trazer os melhores planos para você.
          </Text>
          
          <TouchableOpacity 
            style={styles.button}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.buttonText}>Voltar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </GuardianLayout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 40, marginTop: 10 },
  title: { fontSize: 24, fontFamily: 'Inter_700Bold', color: '#1D1D1F' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 100 },
  iconContainer: { marginBottom: 24 },
  messageTitle: { fontSize: 24, fontFamily: 'Inter_700Bold', color: '#1D1D1F', marginBottom: 12 },
  messageText: { fontSize: 16, color: '#86868B', textAlign: 'center', lineHeight: 24, paddingHorizontal: 20 },
  button: { marginTop: 40, backgroundColor: '#F2F2F7', paddingHorizontal: 32, paddingVertical: 16, borderRadius: 16 },
  buttonText: { color: '#1D1D1F', fontFamily: 'Inter_700Bold', fontSize: 16 }
});
