import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

import { CompressionProfile, Recipe } from '@/types/recipe';
import { makeId } from '@/utils/format';

export type PreparedVideo = {
  videoUri: string;
  thumbnailUri?: string;
  durationSeconds?: number;
  originalBytes: number;
  compressedBytes: number;
  profile: CompressionProfile;
  usedCompressionFallback: boolean;
};

export const compressionProfiles: Record<
  CompressionProfile,
  { label: string; description: string; maxSize: number; bitrate: number }
> = {
  compact: {
    label: 'Oszczędny',
    description: '540p · najmniejszy rozmiar',
    maxSize: 540,
    bitrate: 600_000,
  },
  balanced: {
    label: 'Zalecany',
    description: '720p · czytelny tekst i mały plik',
    maxSize: 720,
    bitrate: 1_000_000,
  },
  quality: {
    label: 'Wysoka jakość',
    description: '1080p · większy plik',
    maxSize: 1080,
    bitrate: 2_200_000,
  },
};

const mediaDirectory = new Directory(Paths.document, 'CookClip');
const videosDirectory = new Directory(mediaDirectory, 'videos');
const thumbnailsDirectory = new Directory(mediaDirectory, 'thumbnails');

function ensureMediaDirectories() {
  mediaDirectory.create({ idempotent: true, intermediates: true });
  videosDirectory.create({ idempotent: true, intermediates: true });
  thumbnailsDirectory.create({ idempotent: true, intermediates: true });
}

function normalizeUri(uri: string) {
  if (/^[a-z]+:\/\//i.test(uri)) return uri;
  return `file://${uri}`;
}

async function safeFileSize(uri: string, fallback = 0) {
  try {
    return new File(normalizeUri(uri)).size || fallback;
  } catch {
    return fallback;
  }
}

async function copyIntoLibrary(sourceUri: string, destination: File) {
  if (destination.exists) destination.delete();
  await new File(normalizeUri(sourceUri)).copy(destination, { overwrite: true });
  return destination;
}

async function createPersistentThumbnail(videoUri: string, id: string) {
  if (Platform.OS === 'web') return undefined;
  try {
    const { createVideoThumbnail } = await import('react-native-compressor');
    const generated = await createVideoThumbnail(videoUri, { quality: 0.82 });
    const destination = new File(thumbnailsDirectory, `${id}.jpg`);
    await copyIntoLibrary(generated.path, destination);
    return destination.uri;
  } catch {
    return undefined;
  }
}

export async function pickVideoFromLibrary() {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['videos'],
    allowsEditing: false,
    quality: 1,
    videoExportPreset: ImagePicker.VideoExportPreset.Passthrough,
  });

  return result.canceled ? undefined : result.assets[0];
}

export async function prepareVideo(
  asset: ImagePicker.ImagePickerAsset,
  profile: CompressionProfile,
  onProgress?: (value: number) => void,
): Promise<PreparedVideo> {
  ensureMediaDirectories();
  const profileOptions = compressionProfiles[profile];
  const id = makeId('video');
  const originalBytes = asset.fileSize ?? (await safeFileSize(asset.uri));
  let compressedUri = asset.uri;
  let usedCompressionFallback = false;

  if (Platform.OS !== 'web') {
    try {
      const { Video } = await import('react-native-compressor');
      compressedUri = await Video.compress(
        asset.uri,
        {
          compressionMethod: 'manual',
          maxSize: profileOptions.maxSize,
          bitrate: profileOptions.bitrate,
          minimumFileSizeForCompress: 0,
          progressDivider: 1,
          stripAudio: false,
        },
        (progress) => onProgress?.(Math.max(0, Math.min(1, progress))),
      );
    } catch {
      usedCompressionFallback = true;
      onProgress?.(1);
    }
  } else {
    usedCompressionFallback = true;
    onProgress?.(1);
  }

  const destination = new File(videosDirectory, `${id}.mp4`);
  let videoUri = compressedUri;
  let compressedBytes = await safeFileSize(compressedUri, originalBytes);

  if (Platform.OS !== 'web') {
    await copyIntoLibrary(compressedUri, destination);
    videoUri = destination.uri;
    compressedBytes = destination.size;
  }

  const thumbnailUri = await createPersistentThumbnail(videoUri, id);

  return {
    videoUri,
    thumbnailUri,
    durationSeconds: asset.duration ? asset.duration / 1000 : undefined,
    originalBytes,
    compressedBytes,
    profile,
    usedCompressionFallback,
  };
}

export async function recompressRecipeVideo(
  recipe: Recipe,
  profile: CompressionProfile,
  onProgress?: (value: number) => void,
) {
  if (!recipe.videoUri) throw new Error('Ten przepis nie ma zapisanego filmu.');

  return prepareVideo(
    {
      uri: recipe.videoUri,
      width: 0,
      height: 0,
      type: 'video',
      fileName: `${recipe.title}.mp4`,
      fileSize: recipe.compressedVideoBytes,
      duration: recipe.videoDurationSeconds ? recipe.videoDurationSeconds * 1000 : null,
    },
    profile,
    onProgress,
  );
}

function isManagedUri(uri?: string) {
  return Boolean(uri && uri.startsWith(mediaDirectory.uri));
}

function deleteManagedFile(uri?: string) {
  if (!isManagedUri(uri)) return;
  try {
    const file = new File(uri!);
    if (file.exists) file.delete();
  } catch {
    // The database entry can still be safely removed if a stale file is already gone.
  }
}

export async function deleteManagedMedia(recipe: Recipe) {
  deleteManagedFile(recipe.videoUri);
  deleteManagedFile(recipe.thumbnailUri);
}
