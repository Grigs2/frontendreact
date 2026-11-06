import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation';
import { viagemNome, viagemService } from '../services/viagemService';
import { ViagemDTO } from '../types';
import DriverLayout from '../components/DriverLayout';
import StudentInviteList from '../components/StudentInviteList';
import { ScreenHeader } from '../components/ui';
import { layout } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'DriverAvailableDependents'>;

/** Convidar alunos para uma viagem específica (aberta a partir dos detalhes da viagem). */
export default function DriverAvailableDependentsScreen({ route, navigation }: Props) {
  const { viagemId } = route.params;
  const [viagem, setViagem] = useState<ViagemDTO | null>(null);

  useEffect(() => {
    viagemService.visualizar(viagemId).then(setViagem).catch(() => setViagem(null));
  }, [viagemId]);

  return (
    <DriverLayout>
      <View style={styles.container}>
        <StudentInviteList
          viagemId={viagemId}
          escolaNome={viagem?.escolaNome}
          header={
            <ScreenHeader
              title="Convidar alunos"
              subtitle={viagem ? viagemNome(viagem) : undefined}
              onBack={() => navigation.goBack()}
            />
          }
        />
      </View>
    </DriverLayout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: layout.screenMargin, width: '100%', maxWidth: 800, alignSelf: 'center' },
});
