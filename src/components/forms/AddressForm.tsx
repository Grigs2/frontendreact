import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { TextField } from '../ui';
import { colors, maxFontSizeMultiplier, spacing, typography } from '../../theme';
import { maskCEP, onlyDigits } from '../../utils/masks';
import { validateCEP, validateRequired, validateUF } from '../../utils/validators';
import { cepService, CepError } from '../../services/cepService';
import { EnderecoOperacionalDTO } from '../../types';

export interface AddressValue {
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
}

export const EMPTY_ADDRESS: AddressValue = {
  cep: '',
  logradouro: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  uf: '',
};

export type AddressErrors = Partial<Record<keyof AddressValue, string | null>>;

export const validateAddress = (value: AddressValue): AddressErrors => ({
  cep: validateCEP(value.cep),
  logradouro: validateRequired(value.logradouro, 'o logradouro'),
  numero: validateRequired(value.numero, 'o número'),
  bairro: validateRequired(value.bairro, 'o bairro'),
  cidade: validateRequired(value.cidade, 'a cidade'),
  uf: validateUF(value.uf),
});

export const hasErrors = (errors: Record<string, string | null | undefined>) => Object.values(errors).some(Boolean);

/** Texto único para o campo legado `usuarioDTO.endereco` / `usuario.endereco`. */
export const formatAddress = (a: AddressValue) => {
  const complemento = a.complemento.trim() ? ` - ${a.complemento.trim()}` : '';
  return `${a.logradouro.trim()}, ${a.numero.trim()}${complemento} - ${a.bairro.trim()}, ${a.cidade.trim()}/${a.uf
    .trim()
    .toUpperCase()} - CEP ${maskCEP(a.cep)}`;
};

export const toEnderecoOperacional = (a: AddressValue): EnderecoOperacionalDTO => ({
  cep: maskCEP(a.cep),
  logradouro: a.logradouro.trim(),
  numero: a.numero.trim(),
  complemento: a.complemento.trim(),
  bairro: a.bairro.trim(),
  cidade: a.cidade.trim(),
  uf: a.uf.trim().toUpperCase(),
});

export const fromEnderecoOperacional = (e?: EnderecoOperacionalDTO | null): AddressValue =>
  e
    ? {
        cep: maskCEP(e.cep || ''),
        logradouro: e.logradouro || '',
        numero: e.numero || '',
        complemento: e.complemento || '',
        bairro: e.bairro || '',
        cidade: e.cidade || '',
        uf: e.uf || '',
      }
    : EMPTY_ADDRESS;

interface AddressFormProps {
  value: AddressValue;
  onChange: (value: AddressValue) => void;
  errors?: AddressErrors;
  editable?: boolean;
}

type LookupState = 'idle' | 'loading' | 'found' | 'error';

/**
 * CEP em destaque no topo. Ao completar 8 dígitos consulta o ViaCEP e preenche
 * logradouro, bairro, cidade e UF; número e complemento ficam para o usuário.
 * Se o CEP não existir ou o serviço falhar, os campos continuam editáveis para preenchimento manual.
 */
