import { Ingredient, Nutrients } from '@/types/recipe';

const nutrientKeys: (keyof Nutrients)[] = [
  'calories',
  'protein',
  'carbohydrates',
  'fat',
  'fiber',
  'sugars',
  'salt',
];

export function addNutrition(...values: Nutrients[]): Nutrients {
  return values.reduce<Nutrients>(
    (total, value) => {
      for (const key of nutrientKeys) total[key] += value[key];
      return total;
    },
    {
      calories: 0,
      protein: 0,
      carbohydrates: 0,
      fat: 0,
      fiber: 0,
      sugars: 0,
      salt: 0,
    },
  );
}

export function totalNutrition(ingredients: Ingredient[]): Nutrients {
  return addNutrition(...ingredients.map((ingredient) => ingredient.nutrition));
}

export function scaleNutrition(nutrition: Nutrients, factor: number): Nutrients {
  return nutrientKeys.reduce<Nutrients>(
    (scaled, key) => {
      scaled[key] = nutrition[key] * factor;
      return scaled;
    },
    {
      calories: 0,
      protein: 0,
      carbohydrates: 0,
      fat: 0,
      fiber: 0,
      sugars: 0,
      salt: 0,
    },
  );
}

export function nutritionPerServing(ingredients: Ingredient[], servings: number): Nutrients {
  return scaleNutrition(totalNutrition(ingredients), 1 / Math.max(1, servings));
}

export function scaleIngredientAmount(amount: number, baseServings: number, servings: number) {
  return amount * (servings / Math.max(1, baseServings));
}

export function formatAmount(value: number) {
  if (Number.isInteger(value)) return String(value);
  if (value < 10) return value.toFixed(1).replace('.', ',');
  return String(Math.round(value));
}
