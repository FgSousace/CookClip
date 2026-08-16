import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { radius, spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';
import { Recipe } from '@/types/recipe';
import { nutritionPerServing } from '@/utils/nutrition';

export function RecipeCard({
  recipe,
  onPress,
  onFavorite,
}: {
  recipe: Recipe;
  onPress: () => void;
  onFavorite: () => void;
}) {
  const { colors } = useAppTheme();
  const nutrition = nutritionPerServing(recipe.ingredients, recipe.servings);

  return (
    <Pressable
      accessibilityLabel={`${recipe.title}, ${Math.round(nutrition.calories)} kilokalorii na porcję`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border, shadowColor: colors.shadow },
        pressed && styles.pressed,
      ]}>
      <View style={[styles.cover, { backgroundColor: recipe.accentColor }]}>
        {recipe.thumbnailUri ? (
          <Image contentFit="cover" source={{ uri: recipe.thumbnailUri }} style={StyleSheet.absoluteFill} />
        ) : (
          <Text style={styles.emoji}>{recipe.coverEmoji}</Text>
        )}
        <View style={styles.coverShade} />
        {recipe.videoUri ? (
          <View style={styles.videoBadge}>
            <Ionicons color="#FFFFFF" name="play" size={12} />
            <Text style={styles.videoBadgeText}>FILM</Text>
          </View>
        ) : null}
        <Pressable
          accessibilityLabel={recipe.favorite ? 'Usuń z ulubionych' : 'Dodaj do ulubionych'}
          hitSlop={8}
          onPress={(event) => {
            event.stopPropagation();
            onFavorite();
          }}
          style={styles.favorite}>
          <Ionicons color="#FFFFFF" name={recipe.favorite ? 'heart' : 'heart-outline'} size={21} />
        </Pressable>
      </View>
      <View style={styles.content}>
        <Text numberOfLines={2} style={[styles.title, { color: colors.text }]}>
          {recipe.title}
        </Text>
        <Text numberOfLines={1} style={[styles.category, { color: colors.textMuted }]}>
          {recipe.category} · {recipe.prepMinutes + recipe.cookMinutes} min
        </Text>
        <View style={styles.macros}>
          <Text style={[styles.calories, { color: colors.primary }]}>{Math.round(nutrition.calories)} kcal</Text>
          <Text style={[styles.protein, { color: colors.textMuted }]}>B {Math.round(nutrition.protein)} g</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 0,
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  pressed: {
    opacity: 0.86,
    transform: [{ scale: 0.985 }],
  },
  cover: {
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  coverShade: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.12)',
  },
  emoji: {
    fontSize: 58,
  },
  favorite: {
    position: 'absolute',
    right: 9,
    top: 9,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.34)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoBadge: {
    position: 'absolute',
    left: 9,
    bottom: 9,
    paddingHorizontal: 8,
    height: 26,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(0,0,0,0.48)',
    flexDirection: 'row',
    gap: 3,
    alignItems: 'center',
  },
  videoBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  content: {
    padding: spacing.sm,
    gap: 5,
  },
  title: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '900',
    minHeight: 40,
  },
  category: {
    fontSize: 12,
    fontWeight: '600',
  },
  macros: {
    marginTop: 3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  calories: {
    fontSize: 13,
    fontWeight: '900',
  },
  protein: {
    fontSize: 12,
    fontWeight: '700',
  },
});
