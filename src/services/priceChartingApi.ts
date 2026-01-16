/**
 * PriceCharting API Integration for Video Games
 * 
 * PriceCharting is the gold standard for video game pricing.
 * Returns condition-specific prices: Loose, CIB, New/Sealed, Graded
 * 
 * IMPORTANT: We only return prices matching the user's condition type
 * to ensure accurate comparisons (no comparing loose to sealed!)
 * 
 * API Docs: https://www.pricecharting.com/api-documentation
 */

import { apiConfig, isPriceChartingConfigured } from '@/config/api';
import { MarketComparable } from '@/types/asset';

interface PriceChartingProduct {
  id: string;
  'product-name': string;
  'console-name'?: string;
  'loose-price'?: number;
  'cib-price'?: number;
  'new-price'?: number;
  'graded-price'?: number;
  'box-only-price'?: number;
  'manual-only-price'?: number;
}

interface PriceChartingResponse {
  status: string;
  products?: PriceChartingProduct[];
  product?: PriceChartingProduct;
}

export async function searchPriceCharting(
  name: string,
  category: 'video-games',
  details?: Record<string, unknown>
): Promise<{
  estimatedValue: number;
  comparables: MarketComparable[];
  priceBreakdown?: {
    loose?: number;
    cib?: number;
    new?: number;
    graded?: number;
  };
} | null> {
  if (!isPriceChartingConfigured()) {
    console.log('PriceCharting API not configured');
    return null;
  }

  try {
    // Build search query with platform
    let searchQuery = name;
    if (details?.platform) {
      searchQuery = `${details.platform} ${name}`;
    }
    
    const searchParams = new URLSearchParams({
      t: apiConfig.priceCharting.apiKey,
      q: searchQuery,
      type: 'video-games',
    });

    const response = await fetch(
      `${apiConfig.priceCharting.baseUrl}/products?${searchParams}`
    );

    if (!response.ok) {
      console.error('PriceCharting API error:', response.status);
      return null;
    }

    const data: PriceChartingResponse = await response.json();

    if (!data.products || data.products.length === 0) {
      return await lookupSingleProduct(searchQuery, details);
    }

    // Find best matching product
    const product = findBestMatch(data.products, name, details);
    if (!product) return null;

    // Get the user's condition type
    const conditionType = (details?.conditionType as string) || 'cib';
    const isGraded = details?.gradingCompany && details.gradingCompany !== 'raw';

    // Extract ALL prices for reference
    const priceBreakdown: {
      loose?: number;
      cib?: number;
      new?: number;
      graded?: number;
    } = {};

    if (product['loose-price']) {
      priceBreakdown.loose = product['loose-price'] / 100;
    }
    if (product['cib-price']) {
      priceBreakdown.cib = product['cib-price'] / 100;
    }
    if (product['new-price']) {
      priceBreakdown.new = product['new-price'] / 100;
    }
    if (product['graded-price']) {
      priceBreakdown.graded = product['graded-price'] / 100;
    }

    // ONLY return the price that matches the user's condition
    let estimatedValue = 0;
    const comparables: MarketComparable[] = [];
    const today = new Date().toISOString().split('T')[0];

    if (isGraded) {
      // Graded items - use graded price or estimate from sealed
      if (priceBreakdown.graded) {
        estimatedValue = priceBreakdown.graded;
        comparables.push({
          name: `${product['product-name']} (Graded)`,
          soldPrice: priceBreakdown.graded,
          soldDate: today,
          source: 'PriceCharting',
          condition: 'Graded',
        });
      } else if (priceBreakdown.new) {
        // Estimate graded price from sealed based on grade
        const grade = (details?.grade as number) || 8;
        let gradeMultiplier = 1.5; // Default
        if (grade >= 9.8) gradeMultiplier = 5.0;
        else if (grade >= 9.6) gradeMultiplier = 3.0;
        else if (grade >= 9.4) gradeMultiplier = 2.0;
        else if (grade >= 9.0) gradeMultiplier = 1.5;
        else if (grade >= 8.0) gradeMultiplier = 1.2;
        else gradeMultiplier = 1.0;
        
        estimatedValue = priceBreakdown.new * gradeMultiplier;
        comparables.push({
          name: `${product['product-name']} (Sealed - base for graded estimate)`,
          soldPrice: priceBreakdown.new,
          soldDate: today,
          source: 'PriceCharting',
          condition: 'New/Sealed',
        });
      }
    } else if (conditionType === 'sealed') {
      // Sealed items - ONLY use new/sealed price
      if (priceBreakdown.new) {
        estimatedValue = priceBreakdown.new;
        comparables.push({
          name: `${product['product-name']} (New/Sealed)`,
          soldPrice: priceBreakdown.new,
          soldDate: today,
          source: 'PriceCharting',
          condition: 'New/Sealed',
        });
      }
    } else if (conditionType === 'cib') {
      // CIB items - ONLY use CIB price
      if (priceBreakdown.cib) {
        estimatedValue = priceBreakdown.cib;
        comparables.push({
          name: `${product['product-name']} (CIB)`,
          soldPrice: priceBreakdown.cib,
          soldDate: today,
          source: 'PriceCharting',
          condition: 'CIB',
        });
      }
    } else if (conditionType === 'loose') {
      // Loose items - ONLY use loose price
      if (priceBreakdown.loose) {
        estimatedValue = priceBreakdown.loose;
        comparables.push({
          name: `${product['product-name']} (Loose)`,
          soldPrice: priceBreakdown.loose,
          soldDate: today,
          source: 'PriceCharting',
          condition: 'Loose',
        });
      }
    }

    // If we couldn't find a matching condition price, return null
    if (estimatedValue === 0) {
      console.log(`No ${conditionType} price found for ${name}`);
      return null;
    }

    return {
      estimatedValue: Math.round(estimatedValue * 100) / 100,
      comparables,
      priceBreakdown,
    };
  } catch (error) {
    console.error('PriceCharting API error:', error);
    return null;
  }
}

