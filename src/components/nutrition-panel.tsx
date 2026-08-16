import { Pressable, StyleSheet, Text, View } from 'react-native';

import { radius, spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';
import { Nutrients } from '@/types/recipe';

export type NutritionMode = 'serving' | 'total';

const macroItems: { key: keyof Nutrients; label: string; unit: string }[] = [
  { key: 'protein', label: 'Białko', unit: 'g' },
  { key: 'carbohydrates', label: 'Węglowodany', unit: 'g' },
  { key: 'fat', label: 'Tłuszcz', unit: 'g' },
  { key: 'fiber', label: 'Błonnik', unit: 'g' },
  { key: 'sugars', label: 'Cukry', unit: 'g' },
  { key: 'salt', label: 'Sól', unit: 'g' },
];

export function NutritionPanel({
  nutrition,
  mode,
  onModeChange,
}: {
  nutrition: Nutrients;
  mode: NutritionMode;
  onModeChange: (mode: NutritionMode) => void;
}) {
  const { colors } = useAppTheme();

  return (
    <View style={styles.root}>
      <View style={[styles.segment, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
        {(
          [
            ['serving', 'Na porcję'],
            ['total', 'Całość'],
          ] as const
        ).map(([value, label]) => {
          const selected = mode === value;
          return (
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              key={value}
              onPress={() => onModeChange(value)}
              style={[styles.segmentButton, selected && { backgroundColor: colors.primary }]}>
              <Text style={[styles.segmentText, { color: selected ? '#FFFFFF' : colors.textMuted }]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={[styles.calories, { backgroundColor: colors.primarySoft }]}>
        <Text style={[styles.calorieValue, { color: colors.primary }]}>{Math.round(nutrition.calories)}</Text>
        <View>
          <Text style={[styles.calorieUnit, { color: colors.primary }]}>kcal</Text>
          <Text style={[styles.calorieCaption, { color: colors.textMuted }]}>
            {mode === 'serving' ? 'w jednej porcji' : 'w całym daniu'}
          </Text>
        </View>
      </View>

      <View style={styles.grid}>
        {macroItems.map((item) => (
          <View key={item.key} style={[styles.macro, { backgroundColor: colors.surfaceElevated }]}>
            <Text style={[styles.macroValue, { color: colors.text }]}>
              {item.key === 'salt' ? nutrition[item.key].toFixed(1).replace('.', ',') : Math.round(nutrition[item.key])}
              <Text style={[styles.macroUnit, { color: colors.textMuted }]}> {item.unit}</Text>
            </Text>
            <Text style={[styles.macroLabel, { color: colors.textMuted }]}>{item.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: spacing.md,
  },
  segment: {
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    padding: 3,
  },
  segmentButton: {
    flex: 1,
    height: 38,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentText: {
    fontWeight: '800',
    fontSize: 13,
  },
  calories: {
    borderRadius: radius.md,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  calorieValue: {
    fontSize: 40,
    lineHeight: 44,
    fontWeight: '900',
  },
  calorieUnit: {
    fontSize: 16,
    fontWeight: '900',
  },
  calorieCaption: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  macro: {
    width: '31%',
    flexGrow: 1,
    minWidth: 88,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  macroValue: {
    fontSize: 16,
    fontWeight: '900',
  },
  macroUnit: {
    fontSize: 12,
    fontWeight: '700',
  },
  macroLabel: {
    marginTop: 3,
    fontSize: 11,
    fontWeight: '600',
  },
});
