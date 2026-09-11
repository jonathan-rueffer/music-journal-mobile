import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { listSongMemoriesBySong, type SongMemory } from '../lib/songMemories';
import MemoryCard, { type CardOrigin, type MemoryCardHandle } from '../components/MemoryCard';
import MemoryDetailModal from '../components/MemoryDetailModal';
import { colors, fonts, radii, spacing } from '../theme';

export default function SongDetailScreen({
  songId,
  reopenMemory,
  onBack,
  onOpenEvent,
  onEditMemory,
}: {
  songId: string;
  reopenMemory?: SongMemory;
  onBack: () => void;
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
    listSongMemoriesBySong(songId)
      .then(setMemories)
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false));
  }, [songId]);

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

  const song = memories[0]?.songs;

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Pressable onPress={onBack} hitSlop={8} style={styles.backRow}>
          <Ionicons name="chevron-back" size={18} color={colors.textMuted} />
          <Text style={styles.backText}>Back</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={memories}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            song ? (
              <View style={styles.songHeader}>
                {song.album_art_url ? (
                  <Image source={{ uri: song.album_art_url }} style={styles.artwork} />
                ) : (
                  <View style={[styles.artwork, styles.artworkPlaceholder]} />
                )}
                <Text style={styles.songTitle}>{song.title}</Text>
                <Text style={styles.songArtist}>{song.artist}</Text>
                <Text style={styles.memoryCount}>
                  {memories.length} {memories.length === 1 ? 'memory' : 'memories'}
                </Text>
              </View>
            ) : null
          }
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
        onOpenSong={() => {}}
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
    marginBottom: spacing.sm,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  backText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.textMuted,
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
  songHeader: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  artwork: {
    width: 140,
    height: 140,
    borderRadius: radii.md,
    marginBottom: spacing.md,
  },
  artworkPlaceholder: {
    backgroundColor: colors.border,
  },
  songTitle: {
    fontFamily: fonts.headingSemiBold,
    fontSize: 19,
    color: colors.text,
    textAlign: 'center',
  },
  songArtist: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 2,
  },
  memoryCount: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.textFaint,
    marginTop: spacing.sm,
  },
});
