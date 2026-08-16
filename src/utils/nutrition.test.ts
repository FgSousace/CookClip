import { describe, expect, it } from 'vitest';

import { Ingredient } from '@/types/recipe';
import {
  formatAmount,
  nutritionPerServing,
  scaleIngredientAmount,
  scaleNutrition,
  totalNutrition,
} from '@/utils/nutrition';

const ingredients: Ingredient[] = [
  {
    id: 'chicken',
    name: 'Kurczak',
    amount: 300,
    unit: 'g',
    nutrition: {
      calories: 495,
      protein: 93,
      carbohydrates: 0,
      fat: 10.8,
      fiber: 0,
      sugars: 0,
      salt: 0.3,
    },
  },
  {
    id: 'rice',
    name: 'Ryż',
    amount: 200,
    unit: 'g',
    nutrition: {
      calories: 720,
      protein: 14,
      carbohydrates: 158,
      fat: 1.2,
      fiber: 2.6,
      sugars: 0.4,
      salt: 0,
    },
  },
];

describe('nutrition calculations', () => {
  it('sums nutrients for the whole recipe', () => {
    expect(totalNutrition(ingredients)).toEqual({
      calories: 1215,
      protein: 107,
      carbohydrates: 158,
      fat: 12,
      fiber: 2.6,
      sugars: 0.4,
      salt: 0.3,
    });
  });

  it('returns values per serving', () => {
    expect(nutritionPerServing(ingredients, 3)).toMatchObject({
      calories: 405,
      protein: 107 / 3,
      carbohydrates: 158 / 3,
      fat: 4,
    });
  });

  it('guards against a zero serving count', () => {
    expect(nutritionPerServing(ingredients, 0)).toEqual(totalNutrition(ingredients));
  });

  it('scales every nutrient', () => {
    expect(scaleNutrition(totalNutrition(ingredients), 0.5).calories).toBe(607.5);
  });
});

describe('portion scaling', () => {
  it('scales ingredient amounts to the selected portion count', () => {
    expect(scaleIngredientAmount(250, 2, 5)).toBe(625);
  });

  it('formats Polish decimal amounts', () => {
    expect(formatAmount(2.5)).toBe('2,5');
    expect(formatAmount(12.7)).toBe('13');
  });
});
