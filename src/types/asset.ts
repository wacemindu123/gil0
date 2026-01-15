// Currently supporting Video Games only
// Future categories: trading-cards, cars, art, vintage-toys, sneakers
export type AssetCategory = 'video-games';

export type Condition = 'mint' | 'near-mint' | 'excellent' | 'good' | 'fair' | 'poor';

// Video Game specific details
export interface VideoGameDetails {
  platform: string;
  region: 'NTSC' | 'PAL' | 'NTSC-J' | 'other';
  conditionType: 'sealed' | 'cib' | 'loose';
  gradingCompany?: 'WATA' | 'VGA' | 'CGC' | 'raw';
  grade?: number;
  sealRating?: string;
  boxCondition?: Condition;
}

export interface Asset {
  id: string;
  name: string;
  category: AssetCategory;
  imageUrl: string;
  photos?: string[];
  currentValue: number;
  estimatedValue?: number;
  purchasePrice: number;
  purchaseDate: string;
  source: string;
  lastUpdated: string;
  // Video game specific details
  videoGameDetails?: VideoGameDetails;
}

export interface PriceSource {
  name: string;
  price: number;
  url: string;
  lastChecked: string;
}

export interface MarketComparable {
  name: string;
  soldPrice: number;
  soldDate: string;
  source: string;
  condition?: string;
  url?: string;
}

export const categoryLabels: Record<AssetCategory, string> = {
  'video-games': 'Video Games',
};

export const categoryIcons: Record<AssetCategory, string> = {
  'video-games': '🎮',
};
