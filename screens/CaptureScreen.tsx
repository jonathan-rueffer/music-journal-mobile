import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SearchScreen from './SearchScreen';
import TagCategoryRow from '../components/TagCategoryRow';
import WhenPicker from '../components/WhenPicker';
import PrimaryButton from '../components/PrimaryButton';
import TextField from '../components/TextField';
import type { SpotifyTrack } from '../lib/spotify';
import {
  createSongMemory,
  listMyTagHistory,
  updateSongMemory,
  upsertSong,
  type FrequencyEntry,
  type MemoryDate,
  type SongMemory,
} from '../lib/songMemories';
import { animateNextLayout } from '../lib/animateLayout';
import { colors, fonts, getEmotionColor, radii, spacing } from '../theme';

// Editing a memory reuses this exact screen rather than a separate
// in-place editor — same UI, just seeded from `editingMemory`'s current
// values instead of starting blank, and updating that row on save instead
// of inserting a new one.
function trackFromMemory(memory: SongMemory): SpotifyTrack {
  return {
    spotifyTrackId: memory.songs.spotify_track_id,
    title: memory.songs.title,
    artist: memory.songs.artist,
    album: memory.songs.album,
    albumArtUrl: memory.songs.album_art_url,
    previewUrl: memory.songs.preview_url,
    durationMs: memory.songs.duration_ms,
  };
}

