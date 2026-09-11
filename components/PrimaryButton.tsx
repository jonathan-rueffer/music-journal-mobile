import { ActivityIndicator, Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';
import { colors, fonts, radii, shadow, spacing } from '../theme';

export default function PrimaryButton({
  title,
  onPress,
  disabled,
  loading,
  variant = 'filled',
  style,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'filled' | 'outline';
  style?: StyleProp<ViewStyle>;
}) {
  const isDisabled = disabled || loading;

  if (variant === 'outline') {
    return (
      <Pressable
        onPress={onPress}
        disabled={isDisabled}
        style={({ pressed }) => [
          styles.outline,
          isDisabled && styles.disabled,
          pressed && !isDisabled && styles.pressed,
          style,
        ]}
      >
        {loading ? <ActivityIndicator color={colors.accent} /> : <Text style={styles.outlineText}>{title}</Text>}
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.filled,
        shadow.soft,
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={colors.card} /> : <Text style={styles.filledText}>{title}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  filled: {
    backgroundColor: colors.accent,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  filledText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    color: colors.card,
  },
  outline: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
    backgroundColor: 'transparent',
  },
  outlineText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    color: colors.accent,
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.85,
  },
});