async function lookupSingleProduct(
  query: string,
  details?: Record<string, unknown>
): Promise<{
  estimatedValue: number;
  comparables: MarketComparable[];
} | null> {
  try {
    const params = new URLSearchParams({
      t: apiConfig.priceCharting.apiKey,
      q: query,
      type: 'video-games',
    });

    const response = await fetch(
      `${apiConfig.priceCharting.baseUrl}/product?${params}`
    );

    if (!response.ok) return null;

    const data: PriceChartingResponse = await response.json();
    if (!data.product) return null;

    const product = data.product;
    const conditionType = (details?.conditionType as string) || 'cib';
    const today = new Date().toISOString().split('T')[0];
    
    // Get the correct price for the condition
    let price = 0;
    let conditionLabel = 'CIB';
    
    if (conditionType === 'sealed' && product['new-price']) {
      price = product['new-price'] / 100;
      conditionLabel = 'New/Sealed';
    } else if (conditionType === 'cib' && product['cib-price']) {
      price = product['cib-price'] / 100;
      conditionLabel = 'CIB';
    } else if (conditionType === 'loose' && product['loose-price']) {
      price = product['loose-price'] / 100;
      conditionLabel = 'Loose';
    } else {
      // Fallback to any available price
      price = (product['cib-price'] || product['loose-price'] || product['new-price'] || 0) / 100;
    }

    if (price === 0) return null;

    return {
      estimatedValue: price,
      comparables: [{
        name: `${product['product-name']} (${conditionLabel})`,
        soldPrice: price,
        soldDate: today,
        source: 'PriceCharting',
        condition: conditionLabel,
      }],
    };
  } catch {
    return null;
  }
}

function findBestMatch(
  products: PriceChartingProduct[],
  searchName: string,
  details?: Record<string, unknown>
): PriceChartingProduct | null {
  if (products.length === 0) return null;
  
  const searchLower = searchName.toLowerCase();
  const platform = details?.platform as string | undefined;
  const conditionType = (details?.conditionType as string) || 'cib';
  
  const scored = products.map(product => {
    let score = 0;
    const productName = product['product-name'].toLowerCase();
    const consoleName = product['console-name']?.toLowerCase() || '';
    
    // Exact name match
    if (productName === searchLower) score += 100;
    else if (productName.includes(searchLower)) score += 50;
    else if (searchLower.includes(productName)) score += 30;
    
    // Platform match
    if (platform && consoleName.includes(platform.toLowerCase())) {
      score += 40;
    }
    
    // Prefer items that have the condition price we need
    if (conditionType === 'sealed' && product['new-price']) score += 20;
    else if (conditionType === 'cib' && product['cib-price']) score += 20;
    else if (conditionType === 'loose' && product['loose-price']) score += 20;
    
    return { product, score };
  });
  
  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.score > 0 ? scored[0].product : products[0];
}

/**
 * Look up a game by UPC/EAN barcode
 */
export async function lookupByUPC(upc: string): Promise<{
  name: string;
  platform: string;
  prices: {
    loose?: number;
    cib?: number;
    sealed?: number;
  };
} | null> {
  if (!isPriceChartingConfigured()) {
    console.log('PriceCharting API not configured');
    return null;
  }

  try {
    // Clean the UPC - remove any non-numeric characters
    const cleanUPC = upc.replace(/\D/g, '');
    
    const searchParams = new URLSearchParams({
      t: apiConfig.priceCharting.apiKey,
      upc: cleanUPC,
    });

    const response = await fetch(
      `${apiConfig.priceCharting.baseUrl}/product?${searchParams}`
    );

    if (!response.ok) {
      console.error('PriceCharting UPC lookup error:', response.status);
      return null;
    }

    const data: PriceChartingResponse = await response.json();

    if (!data.product) {
      console.log('No product found for UPC:', cleanUPC);
      return null;
    }

    const product = data.product;
    
    return {
      name: product['product-name'],
      platform: product['console-name'] || 'Unknown',
      prices: {
        loose: product['loose-price'] ? product['loose-price'] / 100 : undefined,
        cib: product['cib-price'] ? product['cib-price'] / 100 : undefined,
        sealed: product['new-price'] ? product['new-price'] / 100 : undefined,
      },
    };
  } catch (error) {
    console.error('PriceCharting UPC lookup error:', error);
    return null;
  }
}
