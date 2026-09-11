import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  connectedButtonStyle,
  connectedDropdownStyle,
  dropdownRowStyle,
  dropdownRowTextStyle,
} from './TagSuggestionDropdown';
import { colors, fonts, radii, spacing } from '../theme';

export type SortOption = 'recent' | 'chronological' | 'mostSongs';
export type SortDirection = 'desc' | 'asc';

const OPTIONS: { key: SortOption; label: string }[] = [
  { key: 'recent', label: 'Recently added' },
  { key: 'chronological', label: 'Chronological' },
  { key: 'mostSongs', label: 'Most songs' },
];

// Same button + dropdown styling as FilterMenu (bordered pill button, a
// bordered card below it with hairline-separated rows) so the two controls
// read as the same family, even though sort always has exactly one active
// option rather than being on/off like a filter.
//
// The label ("Sort: Most songs") never changes when direction flips — only
// the arrow and the actual resulting order do — so tapping the compact
// circular arrow never leaves it ambiguous whether the label secretly means
// its opposite. The arrow is a separate tap target from the label (split by
// a thin divider) so flipping direction doesn't reopen the option menu.
export default function SortMenu({
  value,
  direction,
  onChange,
  onToggleDirection,
}: {
  value: SortOption;
  direction: SortDirection;
  onChange: (option: SortOption) => void;
  onToggleDirection: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [buttonWidth, setButtonWidth] = useState<number | null>(null);
  const currentLabel = OPTIONS.find((o) => o.key === value)!.label;

  return (
    <View style={styles.wrapper}>
      <View
        style={[styles.button, open && connectedButtonStyle]}
        onLayout={(e) => setButtonWidth(e.nativeEvent.layout.width)}
      >
        <Pressable style={styles.labelPress} onPress={() => setOpen((o) => !o)}>
          <Ionicons name="swap-vertical-outline" size={15} color={colors.textMuted} />
          <Text style={styles.buttonText}>{currentLabel}</Text>
        </Pressable>

        <View style={styles.divider} />

        <Pressable style={styles.arrowButton} onPress={onToggleDirection} hitSlop={8}>
          <Ionicons
            name={direction === 'desc' ? 'arrow-down' : 'arrow-up'}
            size={13}
            color={colors.accent}
          />
        </Pressable>
      </View>

      {open && (
        <View style={[styles.menu, buttonWidth !== null && { width: buttonWidth }]}>
          {OPTIONS.map((o) => (
            <Pressable
              key={o.key}
              style={styles.row}
              onPress={() => {
                onChange(o.key);
                setOpen(false);
              }}
            >
              <Text style={[styles.rowText, o.key === value && styles.rowTextActive]}>{o.label}</Text>
              {o.key === value && <Ionicons name="checkmark" size={16} color={colors.accent} />}
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: radii.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
    overflow: 'hidden',
  },
  labelPress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs + 2,
    paddingLeft: spacing.sm + 2,
    paddingRight: spacing.sm,
  },
  buttonText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.textMuted,
  },
  divider: {
    width: 1,
    height: 18,
    backgroundColor: colors.border,
  },
  arrowButton: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    // Faint coral tint, not the solid accent — the dark-orange arrow icon
    // on top of it is what should read as the primary color here.
    backgroundColor: '#F7D9C4',
    marginLeft: spacing.sm,
    marginRight: spacing.xs,
  },
  menu: {
    ...connectedDropdownStyle,
    alignSelf: 'flex-start',
  },
  row: {
    ...dropdownRowStyle,
  },
  rowText: {
    ...dropdownRowTextStyle,
  },
  rowTextActive: {
    fontFamily: fonts.bodySemiBold,
    color: colors.accent,
  },
});
