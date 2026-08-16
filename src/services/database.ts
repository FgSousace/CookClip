import * as SQLite from 'expo-sqlite';

import { sampleRecipes } from '@/data/sample-recipes';
import { Recipe } from '@/types/recipe';

type RecipeRow = {
  payload: string;
};

let databasePromise: Promise<SQLite.SQLiteDatabase> | undefined;

async function openDatabase() {
  if (!databasePromise) {
    databasePromise = SQLite.openDatabaseAsync('cookclip.db').then(async (database) => {
      await database.execAsync(`
        PRAGMA journal_mode = WAL;
        PRAGMA foreign_keys = ON;
        CREATE TABLE IF NOT EXISTS recipes (
          id TEXT PRIMARY KEY NOT NULL,
          title TEXT NOT NULL,
          category TEXT NOT NULL,
          favorite INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          payload TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_recipes_updated_at ON recipes(updated_at DESC);
        CREATE INDEX IF NOT EXISTS idx_recipes_title ON recipes(title COLLATE NOCASE);
      `);

      const row = await database.getFirstAsync<{ count: number }>('SELECT COUNT(*) AS count FROM recipes');
      if ((row?.count ?? 0) === 0) {
        await database.withTransactionAsync(async () => {
          for (const recipe of sampleRecipes) await upsertRecipeWithDatabase(database, recipe);
        });
      }

      return database;
    });
  }

  return databasePromise;
}

function normalizeRecipe(recipe: Recipe): Recipe {
  return {
    ...recipe,
    category: recipe.category || 'Inne',
    coverEmoji: recipe.coverEmoji || '🍽️',
    accentColor: recipe.accentColor || '#2F7D4A',
    servings: Math.max(1, recipe.servings || 1),
    ingredients: recipe.ingredients ?? [],
    steps: recipe.steps ?? [],
    favorite: Boolean(recipe.favorite),
  };
}

function parseRecipe(row: RecipeRow): Recipe {
  return normalizeRecipe(JSON.parse(row.payload) as Recipe);
}

async function upsertRecipeWithDatabase(database: SQLite.SQLiteDatabase, recipe: Recipe) {
  await database.runAsync(
    `INSERT INTO recipes (id, title, category, favorite, created_at, updated_at, payload)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       title = excluded.title,
       category = excluded.category,
       favorite = excluded.favorite,
       updated_at = excluded.updated_at,
       payload = excluded.payload`,
    recipe.id,
    recipe.title,
    recipe.category,
    recipe.favorite ? 1 : 0,
    recipe.createdAt,
    recipe.updatedAt,
    JSON.stringify(recipe),
  );
}

export async function listRecipes() {
  const database = await openDatabase();
  const rows = await database.getAllAsync<RecipeRow>(
    'SELECT payload FROM recipes ORDER BY favorite DESC, updated_at DESC',
  );
  return rows.map(parseRecipe);
}

export async function getRecipeById(id: string) {
  const database = await openDatabase();
  const row = await database.getFirstAsync<RecipeRow>('SELECT payload FROM recipes WHERE id = ?', id);
  return row ? parseRecipe(row) : undefined;
}

export async function upsertRecipe(recipe: Recipe) {
  const database = await openDatabase();
  await upsertRecipeWithDatabase(database, normalizeRecipe(recipe));
}

export async function removeRecipe(id: string) {
  const database = await openDatabase();
  await database.runAsync('DELETE FROM recipes WHERE id = ?', id);
}
