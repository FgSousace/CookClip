import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/ui/primary-button';
import { SectionCard } from '@/components/ui/section-card';
import { radius, spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useRecipeStore } from '@/store/recipe-store';
import { Ingredient, Nutrients, Recipe, RecipeStep, emptyNutrients } from '@/types/recipe';
import { makeId } from '@/utils/format';

function numberValue(value: string) {
  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function EditableField({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
  keyboardType,
  compact,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'decimal-pad' | 'number-pad' | 'url';
  compact?: boolean;
}) {
  const { colors } = useAppTheme();
  return (
    <View style={[styles.field, compact && styles.compactField]}>
      <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{label}</Text>
      <TextInput
        keyboardType={keyboardType}
        multiline={multiline}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        style={[
          styles.input,
          multiline && styles.multilineInput,
          compact && styles.compactInput,
          { backgroundColor: colors.surfaceElevated, borderColor: colors.border, color: colors.text },
        ]}
        value={value}
      />
    </View>
  );
}

const nutrientFields: { key: keyof Nutrients; label: string }[] = [
  { key: 'calories', label: 'kcal' },
  { key: 'protein', label: 'Białko g' },
  { key: 'carbohydrates', label: 'Węgle g' },
  { key: 'fat', label: 'Tłuszcz g' },
  { key: 'fiber', label: 'Błonnik g' },
  { key: 'sugars', label: 'Cukry g' },
  { key: 'salt', label: 'Sól g' },
];

export default function EditRecipeScreen() {
  const router = useRouter();
  const { id, fresh } = useLocalSearchParams<{ id: string; fresh?: string }>();
  const { colors } = useAppTheme();
  const { getRecipe, updateRecipe } = useRecipeStore();
  const storedRecipe = getRecipe(id);
  const [recipe, setRecipe] = useState<Recipe | undefined>(() =>
    storedRecipe ? JSON.parse(JSON.stringify(storedRecipe)) : undefined,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (recipe || !storedRecipe) return;

    let cancelled = false;
    const hydrate = Promise.resolve().then(() => {
      if (!cancelled) setRecipe(JSON.parse(JSON.stringify(storedRecipe)));
    });

    void hydrate;
    return () => {
      cancelled = true;
    };
  }, [recipe, storedRecipe]);

  const finish = () => router.replace({ pathname: '/recipe/[id]', params: { id } });

  if (!recipe) {
    return (
      <SafeAreaView style={[styles.safeArea, styles.center, { backgroundColor: colors.background }]}>
        <Text style={[styles.missingText, { color: colors.text }]}>Nie znaleziono przepisu do edycji.</Text>
        <PrimaryButton label="Wróć" onPress={() => router.replace('/')} style={styles.missingButton} />
      </SafeAreaView>
    );
  }

  const patchRecipe = (patch: Partial<Recipe>) => setRecipe((current) => (current ? { ...current, ...patch } : current));

  const updateIngredient = (ingredientId: string, patch: Partial<Ingredient>) => {
    patchRecipe({
      ingredients: recipe.ingredients.map((ingredient) =>
        ingredient.id === ingredientId ? { ...ingredient, ...patch } : ingredient,
      ),
    });
  };

  const updateIngredientNutrition = (ingredientId: string, key: keyof Nutrients, value: string) => {
    const ingredient = recipe.ingredients.find((item) => item.id === ingredientId);
    if (!ingredient) return;
    updateIngredient(ingredientId, { nutrition: { ...ingredient.nutrition, [key]: numberValue(value) } });
  };

  const addIngredient = () => {
    patchRecipe({
      ingredients: [
        ...recipe.ingredients,
        {
          id: makeId('ingredient'),
          name: '',
          amount: 0,
          unit: 'g',
          nutrition: emptyNutrients(),
        },
      ],
    });
  };

  const removeIngredient = (ingredientId: string) => {
    patchRecipe({ ingredients: recipe.ingredients.filter((ingredient) => ingredient.id !== ingredientId) });
  };

  const updateStep = (stepId: string, patch: Partial<RecipeStep>) => {
    patchRecipe({ steps: recipe.steps.map((step) => (step.id === stepId ? { ...step, ...patch } : step)) });
  };

  const addStep = () => {
    patchRecipe({
      steps: [
        ...recipe.steps,
        { id: makeId('step'), order: recipe.steps.length + 1, instruction: '' },
      ],
    });
  };

  const removeStep = (stepId: string) => {
    patchRecipe({
      steps: recipe.steps
        .filter((step) => step.id !== stepId)
        .map((step, index) => ({ ...step, order: index + 1 })),
    });
  };

  const moveStep = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= recipe.steps.length) return;
    const steps = [...recipe.steps];
    [steps[index], steps[target]] = [steps[target], steps[index]];
    patchRecipe({ steps: steps.map((step, stepIndex) => ({ ...step, order: stepIndex + 1 })) });
  };

  const save = async () => {
    if (!recipe.title.trim()) {
      setError('Nazwa dania nie może być pusta.');
      return;
    }
    if (!recipe.ingredients.some((ingredient) => ingredient.name.trim())) {
      setError('Dodaj przynajmniej jeden składnik.');
      return;
    }
    if (!recipe.steps.some((step) => step.instruction.trim())) {
      setError('Dodaj przynajmniej jeden krok przygotowania.');
      return;
    }

    try {
      setSaving(true);
      setError(undefined);
      await updateRecipe({
        ...recipe,
        title: recipe.title.trim(),
        category: recipe.category.trim() || 'Inne',
        ingredients: recipe.ingredients.filter((ingredient) => ingredient.name.trim()),
        steps: recipe.steps
          .filter((step) => step.instruction.trim())
          .map((step, index) => ({ ...step, order: index + 1 })),
      });
      finish();
    } catch (reason) {
      setSaving(false);
      setError(reason instanceof Error ? reason.message : 'Nie udało się zapisać zmian.');
    }
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <View style={[styles.navigation, { borderBottomColor: colors.border }]}>
          <Pressable onPress={finish} style={styles.navButton}>
            <Text style={[styles.cancelText, { color: colors.textMuted }]}>Anuluj</Text>
          </Pressable>
          <Text style={[styles.navigationTitle, { color: colors.text }]}>Edytuj przepis</Text>
          <Pressable disabled={saving} onPress={() => void save()} style={styles.navButton}>
            <Text style={[styles.saveText, { color: colors.primary }]}>{saving ? 'Zapisuję…' : 'Zapisz'}</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {fresh === '1' ? (
            <View style={[styles.reviewBanner, { backgroundColor: colors.primarySoft }]}>
              <Ionicons color={colors.primary} name="sparkles-outline" size={24} />
              <View style={styles.reviewTextBlock}>
                <Text style={[styles.reviewTitle, { color: colors.primary }]}>Sprawdź kartę przed zapisaniem</Text>
                <Text style={[styles.reviewText, { color: colors.textMuted }]}>
                  Film jest już bezpiecznie zapisany. Uzupełnij składniki, ilości, makro i kolejne kroki.
                </Text>
              </View>
            </View>
          ) : null}

          <SectionCard title="Podstawowe informacje">
            <EditableField label="Nazwa dania" onChangeText={(title) => patchRecipe({ title })} value={recipe.title} />
            <EditableField label="Kategoria" onChangeText={(category) => patchRecipe({ category })} value={recipe.category} />
            <View style={styles.fieldRow}>
              <EditableField
                compact
                keyboardType="number-pad"
                label="Porcje"
                onChangeText={(value) => patchRecipe({ servings: Math.max(1, Math.round(numberValue(value))) })}
                value={String(recipe.servings)}
              />
              <EditableField
                compact
                keyboardType="number-pad"
                label="Przygotowanie min"
                onChangeText={(value) => patchRecipe({ prepMinutes: Math.round(numberValue(value)) })}
                value={String(recipe.prepMinutes)}
              />
              <EditableField
                compact
                keyboardType="number-pad"
                label="Gotowanie min"
                onChangeText={(value) => patchRecipe({ cookMinutes: Math.round(numberValue(value)) })}
                value={String(recipe.cookMinutes)}
              />
            </View>
          </SectionCard>

          <SectionCard
            action={
              <Pressable onPress={addIngredient} style={[styles.addSmall, { backgroundColor: colors.primarySoft }]}>
                <Ionicons color={colors.primary} name="add" size={17} />
                <Text style={[styles.addSmallText, { color: colors.primary }]}>Składnik</Text>
              </Pressable>
            }
            title="Składniki i makro">
            <View style={styles.editorList}>
              {recipe.ingredients.map((ingredient, index) => (
                <View
                  key={ingredient.id}
                  style={[
                    styles.editorItem,
                    { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
                  ]}>
                  <View style={styles.itemHeader}>
                    <Text style={[styles.itemNumber, { color: colors.primary }]}>Składnik {index + 1}</Text>
                    <Pressable accessibilityLabel="Usuń składnik" onPress={() => removeIngredient(ingredient.id)}>
                      <Ionicons color={colors.danger} name="trash-outline" size={19} />
                    </Pressable>
                  </View>
                  <EditableField
                    label="Nazwa"
                    onChangeText={(name) => updateIngredient(ingredient.id, { name })}
                    placeholder="Np. pierś z kurczaka"
                    value={ingredient.name}
                  />
                  <View style={styles.fieldRow}>
                    <EditableField
                      compact
                      keyboardType="decimal-pad"
                      label="Ilość"
                      onChangeText={(value) => updateIngredient(ingredient.id, { amount: numberValue(value) })}
                      value={String(ingredient.amount).replace('.', ',')}
                    />
                    <EditableField
                      compact
                      label="Jednostka"
                      onChangeText={(unit) => updateIngredient(ingredient.id, { unit })}
                      value={ingredient.unit}
                    />
                    <EditableField
                      compact
                      label="Uwagi"
                      onChangeText={(note) => updateIngredient(ingredient.id, { note })}
                      placeholder="opcjonalnie"
                      value={ingredient.note ?? ''}
                    />
                  </View>
                  <Text style={[styles.macroHint, { color: colors.textMuted }]}>Wartości dla całej podanej ilości</Text>
                  <View style={styles.nutrientGrid}>
                    {nutrientFields.map((field) => (
                      <EditableField
                        compact
                        key={field.key}
                        keyboardType="decimal-pad"
                        label={field.label}
                        onChangeText={(value) => updateIngredientNutrition(ingredient.id, field.key, value)}
                        value={String(ingredient.nutrition[field.key]).replace('.', ',')}
                      />
                    ))}
                  </View>
                </View>
              ))}
            </View>
            <PrimaryButton icon="add" label="Dodaj składnik" onPress={addIngredient} variant="secondary" />
          </SectionCard>

          <SectionCard
            action={
              <Pressable onPress={addStep} style={[styles.addSmall, { backgroundColor: colors.primarySoft }]}>
                <Ionicons color={colors.primary} name="add" size={17} />
                <Text style={[styles.addSmallText, { color: colors.primary }]}>Krok</Text>
              </Pressable>
            }
            title="Przygotowanie">
            <View style={styles.editorList}>
              {recipe.steps.map((step, index) => (
                <View
                  key={step.id}
                  style={[styles.editorItem, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
                  <View style={styles.itemHeader}>
                    <View style={styles.orderControls}>
                      <View style={[styles.orderCircle, { backgroundColor: colors.primary }]}>
                        <Text style={styles.orderText}>{index + 1}</Text>
                      </View>
                      <Pressable disabled={index === 0} onPress={() => moveStep(index, -1)}>
                        <Ionicons color={index === 0 ? colors.border : colors.textMuted} name="arrow-up" size={19} />
                      </Pressable>
                      <Pressable disabled={index === recipe.steps.length - 1} onPress={() => moveStep(index, 1)}>
                        <Ionicons
                          color={index === recipe.steps.length - 1 ? colors.border : colors.textMuted}
                          name="arrow-down"
                          size={19}
                        />
                      </Pressable>
                    </View>
                    <Pressable accessibilityLabel="Usuń krok" onPress={() => removeStep(step.id)}>
                      <Ionicons color={colors.danger} name="trash-outline" size={19} />
                    </Pressable>
                  </View>
                  <EditableField
                    label="Instrukcja"
                    multiline
                    onChangeText={(instruction) => updateStep(step.id, { instruction })}
                    placeholder="Opisz dokładnie, co zrobić"
                    value={step.instruction}
                  />
                  <EditableField
                    keyboardType="number-pad"
                    label="Moment filmu w sekundach"
                    onChangeText={(value) =>
                      updateStep(step.id, { videoTimestampSeconds: value ? Math.round(numberValue(value)) : undefined })
                    }
                    placeholder="Np. 35"
                    value={step.videoTimestampSeconds === undefined ? '' : String(step.videoTimestampSeconds)}
                  />
                </View>
              ))}
            </View>
            <PrimaryButton icon="add" label="Dodaj kolejny krok" onPress={addStep} variant="secondary" />
          </SectionCard>

          <SectionCard title="Źródło i notatki">
            <EditableField
              keyboardType="url"
              label="Link do oryginału"
              onChangeText={(sourceUrl) => patchRecipe({ sourceUrl })}
              placeholder="https://…"
              value={recipe.sourceUrl ?? ''}
            />
            <EditableField
              label="Nazwa źródła"
              onChangeText={(sourceLabel) => patchRecipe({ sourceLabel })}
              placeholder="Np. TikTok @autor"
              value={recipe.sourceLabel ?? ''}
            />
            <EditableField
              label="Własne notatki"
              multiline
              onChangeText={(notes) => patchRecipe({ notes })}
              placeholder="Co zmienić następnym razem?"
              value={recipe.notes ?? ''}
            />
          </SectionCard>

          {error ? (
            <View style={[styles.error, { backgroundColor: colors.dangerSoft }]}>
              <Ionicons color={colors.danger} name="warning-outline" size={19} />
              <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
            </View>
          ) : null}

          <PrimaryButton
            icon="checkmark"
            label={saving ? 'Zapisuję zmiany…' : 'Zapisz cały przepis'}
            loading={saving}
            onPress={() => void save()}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  navigation: { height: 58, borderBottomWidth: StyleSheet.hairlineWidth, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  navigationTitle: { fontSize: 17, fontWeight: '900' },
  navButton: { minWidth: 72, height: 44, alignItems: 'center', justifyContent: 'center' },
  cancelText: { fontSize: 14, fontWeight: '700' },
  saveText: { fontSize: 14, fontWeight: '900' },
  content: { width: '100%', maxWidth: 760, alignSelf: 'center', padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.md },
  reviewBanner: { borderRadius: radius.md, padding: spacing.md, flexDirection: 'row', gap: spacing.sm },
  reviewTextBlock: { flex: 1 },
  reviewTitle: { fontSize: 15, fontWeight: '900' },
  reviewText: { fontSize: 12, lineHeight: 17, marginTop: 3 },
  field: { flex: 1, gap: 5 },
  compactField: { minWidth: 82 },
  fieldLabel: { fontSize: 11, fontWeight: '800' },
  input: { minHeight: 48, borderRadius: radius.sm, borderWidth: 1, paddingHorizontal: spacing.sm, fontSize: 14, fontWeight: '600' },
  compactInput: { minHeight: 43, fontSize: 13, paddingHorizontal: spacing.xs },
  multilineInput: { minHeight: 92, paddingTop: spacing.sm, textAlignVertical: 'top' },
  fieldRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  addSmall: { height: 34, borderRadius: radius.pill, paddingHorizontal: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: 4 },
  addSmallText: { fontSize: 11, fontWeight: '900' },
  editorList: { gap: spacing.sm },
  editorItem: { borderWidth: 1, borderRadius: radius.md, padding: spacing.sm, gap: spacing.sm },
  itemHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  itemNumber: { fontSize: 12, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5 },
  macroHint: { fontSize: 10, fontWeight: '700', marginBottom: -4 },
  nutrientGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  orderControls: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  orderCircle: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  orderText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900' },
  error: { borderRadius: radius.md, padding: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  errorText: { flex: 1, fontSize: 12, lineHeight: 17, fontWeight: '700' },
  missingText: { fontSize: 18, fontWeight: '900' },
  missingButton: { marginTop: spacing.lg, width: 180 },
});
