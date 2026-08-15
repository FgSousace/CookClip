export type IngredientHint = {
  name: string;
  amount: number;
  unit: string;
};

export type LinkImportResult = {
  sourceLabel: 'TikTok' | 'Instagram' | 'YouTube';
  title?: string;
  description?: string;
  ingredients: IngredientHint[];
  steps: string[];
};

const quantityUnits =
  '(?:kg|g|dag|ml|l|łyżk(?:a|i|ę|ek)|łyżeczk(?:a|i|ę|ek)|szt(?:\\.|uki)?|ząb(?:ek|ki|ków)|szklank(?:a|i|ę)|cup|cups|tbsp|tsp)';

function decodeHtml(value: string) {
  const named: Record<string, string> = {
    amp: '&',
    apos: "'",
    gt: '>',
    lt: '<',
    nbsp: ' ',
    quot: '"',
  };

  return value
    .replace(/\\n/g, '\n')
    .replace(/&#(x?[0-9a-f]+);/gi, (_, code: string) => {
      const radix = code.toLowerCase().startsWith('x') ? 16 : 10;
      const parsed = Number.parseInt(code.replace(/^x/i, ''), radix);
      return Number.isFinite(parsed) ? String.fromCodePoint(parsed) : '';
    })
    .replace(/&([a-z]+);/gi, (entity, name: string) => named[name.toLowerCase()] ?? entity)
    .replace(/\s+\n/g, '\n')
    .trim();
}

function readMeta(html: string, key: string) {
  const normalizedKey = key.toLowerCase();
  const tags = html.match(/<meta\s+[^>]*>/gi) ?? [];

  for (const tag of tags) {
    const attributes: Record<string, string> = {};
    for (const match of tag.matchAll(/([:\w-]+)\s*=\s*(["'])(.*?)\2/gis)) {
      attributes[match[1].toLowerCase()] = match[3];
    }
    const name = (attributes.property ?? attributes.name)?.toLowerCase();
    if (name === normalizedKey && attributes.content) return decodeHtml(attributes.content);
  }

  return undefined;
}

function cleanTitle(value?: string) {
  return value
    ?.replace(/\s*[|·-]\s*(TikTok|Instagram|YouTube)\s*$/i, '')
    .replace(/^.*? on Instagram:\s*[“"]?/i, '')
    .replace(/[”"]\s*$/g, '')
    .trim();
}

function parseQuantity(value?: string) {
  if (!value) return 0;
  if (value.includes('/')) {
    const [numerator, denominator] = value.split('/').map((part) => Number(part));
    return denominator ? numerator / denominator : 0;
  }
  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
}

function captionLines(description: string) {
  return description
    .replace(/\s+[•·]\s+/g, '\n')
    .split(/\r?\n/)
    .map((line) => line.replace(/^[\s\-*–—•]+/, '').replace(/\s+/g, ' ').trim())
    .filter((line) => line && !/^#\S+(?:\s+#\S+)*$/.test(line));
}

export function extractRecipeHintsFromDescription(description: string) {
  const lines = captionLines(description);
  const ingredients: IngredientHint[] = [];
  const steps: string[] = [];
  let section: 'ingredients' | 'steps' | undefined;
  const ingredientPattern = new RegExp(
    `^(?:(\\d+(?:[.,]\\d+)?|\\d+\\/\\d+)\\s*)?(${quantityUnits})?\\s+(.{2,})$`,
    'i',
  );

  for (const line of lines) {
    if (/^(składniki|ingredients)\s*:?$/i.test(line)) {
      section = 'ingredients';
      continue;
    }
    if (/^(przygotowanie|wykonanie|instrukcja|steps|method)\s*:?$/i.test(line)) {
      section = 'steps';
      continue;
    }

    const numberedStep = line.match(/^(?:krok\s*)?(\d{1,2})[.):\-]\s*(.{4,})$/i);
    if (numberedStep) {
      steps.push(numberedStep[2]);
      section = 'steps';
      continue;
    }

    const ingredient = line.match(ingredientPattern);
    const hasQuantitySignal = Boolean(ingredient?.[1] || ingredient?.[2]);
    if (ingredient && section !== 'steps' && (section === 'ingredients' || hasQuantitySignal)) {
      ingredients.push({
        amount: parseQuantity(ingredient[1]),
        unit: ingredient[2] ?? '',
        name: ingredient[3].replace(/[;,]$/, '').trim(),
      });
      continue;
    }

    if (section === 'steps' && line.length >= 8 && !/^https?:\/\//i.test(line)) steps.push(line);
  }

  return {
    ingredients: ingredients.slice(0, 40),
    steps: steps.slice(0, 30),
  };
}

function platformForUrl(value: string): LinkImportResult['sourceLabel'] {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error('Wklej pełny, poprawny link zaczynający się od https://.');
  }

  if (url.protocol !== 'https:') throw new Error('Dla bezpieczeństwa CookClip obsługuje wyłącznie linki HTTPS.');
  const host = url.hostname.toLowerCase();
  if (host === 'youtu.be' || host === 'youtube.com' || host.endsWith('.youtube.com')) return 'YouTube';
  if (host === 'instagram.com' || host.endsWith('.instagram.com')) return 'Instagram';
  if (host === 'tiktok.com' || host.endsWith('.tiktok.com')) return 'TikTok';
  throw new Error('Na razie obsługiwane są linki z TikToka, Instagrama i YouTube.');
}

export function parseSourceHtml(html: string, sourceLabel: LinkImportResult['sourceLabel']): LinkImportResult {
  const description = readMeta(html, 'og:description') ?? readMeta(html, 'description');
  const title = cleanTitle(readMeta(html, 'og:title') ?? readMeta(html, 'twitter:title'));
  const hints = description ? extractRecipeHintsFromDescription(description) : { ingredients: [], steps: [] };
  return { sourceLabel, title, description, ...hints };
}

export async function analyzeSourceLink(value: string): Promise<LinkImportResult> {
  const sourceLabel = platformForUrl(value.trim());
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);

  try {
    const response = await fetch(value.trim(), {
      headers: { Accept: 'text/html,application/xhtml+xml' },
      redirect: 'follow',
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Platforma zwróciła błąd ${response.status}.`);
    const html = await response.text();
    if (html.length > 5_000_000) throw new Error('Strona źródłowa jest zbyt duża do bezpiecznej analizy.');

    const result = parseSourceHtml(html, sourceLabel);
    if (!result.title && !result.description) {
      throw new Error('Platforma nie udostępniła publicznego opisu tego filmu.');
    }
    return result;
  } catch (reason) {
    if (reason instanceof Error && reason.name === 'AbortError') {
      throw new Error('Platforma nie odpowiedziała w ciągu 12 sekund.');
    }
    throw reason;
  } finally {
    clearTimeout(timeout);
  }
}
