import React, { forwardRef, useState } from 'react';
import {
  Platform,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { borders, colors, layout, maxFontSizeMultiplier, radius, spacing, typography } from '../../theme';

type FeatherIconName = React.ComponentProps<typeof Feather>['name'];

interface TextFieldProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: FeatherIconName;
  rightIcon?: FeatherIconName;
  onRightIconPress?: () => void;
  rightIconLabel?: string;
  containerStyle?: StyleProp<ViewStyle>;
}

const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  {
    label,
    error,
    hint,
    leftIcon,
    rightIcon,
    onRightIconPress,
    rightIconLabel,
    containerStyle,
    style,
    editable = true,
    multiline,
    onFocus,
    onBlur,
    ...rest
  },
  ref,
) {
  const [focused, setFocused] = useState(false);

  const borderColor = error ? colors.danger : focused ? colors.ink : colors.border;

  return (
    <View style={[styles.container, containerStyle]}>
      {!!label && (
        <Text style={styles.label} maxFontSizeMultiplier={maxFontSizeMultiplier}>
          {label}
        </Text>
      )}
      <View
        style={[
          styles.field,
          multiline && styles.fieldMultiline,
          { borderColor, borderWidth: focused || error ? borders.alert : borders.hairline },
          !editable && styles.fieldDisabled,
        ]}
      >
        {leftIcon && <Feather name={leftIcon} size={20} color={colors.slate500} />}
        <TextInput
          ref={ref}
          style={[styles.input, webNoOutline, multiline && styles.inputMultiline, !editable && styles.inputDisabled, style]}
          placeholderTextColor={colors.slate500}
          editable={editable}
          multiline={multiline}
          maxFontSizeMultiplier={maxFontSizeMultiplier}
          accessibilityLabel={rest.accessibilityLabel ?? label ?? rest.placeholder}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...rest}
        />
        {rightIcon && (
          <Pressable
            onPress={onRightIconPress}
            disabled={!onRightIconPress}
            accessibilityRole="button"
            accessibilityLabel={rightIconLabel}
            hitSlop={8}
            style={styles.rightIcon}
          >
            <Feather name={rightIcon} size={20} color={colors.slate500} />
          </Pressable>
        )}
      </View>
      {!!error && (
        <Text style={styles.error} maxFontSizeMultiplier={maxFontSizeMultiplier}>
          {error}
        </Text>
      )}
      {!error && !!hint && (
        <Text style={styles.hint} maxFontSizeMultiplier={maxFontSizeMultiplier}>
          {hint}
        </Text>
      )}
    </View>
  );
});

export default TextField;

// No web, o foco já é sinalizado pela borda ink de 2px do campo; remove o contorno padrão do navegador.
const webNoOutline = Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null;

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  label: {
    ...typography.captionBold,
    color: colors.slate700,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: layout.buttonLg,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.input,
    backgroundColor: colors.surface,
  },
  fieldMultiline: {
    alignItems: 'flex-start',
    paddingVertical: spacing.md,
  },
  fieldDisabled: {
    backgroundColor: colors.background,
  },
  input: {
    ...typography.body,
    flex: 1,
    minWidth: 0,
    color: colors.ink,
    minHeight: layout.minTouch,
    paddingVertical: 0,
  },
  inputMultiline: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  inputDisabled: {
    color: colors.slate500,
  },
  rightIcon: {
    minWidth: 32,
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: {
    ...typography.caption,
    color: colors.danger,
  },
  hint: {
    ...typography.caption,
    color: colors.slate500,
  },
});
