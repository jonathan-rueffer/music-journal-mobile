import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import TextField from './TextField';
import TagSuggestionDropdown, { connectedInputStyleFor } from './TagSuggestionDropdown';
import { colors, fonts, getEmotionColor, radii, spacing } from '../theme';
import type { FrequencyEntry } from '../lib/songMemories';
import { animateNextLayout } from '../lib/animateLayout';

export type FilterAxis = 'location' | 'emotion' | 'custom';
export type FilterValues = Record<FilterAxis, string | null>;

// Emotion has no single fixed color elsewhere — each applied emotion value
// gets its own via getEmotionColor, reused below once a value is actually
// picked. This is only the *facet's* representative color, shown on the
// pill before a value is chosen: a warm rust tone, distinct from the other
// two facets' colors (location's teal, custom's brown) and from the primary
// coral accent.
const EMOTION_FACET_COLOR = { bg: '#A6432F', text: '#FFFDF8' };

const FACETS: {
  key: FilterAxis;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: { bg: string; text: string };
}[] = [
  { key: 'location', label: 'Location', icon: 'location-outline', color: colors.category.location },
  { key: 'emotion', label: 'Emotion', icon: 'heart-outline', color: EMOTION_FACET_COLOR },
  { key: 'custom', label: 'Custom', icon: 'pricetag-outline', color: colors.category.custom },
];

function colorForValue(axis: FilterAxis, value: string) {
  if (axis === 'emotion') return getEmotionColor(value);
  return FACETS.find((f) => f.key === axis)!.color;
}

export type FilterMenuHandle = {
  // Returns to the three-facet-pill state without fully collapsing. Used by
  // the parent screen's tap-outside overlay: while a facet's search box is
  // active, a tap on content underneath (e.g. a memory card) should back
  // the search out rather than also triggering that content's own press.
  closeSearch: () => void;
};

// A three-state progression: a collapsed "Filter" pill -> tapping it
// expands horizontally into three facet pills (Location/Emotion/Custom,
// each carrying that facet's icon and color) -> tapping a facet pill morphs
// it in place into an active search bar, reusing the same recent-plus-
// matching autocomplete dropdown built for tag-adding, to pick a value to
// filter by. A facet pill with a value already set shows that value (in its
// resolved color, with an inline X to clear) instead of the facet's name.
const FilterMenu = forwardRef<
  FilterMenuHandle,
  {
    values: FilterValues;
    suggestions: Record<FilterAxis, FrequencyEntry[]>;
    onChange: (axis: FilterAxis, value: string | null) => void;
    // Fired whenever a facet's search box opens/closes, so the parent
    // screen can render a tap-outside overlay above the content below it
    // only while it's actually needed.
    onSearchActiveChange?: (active: boolean) => void;
  }
>(function FilterMenu({ values, suggestions, onChange, onSearchActiveChange }, ref) {
  const [expanded, setExpanded] = useState(false);
  const [activeAxis, setActiveAxis] = useState<FilterAxis | null>(null);
  const [query, setQuery] = useState('');
  const inputRef = useRef<TextInput>(null);
  const lastSelectedAtRef = useRef(0);

  const anyActive = FACETS.some((f) => values[f.key]);

  useEffect(() => {
    onSearchActiveChange?.(activeAxis !== null);
  }, [activeAxis, onSearchActiveChange]);

  useImperativeHandle(ref, () => ({
    closeSearch: () => {
      animateNextLayout();
      setActiveAxis(null);
      setQuery('');
    },
  }));

  function collapse() {
    animateNextLayout();
    setExpanded(false);
    setActiveAxis(null);
    setQuery('');
  }

  function expand() {
    animateNextLayout();
    setExpanded(true);
  }

  function openAxis(axis: FilterAxis) {
    animateNextLayout();
    setActiveAxis(axis);
    setQuery('');
  }

  function selectValue(value: string) {
    if (!activeAxis) return;
    onChange(activeAxis, value);
    lastSelectedAtRef.current = Date.now();
    collapse();
  }

  function handleBlur() {
    // A tap on a suggestion also blurs the input — don't let that be
    // mistaken for the user tapping away before picking anything.
    setTimeout(() => {
      if (Date.now() - lastSelectedAtRef.current < 300) return;
      animateNextLayout();
      setActiveAxis(null);
      setQuery('');
    }, 150);
  }

  const trimmedQuery = query.trim();
  const matches = activeAxis
    ? suggestions[activeAxis]
        .filter((s) => s.value.toLowerCase().includes(trimmedQuery.toLowerCase()))
        .slice(0, 5)
    : [];

  // State 1: collapsed.
  if (!expanded) {
    return (
      <Pressable style={[styles.filterPill, anyActive && styles.filterPillActive]} onPress={expand}>
        <Ionicons name="options-outline" size={15} color={anyActive ? colors.card : colors.textMuted} />
        <Text style={[styles.filterPillText, anyActive && styles.filterPillTextActive]}>Filter</Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.row}>
      <Pressable style={styles.collapseButton} onPress={collapse} hitSlop={8}>
        <Ionicons name="options-outline" size={15} color={colors.textMuted} />
      </Pressable>

      {FACETS.map((facet) => {
        // While one facet is being searched, the other two step aside so
        // the search bar + dropdown has room.
        if (activeAxis && activeAxis !== facet.key) return null;

        if (activeAxis === facet.key) {
          const showDropdown = matches.length > 0;
          return (
            <View key={facet.key} style={styles.searchBlock}>
              <TextField
                ref={inputRef}
                icon={facet.icon}
                iconColor={facet.color.bg}
                value={query}
                onChangeText={setQuery}
                placeholder={`Filter by ${facet.label.toLowerCase()}…`}
                autoFocus
                onClear={() => setQuery('')}
                onBlur={handleBlur}
                style={showDropdown ? connectedInputStyleFor(facet.color.bg) : undefined}
              />
              {showDropdown && (
                <TagSuggestionDropdown
                  matches={matches}
                  query={trimmedQuery}
                  showCreateRow={false}
                  onSelect={selectValue}
                  accentColor={facet.color.bg}
                />
              )}
            </View>
          );
        }

        // State 2: a facet pill — outlined in its color when unset, solid
        // fill (in the resolved value's color) once a value is applied.
        const value = values[facet.key];
        const palette = value ? colorForValue(facet.key, value) : null;
        return (
          <Pressable
            key={facet.key}
            style={[
              styles.facetPill,
              !value && { borderColor: facet.color.bg },
              value && { backgroundColor: palette!.bg, borderColor: palette!.bg },
            ]}
            onPress={() => openAxis(facet.key)}
          >
            <Ionicons name={facet.icon} size={13} color={value ? palette!.text : facet.color.bg} />
            <Text
              style={[styles.facetPillText, { color: value ? palette!.text : facet.color.bg }]}
              numberOfLines={1}
            >
              {value ?? facet.label}
            </Text>
            {value && (
              <Pressable hitSlop={8} onPress={() => onChange(facet.key, null)}>
                <Ionicons name="close" size={13} color={palette!.text} />
              </Pressable>
            )}
          </Pressable>
        );
      })}
    </View>
  );
});

export default FilterMenu;

const styles = StyleSheet.create({
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  filterPillActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  filterPillText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.textMuted,
  },
  filterPillTextActive: {
    color: colors.card,
    fontFamily: fonts.bodySemiBold,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  collapseButton: {
    width: 30,
    height: 30,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  facetPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    maxWidth: 140,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.sm + 2,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    backgroundColor: colors.card,
  },
  facetPillText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    flexShrink: 1,
  },
  searchBlock: {
    flex: 1,
    minWidth: 200,
  },
});
