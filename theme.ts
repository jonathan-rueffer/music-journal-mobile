// Polaroid / vintage-Instagram palette (DESIGN_2.md) — warm camera-era tones
// in the spirit of the pre-2016 Instagram logo's sunset gradient and brown
// leather body. A deliberate departure from a neutral corporate palette;
// every surface should read warm, not just a single accented button on an
// otherwise neutral theme.
export const colors = {
  background: '#F4EDE0', // cream
  card: '#FFFDF8', // warm white — surfaces/cards
  text: '#5A3B26', // leather brown — headings/primary text
  textMuted: '#8A5A3B', // mid brown — labels/secondary copy
  textFaint: '#B49A7C', // faded tan — tertiary/meta text
  border: '#D9CBB0', // warm tan — card borders, dashed "add" chip outlines
  accent: '#D85A30', // sunset coral — the ONE accent-filled primary action
  danger: '#B23A2E', // deep rust-red
  success: '#3E7A72', // reuse the location teal as a positive/success signal

  // The sunset-gradient pair used by GradientButton's filled variant (coral
  // -> mustard), evoking the old Instagram ombré. Reserved for the single
  // primary action per screen (Save, Sign in) — see DESIGN_2.md: "only one
  // accent-filled primary action per screen."
  gradientStart: '#D85A30',
  gradientEnd: '#E0A034',

  // Fixed per-category colors for applied tag chips — none of these need
  // DESIGN_2.md's per-value color-consistency rule (that's emotion-only).
  // Deliberately none of these reuse the primary coral accent, so an applied
  // tag chip never visually competes with the screen's one coral action.
  // "date"/When has no fixed category color of its own — its applied tag
  // uses the primary coral accent instead (per the When redesign), and its
  // "Any"/unset field styling uses one-off colors defined in WhenPicker.
  category: {
    event: { bg: '#E0A034', text: '#5A3B26' }, // golden mustard
    location: { bg: '#3E7A72', text: '#FFFDF8' }, // faded teal
    custom: { bg: '#8A5A3B', text: '#FFFDF8' }, // mid brown
  },
  // Suggested-but-not-applied tags: dashed outline, muted, no fill — must
  // stay visually distinct from applied chips' solid category colors across
  // *every* category (DESIGN_2.md: "this distinction matters and should not
  // be blurred"), so it deliberately does not vary by category. Uses the
  // exact "Border" role from the palette table, which DESIGN_2.md names
  // specifically for this purpose.
  suggestion: {
    border: '#D9CBB0',
    text: '#8A5A3B',
  },
} as const;

// DESIGN_2.md: "Emotion tag colors: a scalable, deterministic system."
// Tier 1 — a curated valence lexicon maps common emotion words to a family,
// reusing hues from the core palette rather than introducing new ones.
// Tier 2 — within the matched family, hash the exact word to pick one of a
// few shades, so related words read as the same family while still being
// distinguishable. Unrecognized words fall back to a muted neutral family,
// via the same hashing — fully deterministic, no storage needed.
type Shade = { bg: string; text: string; solid: string };

const FAMILIES = {
  // Warm, high-energy positive — coral family (reuses the primary accent hue)
  coral: [
    { bg: '#F7D9C4', text: '#B8461F', solid: '#D9743F' },
    { bg: '#F4C7A8', text: '#A63D1A', solid: '#CC6530' },
    { bg: '#F9E0CC', text: '#C25226', solid: '#E08048' },
  ],
  // Warm, calm positive — mustard/gold family (reuses the event hue)
  mustard: [
    { bg: '#F3E1B0', text: '#8A6420', solid: '#C99A3E' },
    { bg: '#EAD08C', text: '#7A5518', solid: '#B98A2E' },
    { bg: '#F6E8C4', text: '#96751F', solid: '#D2A94E' },
  ],
  // Cool, calm — teal family (reuses the location hue)
  teal: [
    { bg: '#CFE3DF', text: '#2C5F58', solid: '#4C8880' },
    { bg: '#BBDAD4', text: '#24504A', solid: '#3E7A72' },
    { bg: '#DCEAE7', text: '#356F67', solid: '#5C9A91' },
  ],
  // Cool, low-energy negative — muted blue-slate family
  slate: [
    { bg: '#D3D9DC', text: '#4A5A63', solid: '#6E828C' },
    { bg: '#C2CBCF', text: '#3E4C54', solid: '#5C6B73' },
    { bg: '#DEE3E5', text: '#55646C', solid: '#7C8F98' },
  ],
  // Intense negative — deep rust family
  rust: [
    { bg: '#E3C1B8', text: '#8C3A2B', solid: '#A6432F' },
    { bg: '#D9AA9C', text: '#7A2F21', solid: '#93392A' },
    { bg: '#EAD0C8', text: '#9C4433', solid: '#B8523D' },
  ],
  // Fallback for unrecognized words — muted neutral
  neutral: [
    { bg: '#E3DED4', text: '#6B6357', solid: '#948A78' },
    { bg: '#D9D2C4', text: '#5C5548', solid: '#847A68' },
    { bg: '#EDE8DE', text: '#7A7264', solid: '#A69A84' },
  ],
} as const satisfies Record<string, Shade[]>;

