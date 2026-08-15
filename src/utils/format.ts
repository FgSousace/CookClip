export function formatDuration(seconds?: number) {
  if (!seconds || seconds <= 0) return 'Brak danych';
  const minutes = Math.floor(seconds / 60);
  const rest = Math.round(seconds % 60);
  return `${minutes}:${String(rest).padStart(2, '0')}`;
}

export function formatBytes(bytes?: number) {
  if (!bytes || bytes <= 0) return '0 MB';
  const megabytes = bytes / 1024 / 1024;
  if (megabytes < 1) return `${Math.round(bytes / 1024)} KB`;
  if (megabytes < 10) return `${megabytes.toFixed(1).replace('.', ',')} MB`;
  return `${Math.round(megabytes)} MB`;
}

export function formatTimestamp(seconds?: number) {
  if (seconds === undefined) return '';
  const minutes = Math.floor(seconds / 60);
  const rest = Math.floor(seconds % 60);
  return `${minutes}:${String(rest).padStart(2, '0')}`;
}

export function makeId(prefix = 'item') {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}
