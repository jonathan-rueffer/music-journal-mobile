import { forwardRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, radii, spacing } from '../theme';

const TextField = forwardRef<
  TextInput,
  TextInputProps & {
    label?: string;
    containerStyle?: object;
    serif?: boolean;
    onClear?: () => void;
    icon?: keyof typeof Ionicons.glyphMap;
    iconColor?: string;
  }
>(function TextField({ label, containerStyle, serif, onClear, icon, iconColor, ...inputProps }, ref) {
  const [focused, setFocused] = useState(false);
  const showClear = !!onClear && !!inputProps.value;

  return (
    <View style={containerStyle}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.inputWrapper}>
        {icon && (
          <Ionicons name={icon} size={18} color={iconColor ?? colors.textFaint} style={styles.leadingIcon} />
        )}
        <TextInput
          ref={ref}
          placeholderTextColor={colors.textFaint}
          {...inputProps}
          onFocus={(e) => {
            setFocused(true);
            inputProps.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            inputProps.onBlur?.(e);
          }}
          style={[
            styles.input,
            icon && styles.inputWithIcon,
            serif && styles.serifInput,
            focused && styles.inputFocused,
            showClear && styles.inputWithClear,
            inputProps.style,
          ]}
        />
        {showClear && (
          <Pressable onPress={onClear} hitSlop={10} style={styles.clearButton}>
            <Text style={styles.clearButtonText}>×</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
});

export default TextField;

const styles = StyleSheet.create({
  label: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  inputWrapper: {
    justifyContent: 'center',
  },
  input: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.card,
  },
  inputFocused: {
    borderColor: colors.accent,
  },
  inputWithClear: {
    paddingRight: spacing.xl,
  },
  inputWithIcon: {
    paddingLeft: spacing.xl + spacing.md,
  },
  leadingIcon: {
    position: 'absolute',
    left: spacing.md,
    zIndex: 1,
  },
  serifInput: {
    fontFamily: fonts.serif,
    fontSize: 16,
    lineHeight: 24,
  },
  clearButton: {
    position: 'absolute',
    right: spacing.sm,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    width: 24,
  },
  clearButtonText: {
    fontSize: 18,
    fontFamily: fonts.bodyMedium,
    color: colors.textMuted,
    lineHeight: 18,
  },
});
