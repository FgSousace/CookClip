import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import type { ImagePickerAsset } from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
import { radius, spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';
import { analyzeSourceLink, LinkImportResult } from '@/services/link-import';
import {
  compressionProfiles,
  pickVideoFromLibrary,
  prepareVideo,
} from '@/services/media-storage';
import { useRecipeStore } from '@/store/recipe-store';
import { CompressionProfile, emptyNutrients } from '@/types/recipe';
import { formatBytes, formatDuration, makeId } from '@/utils/format';

type ImportMode = 'link' | 'file';

const accentColors = ['#2F7D4A', '#E4854F', '#D45A45', '#597FBA', '#8A62B4'];

function titleFromAsset(asset: ImagePickerAsset) {
  const name = asset.fileName?.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim();
  return name || 'Nowy przepis z filmu';
}

export default function AddRecipeScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const { createRecipe } = useRecipeStore();
  const [mode, setMode] = useState<ImportMode>('link');
  const [sourceUrl, setSourceUrl] = useState('');
  const [title, setTitle] = useState('');
  const [asset, setAsset] = useState<ImagePickerAsset>();
  const [profile, setProfile] = useState<CompressionProfile>('balanced');
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [analyzingLink, setAnalyzingLink] = useState(false);
  const [linkResult, setLinkResult] = useState<LinkImportResult>();
  const [error, setError] = useState<string>();

  const socialPlatform = useMemo(() => {
    const value = sourceUrl.toLowerCase();
    if (value.includes('tiktok.com')) return 'TikTok';
    if (value.includes('instagram.com')) return 'Instagram';
    if (value.includes('youtube.com') || value.includes('youtu.be')) return 'YouTube';
    return undefined;
  }, [sourceUrl]);

  const chooseVideo = async () => {
    try {
      setError(undefined);
      const picked = await pickVideoFromLibrary();
      if (!picked) return;
      setAsset(picked);
      setTitle((current) => current || titleFromAsset(picked));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Nie udało się otworzyć galerii.');
    }
  };

  const pasteLink = async () => {
    const value = await Clipboard.getStringAsync();
    setSourceUrl(value.trim());
    setLinkResult(undefined);
  };

  const analyzeLink = async () => {
    if (!sourceUrl.trim()) {
      setError('Najpierw wklej link do filmu.');
      return;
    }

    try {
      setError(undefined);
      setAnalyzingLink(true);
      const result = await analyzeSourceLink(sourceUrl);
      setLinkResult(result);
      setTitle((current) => current || result.title || 'Nowy przepis z filmu');
    } catch (reason) {
      setLinkResult(undefined);
      setError(
        `${reason instanceof Error ? reason.message : 'Nie udało się odczytać opisu.'} Nadal możesz dodać film z galerii i uzupełnić kartę ręcznie.`,
      );
    } finally {
      setAnalyzingLink(false);
    }
  };

  const createFromVideo = async () => {
    if (!asset) {
      setError('Film jest wymagany — wybierz go z telefonu, aby przepis zawsze miał własne wideo.');
      return;
    }

    try {
      setError(undefined);
      setProcessing(true);
      setProgress(0.02);
      const media = await prepareVideo(asset, profile, setProgress);
      const importedIngredients = linkResult?.ingredients.map((ingredient) => ({
        id: makeId('ingredient'),
        ...ingredient,
        nutrition: emptyNutrients(),
      }));
      const importedSteps = linkResult?.steps.map((instruction, index) => ({
        id: makeId('step'),
        order: index + 1,
        instruction,
      }));
      const mediaNote = media.usedCompressionFallback
        ? 'Film został bezpiecznie zapisany. Pełna kompresja wymaga zainstalowanej wersji rozwojowej CookClip.'
        : 'Film został skompresowany lokalnie. Oryginał nie jest przechowywany przez CookClip.';
      const recipe = await createRecipe({
        title: title.trim() || titleFromAsset(asset),
        category: 'Do uzupełnienia',
        coverEmoji: '🎬',
        accentColor: accentColors[Math.floor(Math.random() * accentColors.length)],
        sourceUrl: sourceUrl.trim() || undefined,
        sourceLabel: linkResult?.sourceLabel ?? socialPlatform ?? (sourceUrl ? 'Link źródłowy' : 'Film z telefonu'),
        videoUri: media.videoUri,
        thumbnailUri: media.thumbnailUri,
        videoDurationSeconds: media.durationSeconds,
        originalVideoBytes: media.originalBytes,
        compressedVideoBytes: media.compressedBytes,
        compressionProfile: media.profile,
        servings: 1,
        prepMinutes: 0,
        cookMinutes: 0,
        ingredients: importedIngredients?.length
          ? importedIngredients
          : [
              {
                id: makeId('ingredient'),
                name: 'Dodaj pierwszy składnik',
                amount: 0,
                unit: 'g',
                nutrition: emptyNutrients(),
              },
            ],
        steps: importedSteps?.length
          ? importedSteps
          : [
              {
                id: makeId('step'),
                order: 1,
                instruction: 'Uzupełnij instrukcję przygotowania po analizie filmu.',
                videoTimestampSeconds: 0,
              },
            ],
        notes: linkResult?.description
          ? `${mediaNote}\n\nOpis źródłowy:\n${linkResult.description}`
          : mediaNote,
        favorite: false,
      });
      router.replace({ pathname: '/edit/[id]', params: { id: recipe.id, fresh: '1' } });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Nie udało się przygotować filmu.');
      setProcessing(false);
    }
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <View style={styles.navigation}>
          <Pressable accessibilityLabel="Zamknij" onPress={() => router.back()} style={styles.closeButton}>
            <Ionicons color={colors.text} name="close" size={28} />
          </Pressable>
          <Text style={[styles.navigationTitle, { color: colors.text }]}>Dodaj przepis</Text>
          <View style={styles.navigationSpacer} />
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View>
            <Text style={[styles.heroTitle, { color: colors.text }]}>Zamień film w przepis</Text>
            <Text style={[styles.heroText, { color: colors.textMuted }]}>
              Film zostanie zapisany i skompresowany bezpośrednio na telefonie. Nic nie trafia na nasz serwer.
            </Text>
          </View>

          <View style={[styles.segment, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
            {(
              [
                ['link', 'Wklej link', 'link-outline'],
                ['file', 'Film z telefonu', 'phone-portrait-outline'],
              ] as const
            ).map(([value, label, icon]) => {
              const selected = mode === value;
              return (
                <Pressable
                  accessibilityRole="tab"
                  accessibilityState={{ selected }}
                  key={value}
                  onPress={() => setMode(value)}
                  style={[styles.segmentButton, selected && { backgroundColor: colors.primary }]}>
                  <Ionicons color={selected ? '#FFFFFF' : colors.textMuted} name={icon} size={17} />
                  <Text style={[styles.segmentText, { color: selected ? '#FFFFFF' : colors.textMuted }]}>{label}</Text>
                </Pressable>
              );
            })}
          </View>

          {mode === 'link' ? (
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Link do filmu</Text>
              <View style={[styles.linkInput, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Ionicons color={colors.textMuted} name="link-outline" size={20} />
                <TextInput
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                  onChangeText={(value) => {
                    setSourceUrl(value);
                    setLinkResult(undefined);
                  }}
                  placeholder="TikTok, Instagram albo YouTube"
                  placeholderTextColor={colors.textMuted}
                  style={[styles.textInput, { color: colors.text }]}
                  value={sourceUrl}
                />
                <Pressable onPress={() => void pasteLink()} style={[styles.pasteButton, { backgroundColor: colors.primarySoft }]}>
                  <Text style={[styles.pasteText, { color: colors.primary }]}>Wklej</Text>
                </Pressable>
              </View>
              {socialPlatform ? (
                <View style={[styles.sourceDetected, { backgroundColor: colors.primarySoft }]}>
                  <Ionicons color={colors.primary} name="checkmark-circle" size={18} />
                  <Text style={[styles.sourceDetectedText, { color: colors.primary }]}>Rozpoznano: {socialPlatform}</Text>
                </View>
              ) : null}
              <Text style={[styles.helper, { color: colors.textMuted }]}>
                Importer zachowa źródło. Jeżeli serwis nie udostępni pliku, wybierzesz zapisany film z galerii.
              </Text>
              <Pressable
                disabled={!sourceUrl.trim() || analyzingLink}
                onPress={() => void analyzeLink()}
                style={[
                  styles.analyzeButton,
                  { backgroundColor: colors.primarySoft, opacity: !sourceUrl.trim() ? 0.5 : 1 },
                ]}>
                {analyzingLink ? (
                  <ActivityIndicator color={colors.primary} size="small" />
                ) : (
                  <Ionicons color={colors.primary} name="sparkles-outline" size={18} />
                )}
                <Text style={[styles.analyzeButtonText, { color: colors.primary }]}>
                  {analyzingLink ? 'Czytam publiczny opis…' : 'Podpowiedz dane z linku'}
                </Text>
              </Pressable>
              {linkResult ? (
                <View style={[styles.importSummary, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Ionicons color={colors.primary} name="checkmark-circle" size={20} />
                  <View style={styles.importSummaryContent}>
                    <Text style={[styles.importSummaryTitle, { color: colors.text }]}>Opis odczytany lokalnie</Text>
                    <Text style={[styles.importSummaryText, { color: colors.textMuted }]}>
                      {linkResult.ingredients.length} składników · {linkResult.steps.length} kroków · wszystko sprawdzisz przed zapisem
                    </Text>
                  </View>
                </View>
              ) : null}
            </View>
          ) : null}

          <View style={[styles.videoPicker, { backgroundColor: colors.surface, borderColor: asset ? colors.primary : colors.border }]}>
            <View style={[styles.videoIcon, { backgroundColor: asset ? colors.primarySoft : colors.surfaceElevated }]}>
              <Ionicons color={asset ? colors.primary : colors.textMuted} name={asset ? 'checkmark' : 'videocam-outline'} size={30} />
            </View>
            <View style={styles.videoPickerContent}>
              <Text style={[styles.videoPickerTitle, { color: colors.text }]}>
                {asset ? asset.fileName || 'Wybrany film' : 'Film wymagany'}
              </Text>
              <Text style={[styles.videoPickerSubtitle, { color: colors.textMuted }]}>
                {asset
                  ? `${formatDuration(asset.duration ? asset.duration / 1000 : undefined)} · ${formatBytes(asset.fileSize)}`
                  : 'Do analizy, odtwarzania i kompresji lokalnej'}
              </Text>
            </View>
            <Pressable onPress={() => void chooseVideo()} style={[styles.chooseButton, { backgroundColor: colors.primary }]}>
              <Text style={styles.chooseButtonText}>{asset ? 'Zmień' : 'Wybierz'}</Text>
            </Pressable>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Nazwa dania</Text>
            <TextInput
              onChangeText={setTitle}
              placeholder="Np. kremowy makaron z kurczakiem"
              placeholderTextColor={colors.textMuted}
              style={[styles.singleInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              value={title}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Kompresja filmu</Text>
            <View style={styles.profileList}>
              {(Object.keys(compressionProfiles) as CompressionProfile[]).map((value) => {
                const item = compressionProfiles[value];
                const selected = profile === value;
                return (
                  <Pressable
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    key={value}
                    onPress={() => setProfile(value)}
                    style={[
                      styles.profile,
                      {
                        backgroundColor: selected ? colors.primarySoft : colors.surface,
                        borderColor: selected ? colors.primary : colors.border,
                      },
                    ]}>
                    <View style={[styles.radio, { borderColor: selected ? colors.primary : colors.border }]}>
                      {selected ? <View style={[styles.radioDot, { backgroundColor: colors.primary }]} /> : null}
                    </View>
                    <View style={styles.profileContent}>
                      <Text style={[styles.profileTitle, { color: colors.text }]}>{item.label}</Text>
                      <Text style={[styles.profileDescription, { color: colors.textMuted }]}>{item.description}</Text>
                    </View>
                    {value === 'balanced' ? (
                      <Text style={[styles.recommended, { color: colors.primary }]}>POLECANY</Text>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          </View>

          {processing ? (
            <View style={[styles.processing, { backgroundColor: colors.primarySoft }]}>
              <View style={styles.processingHeader}>
                <Text style={[styles.processingTitle, { color: colors.primary }]}>Kompresuję film na telefonie…</Text>
                <Text style={[styles.processingPercent, { color: colors.primary }]}>{Math.round(progress * 100)}%</Text>
              </View>
              <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
                <View style={[styles.progressFill, { backgroundColor: colors.primary, width: `${Math.max(3, progress * 100)}%` }]} />
              </View>
              <Text style={[styles.processingText, { color: colors.textMuted }]}>Nie zamykaj aplikacji do zakończenia zapisu.</Text>
            </View>
          ) : null}

          {error ? (
            <View style={[styles.error, { backgroundColor: colors.dangerSoft }]}>
              <Ionicons color={colors.danger} name="warning-outline" size={19} />
              <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
            </View>
          ) : null}

          <View style={[styles.privacy, { borderColor: colors.border }]}>
            <Ionicons color={colors.primary} name="shield-checkmark-outline" size={22} />
            <Text style={[styles.privacyText, { color: colors.textMuted }]}>
              Analiza, kompresja i zapis odbywają się lokalnie. CookClip nie wymaga konta ani serwera.
            </Text>
          </View>

          <PrimaryButton
            disabled={!asset}
            icon="sparkles-outline"
            label={processing ? 'Przygotowuję film…' : 'Utwórz kartę przepisu'}
            loading={processing}
            onPress={() => void createFromVideo()}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { flex: 1 },
  navigation: {
    height: 58,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  closeButton: { width: 44, height: 44, alignItems: 'flex-start', justifyContent: 'center' },
  navigationTitle: { fontSize: 17, fontWeight: '900' },
  navigationSpacer: { width: 44 },
  content: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  heroTitle: { fontSize: 30, lineHeight: 35, fontWeight: '900', letterSpacing: -0.7 },
  heroText: { fontSize: 14, lineHeight: 21, marginTop: spacing.xs },
  segment: { borderRadius: radius.md, borderWidth: 1, padding: 3, flexDirection: 'row' },
  segmentButton: { flex: 1, height: 45, borderRadius: radius.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  segmentText: { fontSize: 13, fontWeight: '900' },
  fieldGroup: { gap: spacing.xs },
  label: { fontSize: 15, fontWeight: '900' },
  linkInput: { height: 56, borderRadius: radius.md, borderWidth: 1, flexDirection: 'row', alignItems: 'center', paddingLeft: spacing.md, paddingRight: 5, gap: spacing.xs },
  textInput: { flex: 1, height: '100%', fontSize: 14, fontWeight: '600' },
  pasteButton: { height: 43, paddingHorizontal: spacing.md, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  pasteText: { fontSize: 13, fontWeight: '900' },
  sourceDetected: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: spacing.sm, height: 32, borderRadius: radius.pill },
  sourceDetectedText: { fontSize: 12, fontWeight: '900' },
  helper: { fontSize: 11, lineHeight: 16 },
  analyzeButton: { height: 44, borderRadius: radius.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  analyzeButtonText: { fontSize: 13, fontWeight: '900' },
  importSummary: { borderWidth: 1, borderRadius: radius.md, padding: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  importSummaryContent: { flex: 1 },
  importSummaryTitle: { fontSize: 13, fontWeight: '900' },
  importSummaryText: { fontSize: 11, lineHeight: 16, marginTop: 2 },
  videoPicker: { borderRadius: radius.lg, borderWidth: 1.5, padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  videoIcon: { width: 52, height: 52, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  videoPickerContent: { flex: 1, minWidth: 0 },
  videoPickerTitle: { fontSize: 14, fontWeight: '900' },
  videoPickerSubtitle: { fontSize: 11, lineHeight: 16, marginTop: 3 },
  chooseButton: { height: 38, paddingHorizontal: spacing.sm, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  chooseButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900' },
  singleInput: { height: 56, borderRadius: radius.md, borderWidth: 1, paddingHorizontal: spacing.md, fontSize: 15, fontWeight: '600' },
  profileList: { gap: spacing.xs },
  profile: { minHeight: 64, borderRadius: radius.md, borderWidth: 1.5, padding: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  profileContent: { flex: 1 },
  profileTitle: { fontSize: 14, fontWeight: '900' },
  profileDescription: { fontSize: 11, marginTop: 2 },
  recommended: { fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  processing: { borderRadius: radius.md, padding: spacing.md, gap: spacing.sm },
  processingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  processingTitle: { fontSize: 14, fontWeight: '900' },
  processingPercent: { fontSize: 14, fontWeight: '900' },
  progressTrack: { height: 8, borderRadius: radius.pill, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: radius.pill },
  processingText: { fontSize: 11 },
  error: { borderRadius: radius.md, padding: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  errorText: { flex: 1, fontSize: 12, lineHeight: 17, fontWeight: '700' },
  privacy: { borderTopWidth: 1, borderBottomWidth: 1, paddingVertical: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  privacyText: { flex: 1, fontSize: 12, lineHeight: 18, fontWeight: '600' },
});
