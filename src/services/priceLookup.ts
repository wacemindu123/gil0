/**
 * Video Game Price Lookup Service
 * 
 * Uses real APIs:
 * - PriceCharting (primary - best for video games)
 * - eBay sold listings (secondary)
 */

import { MarketComparable } from '@/types/asset';
import { isAnyApiConfigured, isPriceChartingConfigured } from '@/config/api';
import { searchPriceCharting } from './priceChartingApi';
import { searchEbaySoldListings } from './ebayApi';
import { calculateValuation, AssetMetadata } from './valuationEngine';

interface PriceLookupParams {
  category: 'video-games';
  name: string;
  details?: Record<string, unknown>;
}

interface PriceLookupResult {
  estimatedValue: number;
  confidence: 'high' | 'medium' | 'low';
  confidenceScore: number;
  comparables: MarketComparable[];
  priceRange: {
    low: number;
    median: number;
    high: number;
  };
  rollingAverage: {
    days30: number | null;
    days90: number | null;
    days180: number | null;
  };
  adjustments: Array<{
    type: string;
    factor: number;
    reason: string;
  }>;
  methodology: string;
  lastUpdated: string;
  source: 'pricecharting' | 'ebay' | 'combined' | 'none';
}

/**
 * Main price lookup function - uses real APIs only
 */
export async function lookupPrice(params: PriceLookupParams): Promise<PriceLookupResult> {
  const { name, details } = params;
  
  if (!isAnyApiConfigured()) {
    return createEmptyResult('No API keys configured. Add PriceCharting API key to .env');
  }
  
  const allComparables: MarketComparable[] = [];
  let source: PriceLookupResult['source'] = 'none';
  
  // 1. Try PriceCharting (best for video games)
  if (isPriceChartingConfigured()) {
    try {
      const pcResult = await searchPriceCharting(name, 'video-games', details);
      if (pcResult && pcResult.estimatedValue > 0) {
        allComparables.push(...pcResult.comparables);
        source = 'pricecharting';
      }
    } catch (error) {
      console.error('PriceCharting lookup failed:', error);
    }
  }
  
  // 2. Try eBay for additional comparables
  try {
    const ebayResults = await searchEbaySoldListings(name, 'video-games', details);
    if (ebayResults.length > 0) {
      allComparables.push(...ebayResults);
      if (source !== 'pricecharting') {
        source = 'ebay';
      } else {
        source = 'combined';
      }
    }
  } catch (error) {
    console.error('eBay lookup failed:', error);
  }
  
  if (allComparables.length === 0) {
    return createEmptyResult('No pricing data found for this game');
  }
  
  // Use valuation engine for accurate pricing
  const metadata: AssetMetadata = {
    category: 'video-games',
    name,
    ...details,
  } as AssetMetadata;
  
  const valuation = calculateValuation(metadata, allComparables);
  
  return {
    estimatedValue: valuation.estimatedValue,
    confidence: valuation.confidence,
    confidenceScore: valuation.confidenceScore,
    comparables: allComparables.slice(0, 10),
    priceRange: valuation.priceRange,
    rollingAverage: valuation.rollingAverage,
    adjustments: valuation.adjustments,
    methodology: valuation.methodology,
    lastUpdated: new Date().toISOString(),
    source,
  };
}

function createEmptyResult(message: string): PriceLookupResult {
  return {
    estimatedValue: 0,
    confidence: 'low',
    confidenceScore: 0,
    comparables: [],
    priceRange: { low: 0, median: 0, high: 0 },
    rollingAverage: { days30: null, days90: null, days180: null },
    adjustments: [],
    methodology: message,
    lastUpdated: new Date().toISOString(),
    source: 'none',
  };
}

/**
 * Market sources for video games
 */
export const marketSources = [
  { name: 'PriceCharting', url: 'https://pricecharting.com', type: 'Price Guide' },
  { name: 'eBay', url: 'https://ebay.com', type: 'Marketplace' },
  { name: 'Heritage Auctions', url: 'https://ha.com', type: 'Auction' },
  { name: 'Goldin', url: 'https://goldin.co', type: 'Auction' },
];

export { isAnyApiConfigured } from '@/config/api';
