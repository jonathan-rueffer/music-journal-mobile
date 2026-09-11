import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, radii, spacing } from '../theme';
import type { FrequencyEntry } from '../lib/songMemories';

// Splits a suggestion's label around the first case-insensitive occurrence
// of the query so the match can be bolded in the accent color, e.g. typing
// "dor" bolds "Dor" within "Dormroom".
function HighlightedLabel({ text, query, color }: { text: string; query: string; color: string }) {
  if (!query) return <Text style={styles.rowText}>{text}</Text>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <Text style={styles.rowText}>{text}</Text>;
  return (
    <Text style={styles.rowText} numberOfLines={1}>
      {text.slice(0, idx)}
      <Text style={[styles.rowMatch, { color }]}>{text.slice(idx, idx + query.length)}</Text>
      {text.slice(idx + query.length)}
    </Text>
  );
}

// Shared "recent-plus-matching" autocomplete dropdown: a small "Recent"
// heading on an empty query, bold highlighting of the matched substring, a
// muted usage count per row, and an optional "Create" row when nothing
// matches. Used both for tag-adding (TagCategoryRow) and for picking a
// value to filter the home screen's memory list by (FilterMenu) — same
// visual language in both places. `accentColor` defaults to the primary
// coral accent, but callers with their own identity (e.g. FilterMenu's
// per-facet color) can override it throughout.
export default function TagSuggestionDropdown({
  matches,
  query,
  showCreateRow,
  onSelect,
  accentColor = colors.accent,
}: {
  matches: FrequencyEntry[];
  query: string;
  showCreateRow: boolean;
  onSelect: (value: string) => void;
  accentColor?: string;
}) {
  return (
    <View style={connectedDropdownStyleFor(accentColor)}>
      {query.length === 0 && <Text style={styles.heading}>Recent</Text>}
      {matches.map((s) => (
        <Pressable key={s.value} style={styles.row} onPress={() => onSelect(s.value)}>
          <HighlightedLabel text={s.value} query={query} color={accentColor} />
          <Text style={styles.rowCount}>{s.count}x</Text>
        </Pressable>
      ))}
      {showCreateRow && (
        <Pressable style={styles.row} onPress={() => onSelect(query)}>
          <Ionicons name="add-circle-outline" size={16} color={accentColor} />
          <Text style={[styles.createText, { color: accentColor }]} numberOfLines={1}>
            Create "{query}"
          </Text>
        </Pressable>
      )}
    </View>
  );
}

// Applied to the TextField feeding this dropdown so the two read as one
// connected control: flat top corners on the dropdown below, matching
// border continuing from the input, no gap between them.
export function connectedInputStyleFor(color: string) {
  return {
    borderColor: color,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  } as const;
}

export const connectedInputStyle = connectedInputStyleFor(colors.accent);

// The exact same "connected" shape as this file's own dropdown card (flat
// top, rounded bottom, no top border), for menus that drop down from a
// button rather than a text input (SortMenu, FilterMenu). Pair with
// connectedButtonStyleFor on the triggering button so the button's own
// bottom border becomes the single seam line between the two, instead of a
// gap or a doubled border.
export function connectedDropdownStyleFor(color: string) {
  return {
    marginTop: 0,
    borderWidth: 1.5,
    borderTopWidth: 0,
    borderColor: color,
    borderBottomLeftRadius: radii.sm,
    borderBottomRightRadius: radii.sm,
    backgroundColor: colors.card,
    overflow: 'hidden',
  } as const;
}

export const connectedDropdownStyle = connectedDropdownStyleFor(colors.accent);

// Applied to a dropdown-triggering button while its menu is open: a colored
// border, square bottom corners, and top corners pulled in to radii.sm (even
// on an otherwise pill-shaped button) so the curvature matches the connected
// dropdown sitting flush beneath it, rather than mixing a pill's tight curve
// on top with the dropdown's gentler one on the bottom.
export function connectedButtonStyleFor(color: string) {
  return {
    borderColor: color,
    borderTopLeftRadius: radii.sm,
    borderTopRightRadius: radii.sm,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  } as const;
}

export const connectedButtonStyle = connectedButtonStyleFor(colors.accent);

// Row styling to pair with connectedDropdownStyleFor, matching this file's
// own `row`/`rowText` treatment (hairline separators, 13px medium text).
export const dropdownRowStyle = {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: spacing.sm,
  paddingVertical: spacing.sm + 2,
  paddingHorizontal: spacing.md,
  borderTopWidth: StyleSheet.hairlineWidth,
  borderTopColor: colors.border,
} as const;

export const dropdownRowTextStyle = {
  fontFamily: fonts.bodyMedium,
  fontSize: 13,
  color: colors.text,
} as const;

const styles = StyleSheet.create({
  heading: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: colors.textFaint,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  rowText: {
    flex: 1,
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.text,
  },
  rowMatch: {
    fontFamily: fonts.bodySemiBold,
  },
  rowCount: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textFaint,
  },
  createText: {
    flex: 1,
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
  },
});
