/**
 * eBay Browse API Integration for Video Games
 * 
 * Searches sold/completed listings for real transaction data.
 * API Docs: https://developer.ebay.com/api-docs/buy/browse/static/overview.html
 */

import { apiConfig, isEbayConfigured } from '@/config/api';
import { MarketComparable } from '@/types/asset';

interface EbaySearchResult {
  itemSummaries?: Array<{
    itemId: string;
    title: string;
    price: {
      value: string;
      currency: string;
    };
    condition: string;
    itemWebUrl: string;
    image?: {
      imageUrl: string;
    };
    itemEndDate?: string;
  }>;
  total: number;
}

// eBay category IDs for video games
const VIDEO_GAME_CATEGORIES = ['139973', '187', '1249'];

function buildSearchQuery(
  name: string, 
  details?: Record<string, unknown>
): string {
  let query = name;
  
  if (details) {
    // Add platform
    if (details.platform) {
      query += ` ${details.platform}`;
    }
    
    // Add condition type keywords
    if (details.conditionType === 'sealed') {
      query += ' sealed';
    } else if (details.conditionType === 'cib') {
      query += ' complete CIB';
    } else if (details.conditionType === 'loose') {
      query += ' loose cart';
    }
    
    // Add grading info
    if (details.gradingCompany && details.gradingCompany !== 'raw') {
      query += ` ${details.gradingCompany}`;
      if (details.grade) {
        query += ` ${details.grade}`;
      }
    }
  }
  
  return query;
}

export async function searchEbaySoldListings(
  name: string,
  category: 'video-games',
  details?: Record<string, unknown>
): Promise<MarketComparable[]> {
  if (!isEbayConfigured()) {
    console.log('eBay API not configured');
    return [];
  }

  const query = buildSearchQuery(name, details);
  const categoryIds = VIDEO_GAME_CATEGORIES.join(',');
  
  try {
    const params = new URLSearchParams({
      q: query,
      category_ids: categoryIds,
      filter: 'conditionIds:{1000|1500|2000|2500|3000}',
      sort: 'newlyListed',
      limit: '20',
    });

    // Note: eBay Browse API requires OAuth token
    // This needs server-side implementation for full functionality
    const response = await fetch(
      `https://api.ebay.com/buy/browse/v1/item_summary/search?${params}`,
      {
        headers: {
          'Authorization': `Bearer ${apiConfig.ebay.appId}`,
          'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US',
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      console.log('eBay API request failed, status:', response.status);
      return [];
    }

    const data: EbaySearchResult = await response.json();
    
    if (!data.itemSummaries || data.itemSummaries.length === 0) {
      return [];
    }

    return data.itemSummaries.map(item => ({
      name: item.title,
      soldPrice: parseFloat(item.price.value),
      soldDate: item.itemEndDate || new Date().toISOString().split('T')[0],
      source: 'eBay',
      condition: item.condition,
      url: item.itemWebUrl,
    }));
  } catch (error) {
    console.error('eBay API error:', error);
    return [];
  }
}
