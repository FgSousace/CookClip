import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IconButton } from '@/components/ui/icon-button';
import { PrimaryButton } from '@/components/ui/primary-button';
import { SectionCard } from '@/components/ui/section-card';
import { radius, spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';
import { deleteManagedMedia, recompressRecipeVideo } from '@/services/media-storage';
import { useRecipeStore } from '@/store/recipe-store';
import { formatBytes } from '@/utils/format';

export default function StorageScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const { recipes, totalVideoBytes, updateRecipe } = useRecipeStore();
  const [compressingId, setCompressingId] = useState<string>();
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState<string>();

  const videoRecipes = useMemo(
    () => recipes.filter((recipe) => recipe.videoUri).sort((left, right) => (right.compressedVideoBytes ?? 0) - (left.compressedVideoBytes ?? 0)),
    [recipes],
  );

  const totalOriginalBytes = videoRecipes.reduce((sum, recipe) => sum + (recipe.originalVideoBytes ?? 0), 0);
  const totalSavedBytes = Math.max(0, totalOriginalBytes - totalVideoBytes);

  const compressMore = async (recipeId: string) => {
    const recipe = recipes.find((item) => item.id === recipeId);
    if (!recipe?.videoUri) return;
    try {
      setMessage(undefined);
      setProgress(0);
      setCompressingId(recipe.id);
      const media = await recompressRecipeVideo(recipe, 'compact', setProgress);
      await updateRecipe({
        ...recipe,
        videoUri: media.videoUri,
        thumbnailUri: media.thumbnailUri ?? recipe.thumbnailUri,
        compressedVideoBytes: media.compressedBytes,
        compressionProfile: 'compact',
      });
      await deleteManagedMedia(recipe);
      setMessage(`Film „${recipe.title}” został ponownie skompresowany.`);
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : 'Nie udało się ponownie skompresować filmu.');
    } finally {
      setCompressingId(undefined);
      setProgress(0);
    }
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={styles.navigation}>
        <IconButton icon="chevron-back" label="Wróć" onPress={() => router.back()} />
        <Text style={[styles.navigationTitle, { color: colors.text }]}>Pamięć i prywatność</Text>
        <View style={styles.navigationSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.storageHero, { backgroundColor: colors.primary }]}>
          <Ionicons color="rgba(255,255,255,0.85)" name="phone-portrait-outline" size={28} />
          <Text style={styles.storageHeroValue}>{formatBytes(totalVideoBytes)}</Text>
          <Text style={styles.storageHeroLabel}>zajmują wszystkie filmy CookClip</Text>
          <View style={styles.storageStats}>
            <View style={styles.storageStat}>
              <Text style={styles.storageStatValue}>{videoRecipes.length}</Text>
              <Text style={styles.storageStatLabel}>filmów</Text>
            </View>
            <View style={styles.storageDivider} />
            <View style={styles.storageStat}>
              <Text style={styles.storageStatValue}>{formatBytes(totalSavedBytes)}</Text>
              <Text style={styles.storageStatLabel}>zaoszczędzone</Text>
            </View>
          </View>
        </View>

        <SectionCard title="Filmy według rozmiaru">
          {videoRecipes.length ? (
            <View style={styles.videoList}>
              {videoRecipes.map((recipe, index) => {
                const compressing = compressingId === recipe.id;
                return (
                  <View
                    key={recipe.id}
                    style={[
                      styles.videoRow,
                      index > 0 && { borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth },
                    ]}>
                    <Pressable
                      onPress={() => router.push({ pathname: '/recipe/[id]', params: { id: recipe.id } })}
                      style={styles.videoInfo}>
                      <View style={[styles.videoEmoji, { backgroundColor: recipe.accentColor }]}>
                        <Text style={styles.videoEmojiText}>{recipe.coverEmoji}</Text>
                      </View>
                      <View style={styles.videoTextBlock}>
                        <Text numberOfLines={1} style={[styles.videoTitle, { color: colors.text }]}>{recipe.title}</Text>
                        <Text style={[styles.videoMeta, { color: colors.textMuted }]}>
                          {formatBytes(recipe.compressedVideoBytes)} · {recipe.compressionProfile ?? 'bez profilu'}
                        </Text>
                      </View>
                    </Pressable>
                    {compressing ? (
                      <View style={styles.compressProgress}>
                        <Text style={[styles.progressText, { color: colors.primary }]}>{Math.round(progress * 100)}%</Text>
                      </View>
                    ) : (
                      <Pressable
                        disabled={Boolean(compressingId) || recipe.compressionProfile === 'compact'}
                        onPress={() => void compressMore(recipe.id)}
                        style={[
                          styles.compactButton,
                          { backgroundColor: colors.primarySoft },
                          recipe.compressionProfile === 'compact' && styles.disabled,
                        ]}>
                        <Ionicons color={colors.primary} name="contract-outline" size={16} />
                        <Text style={[styles.compactButtonText, { color: colors.primary }]}>Zmniejsz</Text>
                      </Pressable>
                    )}
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={styles.empty}>
              <Ionicons color={colors.textMuted} name="film-outline" size={34} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>Nie zapisano jeszcze żadnych filmów.</Text>
            </View>
          )}
        </SectionCard>

        {message ? (
          <View style={[styles.message, { backgroundColor: colors.primarySoft }]}>
            <Ionicons color={colors.primary} name="information-circle-outline" size={20} />
            <Text style={[styles.messageText, { color: colors.text }]}>{message}</Text>
          </View>
        ) : null}

        <SectionCard title="Zasady przechowywania">
          {[
            ['cloud-offline-outline', 'Bez chmury', 'Filmy, przepisy i baza danych pozostają na urządzeniu.'],
            ['trash-bin-outline', 'Oryginał jest czyszczony', 'Po udanym imporcie CookClip zachowuje tylko skompresowaną kopię.'],
            ['shield-checkmark-outline', 'Prywatnie', 'Nie wymagamy konta i nie wysyłamy telemetrii dotyczącej przepisów.'],
          ].map(([icon, title, description]) => (
            <View key={title} style={styles.rule}>
              <View style={[styles.ruleIcon, { backgroundColor: colors.primarySoft }]}>
                <Ionicons color={colors.primary} name={icon as keyof typeof Ionicons.glyphMap} size={20} />
              </View>
              <View style={styles.ruleTextBlock}>
                <Text style={[styles.ruleTitle, { color: colors.text }]}>{title}</Text>
                <Text style={[styles.ruleDescription, { color: colors.textMuted }]}>{description}</Text>
              </View>
            </View>
          ))}
        </SectionCard>

        <PrimaryButton icon="add" label="Dodaj kolejny film" onPress={() => router.push('/add')} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  navigation: { width: '100%', maxWidth: 760, alignSelf: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  navigationTitle: { fontSize: 17, fontWeight: '900' },
  navigationSpacer: { width: 44 },
  content: { width: '100%', maxWidth: 760, alignSelf: 'center', padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.md },
  storageHero: { borderRadius: radius.xl, padding: spacing.lg, alignItems: 'center' },
  storageHeroValue: { color: '#FFFFFF', fontSize: 40, lineHeight: 45, fontWeight: '900', marginTop: spacing.xs },
  storageHeroLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '700' },
  storageStats: { marginTop: spacing.lg, width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-evenly' },
  storageStat: { flex: 1, alignItems: 'center' },
  storageStatValue: { color: '#FFFFFF', fontSize: 17, fontWeight: '900' },
  storageStatLabel: { color: 'rgba(255,255,255,0.72)', fontSize: 10, fontWeight: '700', marginTop: 2 },
  storageDivider: { height: 32, width: 1, backgroundColor: 'rgba(255,255,255,0.3)' },
  videoList: { gap: 0 },
  videoRow: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  videoInfo: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  videoEmoji: { width: 46, height: 46, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  videoEmojiText: { fontSize: 24 },
  videoTextBlock: { flex: 1, minWidth: 0 },
  videoTitle: { fontSize: 14, fontWeight: '900' },
  videoMeta: { fontSize: 11, fontWeight: '600', marginTop: 3 },
  compactButton: { height: 34, borderRadius: radius.pill, paddingHorizontal: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: 4 },
  compactButtonText: { fontSize: 10, fontWeight: '900' },
  disabled: { opacity: 0.42 },
  compressProgress: { width: 52, alignItems: 'flex-end' },
  progressText: { fontSize: 12, fontWeight: '900' },
  empty: { minHeight: 130, alignItems: 'center', justifyContent: 'center', gap: spacing.xs },
  emptyText: { fontSize: 13, fontWeight: '600' },
  message: { borderRadius: radius.md, padding: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  messageText: { flex: 1, fontSize: 12, lineHeight: 17, fontWeight: '700' },
  rule: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  ruleIcon: { width: 42, height: 42, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  ruleTextBlock: { flex: 1 },
  ruleTitle: { fontSize: 14, fontWeight: '900' },
  ruleDescription: { fontSize: 11, lineHeight: 16, marginTop: 2 },
});
