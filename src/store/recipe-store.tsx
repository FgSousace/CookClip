import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { deleteManagedMedia } from '@/services/media-storage';
import { listRecipes, removeRecipe, upsertRecipe } from '@/services/database';
import { Recipe, RecipeDraft } from '@/types/recipe';
import { makeId } from '@/utils/format';

type RecipeStoreValue = {
  recipes: Recipe[];
  loading: boolean;
  error?: string;
  refresh: () => Promise<void>;
  getRecipe: (id: string) => Recipe | undefined;
  createRecipe: (draft: RecipeDraft) => Promise<Recipe>;
  updateRecipe: (recipe: Recipe) => Promise<void>;
  deleteRecipe: (id: string) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  totalVideoBytes: number;
};

const RecipeStoreContext = createContext<RecipeStoreValue | undefined>(undefined);

function sortRecipes(recipes: Recipe[]) {
  return [...recipes].sort((left, right) => {
    if (left.favorite !== right.favorite) return left.favorite ? -1 : 1;
    return right.updatedAt.localeCompare(left.updatedAt);
  });
}

export function RecipeStoreProvider({ children }: { children: ReactNode }) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  const refresh = useCallback(async () => {
    try {
      setError(undefined);
      setRecipes(await listRecipes());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Nie udało się odczytać lokalnej bazy.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    void listRecipes()
      .then((storedRecipes) => {
        if (cancelled) return;
        setError(undefined);
        setRecipes(storedRecipes);
      })
      .catch((reason: unknown) => {
        if (cancelled) return;
        setError(reason instanceof Error ? reason.message : 'Nie udało się odczytać lokalnej bazy.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const getRecipe = useCallback((id: string) => recipes.find((recipe) => recipe.id === id), [recipes]);

  const createRecipe = useCallback(async (draft: RecipeDraft) => {
    const now = new Date().toISOString();
    const recipe: Recipe = {
      ...draft,
      id: makeId('recipe'),
      createdAt: now,
      updatedAt: now,
    };

    await upsertRecipe(recipe);
    setRecipes((current) => sortRecipes([recipe, ...current]));
    return recipe;
  }, []);

  const updateRecipe = useCallback(async (recipe: Recipe) => {
    const updated = { ...recipe, updatedAt: new Date().toISOString() };
    await upsertRecipe(updated);
    setRecipes((current) => sortRecipes(current.map((item) => (item.id === updated.id ? updated : item))));
  }, []);

  const deleteRecipe = useCallback(
    async (id: string) => {
      const recipe = recipes.find((item) => item.id === id);
      await removeRecipe(id);
      setRecipes((current) => current.filter((item) => item.id !== id));
      if (recipe) await deleteManagedMedia(recipe);
    },
    [recipes],
  );

  const toggleFavorite = useCallback(
    async (id: string) => {
      const recipe = recipes.find((item) => item.id === id);
      if (!recipe) return;
      await updateRecipe({ ...recipe, favorite: !recipe.favorite });
    },
    [recipes, updateRecipe],
  );

  const value = useMemo<RecipeStoreValue>(
    () => ({
      recipes,
      loading,
      error,
      refresh,
      getRecipe,
      createRecipe,
      updateRecipe,
      deleteRecipe,
      toggleFavorite,
      totalVideoBytes: recipes.reduce((sum, recipe) => sum + (recipe.compressedVideoBytes ?? 0), 0),
    }),
    [createRecipe, deleteRecipe, error, getRecipe, loading, recipes, refresh, toggleFavorite, updateRecipe],
  );

  return <RecipeStoreContext.Provider value={value}>{children}</RecipeStoreContext.Provider>;
}

export function useRecipeStore() {
  const value = useContext(RecipeStoreContext);
  if (!value) throw new Error('useRecipeStore musi być użyty wewnątrz RecipeStoreProvider.');
  return value;
}
