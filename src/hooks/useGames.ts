/**
 * useGames Hook
 * 
 * Manages game data with Supabase cloud sync + localStorage fallback
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Asset } from '@/types/asset';
import { useLocalStorage } from './useLocalStorage';

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
function assetToDbRow(asset: Asset, userId: string, includeId = false) {
  const row: Record<string, unknown> = {
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
  
  // Only include ID for updates (when we have a UUID from Supabase)
  if (includeId && asset.id) {
    row.id = asset.id;
  }
  
  return row;
}

export function useGames(userId: string | null): UseGamesReturn {
  const [games, setGames] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Fallback to localStorage if no Supabase
  const storageKey = userId ? `gil0-${userId}` : 'gil0-assets';
  const [localGames, setLocalGames] = useLocalStorage<Asset[]>(storageKey, []);

  // Fetch games from Supabase
  const fetchGames = useCallback(async () => {
    if (!userId) {
      setGames(localGames);
      setLoading(false);
      return;
    }

    if (!isSupabaseConfigured() || !supabase) {
      setGames(localGames);
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
        setGames(localGames); // Fallback to local
      } else {
        const assets = (data || []).map(dbRowToAsset);
        setGames(assets);
        setLocalGames(assets); // Sync to local
        setError(null);
      }
    } catch (err) {
      console.error('Fetch error:', err);
      setGames(localGames);
    } finally {
      setLoading(false);
    }
  }, [userId, localGames, setLocalGames]);

  // Initial fetch
  useEffect(() => {
    fetchGames();
  }, [userId]);

  // Add a game
  const addGame = useCallback(async (game: Asset) => {
    // Optimistic update with temporary ID
    const tempGame = { ...game, id: `temp-${Date.now()}` };
    const newGames = [tempGame, ...games];
    setGames(newGames);
    setLocalGames(newGames);

    if (!userId || !isSupabaseConfigured() || !supabase) {
      return;
    }

    try {
      const row = assetToDbRow(game, userId, false); // Don't include ID, let Supabase generate UUID
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
        const updatedGames = newGames.map(g => 
          g.id === tempGame.id ? realGame : g
        );
        setGames(updatedGames);
        setLocalGames(updatedGames);
      }
    } catch (err) {
      console.error('Add game error:', err);
    }
  }, [games, userId, setLocalGames]);

  // Update a game
  const updateGame = useCallback(async (game: Asset) => {
    const newGames = games.map(g => g.id === game.id ? game : g);
    setGames(newGames);
    setLocalGames(newGames);

    if (!userId || !isSupabaseConfigured() || !supabase) {
      return;
    }

    try {
      const row = assetToDbRow(game, userId, false); // Don't include ID in update body
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
  }, [games, userId, setLocalGames]);

  // Delete a game
  const deleteGame = useCallback(async (gameId: string) => {
    const newGames = games.filter(g => g.id !== gameId);
    setGames(newGames);
    setLocalGames(newGames);

    if (!userId || !isSupabaseConfigured() || !supabase) {
      return;
    }

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
  }, [games, userId, setLocalGames]);

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
