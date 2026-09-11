import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Pressable,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { listMySongMemories, toFrequencyList, type SongMemory } from '../lib/songMemories';
import MemoryCard, { type CardOrigin, type MemoryCardHandle } from '../components/MemoryCard';
import MemoryDetailModal from '../components/MemoryDetailModal';
import EventCard from '../components/EventCard';
import TextField from '../components/TextField';
import FilterMenu, { type FilterAxis, type FilterMenuHandle, type FilterValues } from '../components/FilterMenu';
import SortMenu, { type SortDirection, type SortOption } from '../components/SortMenu';
import { colors, fonts, radii, spacing } from '../theme';

export type ViewMode = 'byEvent' | 'all';

type EventCardData = {
  id: string;
  name: string;
  count: number;
  art: (string | null)[];
};

// SectionList has no native numColumns support (unlike FlatList), so each
// section's items are pre-chunked into rows of up to 2 for a 2-column grid.
type MemorySection = {
  title: string;
  data: SongMemory[][];
};

function chunkPairs<T>(items: T[]): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += 2) {
    rows.push(items.slice(i, i + 2));
  }
  return rows;
}

function matchesSearch(memory: SongMemory, needle: string): boolean {
  if (!needle) return true;
  return (
    memory.songs.title.toLowerCase().includes(needle) ||
    memory.songs.artist.toLowerCase().includes(needle) ||
    memory.locations.some((v) => v.toLowerCase().includes(needle)) ||
    memory.emotions.some((v) => v.toLowerCase().includes(needle)) ||
    memory.custom_tags.some((v) => v.toLowerCase().includes(needle)) ||
    (memory.event?.name.toLowerCase().includes(needle) ?? false)
  );
}

