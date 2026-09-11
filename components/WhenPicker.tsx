import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Pill from './Pill';
import { colors, fonts, radii, spacing } from '../theme';
import { animateNextLayout } from '../lib/animateLayout';
import type { MemoryDate, MemoryDatePrecision } from '../lib/songMemories';

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];
const INITIAL_YEARS_SHOWN = 12;
const YEARS_PER_EXPAND = 12;

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function toISO(year: number, month: number, day: number): string {
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

function lastDayOfMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function formatDisplay(year: number, month: number | null, day: number | null): string {
  if (month === null) return String(year);
  if (day === null) return `${MONTH_NAMES[month]} ${year}`;
  return `${MONTH_NAMES[month]} ${day}, ${year}`;
}

type ActiveField = 'year' | 'month' | 'day' | null;

function FieldBox({
  label,
  value,
  placeholder,
  active,
  disabled,
  onToggle,
  children,
}: {
  label: string;
  value: string | null;
  placeholder: string;
  active: boolean;
  disabled?: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.fieldWrapper}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Pressable
        style={[styles.field, value !== null && styles.fieldSet, disabled && styles.fieldDisabled]}
        onPress={disabled ? undefined : onToggle}
      >
        <View style={styles.fieldValueRow}>
          <Text style={[styles.fieldValue, value === null && styles.fieldValueMuted]}>
            {value ?? placeholder}
          </Text>
          <Ionicons
            name={active ? 'chevron-up' : 'chevron-down'}
            size={12}
            color={value === null ? colors.textMuted : colors.text}
          />
        </View>
      </Pressable>
      {active && (
        <View style={styles.dropdown}>
          <ScrollView style={styles.dropdownScroll} nestedScrollEnabled showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

export default function WhenPicker({
  value,
  onChange,
  active,
  onActivate,
  onDeactivate,
}: {
  value: MemoryDate | null;
  onChange: (value: MemoryDate | null) => void;
  // Only one tag row across the capture screen should be open at a time —
  // owned by CaptureScreen, same coordination as the other four categories.
  active: boolean;
  onActivate: () => void;
  onDeactivate: () => void;
}) {
  const [year, setYear] = useState<number | null>(null);
  const [month, setMonth] = useState<number | null>(null);
  const [day, setDay] = useState<number | null>(null);
  const [activeField, setActiveField] = useState<ActiveField>(null);
  const [yearsShown, setYearsShown] = useState(INITIAL_YEARS_SHOWN);

  // Seed the draft fields from the current value each time the row opens —
  // reopening an applied "When" tag pre-shows the level it was set at.
  // Edits are draft-only until Confirm is tapped, so switching away to
  // another row (or reopening later) never applies a half-finished edit.
  useEffect(() => {
    if (!active) return;
    if (value) {
      const start = new Date(value.start + 'T00:00:00');
      setYear(start.getFullYear());
      setMonth(value.precision === 'year' ? null : start.getMonth());
      setDay(value.precision === 'day' ? start.getDate() : null);
    } else {
      setYear(null);
      setMonth(null);
      setDay(null);
    }
    setActiveField(null);
    setYearsShown(INITIAL_YEARS_SHOWN);
  }, [active]); // eslint-disable-line react-hooks/exhaustive-deps

  function selectYear(y: number | null) {
    animateNextLayout();
    setYear(y);
    if (y === null) {
      // Month/Day can't apply without a Year, same as Day depending on Month.
      setMonth(null);
      setDay(null);
    }
    setActiveField(null);
  }

  function selectMonth(m: number | null) {
    animateNextLayout();
    setMonth(m);
    if (m === null) setDay(null); // Day can't apply without a Month
    else if (year !== null && day !== null && day > lastDayOfMonth(year, m)) {
      setDay(lastDayOfMonth(year, m)); // clamp (e.g. Feb 30 -> Feb 28/29)
    }
    setActiveField(null);
  }

  function selectDay(d: number | null) {
    animateNextLayout();
    setDay(d);
    setActiveField(null);
  }

  function toggleField(field: ActiveField) {
    animateNextLayout();
    setActiveField((current) => (current === field ? null : field));
  }

  function useToday() {
    const today = new Date();
    const iso = toISO(today.getFullYear(), today.getMonth(), today.getDate());
    onChange({ start: iso, end: iso, precision: 'day' });
    animateNextLayout();
    onDeactivate();
  }

  function confirm() {
    if (year === null) return;
    const precision: MemoryDatePrecision = day !== null ? 'day' : month !== null ? 'month' : 'year';
    if (precision === 'year') {
      onChange({ start: `${year}-01-01`, end: `${year}-12-31`, precision });
    } else if (precision === 'month' && month !== null) {
      onChange({
        start: toISO(year, month, 1),
        end: toISO(year, month, lastDayOfMonth(year, month)),
        precision,
      });
    } else if (month !== null && day !== null) {
      const iso = toISO(year, month, day);
      onChange({ start: iso, end: iso, precision });
    }
    animateNextLayout();
    onDeactivate();
  }

  function cancel() {
    animateNextLayout();
    onDeactivate();
  }

  function handleActivate() {
    animateNextLayout();
    onActivate();
  }

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: yearsShown }, (_, i) => currentYear - i);
  const dayOptions =
    year !== null && month !== null
      ? Array.from({ length: lastDayOfMonth(year, month) }, (_, i) => i + 1)
      : [];

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Ionicons name="time-outline" size={20} color={colors.text} style={styles.icon} />
        <Text style={styles.label}>When</Text>
      </View>

      {!active && (
        <View style={styles.chipRow}>
          {value ? (
            <Pressable onPress={handleActivate}>
              <Pill
                label={formatDisplay(
                  new Date(value.start + 'T00:00:00').getFullYear(),
                  value.precision === 'year' ? null : new Date(value.start + 'T00:00:00').getMonth(),
                  value.precision === 'day' ? new Date(value.start + 'T00:00:00').getDate() : null
                )}
                bg={colors.accent}
                text={colors.card}
                onRemove={() => onChange(null)}
              />
            </Pressable>
          ) : (
            <Pressable style={styles.addChip} onPress={handleActivate}>
              <Text style={styles.addChipText}>+ add</Text>
            </Pressable>
          )}
        </View>
      )}

      {active && (
        <View>
          <Pressable onPress={useToday} hitSlop={8} style={styles.useTodayButton}>
            <Text style={styles.useTodayText}>Use today</Text>
          </Pressable>

          <View style={styles.fieldsRow}>
            <FieldBox
              label="Year"
              value={year !== null ? String(year) : null}
              placeholder="Any"
              active={activeField === 'year'}
              onToggle={() => toggleField('year')}
            >
              <Pressable style={styles.dropdownRow} onPress={() => selectYear(null)}>
                <Text style={styles.dropdownRowText}>Any</Text>
              </Pressable>
              {yearOptions.map((y) => (
                <Pressable key={y} style={styles.dropdownRow} onPress={() => selectYear(y)}>
                  <Text style={styles.dropdownRowText}>{y}</Text>
                </Pressable>
              ))}
              <Pressable
                style={styles.dropdownRow}
                onPress={() => setYearsShown((n) => n + YEARS_PER_EXPAND)}
              >
                <Text style={styles.dropdownRowText}>More…</Text>
              </Pressable>
            </FieldBox>

            <FieldBox
              label="Month"
              value={month !== null ? MONTH_NAMES[month] : null}
              placeholder="Any"
              active={activeField === 'month'}
              onToggle={() => toggleField('month')}
            >
              <Pressable style={styles.dropdownRow} onPress={() => selectMonth(null)}>
                <Text style={styles.dropdownRowText}>Any</Text>
              </Pressable>
              {MONTH_NAMES.map((m, i) => (
                <Pressable key={m} style={styles.dropdownRow} onPress={() => selectMonth(i)}>
                  <Text style={styles.dropdownRowText}>{m}</Text>
                </Pressable>
              ))}
            </FieldBox>

            <FieldBox
              label="Day"
              value={day !== null ? String(day) : null}
              placeholder="Any"
              active={activeField === 'day'}
              disabled={month === null}
              onToggle={() => toggleField('day')}
            >
              <Pressable style={styles.dropdownRow} onPress={() => selectDay(null)}>
                <Text style={styles.dropdownRowText}>Any</Text>
              </Pressable>
              {dayOptions.map((d) => (
                <Pressable key={d} style={styles.dropdownRow} onPress={() => selectDay(d)}>
                  <Text style={styles.dropdownRowText}>{d}</Text>
                </Pressable>
              ))}
            </FieldBox>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summary}>
              {year !== null ? `Applies as '${formatDisplay(year, month, day)}'` : ''}
            </Text>

            <View style={styles.confirmRow}>
              <Pressable onPress={cancel} hitSlop={8}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={confirm}
                disabled={year === null}
                style={[styles.confirmButton, year === null && styles.confirmButtonDisabled]}
              >
                <Text style={styles.confirmButtonText}>Confirm</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  icon: {
    marginRight: spacing.xs,
  },
  label: {
    fontFamily: fonts.headingSemiBold,
    fontSize: 16,
    color: colors.text,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  addChip: {
    borderRadius: radii.pill,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm + 2,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  addChipText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.textMuted,
  },
  useTodayButton: {
    alignSelf: 'flex-start',
  },
  useTodayText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.textMuted,
    textDecorationLine: 'underline',
    marginBottom: spacing.sm,
  },
  fieldsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  fieldWrapper: {
    flex: 1,
  },
  fieldLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    color: colors.textFaint,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  field: {
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.xs,
    borderRadius: radii.sm,
    borderWidth: 1.5,
    // #C2A87E is the exact "Any"/unset border color named in the When
    // redesign spec — a richer tan than the theme's general border color.
    borderColor: '#C2A87E',
    backgroundColor: colors.card,
  },
  fieldValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
  },
  fieldSet: {
    borderStyle: 'solid',
    borderColor: colors.border,
  },
  fieldDisabled: {
    opacity: 0.5,
  },
  fieldValue: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: colors.text,
  },
  fieldValueMuted: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.textMuted,
  },
  dropdown: {
    marginTop: spacing.xs,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    overflow: 'hidden',
  },
  dropdownScroll: {
    maxHeight: 160,
  },
  dropdownRow: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  dropdownRowText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.text,
    textAlign: 'center',
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  summary: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textFaint,
  },
  confirmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  cancelText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.textMuted,
  },
  confirmButton: {
    backgroundColor: colors.accent,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
  },
  confirmButtonDisabled: {
    opacity: 0.4,
  },
  confirmButtonText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: colors.card,
  },
});
