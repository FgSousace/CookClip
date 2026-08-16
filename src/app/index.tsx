import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RecipeCard } from '@/components/recipe-card';
import { IconButton } from '@/components/ui/icon-button';
import { radius, spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useRecipeStore } from '@/store/recipe-store';
import { formatBytes } from '@/utils/format';

export default function HomeScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const { recipes, loading, error, toggleFavorite, totalVideoBytes } = useRecipeStore();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('Wszystkie');

  const categories = useMemo(
    () => ['Wszystkie', ...Array.from(new Set(recipes.map((recipe) => recipe.category))).sort()],
    [recipes],
  );

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('pl-PL');
    return recipes.filter((recipe) => {
      const categoryMatches = category === 'Wszystkie' || recipe.category === category;
      const queryMatches =
        !normalizedQuery ||
        recipe.title.toLocaleLowerCase('pl-PL').includes(normalizedQuery) ||
        recipe.ingredients.some((ingredient) =>
          ingredient.name.toLocaleLowerCase('pl-PL').includes(normalizedQuery),
        );
      return categoryMatches && queryMatches;
    });
  }, [category, query, recipes]);

  return (
    <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <FlatList
        ListEmptyComponent={
          loading ? (
            <View style={styles.centerState}>
              <ActivityIndicator color={colors.primary} size="large" />
              <Text style={[styles.stateText, { color: colors.textMuted }]}>Otwieram lokalną książkę kucharską…</Text>
            </View>
          ) : (
            <View style={styles.centerState}>
              <Ionicons color={colors.textMuted} name="restaurant-outline" size={44} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>Nie znaleziono dań</Text>
              <Text style={[styles.stateText, { color: colors.textMuted }]}>Zmień wyszukiwanie albo dodaj nowy film.</Text>
            </View>
          )
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.topRow}>
              <View style={styles.brandBlock}>
                <View style={[styles.brandIcon, { backgroundColor: colors.primary }]}>
                  <Ionicons color="#FFFFFF" name="restaurant" size={21} />
                </View>
                <View>
                  <Text style={[styles.brand, { color: colors.text }]}>CookClip</Text>
                  <Text style={[styles.tagline, { color: colors.textMuted }]}>Twoje przepisy. Twoje filmy.</Text>
                </View>
              </View>
              <View style={styles.headerActions}>
                <View style={[styles.storagePill, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Ionicons color={colors.primary} name="phone-portrait-outline" size={15} />
                  <Text style={[styles.storageText, { color: colors.textMuted }]}>{formatBytes(totalVideoBytes)}</Text>
                </View>
                <IconButton icon="settings-outline" label="Pamięć i ustawienia" onPress={() => router.push('/storage')} />
              </View>
            </View>

            <View style={[styles.search, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Ionicons color={colors.textMuted} name="search" size={20} />
              <TextInput
                accessibilityLabel="Szukaj przepisów"
                onChangeText={setQuery}
                placeholder="Szukaj dania lub składnika"
                placeholderTextColor={colors.textMuted}
                style={[styles.searchInput, { color: colors.text }]}
                value={query}
              />
              {query ? (
                <Pressable accessibilityLabel="Wyczyść wyszukiwanie" onPress={() => setQuery('')}>
                  <Ionicons color={colors.textMuted} name="close-circle" size={20} />
                </Pressable>
              ) : null}
            </View>

            <ScrollView
              contentContainerStyle={styles.categories}
              horizontal
              showsHorizontalScrollIndicator={false}>
              {categories.map((item) => {
                const selected = category === item;
                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    key={item}
                    onPress={() => setCategory(item)}
                    style={[
                      styles.category,
                      {
                        backgroundColor: selected ? colors.primary : colors.surface,
                        borderColor: selected ? colors.primary : colors.border,
                      },
                    ]}>
                    <Text style={[styles.categoryText, { color: selected ? '#FFFFFF' : colors.text }]}>{item}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={styles.sectionHeading}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Twoje dania</Text>
              <Text style={[styles.count, { color: colors.textMuted }]}>{filtered.length}</Text>
            </View>
            {error ? (
              <View style={[styles.error, { backgroundColor: colors.dangerSoft }]}>
                <Ionicons color={colors.danger} name="warning-outline" size={18} />
                <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
              </View>
            ) : null}
          </View>
        }
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContent}
        data={filtered}
        keyExtractor={(recipe) => recipe.id}
        numColumns={2}
        renderItem={({ item }) => (
          <RecipeCard
            onFavorite={() => void toggleFavorite(item.id)}
            onPress={() => router.push({ pathname: '/recipe/[id]', params: { id: item.id } })}
            recipe={item}
          />
        )}
        showsVerticalScrollIndicator={false}
      />

      <Pressable
        accessibilityLabel="Dodaj przepis"
        accessibilityRole="button"
        onPress={() => router.push('/add')}
        style={({ pressed }) => [
          styles.addButton,
          { backgroundColor: colors.primary, shadowColor: colors.shadow },
          pressed && styles.addPressed,
        ]}>
        <Ionicons color="#FFFFFF" name="add" size={30} />
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  listContent: {
    width: '100%',
    maxWidth: 920,
    alignSelf: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: 110,
  },
  header: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  brandBlock: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  brandIcon: {
    width: 44,
    height: 44,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: {
    fontSize: 25,
    lineHeight: 28,
    fontWeight: '900',
    letterSpacing: -0.7,
  },
  tagline: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  storagePill: {
    height: 40,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  storageText: {
    fontSize: 11,
    fontWeight: '800',
  },
  search: {
    height: 54,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 15,
    fontWeight: '600',
  },
  categories: {
    gap: spacing.xs,
    paddingRight: spacing.md,
  },
  category: {
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '800',
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  sectionTitle: {
    fontSize: 23,
    fontWeight: '900',
  },
  count: {
    fontSize: 14,
    fontWeight: '800',
  },
  row: {
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  centerState: {
    minHeight: 280,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '900',
    marginTop: spacing.sm,
  },
  stateText: {
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
    marginTop: spacing.xs,
  },
  error: {
    borderRadius: radius.sm,
    padding: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
  },
  addButton: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.25,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 7,
  },
  addPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.96 }],
  },
});
