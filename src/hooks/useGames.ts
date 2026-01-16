/**
 * useGames Hook
 * 
 * Manages game data with Supabase cloud sync + localStorage fallback
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Asset } from '@/types/asset';

interface UseGamesReturn {
  games: Asset[];
  loading: boolean;
  error: string | null;
  addGame: (game: Asset) => Promise<void>;
  updateGame: (game: Asset) => Promise<void>;
  deleteGame: (gameId: string) => Promise<void>;
  refreshGames: () => Promise<void>;
}

// Convert database row to Asset
function dbRowToAsset(row: any): Asset {
  return {
    id: row.id,
    name: row.name,
    category: 'video-games',
    imageUrl: row.image_url || '/placeholder.svg',
    currentValue: parseFloat(row.current_value),
    purchasePrice: parseFloat(row.purchase_price),
    purchaseDate: row.purchase_date,
    source: row.source,
    lastUpdated: row.updated_at?.split('T')[0] || new Date().toISOString().split('T')[0],
    videoGameDetails: {
      platform: row.platform,
      region: row.region || 'NTSC',
      conditionType: row.condition_type || 'cib',
      gradingCompany: row.grading_company || 'raw',
      grade: row.grade ? parseFloat(row.grade) : undefined,
      sealRating: row.seal_rating || undefined,
    },
  };
}

// Convert Asset to database row (omit id for inserts, Supabase generates UUID)
function assetToDbRow(asset: Asset, userId: string) {
  return {
    user_id: userId,
    name: asset.name,
    platform: asset.videoGameDetails?.platform || '',
    region: asset.videoGameDetails?.region || 'NTSC',
    condition_type: asset.videoGameDetails?.conditionType || 'cib',
    grading_company: asset.videoGameDetails?.gradingCompany || null,
    grade: asset.videoGameDetails?.grade || null,
    seal_rating: asset.videoGameDetails?.sealRating || null,
    purchase_price: asset.purchasePrice,
    current_value: asset.currentValue,
    purchase_date: asset.purchaseDate,
    source: asset.source,
    image_url: asset.imageUrl || null,
  };
}

// Helper to get storage key
function getStorageKey(userId: string | null): string {
  return userId ? `gil0-${userId}` : 'gil0-assets';
}

// Helper to load from localStorage
function loadFromStorage(key: string): Asset[] {
  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Error loading from localStorage:', e);
  }
  return [];
}

// Helper to save to localStorage
function saveToStorage(key: string, games: Asset[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(games));
  } catch (e) {
    console.error('Error saving to localStorage:', e);
  }
}

export function useGames(userId: string | null): UseGamesReturn {
  const storageKey = getStorageKey(userId);
  
  // Initialize with localStorage data immediately
  const [games, setGames] = useState<Asset[]>(() => loadFromStorage(storageKey));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const initialLoadDone = useRef(false);

  // Fetch games from Supabase or use localStorage
  const fetchGames = useCallback(async () => {
    // Always start with localStorage
    const localData = loadFromStorage(storageKey);
    
    // If no Supabase, just use localStorage
    if (!userId || !isSupabaseConfigured() || !supabase) {
      setGames(localData);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('games')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error('Supabase fetch error:', fetchError);
        setError(fetchError.message);
        // Fallback to localStorage
        setGames(localData);
      } else {
        const assets = (data || []).map(dbRowToAsset);
        setGames(assets);
        // Sync to localStorage
        saveToStorage(storageKey, assets);
        setError(null);
      }
    } catch (err) {
      console.error('Fetch error:', err);
      setGames(localData);
    } finally {
      setLoading(false);
    }
  }, [userId, storageKey]);

  // Initial fetch when userId changes
  useEffect(() => {
    // Load from new storage key when userId changes
    const localData = loadFromStorage(storageKey);
    setGames(localData);
    
    // Then try to fetch from Supabase
    fetchGames();
    initialLoadDone.current = true;
  }, [userId, storageKey]);

  // Add a game
  const addGame = useCallback(async (game: Asset) => {
    // Generate ID
    const newGame = { ...game, id: `local-${Date.now()}` };
    
    // Update state and localStorage immediately
    setGames(prev => {
      const updated = [newGame, ...prev];
      saveToStorage(storageKey, updated);
      return updated;
    });

    // If Supabase is configured, sync to cloud
    if (userId && isSupabaseConfigured() && supabase) {
      try {
        const row = assetToDbRow(game, userId);
        const { data, error: insertError } = await supabase
          .from('games')
          .insert(row)
          .select()
          .single();

        if (insertError) {
          console.error('Insert error:', insertError);
          setError(insertError.message);
        } else if (data) {
          // Update with the real ID from Supabase
          const realGame = dbRowToAsset(data);
          setGames(prev => {
            const updated = prev.map(g => g.id === newGame.id ? realGame : g);
            saveToStorage(storageKey, updated);
            return updated;
          });
        }
      } catch (err) {
        console.error('Add game error:', err);
      }
    }
  }, [userId, storageKey]);

  // Update a game
  const updateGame = useCallback(async (game: Asset) => {
    setGames(prev => {
      const updated = prev.map(g => g.id === game.id ? game : g);
      saveToStorage(storageKey, updated);
      return updated;
    });

    if (userId && isSupabaseConfigured() && supabase) {
      try {
        const row = assetToDbRow(game, userId);
        const { error: updateError } = await supabase
          .from('games')
          .update(row)
          .eq('id', game.id)
          .eq('user_id', userId);

        if (updateError) {
          console.error('Update error:', updateError);
        }
      } catch (err) {
        console.error('Update game error:', err);
      }
    }
  }, [userId, storageKey]);

  // Delete a game
  const deleteGame = useCallback(async (gameId: string) => {
    setGames(prev => {
      const updated = prev.filter(g => g.id !== gameId);
      saveToStorage(storageKey, updated);
      return updated;
    });

    if (userId && isSupabaseConfigured() && supabase) {
      try {
        const { error: deleteError } = await supabase
          .from('games')
          .delete()
          .eq('id', gameId)
          .eq('user_id', userId);

        if (deleteError) {
          console.error('Delete error:', deleteError);
        }
      } catch (err) {
        console.error('Delete game error:', err);
      }
    }
  }, [userId, storageKey]);

  return {
    games,
    loading,
    error,
    addGame,
    updateGame,
    deleteGame,
    refreshGames: fetchGames,
  };
}
