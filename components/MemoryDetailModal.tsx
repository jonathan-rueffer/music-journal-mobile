import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import Pill from './Pill';
import { MemoryPolaroidFace, type CardOrigin } from './MemoryCard';
import { FRAME_RADIUS } from './PolaroidFrame';
import type { SongMemory } from '../lib/songMemories';
import { colors, fonts, getEmotionColor, radii, shadow, spacing } from '../theme';

const SHEET_MAX_WIDTH = 560;
const SHEET_MARGIN = spacing.lg;
const FLIP_DURATION_MS = 380;
const FLIP_EASING = Easing.inOut(Easing.cubic);
const MAX_VISIBLE_TAGS = 4;

type Tag = { key: string; label: string; bg: string; text: string };

// One element flipping over and growing into place, not a card animation
// handed off to a separate popup: the same box that starts at the tapped
// card's exact size/position rotates through 90° (front face — the same
// polaroid the grid shows — hidden past that point via backfaceVisibility)
// while simultaneously growing to its full centered size, landing on the
// back face (the actual detail content) at 0°/full size. Closing reverses
// the same motion rather than just unmounting.
export default function MemoryDetailModal({
  memory,
  origin,
  skipEnterAnimation,
  onClose,
  onOpenSong,
  onOpenEvent,
  onEdit,
}: {
  memory: SongMemory | null;
  origin: CardOrigin | null;
  // True when reopening after returning from editing (or any other
  // non-tap route back here) — origin may still be a real measured rect
  // (so *closing* can flip back into it normally), but there was no actual
  // tap just now, so opening shouldn't replay the flip/grow entrance.
  skipEnterAnimation?: boolean;
  onClose: () => void;
  onOpenSong: (songId: string) => void;
  onOpenEvent: (eventId: string, eventName: string) => void;
  onEdit: (memory: SongMemory) => void;
}) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  // Mirrors `memory`, but stays populated through the closing animation —
  // the Modal must stay visible while it plays, and only unmount once the
  // reverse flip actually finishes.
  const [displayedMemory, setDisplayedMemory] = useState<SongMemory | null>(null);
  const [tagsExpanded, setTagsExpanded] = useState(false);

  const progress = useSharedValue(0);
  const originAtOpen = useSharedValue<CardOrigin | null>(null);

  useEffect(() => {
    if (!memory) return;
    setDisplayedMemory(memory);
    setTagsExpanded(false);
    originAtOpen.value = origin;
    if (origin && !skipEnterAnimation) {
      // A real tap on a card — play the flip/grow.
      progress.value = 0;
      progress.value = withTiming(1, { duration: FLIP_DURATION_MS, easing: FLIP_EASING });
    } else {
      // Reopened without a fresh tap (skipEnterAnimation) — this should
      // just be the already-open static info card again, not a fresh flip.
      progress.value = 1;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memory]);

  function handleClose() {
    progress.value = withTiming(0, { duration: FLIP_DURATION_MS, easing: FLIP_EASING }, (finished) => {
      if (finished) {
        runOnJS(setDisplayedMemory)(null);
        runOnJS(onClose)();
      }
    });
  }

  const targetWidth = Math.min(screenWidth - SHEET_MARGIN * 2, SHEET_MAX_WIDTH);
  const targetHeight = Math.min(screenHeight * 0.65, 520);

  // Real width/height/left/top (not a transform scale) — the box actually
  // relayouts each frame rather than rendering at full size and shrinking
  // visually, which would scale its text down along with it and produce a
  // jarring size mismatch against the real card sitting underneath at the
  // start of the animation.
  const containerStyle = useAnimatedStyle(() => {
    const targetLeft = (screenWidth - targetWidth) / 2;
    const targetTop = (screenHeight - targetHeight) / 2;
    const o = originAtOpen.value;
    if (!o) {
      // No measured origin to grow from/shrink into (reopening after
      // editing, not a fresh tap) — size and position stay fixed since
      // there's no specific card to animate to/from, but opacity still
      // tracks progress so closing fades out instead of rotating in place
      // at full size and then hard-popping out of existence when it
      // unmounts.
      return {
        left: targetLeft,
        top: targetTop,
        width: targetWidth,
        height: targetHeight,
        opacity: progress.value,
      };
    }
    const t = progress.value;
    return {
      left: o.x + (targetLeft - o.x) * t,
      top: o.y + (targetTop - o.y) * t,
      width: o.width + (targetWidth - o.width) * t,
      height: o.height + (targetHeight - o.height) * t,
      opacity: 1,
    };
  });

  const frontFaceStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 1200 }, { rotateY: `${progress.value * 180}deg` }],
  }));

  const backFaceStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 1200 }, { rotateY: `${180 + progress.value * 180}deg` }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({ opacity: progress.value }));

  const allTags: Tag[] = displayedMemory
    ? [
        ...displayedMemory.locations.map((v) => ({
          key: `loc:${v}`,
          label: v,
          bg: colors.category.location.bg,
          text: colors.category.location.text,
        })),
        ...displayedMemory.emotions.map((v) => {
          const palette = getEmotionColor(v);
          return { key: `emo:${v}`, label: v, bg: palette.bg, text: palette.text };
        }),
        ...displayedMemory.custom_tags.map((v) => ({
          key: `custom:${v}`,
          label: v,
          bg: colors.category.custom.bg,
          text: colors.category.custom.text,
        })),
      ]
    : [];
  const visibleTags = tagsExpanded ? allTags : allTags.slice(0, MAX_VISIBLE_TAGS);
  const hiddenTagCount = allTags.length - visibleTags.length;

  return (
    <Modal visible={!!displayedMemory} transparent animationType="none" onRequestClose={handleClose}>
      <Pressable style={styles.backdropTouchable} onPress={handleClose}>
        <Animated.View style={[styles.backdrop, backdropStyle]} />
      </Pressable>

      {displayedMemory && (
        <Animated.View style={[styles.flipContainer, containerStyle]}>
          {/* Absorbs taps so they don't fall through to the backdrop
              behind — a single wrapper around both faces rather than one
              per face, since only whichever face backfaceVisibility is
              currently showing should matter for hit-testing anyway. */}
          <Pressable style={styles.tapAbsorb} onPress={() => {}}>
            <Animated.View style={[styles.face, frontFaceStyle]}>
              <MemoryPolaroidFace memory={displayedMemory} />
            </Animated.View>

            <Animated.View style={[styles.face, styles.backFace, backFaceStyle]}>
              {/* Kept separate from backFace itself since overflow:'hidden'
                  on the same view as the shadow style would clip the
                  shadow too. */}
              <View style={styles.backClip}>

              <View style={styles.backContent}>
                <View style={styles.headerRow}>
                  <View style={styles.headerLeft}>
                    <Pressable
                      onPress={() => {
                        onOpenSong(displayedMemory.song_id);
                        handleClose();
                      }}
                    >
                      <Text style={styles.songTitle} numberOfLines={1}>
                        {displayedMemory.songs.title}
                      </Text>
                    </Pressable>
                    <Text style={styles.songArtist} numberOfLines={1}>
                      {displayedMemory.songs.artist}
                    </Text>
                    {displayedMemory.event && (
                      <Pressable
                        onPress={() => {
                          onOpenEvent(displayedMemory.event!.id, displayedMemory.event!.name);
                          handleClose();
                        }}
                      >
                        <Text style={styles.eventLine} numberOfLines={1}>
                          {displayedMemory.event.name}
                        </Text>
                      </Pressable>
                    )}
                  </View>

                  <View style={styles.headerRight}>
                    <Pressable style={styles.editButton} onPress={() => onEdit(displayedMemory)}>
                      <Ionicons name="create-outline" size={13} color={colors.text} />
                      <Text style={styles.editButtonText}>Edit</Text>
                    </Pressable>
                    <Pressable style={styles.closeButton} onPress={handleClose} hitSlop={8}>
                      <Ionicons name="close" size={16} color={colors.textMuted} />
                    </Pressable>
                  </View>
                </View>

                <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
                  {allTags.length > 0 && (
                    <View style={styles.tagList}>
                      {visibleTags.map((tag) => (
                        <Pill key={tag.key} label={tag.label} bg={tag.bg} text={tag.text} />
                      ))}
                      {hiddenTagCount > 0 && (
                        <Pill
                          variant="suggested"
                          label={`+${hiddenTagCount} more`}
                          onPress={() => setTagsExpanded(true)}
                        />
                      )}
                    </View>
                  )}

                  {displayedMemory.note && (
                    <>
                      <View style={styles.noteDivider} />
                      <Text style={styles.note}>{displayedMemory.note}</Text>
                    </>
                  )}
                </ScrollView>
              </View>
              </View>
            </Animated.View>
          </Pressable>
        </Animated.View>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdropTouchable: {
    flex: 1,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(58,38,25,0.55)',
  },
  flipContainer: {
    position: 'absolute',
  },
  tapAbsorb: {
    width: '100%',
    height: '100%',
  },
  // Both faces fill the flip container exactly; backfaceVisibility is what
  // makes only one of them actually show at a given rotation.
  face: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backfaceVisibility: 'hidden',
  },
  backFace: {
    backgroundColor: colors.card,
    borderRadius: FRAME_RADIUS,
    ...shadow.card,
  },
  backClip: {
    flex: 1,
    borderRadius: FRAME_RADIUS,
    overflow: 'hidden',
  },
  backContent: {
    flex: 1,
    padding: spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  headerLeft: {
    flex: 1,
  },
  songTitle: {
    fontFamily: fonts.bodyMedium,
    fontSize: 17,
    color: colors.text,
  },
  songArtist: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 2,
  },
  eventLine: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.accent,
    marginTop: 4,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: spacing.sm + 2,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  editButtonText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.text,
  },
  closeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: spacing.md,
  },
  tagList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  noteDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#EDE4D0',
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  note: {
    fontFamily: fonts.serif,
    fontSize: 16,
    lineHeight: 23,
    color: colors.text,
  },
});
