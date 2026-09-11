import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Pill from './Pill';
import TextField from './TextField';
import TagSuggestionDropdown, { connectedInputStyle } from './TagSuggestionDropdown';
import { colors, fonts, radii, spacing } from '../theme';
import type { FrequencyEntry } from '../lib/songMemories';
import { animateNextLayout } from '../lib/animateLayout';

const MAX_VISIBLE_MATCHES = 5;

export default function TagCategoryRow({
  icon,
  label,
  multiple,
  applied,
  suggestions,
  colorFor,
  onApply,
  onRemove,
  placeholder,
  active,
  onActivate,
  onDeactivate,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  multiple: boolean;
  applied: string[];
  suggestions: FrequencyEntry[];
  colorFor: (value: string) => { bg: string; text: string };
  onApply: (value: string) => void;
  onRemove: (value: string) => void;
  placeholder: string;
  // Only one tag row across the whole capture screen should have its search
  // box open at a time — "which one" is owned by the parent (CaptureScreen)
  // rather than local state, so opening one row reliably closes any other
  // that was left open instead of ending up with two active at once.
  active: boolean;
  onActivate: () => void;
  onDeactivate: () => void;
}) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<TextInput>(null);
  // Timestamp of the last apply() that kept the row open, so a blur that
  // follows very shortly after (the tap that picked a suggestion also blurs
  // the input) doesn't get mistaken for the user tapping away entirely. A
  // boolean latch here would be fragile — it'd only ever get reset by that
  // matching blur actually firing, and if it doesn't (not guaranteed across
  // platforms/timing), the latch would stay stuck and wrongly suppress the
  // *next* real close attempt too. A timestamp self-corrects regardless.
  const lastAppliedAtRef = useRef(0);

  const showAddAffordance = multiple || applied.length === 0;

  const isAppliedAlready = (v: string) => applied.some((a) => a.toLowerCase() === v.toLowerCase());

  const trimmedQuery = query.trim();
  // With an empty query, `includes('')` matches everything, so this doubles
  // as "show recent/frequent tags by default" (suggestions is already
  // frequency-sorted) and narrows to a real search once the user types.
  // Flat, non-scrolling list capped to a small count — no ScrollView here
  // (this used to be nested inside CaptureScreen's own ScrollView, which
  // combined with per-tap layout animation caused a real freeze under rapid
  // repeated tapping).
  const matches = suggestions
    .filter(
      (s) => s.value.toLowerCase().includes(trimmedQuery.toLowerCase()) && !isAppliedAlready(s.value)
    )
    .slice(0, MAX_VISIBLE_MATCHES);

  // Offer "Create '<input>'" only when nothing already covers that exact
  // value — otherwise tapping it would just duplicate a listed suggestion.
  const showCreateRow =
    trimmedQuery.length > 0 &&
    !isAppliedAlready(trimmedQuery) &&
    !suggestions.some((s) => s.value.toLowerCase() === trimmedQuery.toLowerCase());

  const showDropdown = matches.length > 0 || showCreateRow;

  function apply(value: string) {
    onApply(value);
    setQuery('');
    lastAppliedAtRef.current = Date.now();

    if (!multiple) {
      // A single-value field (e.g. Event) has nothing left to add once one
      // value is picked — close the search box back down to the applied
      // pill instead of leaving it open with no use for it.
      animateNextLayout();
      onDeactivate();
      return;
    }

    // Multi-value fields keep the search bar open and refocused for
    // continuous tagging. The tap that picked a suggestion blurs the
    // input, so restore focus once this event cycle (and the resulting
    // re-render) finishes.
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function remove(value: string) {
    onRemove(value);
  }

  function handleActivate() {
    animateNextLayout();
    setQuery('');
    onActivate();
  }

  function handleBlur() {
    // If an apply() happened moments ago, this blur is very likely the tap
    // that picked the suggestion, not the user tapping away — skip closing.
    // Otherwise, it's a real "tapped elsewhere," so collapse back to the
    // "+ add" chip instead of leaving an empty search bar open.
    setTimeout(() => {
      if (Date.now() - lastAppliedAtRef.current < 300) return;
      animateNextLayout();
      onDeactivate();
      setQuery('');
    }, 150);
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Ionicons name={icon} size={20} color={colors.text} style={styles.icon} />
        <Text style={styles.label}>{label}</Text>
      </View>

      <View style={styles.chipRow}>
        {applied.map((value) => {
          const palette = colorFor(value);
          return (
            <Pill
              key={value}
              label={value}
              bg={palette.bg}
              text={palette.text}
              onRemove={() => remove(value)}
            />
          );
        })}

        {showAddAffordance && !active && (
          <Pressable style={styles.addChip} onPress={handleActivate}>
            <Text style={styles.addChipText}>+ add</Text>
          </Pressable>
        )}
      </View>

      {active && (
        <View style={styles.searchBlock}>
          <TextField
            ref={inputRef}
            value={query}
            onChangeText={setQuery}
            placeholder={placeholder}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={() => {
              if (trimmedQuery) apply(trimmedQuery);
            }}
            onBlur={handleBlur}
            style={showDropdown ? connectedInputStyle : undefined}
          />

          {showDropdown && (
            <TagSuggestionDropdown
              matches={matches}
              query={trimmedQuery}
              showCreateRow={showCreateRow}
              onSelect={apply}
            />
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  icon: {
    marginRight: spacing.xs,
  },
  label: {
    fontFamily: fonts.headingSemiBold,
    fontSize: 16,
    color: colors.text,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  addChip: {
    borderRadius: radii.pill,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm + 2,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  addChipText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.textMuted,
  },
  searchBlock: {
    marginTop: spacing.sm,
  },
});
