import { describe, expect, it } from 'vitest';

import { extractRecipeHintsFromDescription, parseSourceHtml } from '@/services/link-import';

describe('local link import', () => {
  it('extracts metadata regardless of meta attribute order', () => {
    const html = `
      <meta content="Makaron w 15 minut | TikTok" property="og:title">
      <meta property="og:description" content="Składniki:\n200 g makaronu\n100 ml śmietanki\nPrzygotowanie:\n1. Ugotuj makaron\n2. Wymieszaj z sosem">
    `;
    const result = parseSourceHtml(html, 'TikTok');

    expect(result.title).toBe('Makaron w 15 minut');
    expect(result.ingredients).toHaveLength(2);
    expect(result.steps).toEqual(['Ugotuj makaron', 'Wymieszaj z sosem']);
  });

  it('recognizes quantities without explicit section headers', () => {
    const result = extractRecipeHintsFromDescription('250 g kurczaka\n1/2 łyżeczki soli\n#obiad #fit');

    expect(result.ingredients).toEqual([
      { amount: 250, unit: 'g', name: 'kurczaka' },
      { amount: 0.5, unit: 'łyżeczki', name: 'soli' },
    ]);
  });
});