type Family = keyof typeof FAMILIES;

// Small bundled valence lexicon — common journaling emotion words mapped to
// a family by emotional tone. Deliberately not exhaustive: anything missing
// falls back to the neutral family via the same hashing, so coverage gaps
// never break the system, just skip the tier-1 grouping.
const EMOTION_LEXICON: Record<string, Family> = {
  // warm, high-energy positive
  happy: 'coral', excited: 'coral', elated: 'coral', joyful: 'coral',
  thrilled: 'coral', ecstatic: 'coral', cheerful: 'coral', delighted: 'coral',
  amazed: 'coral', energetic: 'coral', giddy: 'coral', euphoric: 'coral',
  // warm, calm positive
  nostalgic: 'mustard', content: 'mustard', grateful: 'mustard', cozy: 'mustard',
  fond: 'mustard', sentimental: 'mustard', warm: 'mustard', comfortable: 'mustard',
  satisfied: 'mustard', proud: 'mustard', hopeful: 'mustard', loved: 'mustard',
  // cool, calm
  peaceful: 'teal', relaxed: 'teal', serene: 'teal', tranquil: 'teal',
  mellow: 'teal', chill: 'teal', quiet: 'teal', still: 'teal',
  soothed: 'teal', calm: 'teal',
  // cool, low-energy negative
  sad: 'slate', lonely: 'slate', wistful: 'slate', melancholy: 'slate',
  blue: 'slate', down: 'slate', tired: 'slate', weary: 'slate',
  empty: 'slate', numb: 'slate', longing: 'slate', bittersweet: 'slate',
  // intense negative
  angry: 'rust', anxious: 'rust', stressed: 'rust', frustrated: 'rust',
  furious: 'rust', panicked: 'rust', overwhelmed: 'rust', irritated: 'rust',
  scared: 'rust', afraid: 'rust', worried: 'rust', jealous: 'rust',
};

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function getEmotionColor(name: string): Shade {
  const key = name.trim().toLowerCase();
  const family = EMOTION_LEXICON[key] ?? 'neutral';
  const shades = FAMILIES[family];
  return shades[hashString(key) % shades.length];
}

// Events have no valence lexicon to key off of (unlike emotions), so this
// just hashes the name straight into one of the warm/cool palette families
// for variety — deterministic per event, but not otherwise meaningful.
// "neutral" is excluded on purpose: it exists as emotion's unrecognized-word
// fallback, not a good general-purpose "vintage" color for this.
const EVENT_COLOR_FAMILIES: Family[] = ['coral', 'mustard', 'teal', 'slate', 'rust'];

export function getEventColor(name: string): Shade {
  const key = name.trim().toLowerCase();
  const family = EVENT_COLOR_FAMILIES[hashString(key) % EVENT_COLOR_FAMILIES.length];
  const shades = FAMILIES[family];
  return shades[hashString(key) % shades.length];
}

export const radii = {
  sm: 8,
  md: 16,
  lg: 24,
  pill: 999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const shadow = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  soft: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
} as const;

export const fonts = {
  heading: 'Raleway_700Bold',
  headingSemiBold: 'Raleway_600SemiBold',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemiBold: 'Inter_600SemiBold',
  serif: 'PlayfairDisplay_400Regular',
} as const;
