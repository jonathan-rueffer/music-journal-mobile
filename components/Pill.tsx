import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radii, spacing } from '../theme';

type AppliedProps = {
  variant?: 'applied';
  label: string;
  bg: string;
  text: string;
  onRemove?: () => void;
  onPress?: never;
};

type SuggestedProps = {
  variant: 'suggested';
  label: string;
  onPress: () => void;
  bg?: never;
  text?: never;
  onRemove?: never;
};

export default function Pill(props: AppliedProps | SuggestedProps) {
  if (props.variant === 'suggested') {
    return (
      <Pressable onPress={props.onPress} style={styles.suggestedPill}>
        <Text style={styles.suggestedLabel}>{props.label}</Text>
      </Pressable>
    );
  }

  const { label, bg, text, onRemove } = props;
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <Text style={[styles.label, { color: text }]}>{label}</Text>
      {onRemove && (
        <Pressable onPress={onRemove} hitSlop={8} style={styles.removeButton}>
          <Text style={[styles.removeText, { color: text }]}>×</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.pill,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm + 2,
    gap: spacing.xs,
  },
  label: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
  },
  removeButton: {
    marginLeft: 2,
  },
  removeText: {
    fontSize: 15,
    fontFamily: fonts.bodyMedium,
    lineHeight: 15,
  },
  suggestedPill: {
    borderRadius: radii.pill,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm + 2,
    borderWidth: 1.5,
    borderColor: colors.suggestion.border,
    borderStyle: 'dashed',
    backgroundColor: 'transparent',
  },
  suggestedLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.suggestion.text,
  },
});
