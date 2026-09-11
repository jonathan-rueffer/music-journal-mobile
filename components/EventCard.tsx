import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import PolaroidFrame, { EMPTY_CELL, FRAME_RADIUS } from './PolaroidFrame';
import { colors, fonts, shadow, spacing } from '../theme';

export default function EventCard({
  name,
  count,
  art,
  onPress,
}: {
  name: string;
  count: number;
  art: (string | null)[];
  onPress: () => void;
}) {
  const cells = [0, 1, 2, 3].map((i) => art[i] ?? null);

  const photo = (
    <View style={styles.collage}>
      {count < 4 ? (
        cells[0] ? (
          <Image source={{ uri: cells[0] }} style={styles.singleCell} />
        ) : (
          <View style={[styles.singleCell, styles.cellEmpty]} />
        )
      ) : (
        cells.map((url, i) =>
          url ? (
            <Image key={i} source={{ uri: url }} style={styles.cell} />
          ) : (
            <View key={i} style={[styles.cell, styles.cellEmpty]} />
          )
        )
      )}
    </View>
  );

  const caption = (
    <View style={styles.caption}>
      <Text style={styles.name} numberOfLines={1}>
        {name}
      </Text>
      <Text style={styles.count}>
        {count} {count === 1 ? 'song' : 'songs'}
      </Text>
    </View>
  );

  // Two more of the event's songs peek out, tilted, behind the front card —
  // a stack of photos rather than a single flat one. Falls back to a blank
  // peek when there aren't enough distinct songs to fill both.
  return (
    <Pressable style={styles.pressable} onPress={onPress}>
      <View style={styles.stack}>
        <View style={[styles.peek, styles.peekBack]}>
          <View style={styles.peekInner}>
            {cells[2] ? (
              <Image source={{ uri: cells[2] }} style={styles.peekImage} />
            ) : (
              <View style={[styles.peekImage, styles.cellEmpty]} />
            )}
            <View style={styles.peekScrim} />
            <View style={styles.peekBottomScrim} />
          </View>
        </View>
        <View style={[styles.peek, styles.peekMid]}>
          <View style={styles.peekInner}>
            {cells[1] ? (
              <Image source={{ uri: cells[1] }} style={styles.peekImage} />
            ) : (
              <View style={[styles.peekImage, styles.cellEmpty]} />
            )}
            <View style={styles.peekScrim} />
            <View style={styles.peekBottomScrim} />
          </View>
        </View>
        <PolaroidFrame photo={photo} caption={caption} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    width: '43%',
  },
  stack: {
    position: 'relative',
  },
  // Sized to fill the exact same box as the front PolaroidFrame (which,
  // being normal-flow, is what actually gives `stack` its height) rather
  // than just the inner photo area — otherwise, once rotated, its corners
  // never reach past the front card's own edges and nothing peeks out.
  peek: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    padding: 4,
    borderRadius: FRAME_RADIUS,
    backgroundColor: colors.card,
    ...shadow.soft,
  },
  peekBack: {
    transform: [{ rotate: '-7deg' }],
  },
  peekMid: {
    transform: [{ rotate: '6deg' }],
  },
  peekInner: {
    flex: 1,
    borderRadius: FRAME_RADIUS / 2,
    overflow: 'hidden',
  },
  peekImage: {
    width: '100%',
    height: '100%',
  },
  // Caps how dark a peeking photo can read — a genuinely dark album cover
  // would otherwise stand out against the front card instead of receding
  // into the background like the rest of the stack. Only applied to the
  // two background peeks — the front (top) card's own photo is left as-is.
  peekScrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.background,
    opacity: 0.4,
  },
  // The bottom sliver is the only part of a peek that isn't covered by the
  // front card, so that's specifically where a dark photo clashes hardest
  // against it — stacked on top of peekScrim for extra lightening there.
  peekBottomScrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '35%',
    backgroundColor: colors.background,
    opacity: 0.55,
  },
  collage: {
    width: '100%',
    aspectRatio: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderRadius: FRAME_RADIUS / 2,
    overflow: 'hidden',
  },
  cell: {
    width: '50%',
    height: '50%',
  },
  singleCell: {
    width: '100%',
    height: '100%',
  },
  cellEmpty: {
    backgroundColor: EMPTY_CELL,
  },
  // The thick bottom strip of a polaroid, where the caption sits centered.
  caption: {
    alignItems: 'center',
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  name: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.text,
    textAlign: 'center',
  },
  count: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
    textAlign: 'center',
  },
});
