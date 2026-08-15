import { describe, expect, it } from 'vitest';

import { formatBytes, formatDuration, formatTimestamp } from '@/utils/format';

describe('display formatting', () => {
  it('formats video durations and timestamps', () => {
    expect(formatDuration(125)).toBe('2:05');
    expect(formatTimestamp(69.9)).toBe('1:09');
    expect(formatDuration()).toBe('Brak danych');
  });

  it('formats file sizes using Polish decimals', () => {
    expect(formatBytes(512 * 1024)).toBe('512 KB');
    expect(formatBytes(1.5 * 1024 * 1024)).toBe('1,5 MB');
    expect(formatBytes(24.6 * 1024 * 1024)).toBe('25 MB');
  });
});
