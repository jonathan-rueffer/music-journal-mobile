import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { listSongMemoriesByEvent, type SongMemory } from '../lib/songMemories';
import MemoryCard, { type CardOrigin, type MemoryCardHandle } from '../components/MemoryCard';
import MemoryDetailModal from '../components/MemoryDetailModal';
import { colors, fonts, spacing } from '../theme';

export default function EventDetailScreen({
  eventId,
  eventName,
  reopenMemory,
  onBack,
  onOpenSong,
  onOpenEvent,
  onEditMemory,
}: {
  eventId: string;
  eventName: string;
  reopenMemory?: SongMemory;
  onBack: () => void;
  onOpenSong: (songId: string) => void;
  onOpenEvent: (eventId: string, eventName: string) => void;
  onEditMemory: (memory: SongMemory) => void;
}) {
  const [memories, setMemories] = useState<SongMemory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMemory, setSelectedMemory] = useState<SongMemory | null>(null);
  const [selectedOrigin, setSelectedOrigin] = useState<CardOrigin | null>(null);
  // True when the current selection came from reopening after editing, not
  // a fresh tap — tells the modal not to replay its opening flip/grow, even
  // though selectedOrigin is still a real measured rect (so closing it
  // afterward still flips back into the card normally).
  const [selectedSkipEnter, setSelectedSkipEnter] = useState(false);
  const cardRefs = useRef(new Map<string, MemoryCardHandle>()).current;
  const appliedReopenIdRef = useRef<string | null>(null);

  useEffect(() => {
    listSongMemoriesByEvent(eventId)
      .then(setMemories)
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false));
  }, [eventId]);

  // Show the reopened memory instantly (using the object passed straight
  // through navigation, not waiting on this screen's own fetch above).
  useEffect(() => {
    if (!reopenMemory || appliedReopenIdRef.current === reopenMemory.id) return;
    appliedReopenIdRef.current = reopenMemory.id;
    setSelectedMemory(reopenMemory);
    setSelectedOrigin(null);
    setSelectedSkipEnter(true);
  }, [reopenMemory]);

  // Once this screen's own list has loaded and rendered the same card,
  // upgrade to a real measured origin (so a later close flips back into it)
  // and to the canonical fetched data — only while the user hasn't since
  // selected something else.
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

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Pressable onPress={onBack} hitSlop={8} style={styles.backRow}>
          <Ionicons name="chevron-back" size={18} color={colors.textMuted} />
          <Text style={styles.backText}>Back</Text>
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>
          {eventName}
        </Text>
        <View style={styles.backRow} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : memories.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>No memories tagged with this event yet.</Text>
        </View>
      ) : (
        <FlatList
          data={memories}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <MemoryCard
              ref={(r) => {
                if (r) cardRefs.set(item.id, r);
                else cardRefs.delete(item.id);
              }}
              memory={item}
              style={styles.cardHalf}
              onPress={(origin) => {
                setSelectedMemory(item);
                setSelectedOrigin(origin);
                setSelectedSkipEnter(false);
              }}
            />
          )}
        />
      )}

      <MemoryDetailModal
        memory={selectedMemory}
        origin={selectedOrigin}
        skipEnterAnimation={selectedSkipEnter}
        onClose={() => setSelectedMemory(null)}
        onOpenSong={onOpenSong}
        onOpenEvent={onOpenEvent}
        onEdit={onEditMemory}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    minWidth: 60,
  },
  backText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.textMuted,
  },
  title: {
    fontFamily: fonts.headingSemiBold,
    fontSize: 17,
    color: colors.text,
    flex: 1,
    textAlign: 'center',
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
  emptyText: {
    fontFamily: fonts.body,
    color: colors.textMuted,
    textAlign: 'center',
  },
  listContent: {
    paddingBottom: spacing.xl,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  cardHalf: {
    width: '48%',
  },
});