export default function AddressForm({ value, onChange, errors = {}, editable = true }: AddressFormProps) {
  const [lookup, setLookup] = useState<LookupState>('idle');
  const [lookupMessage, setLookupMessage] = useState<string | null>(null);
  const lastLookup = useRef<string>(onlyDigits(value.cep));
  const numeroRef = useRef<React.ComponentRef<typeof TextInput>>(null);

  const set = (field: keyof AddressValue) => (text: string) => onChange({ ...value, [field]: text });

  const cepDigits = onlyDigits(value.cep);

  useEffect(() => {
    if (cepDigits.length !== 8 || cepDigits === lastLookup.current) return;
    lastLookup.current = cepDigits;
    let cancelled = false;
    setLookup('loading');
    setLookupMessage(null);
    cepService
      .buscar(cepDigits)
      .then((endereco) => {
        if (cancelled) return;
        onChange({
          ...value,
          logradouro: endereco.logradouro || value.logradouro,
          bairro: endereco.bairro || value.bairro,
          cidade: endereco.cidade,
          uf: endereco.uf,
        });
        setLookup('found');
        setLookupMessage(
          endereco.logradouro ? 'Endereço encontrado. Informe o número.' : 'CEP geral da cidade: complete o logradouro e o bairro.',
        );
        numeroRef.current?.focus();
      })
      .catch((error: CepError) => {
        if (cancelled) return;
        setLookup('error');
        setLookupMessage(error.message);
      });
    return () => {
      cancelled = true;
    };
    // value/onChange intencionalmente fora das dependências: a busca só deve disparar quando o CEP muda.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cepDigits]);

  return (
    <View style={styles.container}>
      <TextField
        label="CEP"
        value={value.cep}
        onChangeText={(text) => {
          if (onlyDigits(text).length < 8) {
            lastLookup.current = '';
            setLookup('idle');
            setLookupMessage(null);
          }
          set('cep')(maskCEP(text));
        }}
        placeholder="00000-000"
        keyboardType="number-pad"
        leftIcon="map-pin"
        maxLength={9}
        editable={editable}
        error={errors.cep || undefined}
        hint="Digite o CEP para preencher o endereço automaticamente."
      />
      {lookup !== 'idle' && (
        <View style={styles.lookup} accessibilityLiveRegion="polite">
          {lookup === 'loading' ? (
            <ActivityIndicator size="small" color={colors.ink} />
          ) : (
            <Feather
              name={lookup === 'found' ? 'check-circle' : 'alert-circle'}
              size={16}
              color={lookup === 'found' ? colors.success : colors.danger}
            />
          )}
          <Text
            style={[styles.lookupText, lookup === 'error' && styles.lookupError]}
            maxFontSizeMultiplier={maxFontSizeMultiplier}
          >
            {lookup === 'loading' ? 'Buscando endereço...' : lookupMessage}
          </Text>
        </View>
      )}

      <TextField
        label="Logradouro"
        value={value.logradouro}
        onChangeText={set('logradouro')}
        placeholder="Rua, avenida..."
        editable={editable}
        error={errors.logradouro || undefined}
      />
      <View style={styles.row}>
        <TextField
          ref={numeroRef}
          label="Número"
          value={value.numero}
          onChangeText={set('numero')}
          placeholder="123"
          editable={editable}
          error={errors.numero || undefined}
          containerStyle={styles.small}
        />
        <TextField
          label="Complemento (opcional)"
          value={value.complemento}
          onChangeText={set('complemento')}
          placeholder="Apto, bloco..."
          editable={editable}
          containerStyle={styles.grow}
        />
      </View>
      <TextField
        label="Bairro"
        value={value.bairro}
        onChangeText={set('bairro')}
        editable={editable}
        error={errors.bairro || undefined}
      />
      <View style={styles.row}>
        <TextField
          label="Cidade"
          value={value.cidade}
          onChangeText={set('cidade')}
          editable={editable}
          error={errors.cidade || undefined}
          containerStyle={styles.grow}
        />
        <TextField
          label="UF"
          value={value.uf}
          onChangeText={(text) => set('uf')(text.replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 2))}
          placeholder="SP"
          autoCapitalize="characters"
          maxLength={2}
          editable={editable}
          error={errors.uf || undefined}
          containerStyle={styles.uf}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.lg },
  lookup: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: -spacing.sm },
  lookupText: { ...typography.caption, color: colors.slate700, flex: 1 },
  lookupError: { color: colors.danger },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, alignItems: 'flex-start' },
  small: { flexBasis: 100, flexGrow: 1 },
  grow: { flexBasis: 180, flexGrow: 3 },
  uf: { flexBasis: 80, flexGrow: 1 },
});