export default function HomeScreen({
  refreshKey,
  reopenMemory,
  initialViewMode,
  onAddPress,
  onOpenSong,
  onOpenEvent,
  onEditMemory,
  onSignOut,
}: {
  refreshKey: number;
  // The actual memory object, not just its id — shows the detail view
  // instantly on return from editing rather than waiting on this screen's
  // own network fetch to resolve before it can even look the memory up.
  reopenMemory?: SongMemory;
  // HomeScreen remounts fresh every time App.tsx navigates back to it (e.g.
  // after canceling/saving out of editing a memory), which would otherwise
  // always reset back to the default "By event" tab regardless of which
  // tab the user was actually on when they tapped Edit.
  initialViewMode?: ViewMode;
  onAddPress: () => void;
  onOpenSong: (songId: string) => void;
  onOpenEvent: (eventId: string, eventName: string) => void;
  onEditMemory: (memory: SongMemory, homeViewMode: ViewMode) => void;
  onSignOut: () => void;
}) {
  const [memories, setMemories] = useState<SongMemory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(initialViewMode ?? 'byEvent');
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<FilterValues>({ location: null, emotion: null, custom: null });
  const [sortOption, setSortOption] = useState<SortOption>('mostSongs');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [filterSearchActive, setFilterSearchActive] = useState(false);
  const [selectedMemory, setSelectedMemory] = useState<SongMemory | null>(null);
  const [selectedOrigin, setSelectedOrigin] = useState<CardOrigin | null>(null);
  // True when the current selection came from reopening after editing
  // (or any other non-tap route), not a fresh tap — tells the modal not to
  // replay its opening flip/grow, even though selectedOrigin is still a
  // real measured rect (so *closing* it afterward still flips back into
  // the card normally instead of just fading).
  const [selectedSkipEnter, setSelectedSkipEnter] = useState(false);
  const searchInputRef = useRef<TextInput>(null);
  const filterMenuRef = useRef<FilterMenuHandle>(null);
  // Keyed by memory id so a specific card can be re-measured on demand
  // (reopening after editing) without a real tap.
  const cardRefs = useRef(new Map<string, MemoryCardHandle>()).current;
  // Guards the two reopen effects below against re-firing on every later
  // memories refetch (e.g. pull-to-refresh) — reopenMemory is a one-shot
  // instruction from a single navigation, not a standing rule.
  const appliedReopenIdRef = useRef<string | null>(null);

  // Show the reopened memory instantly, using the object passed straight
  // through navigation — no origin yet, so it just appears settled rather
  // than growing from a card (there's nothing rendered to grow from until
  // this screen's own list fetch below resolves).
  useEffect(() => {
    if (!reopenMemory || appliedReopenIdRef.current === reopenMemory.id) return;
    appliedReopenIdRef.current = reopenMemory.id;
    setSelectedMemory(reopenMemory);
    setSelectedOrigin(null);
    setSelectedSkipEnter(true);
  }, [reopenMemory]);

  // Once this screen's own list has loaded and rendered the same card,
  // upgrade to a real measured origin (so a later close flips back into it
  // instead of fading) and to the canonical fetched data — only while the
  // user hasn't since selected something else.
  useEffect(() => {
    if (!reopenMemory || selectedMemory?.id !== reopenMemory.id || selectedOrigin) return;
    const match = memories.find((m) => m.id === reopenMemory.id);
    if (!match) return;
    const handle = cardRefs.get(reopenMemory.id);
    if (!handle) return;
    handle.measure((origin) => {
      setSelectedMemory(match);
      setSelectedOrigin(origin);
    });
  }, [memories, reopenMemory, selectedMemory, selectedOrigin]);

  // Picking a different sort criterion starts fresh at its own default
  // direction, rather than carrying over a flip that applied to the
  // previous criterion.
  function handleSortOptionChange(option: SortOption) {
    setSortOption(option);
    setSortDirection('desc');
  }

  function handleBackgroundPress() {
    Keyboard.dismiss();
    searchInputRef.current?.blur();
  }

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await listMySongMemories();
      setMemories(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load, refreshKey]);

  const trimmedSearch = searchQuery.trim().toLowerCase();

  const tagSuggestions = useMemo(
    () => ({
      location: toFrequencyList(memories.flatMap((m) => m.locations)),
      emotion: toFrequencyList(memories.flatMap((m) => m.emotions)),
      custom: toFrequencyList(memories.flatMap((m) => m.custom_tags)),
    }),
    [memories]
  );

  // Events don't carry their own tags — only their linked songs do — so an
  // event card's search match comes from either its own name or any memory
  // linked to it (DESIGN.md).
  const eventGroups = useMemo(() => {
    const byId = new Map<string, { id: string; name: string; memories: SongMemory[] }>();
    for (const m of memories) {
      if (!m.event) continue;
      const entry = byId.get(m.event.id) ?? { id: m.event.id, name: m.event.name, memories: [] };
      entry.memories.push(m);
      byId.set(m.event.id, entry);
    }
    return Array.from(byId.values());
  }, [memories]);

  const eventCards = useMemo<EventCardData[]>(() => {
    const withSortKeys = eventGroups
      .filter(
        (g) =>
          !trimmedSearch ||
          g.name.toLowerCase().includes(trimmedSearch) ||
          g.memories.some((m) => matchesSearch(m, trimmedSearch))
      )
      .map((g) => {
        const datedMemories = g.memories.filter((m) => m.memory_date_start);
        return {
          id: g.id,
          name: g.name,
          count: g.memories.length,
          art: g.memories.slice(0, 4).map((m) => m.songs.album_art_url),
          // "Recently added": most recent tagging activity on this event.
          mostRecentAddedAt: Math.max(...g.memories.map((m) => new Date(m.created_at).getTime())),
          // "Chronological": the earliest life period this event covers —
          // undated events (no memory_date_start on any linked memory) sort
          // to the end rather than being guessed at.
          earliestAt:
            datedMemories.length > 0
              ? Math.min(...datedMemories.map((m) => new Date(m.memory_date_start!).getTime()))
              : null,
        };
      });

    // Direction flips whichever criterion is active (e.g. "Most songs" ->
    // least songs first) without changing its label. Undated events always
    // sort to the end under "Chronological," regardless of direction —
    // that's a fallback, not something the arrow should be able to invert.
    withSortKeys.sort((a, b) => {
      if (sortOption === 'chronological') {
        if (a.earliestAt === null && b.earliestAt === null) return 0;
        if (a.earliestAt === null) return 1;
        if (b.earliestAt === null) return -1;
        const cmp = a.earliestAt - b.earliestAt;
        return sortDirection === 'asc' ? -cmp : cmp;
      }
      const cmp = sortOption === 'mostSongs' ? b.count - a.count : b.mostRecentAddedAt - a.mostRecentAddedAt;
      return sortDirection === 'asc' ? -cmp : cmp;
    });

    return withSortKeys.map(({ mostRecentAddedAt, earliestAt, ...card }) => card);
  }, [eventGroups, trimmedSearch, sortOption, sortDirection]);

  const filteredMemories = useMemo(() => {
    return memories.filter((m) => {
      if (!matchesSearch(m, trimmedSearch)) return false;
      if (filters.location && !m.locations.some((v) => v.toLowerCase() === filters.location!.toLowerCase())) {
        return false;
      }
      if (filters.emotion && !m.emotions.some((v) => v.toLowerCase() === filters.emotion!.toLowerCase())) {
        return false;
      }
      if (filters.custom && !m.custom_tags.some((v) => v.toLowerCase() === filters.custom!.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [memories, trimmedSearch, filters]);

  // "July 2026" for the current year, just "2022" for past years (the
  // current year's memories are recent enough that a month header is still
  // useful; older ones collapse to a single yearly bucket).
  const memorySections = useMemo<MemorySection[]>(() => {
    const now = new Date();
    const sections: { title: string; items: SongMemory[] }[] = [];
    const indexByKey = new Map<string, number>();
    for (const m of filteredMemories) {
      const d = new Date(m.created_at);
      const sameYear = d.getFullYear() === now.getFullYear();
      const key = sameYear ? `${d.getFullYear()}-${d.getMonth()}` : `${d.getFullYear()}`;
      let idx = indexByKey.get(key);
      if (idx === undefined) {
        const title = sameYear
          ? d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
          : String(d.getFullYear());
        idx = sections.length;
        indexByKey.set(key, idx);
        sections.push({ title, items: [] });
      }
      sections[idx].items.push(m);
    }
    return sections.map((s) => ({ title: s.title, data: chunkPairs(s.items) }));
  }, [filteredMemories]);

  function handleFilterChange(axis: FilterAxis, value: string | null) {
    setFilters((prev) => ({ ...prev, [axis]: value }));
  }

  return (
    <Pressable style={styles.container} onPress={handleBackgroundPress}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>Your memories</Text>
        <Pressable onPress={onSignOut} hitSlop={8}>
          <Ionicons name="log-out-outline" size={20} color={colors.textMuted} />
        </Pressable>
      </View>

      <TextField
        ref={searchInputRef}
        icon="search"
        placeholder="Search songs, tags, events…"
        value={searchQuery}
        onChangeText={setSearchQuery}
        onClear={() => setSearchQuery('')}
        returnKeyType="search"
        autoCorrect={false}
        containerStyle={styles.searchField}
      />

      <View style={styles.tabs}>
        <Pressable
          style={[styles.tabHalf, viewMode === 'byEvent' && styles.tabHalfActive]}
          onPress={() => setViewMode('byEvent')}
        >
          <Text style={[styles.tabText, viewMode === 'byEvent' && styles.tabTextActive]}>By event</Text>
        </Pressable>
        <Pressable
          style={[styles.tabHalf, viewMode === 'all' && styles.tabHalfActive]}
          onPress={() => setViewMode('all')}
        >
          <Text style={[styles.tabText, viewMode === 'all' && styles.tabTextActive]}>All memories</Text>
        </Pressable>
      </View>

      {viewMode === 'byEvent' && (
        <View style={styles.filterRow}>
          <SortMenu
            value={sortOption}
            direction={sortDirection}
            onChange={handleSortOptionChange}
            onToggleDirection={() => setSortDirection((d) => (d === 'desc' ? 'asc' : 'desc'))}
          />
        </View>
      )}

      {viewMode === 'all' && (
        <View style={styles.filterRow}>
          <FilterMenu
            ref={filterMenuRef}
            values={filters}
            suggestions={tagSuggestions}
            onChange={handleFilterChange}
            onSearchActiveChange={setFilterSearchActive}
          />
        </View>
      )}

      <View style={styles.content}>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : viewMode === 'byEvent' ? (
          eventCards.length === 0 ? (
            <View style={styles.center}>
              <Text style={styles.emptyTitle}>
                {eventGroups.length === 0 ? 'No events yet' : 'No matches'}
              </Text>
              <Text style={styles.emptyText}>
                {eventGroups.length === 0
                  ? 'Tag a memory with an event to see it here.'
                  : 'Try a different search.'}
              </Text>
            </View>
          ) : (
            <FlatList
              data={eventCards}
              keyExtractor={(item) => item.id}
              keyboardShouldPersistTaps="handled"
              numColumns={2}
              columnWrapperStyle={styles.eventRow}
              contentContainerStyle={styles.listContent}
              refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={colors.accent} />}
              renderItem={({ item }) => (
                <EventCard
                  name={item.name}
                  count={item.count}
                  art={item.art}
                  onPress={() => onOpenEvent(item.id, item.name)}
                />
              )}
            />
          )
        ) : memorySections.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.emptyTitle}>{memories.length === 0 ? 'No memories yet' : 'No matches'}</Text>
            <Text style={styles.emptyText}>
              {memories.length === 0 ? 'Tap + to tag your first song.' : 'Try clearing a filter or search.'}
            </Text>
          </View>
        ) : (
          <SectionList
            sections={memorySections}
            keyExtractor={(row) => row[0].id}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.listContent}
            stickySectionHeadersEnabled={false}
            refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={colors.accent} />}
            renderSectionHeader={({ section }) => <Text style={styles.sectionHeader}>{section.title}</Text>}
            renderItem={({ item: row }) => (
              <View style={styles.memoryRow}>
                {row.map((m) => (
                  <MemoryCard
                    key={m.id}
                    ref={(r) => {
                      if (r) cardRefs.set(m.id, r);
                      else cardRefs.delete(m.id);
                    }}
                    memory={m}
                    style={styles.memoryCardHalf}
                    onPress={(origin) => {
                      setSelectedMemory(m);
                      setSelectedOrigin(origin);
                      setSelectedSkipEnter(false);
                    }}
                  />
                ))}
              </View>
            )}
          />
        )}

        {/* While a filter facet's search box is active, a tap on a card
            below must not also open that card — it should just back the
            search out to the three facet pills. This overlay sits above
            the list (last in paint order) and swallows the tap instead of
            letting it reach the card underneath. */}
        {filterSearchActive && (
          <Pressable style={StyleSheet.absoluteFill} onPress={() => filterMenuRef.current?.closeSearch()} />
        )}
      </View>

      <Pressable style={styles.fab} onPress={onAddPress}>
        <Ionicons name="add" size={28} color={colors.card} />
      </Pressable>

      <MemoryDetailModal
        memory={selectedMemory}
        origin={selectedOrigin}
        skipEnterAnimation={selectedSkipEnter}
        onClose={() => setSelectedMemory(null)}
        onOpenSong={onOpenSong}
        onOpenEvent={onOpenEvent}
        onEdit={(memory) => onEditMemory(memory, viewMode)}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: 24,
    color: colors.text,
  },
  searchField: {
    marginBottom: spacing.md,
  },
  tabs: {
    flexDirection: 'row',
    width: '100%',
    padding: 3,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
    marginBottom: spacing.md,
  },
  tabHalf: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.pill,
  },
  tabHalfActive: {
    backgroundColor: colors.accent,
  },
  tabText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.textMuted,
  },
  tabTextActive: {
    color: colors.card,
    fontFamily: fonts.bodySemiBold,
  },
  filterRow: {
    marginBottom: spacing.md,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  errorText: {
    fontFamily: fonts.body,
    color: colors.danger,
    textAlign: 'center',
  },
  emptyTitle: {
    fontFamily: fonts.headingSemiBold,
    fontSize: 17,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  emptyText: {
    fontFamily: fonts.body,
    color: colors.textMuted,
    textAlign: 'center',
  },
  sectionHeader: {
    fontFamily: fonts.headingSemiBold,
    fontSize: 13,
    color: colors.textMuted,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  eventRow: {
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  memoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  memoryCardHalf: {
    width: '48%',
  },
  listContent: {
    paddingBottom: 96,
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
});
