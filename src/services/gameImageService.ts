/**
 * Game Image Service
 * 
 * Fetches game cover art from RAWG Video Games Database API
 * Free tier: 20,000 requests/month
 * https://rawg.io/apidocs
 */

// Platform name mappings to RAWG platform slugs
const platformToSlug: Record<string, string> = {
  'NES': 'nes',
  'SNES': 'snes',
  'N64': 'nintendo-64',
  'GameCube': 'gamecube',
  'Wii': 'wii',
  'Wii U': 'wii-u',
  'Switch': 'nintendo-switch',
  'Game Boy': 'game-boy',
  'GBA': 'game-boy-advance',
  'DS': 'nintendo-ds',
  '3DS': 'nintendo-3ds',
  'PS1': 'playstation',
  'PS2': 'playstation2',
  'PS3': 'playstation3',
  'PS4': 'playstation4',
  'PS5': 'playstation5',
  'PSP': 'psp',
  'PS Vita': 'ps-vita',
  'Xbox': 'xbox-old',
  'Xbox 360': 'xbox360',
  'Xbox One': 'xbox-one',
  'Xbox Series X': 'xbox-series-x',
  'Sega Genesis': 'genesis',
  'Sega Saturn': 'sega-saturn',
  'Dreamcast': 'dreamcast',
  'Atari 2600': 'atari-2600',
  'TurboGrafx-16': 'pc-engine',
  'Neo Geo': 'neogeo',
};

interface RAWGGame {
  id: number;
  name: string;
  background_image: string | null;
  platforms?: Array<{ platform: { slug: string; name: string } }>;
}

interface RAWGResponse {
  count: number;
  results: RAWGGame[];
}

// Simple in-memory cache to avoid repeated API calls
const imageCache: Map<string, string> = new Map();

/**
 * Calculate similarity score between two strings
 */
function stringSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  
  if (s1 === s2) return 1;
  
  const words1 = s1.split(/\s+/);
  const words2 = s2.split(/\s+/);
  
  let matchCount = 0;
  for (const word of words1) {
    if (word.length < 2) continue;
    if (words2.some(w => w.includes(word) || word.includes(w))) {
      matchCount++;
    }
  }
  
  return matchCount / Math.max(words1.length, words2.length);
}

/**
 * Search for a game and return its cover image URL
 */
export async function getGameCoverImage(
  gameName: string,
  platform?: string
): Promise<string | null> {
  // Create cache key
  const cacheKey = `${gameName.toLowerCase()}-${platform?.toLowerCase() || 'any'}`;
  
  // Check cache first
  if (imageCache.has(cacheKey)) {
    return imageCache.get(cacheKey) || null;
  }

  try {
    // Clean up the search query
    let searchQuery = gameName
      .replace(/\s*\(.*?\)\s*/g, '') // Remove parenthetical content
      .trim();

    const params = new URLSearchParams({
      search: searchQuery,
      page_size: '10', // Get more results to find better match
      search_precise: 'false', // Allow fuzzy matching
    });

    // Add platform filter if we have a mapping
    if (platform && platformToSlug[platform]) {
      params.append('platforms', platformToSlug[platform]);
    }

    // RAWG API - using their demo key (limited but works for basic usage)
    // For production, get a free API key at https://rawg.io/apidocs
    const response = await fetch(
      `https://api.rawg.io/api/games?${params}&key=c542e67aec3a4340908f9de9e86038af`
    );

    if (!response.ok) {
      console.log('RAWG API error:', response.status);
      return null;
    }

    const data: RAWGResponse = await response.json();

    if (data.results && data.results.length > 0) {
      // Score each result and find the best match
      let bestMatch: RAWGGame | null = null;
      let bestScore = 0;
      
      const searchLower = gameName.toLowerCase();
      
      for (const game of data.results) {
        let score = stringSimilarity(game.name, gameName);
        
        // Exact match gets highest score
        if (game.name.toLowerCase() === searchLower) {
          score = 2;
        }
        
        // Boost score if platform matches
        if (platform && platformToSlug[platform] && game.platforms) {
          const hasMatchingPlatform = game.platforms.some(
            p => p.platform.slug === platformToSlug[platform]
          );
          if (hasMatchingPlatform) {
            score += 0.5;
          }
        }
        
        // Penalize if name is very different length
        const lengthRatio = Math.min(game.name.length, gameName.length) / 
                           Math.max(game.name.length, gameName.length);
        score *= lengthRatio;
        
        if (score > bestScore && game.background_image) {
          bestScore = score;
          bestMatch = game;
        }
      }

      if (bestMatch?.background_image && bestScore > 0.3) {
        console.log(`Found match: "${bestMatch.name}" for "${gameName}" (score: ${bestScore.toFixed(2)})`);
        imageCache.set(cacheKey, bestMatch.background_image);
        return bestMatch.background_image;
      }
    }

    // Try searching without platform restriction as fallback
    if (platform) {
      const fallbackParams = new URLSearchParams({
        search: searchQuery,
        page_size: '5',
      });

      const fallbackResponse = await fetch(
        `https://api.rawg.io/api/games?${fallbackParams}&key=c542e67aec3a4340908f9de9e86038af`
      );

      if (fallbackResponse.ok) {
        const fallbackData: RAWGResponse = await fallbackResponse.json();
        for (const game of fallbackData.results || []) {
          const score = stringSimilarity(game.name, gameName);
          if (score > 0.5 && game.background_image) {
            console.log(`Fallback match: "${game.name}" for "${gameName}"`);
            imageCache.set(cacheKey, game.background_image);
            return game.background_image;
          }
        }
      }
    }

    return null;
  } catch (error) {
    console.error('Failed to fetch game image:', error);
    return null;
  }
}

/**
 * Preload images for multiple games (useful for batch loading)
 */
export async function preloadGameImages(
  games: Array<{ name: string; platform?: string }>
): Promise<Map<string, string>> {
  const results = new Map<string, string>();
  
  // Process in parallel with a small delay to avoid rate limiting
  const promises = games.map(async (game, index) => {
    // Stagger requests slightly
    await new Promise(resolve => setTimeout(resolve, index * 100));
    const image = await getGameCoverImage(game.name, game.platform);
    if (image) {
      results.set(`${game.name}-${game.platform}`, image);
    }
  });

  await Promise.all(promises);
  return results;
}
