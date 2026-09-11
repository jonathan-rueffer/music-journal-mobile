import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { searchTracks, type SpotifyTrack } from '../lib/spotify';
import TextField from '../components/TextField';
import { colors, fonts, radii, spacing } from '../theme';

const DEBOUNCE_MS = 500;

export default function SearchScreen({
  onSelectTrack,
}: {
  onSelectTrack: (track: SpotifyTrack) => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SpotifyTrack[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    const id = ++requestId.current;
    const timer = setTimeout(async () => {
      try {
        const tracks = await searchTracks(trimmed);
        if (id === requestId.current) {
          setResults(tracks);
          setError(null);
        }
      } catch (err) {
        if (id === requestId.current) {
          setError(err instanceof Error ? err.message : String(err));
        }
      } finally {
        if (id === requestId.current) {
          setLoading(false);
        }
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query]);

  return (
    <View style={styles.container}>
      <TextField
        placeholder="Search for a song…"
        value={query}
        onChangeText={setQuery}
        onClear={() => setQuery('')}
        returnKeyType="search"
        autoCorrect={false}
        autoFocus
        containerStyle={styles.searchField}
      />

      {loading && <ActivityIndicator style={styles.spacer} color={colors.accent} />}
      {error && <Text style={styles.errorText}>{error}</Text>}

      <FlatList
        data={results}
        keyExtractor={(item) => item.spotifyTrackId}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [styles.resultRow, pressed && styles.resultRowPressed]}
            onPress={() => onSelectTrack(item)}
          >
            {item.albumArtUrl ? (
              <Image source={{ uri: item.albumArtUrl }} style={styles.artwork} />
            ) : (
              <View style={[styles.artwork, styles.artworkPlaceholder]} />
            )}
            <View style={styles.resultText}>
              <Text style={styles.resultTitle} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={styles.resultArtist} numberOfLines={1}>
                {item.artist}
              </Text>
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchField: {
    marginBottom: spacing.sm,
  },
  spacer: {
    marginVertical: spacing.sm,
  },
  errorText: {
    fontFamily: fonts.body,
    color: colors.danger,
    marginBottom: spacing.sm,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.sm,
    gap: spacing.md,
  },
  resultRowPressed: {
    backgroundColor: colors.border + '66',
  },
  artwork: {
    width: 52,
    height: 52,
    borderRadius: radii.sm,
  },
  artworkPlaceholder: {
    backgroundColor: colors.border,
  },
  resultText: {
    flex: 1,
  },
  resultTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    color: colors.text,
  },
  resultArtist: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
});