export default function CaptureScreen({
  userId,
  editingMemory,
  onCancel,
  onSaved,
}: {
  userId: string;
  editingMemory?: SongMemory | null;
  onCancel: () => void;
  onSaved: (memory: SongMemory) => void;
}) {
  const [track, setTrack] = useState<SpotifyTrack | null>(() =>
    editingMemory ? trackFromMemory(editingMemory) : null
  );
  // True while re-searching for a different song via the swap button.
  // Deliberately does NOT clear `track` or any tag progress — the swap
  // button's whole point is "let me reconsider the song," not "start over."
  // "Cancel" (discards the whole memory) only shows before a song has ever
  // been picked; once repicking, the back action just returns to the
  // tagging screen with the original song and everything still intact.
  const [isRepicking, setIsRepicking] = useState(false);

  // Drives the "selected song moves to the top" transition: the search
  // list fades/slides up and out (exitAnim), then the settled track strip
  // + tag rows fade/slide in from slightly above their final position
  // (enterAnim), so the two halves read as one continuous upward motion
  // rather than an abrupt screen swap. Editing starts with a track already
  // in hand (never goes through handleSelectTrack, which is the only place
  // that normally animates enterAnim to 1) — starting it at 1 instead of 0
  // there avoids the whole form rendering at opacity: 0 forever.
  const exitAnim = useRef(new Animated.Value(1)).current;
  const enterAnim = useRef(new Animated.Value(track ? 1 : 0)).current;

  function handleSelectTrack(selected: SpotifyTrack) {
    exitAnim.setValue(1);
    Animated.timing(exitAnim, {
      toValue: 0,
      duration: 200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      setTrack(selected);
      setIsRepicking(false);
      enterAnim.setValue(0);
      Animated.timing(enterAnim, {
        toValue: 1,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    });
  }

  function handleChangeSong() {
    // Mirrors handleSelectTrack, just run in reverse: the tagging content
    // fades/slides up and away first (enterAnim back to 0), then the
    // search screen fades/slides back in (exitAnim from 0 to 1) — same
    // visual language as picking a song, so switching feels consistent
    // rather than an instant snap either direction. `track` stays set the
    // whole time.
    Animated.timing(enterAnim, {
      toValue: 0,
      duration: 180,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      setIsRepicking(true);
      exitAnim.setValue(0);
      Animated.timing(exitAnim, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    });
  }

  function handleBackFromRepick() {
    // Reverse of handleChangeSong: back out of re-searching without ever
    // having cleared the original track, so this returns to it exactly as
    // it was, tag progress included.
    Animated.timing(exitAnim, {
      toValue: 0,
      duration: 180,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      setIsRepicking(false);
      enterAnim.setValue(0);
      Animated.timing(enterAnim, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    });
  }

  const [event, setEvent] = useState<string | null>(editingMemory?.event?.name ?? null);
  const [memoryDate, setMemoryDate] = useState<MemoryDate | null>(() => {
    if (!editingMemory?.memory_date_start || !editingMemory.memory_date_precision) return null;
    return {
      start: editingMemory.memory_date_start,
      end: editingMemory.memory_date_end ?? editingMemory.memory_date_start,
      precision: editingMemory.memory_date_precision,
    };
  });
  const [locations, setLocations] = useState<string[]>(editingMemory?.locations ?? []);
  const [emotions, setEmotions] = useState<string[]>(editingMemory?.emotions ?? []);
  const [customTags, setCustomTags] = useState<string[]>(editingMemory?.custom_tags ?? []);

  const [noteExpanded, setNoteExpanded] = useState(!!editingMemory?.note);
  const [note, setNote] = useState(editingMemory?.note ?? '');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Only one tag row's search box should be open at a time — owning this
  // here (rather than as local state inside each TagCategoryRow) means
  // activating one row automatically closes any other that was left open.
  type TagField = 'event' | 'when' | 'location' | 'emotion' | 'custom';
  const [activeTagField, setActiveTagField] = useState<TagField | null>(null);
  function deactivateTagField(field: TagField) {
    setActiveTagField((current) => (current === field ? null : current));
  }

  // The other four tag rows close on outside-tap via their TextInput's own
  // blur (triggered when Keyboard.dismiss() fires below), with a short
  // delay + layout animation rather than an instant snap. WhenPicker has no
  // text input to blur, so it needs an explicit nudge here — matching that
  // same delay/animation, and only ever firing for taps that no inner
  // Pressable (a field box, a dropdown row, Confirm/Cancel, etc.) already
  // claimed.
  function handleBackgroundPress() {
    Keyboard.dismiss();
    if (activeTagField === 'when') {
      setTimeout(() => {
        animateNextLayout();
        setActiveTagField((current) => (current === 'when' ? null : current));
      }, 150);
    }
  }

  const [history, setHistory] = useState<{
    locations: FrequencyEntry[];
    emotions: FrequencyEntry[];
    customTags: FrequencyEntry[];
    events: FrequencyEntry[];
  }>({ locations: [], emotions: [], customTags: [], events: [] });

  useEffect(() => {
    listMyTagHistory()
      .then(setHistory)
      .catch(() => {
        // Autocomplete/suggestions are a nice-to-have — a failure here
        // shouldn't block capturing a memory.
      });
  }, []);

  function toggleNote() {
    animateNextLayout();
    setNoteExpanded((v) => !v);
  }

  async function handleSave() {
    if (!track) return;

    setSaving(true);
    setError(null);
    try {
      const song = await upsertSong(track);
      const params = {
        userId,
        songId: song.id,
        note: note.trim() || null,
        locations,
        emotions,
        customTags,
        memoryDate,
        eventName: event,
      };
      const saved = editingMemory
        ? await updateSongMemory(editingMemory.id, params)
        : await createSongMemory(params);
      onSaved(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  if (!track || isRepicking) {
    const exitStyle = {
      opacity: exitAnim,
      transform: [
        {
          translateY: exitAnim.interpolate({ inputRange: [0, 1], outputRange: [-40, 0] }),
        },
      ],
    };

    return (
      <View style={styles.container}>
        <View style={styles.topBar}>
          <Text style={styles.topBarTitle}>{editingMemory ? 'Edit memory' : 'New memory'}</Text>
          <Pressable onPress={track ? handleBackFromRepick : onCancel} hitSlop={8}>
            <Text style={styles.cancelText}>{track ? 'Back' : 'Cancel'}</Text>
          </Pressable>
        </View>
        <Animated.View style={[styles.container, exitStyle]}>
          <SearchScreen onSelectTrack={handleSelectTrack} />
        </Animated.View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.topBar}>
        <Text style={styles.topBarTitle}>{editingMemory ? 'Edit memory' : 'New memory'}</Text>
        <Pressable onPress={onCancel} hitSlop={8}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Pressable onPress={handleBackgroundPress} style={styles.backgroundPressable}>
        <Animated.View
          style={{
            opacity: enterAnim,
            transform: [
              {
                translateY: enterAnim.interpolate({ inputRange: [0, 1], outputRange: [-24, 0] }),
              },
            ],
          }}
        >
        <View style={styles.trackStrip}>
          {track.albumArtUrl ? (
            <Image source={{ uri: track.albumArtUrl }} style={styles.artwork} />
          ) : (
            <View style={[styles.artwork, styles.artworkPlaceholder]} />
          )}
          <View style={styles.trackText}>
            <Text style={styles.trackTitle} numberOfLines={1}>
              {track.title}
            </Text>
            <Text style={styles.trackArtist} numberOfLines={1}>
              {track.artist}
            </Text>
          </View>
          <Pressable onPress={handleChangeSong} hitSlop={8} style={styles.changeSongButton}>
            <Ionicons name="swap-horizontal-outline" size={16} color={colors.textMuted} />
          </Pressable>
        </View>

        <TagCategoryRow
          icon="flag-outline"
          label="Event"
          multiple={false}
          applied={event ? [event] : []}
          suggestions={history.events}
          colorFor={() => colors.category.event}
          onApply={(v) => setEvent(v)}
          onRemove={() => setEvent(null)}
          placeholder="e.g. freshman year"
          active={activeTagField === 'event'}
          onActivate={() => setActiveTagField('event')}
          onDeactivate={() => deactivateTagField('event')}
        />

        <WhenPicker
          value={memoryDate}
          onChange={setMemoryDate}
          active={activeTagField === 'when'}
          onActivate={() => setActiveTagField('when')}
          onDeactivate={() => deactivateTagField('when')}
        />

        <TagCategoryRow
          icon="location-outline"
          label="Location"
          multiple
          applied={locations}
          suggestions={history.locations}
          colorFor={() => colors.category.location}
          onApply={(v) => setLocations((prev) => [...prev, v])}
          onRemove={(v) => setLocations((prev) => prev.filter((l) => l !== v))}
          placeholder="Where was this?"
          active={activeTagField === 'location'}
          onActivate={() => setActiveTagField('location')}
          onDeactivate={() => deactivateTagField('location')}
        />

        <TagCategoryRow
          icon="heart-outline"
          label="Emotion"
          multiple
          applied={emotions}
          suggestions={history.emotions}
          colorFor={getEmotionColor}
          onApply={(v) => setEmotions((prev) => [...prev, v])}
          onRemove={(v) => setEmotions((prev) => prev.filter((e) => e !== v))}
          placeholder="Add an emotion"
          active={activeTagField === 'emotion'}
          onActivate={() => setActiveTagField('emotion')}
          onDeactivate={() => deactivateTagField('emotion')}
        />

        <TagCategoryRow
          icon="pricetag-outline"
          label="Custom"
          multiple
          applied={customTags}
          suggestions={history.customTags}
          colorFor={() => colors.category.custom}
          onApply={(v) => setCustomTags((prev) => [...prev, v])}
          onRemove={(v) => setCustomTags((prev) => prev.filter((t) => t !== v))}
          placeholder="Add a tag"
          active={activeTagField === 'custom'}
          onActivate={() => setActiveTagField('custom')}
          onDeactivate={() => deactivateTagField('custom')}
        />

        <Pressable style={styles.noteToggle} onPress={toggleNote}>
          <Ionicons
            name={noteExpanded ? 'chevron-down' : 'chevron-forward'}
            size={16}
            color={colors.textMuted}
          />
          <Text style={styles.noteToggleText}>Add a note (optional)</Text>
        </Pressable>

        {noteExpanded && (
          <TextField
            value={note}
            onChangeText={setNote}
            placeholder="What does this song mean to you?"
            multiline
            containerStyle={styles.noteField}
            style={styles.noteInput}
          />
        )}

        {error && <Text style={styles.errorText}>{error}</Text>}
        </Animated.View>
        </Pressable>
      </ScrollView>

      <View style={styles.saveBar}>
        <PrimaryButton
          title={editingMemory ? 'Save changes' : 'Save memory'}
          onPress={handleSave}
          loading={saving}
          style={styles.saveButton}
        />
      </View>
    </KeyboardAvoidingView>
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
    marginBottom: spacing.md,
  },
  topBarTitle: {
    fontFamily: fonts.headingSemiBold,
    fontSize: 17,
    color: colors.text,
  },
  cancelText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.textMuted,
  },
  content: {
    // flexGrow (not just paddingBottom) so the scroll content always fills
    // at least the visible height — otherwise, whenever the actual content
    // is shorter than the screen (e.g. the note collapsed), the background
    // Pressable below only covers its own content's height, and tapping the
    // genuinely blank space past that falls outside it entirely and does
    // nothing.
    flexGrow: 1,
    paddingBottom: spacing.xl,
  },
  backgroundPressable: {
    flex: 1,
  },
  trackStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radii.md,
    padding: spacing.sm,
    marginBottom: spacing.lg,
  },
  artwork: {
    width: 48,
    height: 48,
    borderRadius: radii.sm,
  },
  artworkPlaceholder: {
    backgroundColor: colors.border,
  },
  trackText: {
    flex: 1,
  },
  trackTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    color: colors.text,
  },
  trackArtist: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  changeSongButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  noteToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  noteToggleText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: colors.textMuted,
  },
  noteField: {
    marginBottom: spacing.md,
  },
  noteInput: {
    minHeight: 110,
    lineHeight: 21,
    textAlignVertical: 'top',
  },
  errorText: {
    fontFamily: fonts.body,
    color: colors.danger,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  saveBar: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
  },
  saveButton: {
    width: '100%',
  },
});
