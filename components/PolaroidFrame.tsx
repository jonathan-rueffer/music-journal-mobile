import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Card from './Card';
import { colors, spacing } from '../theme';

// A polaroid's corners are only just rounded, not the app's usual pill/card
// curve — kept as a local constant rather than a theme token since it's
// specific to this one photo-frame conceit.
export const FRAME_RADIUS = 4;

// Neutral fill for a photo slot with no album art to show — deliberately
// not the app's warm border/card tones, so it reads as "empty," not broken.
export const EMPTY_CELL = '#F1EFE8';

// The footer stripe's four equal segments, left to right. "Rose" has no
// existing token in theme.ts, so it's a one-off hex here rather than a new
// palette entry for a single decorative use.
const STRIPE_COLORS = [colors.accent, colors.category.event.bg, colors.category.location.bg, '#C97B84'];

// The shared polaroid chassis — cream frame, a clipped photo area, and the
// four-color footer stripe — used by both EventCard (a collage/stack of
// songs) and MemoryCard (a single song's photo). Callers supply their own
// photo and caption content; this only owns the surrounding shape.
export default function PolaroidFrame({ photo, caption }: { photo: ReactNode; caption: ReactNode }) {
  return (
    <Card style={styles.frame}>
      {/* Clips the stripe's square bottom corners to match the frame's
          rounded corners — kept separate from the frame/Card view itself
          since overflow:'hidden' on the same view as the shadow style
          would clip the shadow too. */}
      <View style={styles.clip}>
        <View style={styles.content}>
          {photo}
          {caption}
        </View>
        <View style={styles.stripe}>
          {STRIPE_COLORS.map((c, i) => (
            <View key={i} style={[styles.stripeSegment, { backgroundColor: c }]} />
          ))}
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  frame: {
    padding: 0,
    borderRadius: FRAME_RADIUS,
    backgroundColor: colors.card,
  },
  clip: {
    borderRadius: FRAME_RADIUS,
    overflow: 'hidden',
  },
  content: {
    padding: spacing.sm,
  },
  stripe: {
    flexDirection: 'row',
    alignSelf: 'flex-end',
    width: '25%',
    height: 5,
  },
  stripeSegment: {
    flex: 1,
  },
});
