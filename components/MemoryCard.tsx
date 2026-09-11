import { forwardRef, useImperativeHandle, useRef } from 'react';
import { Image, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import PolaroidFrame, { EMPTY_CELL } from './PolaroidFrame';
import type { SongMemory } from '../lib/songMemories';
import { colors, fonts, spacing } from '../theme';

export type CardOrigin = { x: number; y: number; width: number; height: number };

export type MemoryCardHandle = {
  // Lets a parent screen measure this card's current on-screen rect without
  // a real tap — used to reopen the detail view's flip-back-into-place
  // animation for a specific memory after returning from editing it,
  // rather than falling back to a plain fade because no origin is known.
  measure: (callback: (origin: CardOrigin) => void) => void;
};

function formatWhen(memory: SongMemory): string | null {
  if (!memory.memory_date_start) return null;
  const d = new Date(memory.memory_date_start + 'T00:00:00');
  if (memory.memory_date_precision === 'year') return String(d.getFullYear());
  if (memory.memory_date_precision === 'month') {
    return d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
  }
  return d.toLocaleDateString();
}

// The front face shown both here (the small grid card) and as the starting
// face of MemoryDetailModal's flip — kept as one component so the two
// never drift apart, since the whole point of the flip is that this exact
// visual is what appears to rotate into the detail view.
export function MemoryPolaroidFace({ memory }: { memory: SongMemory }) {
  // Event and date share one line, separated by a dot, when both are set —
  // rather than one hiding the other — and just the one that's set if only
  // one is.
  const subtitle = [memory.event?.name, formatWhen(memory)].filter(Boolean).join(' · ');

  const photo = (
    <View style={styles.photo}>
      {memory.songs.album_art_url ? (
        <Image source={{ uri: memory.songs.album_art_url }} style={styles.photoImage} />
      ) : (
        <View style={[styles.photoImage, styles.photoEmpty]} />
      )}
    </View>
  );

  const caption = (
    <View style={styles.caption}>
      <Text style={styles.title} numberOfLines={1}>
        {memory.songs.title}
      </Text>
      <Text style={styles.artist} numberOfLines={1}>
        {memory.songs.artist}
      </Text>
      {/* Always rendered (even blank) so every card reserves the same
          caption height — otherwise cards without an event/date end up
          shorter, breaking the grid's row spacing. */}
      <Text style={styles.subtitle} numberOfLines={1}>
        {subtitle || ' '}
      </Text>
    </View>
  );

  return <PolaroidFrame photo={photo} caption={caption} />;
}

// Single-photo polaroid treatment — same chassis as EventCard, but always
// one song's own art (never a collage). Tapping measures this card's own
// on-screen rect (before anything else happens — measureInWindow reports
// the laid-out position, unaffected by any transform) and hands it off so
// MemoryDetailModal can grow this exact card, in place, into the detail
// view — the card itself doesn't animate anymore, the modal owns the
// whole flip now.
const MemoryCard = forwardRef<
  MemoryCardHandle,
  {
    memory: SongMemory;
    onPress: (origin: CardOrigin) => void;
    style?: StyleProp<ViewStyle>;
  }
>(function MemoryCard({ memory, onPress, style }, ref) {
  const pressableRef = useRef<View>(null);

  useImperativeHandle(ref, () => ({
    measure: (callback) => {
      pressableRef.current?.measureInWindow((x, y, width, height) => {
        callback({ x, y, width, height });
      });
    },
  }));

  function handlePress() {
    pressableRef.current?.measureInWindow((x, y, width, height) => {
      onPress({ x, y, width, height });
    });
  }

  return (
    <Pressable ref={pressableRef} style={style} onPress={handlePress}>
      <MemoryPolaroidFace memory={memory} />
    </Pressable>
  );
});

export default MemoryCard;

const styles = StyleSheet.create({
  photo: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 2,
    overflow: 'hidden',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  photoEmpty: {
    backgroundColor: EMPTY_CELL,
  },
  caption: {
    alignItems: 'flex-start',
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  title: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.text,
    textAlign: 'left',
  },
  artist: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'left',
    marginTop: 2,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textFaint,
    textAlign: 'left',
    marginTop: 4,
  },
});
