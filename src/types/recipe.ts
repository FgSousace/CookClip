export type Nutrients = {
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
  fiber: number;
  sugars: number;
  salt: number;
};

export type Ingredient = {
  id: string;
  name: string;
  amount: number;
  unit: string;
  note?: string;
  nutrition: Nutrients;
};

export type RecipeStep = {
  id: string;
  order: number;
  instruction: string;
  videoTimestampSeconds?: number;
};

export type CompressionProfile = 'compact' | 'balanced' | 'quality';

export type Recipe = {
  id: string;
  title: string;
  category: string;
  coverEmoji: string;
  accentColor: string;
  sourceUrl?: string;
  sourceLabel?: string;
  videoUri?: string;
  thumbnailUri?: string;
  videoDurationSeconds?: number;
  originalVideoBytes?: number;
  compressedVideoBytes?: number;
  compressionProfile?: CompressionProfile;
  servings: number;
  prepMinutes: number;
  cookMinutes: number;
  ingredients: Ingredient[];
  steps: RecipeStep[];
  notes?: string;
  favorite: boolean;
  createdAt: string;
  updatedAt: string;
};

export type RecipeDraft = Omit<Recipe, 'id' | 'createdAt' | 'updatedAt'>;

export const emptyNutrients = (): Nutrients => ({
  calories: 0,
  protein: 0,
  carbohydrates: 0,
  fat: 0,
  fiber: 0,
  sugars: 0,
  salt: 0,
});
