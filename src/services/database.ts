/**
 * Database Service
 * 
 * Handles all database operations for games.
 * Uses Supabase when configured, falls back to localStorage.
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Asset } from '@/types/asset';

// Convert Asset to database format
function assetToDbRow(asset: Asset, userId: string) {
  return {
    id: asset.id,
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
    lastUpdated: row.updated_at?.split('T')[0] || row.created_at?.split('T')[0],
    videoGameDetails: {
      platform: row.platform,
      region: row.region,
      conditionType: row.condition_type,
      gradingCompany: row.grading_company || 'raw',
      grade: row.grade ? parseFloat(row.grade) : undefined,
      sealRating: row.seal_rating || undefined,
    },
  };
}

/**
 * Fetch all games for a user
 */
export async function fetchGames(userId: string): Promise<Asset[]> {
  if (!isSupabaseConfigured() || !supabase) {
    console.log('Supabase not configured, using localStorage');
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('games')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching games:', error);
      return [];
    }

    return (data || []).map(dbRowToAsset);
  } catch (error) {
    console.error('Database error:', error);
    return [];
  }
}

/**
 * Add a new game
 */
export async function addGame(asset: Asset, userId: string): Promise<Asset | null> {
  if (!isSupabaseConfigured() || !supabase) {
    return null;
  }

  try {
    const row = assetToDbRow(asset, userId);
    
    const { data, error } = await supabase
      .from('games')
      .insert(row)
      .select()
      .single();

    if (error) {
      console.error('Error adding game:', error);
      return null;
    }

    return dbRowToAsset(data);
  } catch (error) {
    console.error('Database error:', error);
    return null;
  }
}

/**
 * Update a game
 */
export async function updateGame(asset: Asset, userId: string): Promise<Asset | null> {
  if (!isSupabaseConfigured() || !supabase) {
    return null;
  }

  try {
    const row = assetToDbRow(asset, userId);
    
    const { data, error } = await supabase
      .from('games')
      .update(row)
      .eq('id', asset.id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating game:', error);
      return null;
    }

    return dbRowToAsset(data);
  } catch (error) {
    console.error('Database error:', error);
    return null;
  }
}

/**
 * Delete a game
 */
export async function deleteGame(gameId: string, userId: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) {
    return false;
  }

  try {
    const { error } = await supabase
      .from('games')
      .delete()
      .eq('id', gameId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting game:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Database error:', error);
    return false;
  }
}

/**
 * Check if Supabase is ready
 */
export { isSupabaseConfigured };
