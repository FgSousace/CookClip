import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { NutritionMode, NutritionPanel } from '@/components/nutrition-panel';
import { RecipeVideo, RecipeVideoHandle } from '@/components/recipe-video';
import { IconButton } from '@/components/ui/icon-button';
import { PrimaryButton } from '@/components/ui/primary-button';
import { SectionCard } from '@/components/ui/section-card';
import { radius, spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useRecipeStore } from '@/store/recipe-store';
import { formatBytes, formatTimestamp } from '@/utils/format';
import {
  formatAmount,
  scaleIngredientAmount,
  scaleNutrition,
  totalNutrition,
} from '@/utils/nutrition';

export default function RecipeDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useAppTheme();
  const { getRecipe, deleteRecipe, toggleFavorite } = useRecipeStore();
  const recipe = getRecipe(id);
  const videoRef = useRef<RecipeVideoHandle>(null);
  const [servings, setServings] = useState(recipe?.servings ?? 1);
  const [nutritionMode, setNutritionMode] = useState<NutritionMode>('serving');
  const [checkedIngredients, setCheckedIngredients] = useState<Set<string>>(new Set());

  const nutrition = useMemo(() => {
    if (!recipe) return undefined;
    const baseTotal = totalNutrition(recipe.ingredients);
    const selectedTotal = scaleNutrition(baseTotal, servings / Math.max(1, recipe.servings));
    return nutritionMode === 'total' ? selectedTotal : scaleNutrition(selectedTotal, 1 / Math.max(1, servings));
  }, [nutritionMode, recipe, servings]);

  if (!recipe || !nutrition) {
    return (
      <SafeAreaView style={[styles.safeArea, styles.center, { backgroundColor: colors.background }]}>
        <Ionicons color={colors.textMuted} name="alert-circle-outline" size={44} />
        <Text style={[styles.notFoundTitle, { color: colors.text }]}>Nie znaleziono przepisu</Text>
        <PrimaryButton label="Wróć do dań" onPress={() => router.replace('/')} style={styles.notFoundButton} />
      </SafeAreaView>
    );
  }

  const toggleIngredient = (ingredientId: string) => {
    setCheckedIngredients((current) => {
      const next = new Set(current);
      if (next.has(ingredientId)) next.delete(ingredientId);
      else next.add(ingredientId);
      return next;
    });
  };

  const confirmDelete = () => {
    Alert.alert('Usunąć przepis?', 'Film zapisany przez CookClip również zostanie usunięty z pamięci aplikacji.', [
      { text: 'Anuluj', style: 'cancel' },
      {
        text: 'Usuń',
        style: 'destructive',
        onPress: async () => {
          await deleteRecipe(recipe.id);
          router.replace('/');
        },
      },
    ]);
  };

  const savedPercent =
    recipe.originalVideoBytes && recipe.compressedVideoBytes
      ? Math.max(0, Math.round((1 - recipe.compressedVideoBytes / recipe.originalVideoBytes) * 100))
      : 0;

  return (
    <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={styles.navigation}>
        <IconButton icon="chevron-back" label="Wróć" onPress={() => router.back()} />
        <View style={styles.navigationActions}>
          <IconButton
            icon={recipe.favorite ? 'heart' : 'heart-outline'}
            label={recipe.favorite ? 'Usuń z ulubionych' : 'Dodaj do ulubionych'}
            onPress={() => void toggleFavorite(recipe.id)}
            selected={recipe.favorite}
          />
          <IconButton
            icon="create-outline"
            label="Edytuj przepis"
            onPress={() => router.push({ pathname: '/edit/[id]', params: { id: recipe.id } })}
          />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <RecipeVideo accentColor={recipe.accentColor} ref={videoRef} uri={recipe.videoUri} />

        <View style={styles.titleBlock}>
          <Text style={[styles.category, { color: colors.primary }]}>{recipe.category.toLocaleUpperCase('pl-PL')}</Text>
          <Text style={[styles.title, { color: colors.text }]}>{recipe.title}</Text>
          <View style={styles.facts}>
            <View style={[styles.fact, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Ionicons color={colors.primary} name="time-outline" size={17} />
              <Text style={[styles.factText, { color: colors.text }]}>{recipe.prepMinutes + recipe.cookMinutes} min</Text>
            </View>
            <View style={[styles.fact, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Ionicons color={colors.primary} name="people-outline" size={17} />
              <Text style={[styles.factText, { color: colors.text }]}>{servings} porcje</Text>
            </View>
            {recipe.videoUri ? (
              <View style={[styles.fact, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Ionicons color={colors.primary} name="film-outline" size={17} />
                <Text style={[styles.factText, { color: colors.text }]}>{formatBytes(recipe.compressedVideoBytes)}</Text>
              </View>
            ) : null}
          </View>
        </View>

        <SectionCard
          action={
            <View style={[styles.stepper, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
              <Pressable
                accessibilityLabel="Zmniejsz liczbę porcji"
                disabled={servings <= 1}
                onPress={() => setServings((value) => Math.max(1, value - 1))}
                style={styles.stepperButton}>
                <Ionicons color={servings <= 1 ? colors.textMuted : colors.primary} name="remove" size={18} />
              </Pressable>
              <Text style={[styles.stepperValue, { color: colors.text }]}>{servings}</Text>
              <Pressable
                accessibilityLabel="Zwiększ liczbę porcji"
                onPress={() => setServings((value) => Math.min(24, value + 1))}
                style={styles.stepperButton}>
                <Ionicons color={colors.primary} name="add" size={18} />
              </Pressable>
            </View>
          }
          title="Składniki">
          <View style={styles.ingredientList}>
            {recipe.ingredients.map((ingredient, index) => {
              const checked = checkedIngredients.has(ingredient.id);
              const scaledAmount = scaleIngredientAmount(ingredient.amount, recipe.servings, servings);
              return (
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked }}
                  key={ingredient.id}
                  onPress={() => toggleIngredient(ingredient.id)}
                  style={[
                    styles.ingredient,
                    index > 0 && { borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth },
                  ]}>
                  <View
                    style={[
                      styles.checkbox,
                      { borderColor: checked ? colors.primary : colors.border },
                      checked && { backgroundColor: colors.primary },
                    ]}>
                    {checked ? <Ionicons color="#FFFFFF" name="checkmark" size={15} /> : null}
                  </View>
                  <View style={styles.ingredientNameBlock}>
                    <Text
                      style={[
                        styles.ingredientName,
                        { color: checked ? colors.textMuted : colors.text },
                        checked && styles.checkedText,
                      ]}>
                      {ingredient.name}
                    </Text>
                    {ingredient.note ? (
                      <Text style={[styles.ingredientNote, { color: colors.textMuted }]}>{ingredient.note}</Text>
                    ) : null}
                  </View>
                  <Text style={[styles.ingredientAmount, { color: colors.primary }]}>
                    {formatAmount(scaledAmount)} {ingredient.unit}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </SectionCard>

        <SectionCard title="Wartości odżywcze">
          <NutritionPanel mode={nutritionMode} nutrition={nutrition} onModeChange={setNutritionMode} />
          <Text style={[styles.disclaimer, { color: colors.textMuted }]}>
            Wartości są wyliczeniem na podstawie podanych składników i można je ręcznie poprawić.
          </Text>
        </SectionCard>

        <SectionCard title="Przygotowanie">
          <View style={styles.steps}>
            {recipe.steps
              .slice()
              .sort((left, right) => left.order - right.order)
              .map((step) => (
                <View key={step.id} style={styles.step}>
                  <View style={[styles.stepNumber, { backgroundColor: colors.primary }]}>
                    <Text style={styles.stepNumberText}>{step.order}</Text>
                  </View>
                  <View style={styles.stepContent}>
                    <Text style={[styles.stepInstruction, { color: colors.text }]}>{step.instruction}</Text>
                    {recipe.videoUri && step.videoTimestampSeconds !== undefined ? (
                      <Pressable
                        onPress={() => videoRef.current?.seekTo(step.videoTimestampSeconds!)}
                        style={[styles.timestamp, { backgroundColor: colors.primarySoft }]}>
                        <Ionicons color={colors.primary} name="play" size={12} />
                        <Text style={[styles.timestampText, { color: colors.primary }]}>
                          Odtwórz od {formatTimestamp(step.videoTimestampSeconds)}
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>
                </View>
              ))}
          </View>
        </SectionCard>

        {recipe.videoUri ? (
          <SectionCard title="Film i pamięć">
            <View style={styles.storageRows}>
              <View style={styles.storageRow}>
                <Text style={[styles.storageLabel, { color: colors.textMuted }]}>Oryginał</Text>
                <Text style={[styles.storageValue, { color: colors.text }]}>{formatBytes(recipe.originalVideoBytes)}</Text>
              </View>
              <View style={styles.storageRow}>
                <Text style={[styles.storageLabel, { color: colors.textMuted }]}>Po kompresji</Text>
                <Text style={[styles.storageValue, { color: colors.text }]}>{formatBytes(recipe.compressedVideoBytes)}</Text>
              </View>
              <View style={styles.storageRow}>
                <Text style={[styles.storageLabel, { color: colors.textMuted }]}>Zaoszczędzono</Text>
                <Text style={[styles.storageValue, { color: colors.primary }]}>{savedPercent}%</Text>
              </View>
            </View>
          </SectionCard>
        ) : null}

        {recipe.notes || recipe.sourceLabel || recipe.sourceUrl ? (
          <SectionCard title="Informacje">
            {recipe.notes ? <Text style={[styles.notes, { color: colors.text }]}>{recipe.notes}</Text> : null}
            {recipe.sourceLabel ? (
              <Text style={[styles.sourceLabel, { color: colors.textMuted }]}>Źródło: {recipe.sourceLabel}</Text>
            ) : null}
            {recipe.sourceUrl ? (
              <PrimaryButton
                icon="open-outline"
                label="Otwórz oryginalny film"
                onPress={() => void WebBrowser.openBrowserAsync(recipe.sourceUrl!)}
                variant="secondary"
              />
            ) : null}
          </SectionCard>
        ) : null}

        <View style={styles.bottomActions}>
          <PrimaryButton
            icon="create-outline"
            label="Edytuj cały przepis"
            onPress={() => router.push({ pathname: '/edit/[id]', params: { id: recipe.id } })}
            style={styles.flexButton}
          />
          <PrimaryButton
            icon="trash-outline"
            label="Usuń"
            onPress={confirmDelete}
            style={styles.deleteButton}
            variant="danger"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  navigation: {
    width: '100%',
    maxWidth: 800,
    alignSelf: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  navigationActions: { flexDirection: 'row', gap: spacing.xs },
  content: {
    width: '100%',
    maxWidth: 800,
    alignSelf: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  titleBlock: { gap: spacing.xs, paddingVertical: spacing.xs },
  category: { fontSize: 12, fontWeight: '900', letterSpacing: 1.1 },
  title: { fontSize: 32, lineHeight: 37, fontWeight: '900', letterSpacing: -0.8 },
  facts: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.xs },
  fact: {
    height: 36,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  factText: { fontSize: 12, fontWeight: '800' },
  stepper: { flexDirection: 'row', borderRadius: radius.pill, borderWidth: 1, alignItems: 'center' },
  stepperButton: { width: 35, height: 34, alignItems: 'center', justifyContent: 'center' },
  stepperValue: { minWidth: 25, textAlign: 'center', fontWeight: '900', fontSize: 15 },
  ingredientList: { marginTop: -4 },
  ingredient: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  checkbox: { width: 25, height: 25, borderRadius: 8, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  ingredientNameBlock: { flex: 1, minWidth: 0 },
  ingredientName: { fontSize: 15, fontWeight: '700' },
  checkedText: { textDecorationLine: 'line-through' },
  ingredientNote: { fontSize: 12, marginTop: 3 },
  ingredientAmount: { fontSize: 14, fontWeight: '900' },
  disclaimer: { fontSize: 11, lineHeight: 16 },
  steps: { gap: spacing.lg },
  step: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  stepNumber: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  stepNumberText: { color: '#FFFFFF', fontWeight: '900', fontSize: 14 },
  stepContent: { flex: 1, gap: spacing.xs, paddingTop: 4 },
  stepInstruction: { fontSize: 15, lineHeight: 22, fontWeight: '600' },
  timestamp: { alignSelf: 'flex-start', height: 31, paddingHorizontal: spacing.sm, borderRadius: radius.pill, flexDirection: 'row', alignItems: 'center', gap: 5 },
  timestampText: { fontSize: 11, fontWeight: '900' },
  storageRows: { gap: spacing.sm },
  storageRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  storageLabel: { fontSize: 14, fontWeight: '600' },
  storageValue: { fontSize: 14, fontWeight: '900' },
  notes: { fontSize: 15, lineHeight: 22 },
  sourceLabel: { fontSize: 13, fontWeight: '600' },
  bottomActions: { flexDirection: 'row', gap: spacing.sm },
  flexButton: { flex: 1 },
  deleteButton: { minWidth: 105 },
  notFoundTitle: { fontSize: 22, fontWeight: '900', marginTop: spacing.sm },
  notFoundButton: { marginTop: spacing.lg, width: 220 },
});
