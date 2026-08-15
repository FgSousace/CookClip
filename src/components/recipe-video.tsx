import { Ionicons } from '@expo/vector-icons';
import { VideoView, useVideoPlayer } from 'expo-video';
import { forwardRef, useImperativeHandle } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { radius, spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';

export type RecipeVideoHandle = {
  seekTo: (seconds: number) => void;
};

export const RecipeVideo = forwardRef<RecipeVideoHandle, { uri?: string; accentColor: string }>(
  function RecipeVideo({ uri, accentColor }, ref) {
    const { colors } = useAppTheme();
    const player = useVideoPlayer(uri ?? null, (instance) => {
      instance.loop = false;
      instance.timeUpdateEventInterval = 0.5;
    });

    useImperativeHandle(
      ref,
      () => ({
        seekTo(seconds) {
          if (!uri) return;
          player.currentTime = seconds;
          player.play();
        },
      }),
      [player, uri],
    );

    if (!uri) {
      return (
        <View style={[styles.placeholder, { backgroundColor: accentColor }]}>
          <View style={styles.placeholderShade} />
          <View style={[styles.playCircle, { backgroundColor: colors.surface }]}>
            <Ionicons color={colors.primary} name="videocam-outline" size={30} />
          </View>
          <Text style={styles.placeholderTitle}>Tu będzie film przepisu</Text>
          <Text style={styles.placeholderText}>Dodaj własny materiał z telefonu lub importu linku.</Text>
        </View>
      );
    }

    return (
      <VideoView
        allowsPictureInPicture
        contentFit="cover"
        fullscreenOptions={{ enable: true }}
        nativeControls
        player={player}
        style={styles.video}
      />
    );
  },
);

const styles = StyleSheet.create({
  video: {
    width: '100%',
    aspectRatio: 9 / 14,
    maxHeight: 550,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: '#000000',
  },
  placeholder: {
    width: '100%',
    aspectRatio: 9 / 11,
    maxHeight: 440,
    borderRadius: radius.lg,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  placeholderShade: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  playCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  placeholderTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
  },
  placeholderText: {
    color: 'rgba(255,255,255,0.84)',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: spacing.xs,
  },
});
