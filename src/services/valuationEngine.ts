/**
 * Video Game Valuation Engine
 * 
 * Calculates accurate values using:
 * 1. Weighted comparable matching (similarity scoring)
 * 2. Time-decay rolling average (recent sales weighted more)
 * 3. Condition-based adjustments (sealed, CIB, loose, graded)
 * 4. Statistical analysis (median, std deviation, outlier removal)
 */

import { MarketComparable } from '@/types/asset';

// ============================================
// TYPES
// ============================================

export interface AssetMetadata {
  category: 'video-games';
  name: string;
  // Video game fields
  platform?: string;
  region?: string;
  conditionType?: 'sealed' | 'cib' | 'loose';
  gradingCompany?: string;
  grade?: number;
  sealRating?: string;
}

export interface ValuationResult {
  estimatedValue: number;
  confidence: 'high' | 'medium' | 'low';
  confidenceScore: number;
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
  comparablesUsed: number;
  adjustments: PriceAdjustment[];
  methodology: string;
}

export interface ScoredComparable extends MarketComparable {
  similarityScore: number;
  timeWeight: number;
  finalWeight: number;
  adjustedPrice: number;
}

export interface PriceAdjustment {
  type: string;
  factor: number;
  reason: string;
}

// ============================================
// CONFIGURATION
// ============================================

const TIME_DECAY_CONFIG = {
  0: 1.0,
  7: 0.95,
  14: 0.90,
  30: 0.85,
  60: 0.70,
  90: 0.55,
  180: 0.35,
  365: 0.15,
};

const CONFIDENCE_THRESHOLDS = {
  high: { minComparables: 5, minAvgSimilarity: 70 },
  medium: { minComparables: 3, minAvgSimilarity: 50 },
  low: { minComparables: 1, minAvgSimilarity: 0 },
};

// Grade multipliers for WATA/VGA graded games
const GRADE_MULTIPLIERS: Record<number, number> = {
  10: 8.0,
  9.8: 5.0,
  9.6: 3.0,
  9.4: 2.0,
  9.2: 1.6,
  9.0: 1.3,
  8.5: 1.1,
  8.0: 1.0,
  7.5: 0.8,
  7.0: 0.6,
  6.0: 0.4,
  5.0: 0.3,
};

// ============================================
// MAIN VALUATION FUNCTION
// ============================================

export function calculateValuation(
  metadata: AssetMetadata,
  comparables: MarketComparable[]
): ValuationResult {
  if (comparables.length === 0) {
    return createEmptyResult('No comparable sales data available');
  }

  // Step 0: Pre-filter by condition type to ensure apples-to-apples comparison
  const conditionFilteredComparables = filterByConditionType(comparables, metadata.conditionType);
  
  if (conditionFilteredComparables.length === 0) {
    return createEmptyResult(`No ${metadata.conditionType?.toUpperCase() || 'matching'} condition sales found`);
  }

  // Step 1: Score each comparable for similarity
  const scoredComparables = conditionFilteredComparables.map(comp => 
    scoreComparable(comp, metadata)
  );

  // Step 2: Filter out very low similarity matches
  const relevantComparables = scoredComparables.filter(c => c.similarityScore >= 20);
  
  if (relevantComparables.length === 0) {
    return createEmptyResult('No sufficiently similar comparables found');
  }

  // Step 3: Remove statistical outliers
  const withoutOutliers = removeOutliers(relevantComparables);

  // Step 4: Calculate weighted rolling averages
  const rollingAverages = calculateRollingAverages(withoutOutliers);

  // Step 5: Calculate final weighted average
  const { weightedAverage, adjustments } = calculateWeightedAverage(
    withoutOutliers,
    metadata
  );

  // Step 6: Calculate price range
  const priceRange = calculatePriceRange(withoutOutliers);

  // Step 7: Determine confidence
  const { confidence, confidenceScore } = calculateConfidence(
    withoutOutliers,
    relevantComparables.length
  );

  // Step 8: Build methodology explanation
  const methodology = buildMethodology(
    withoutOutliers.length,
    conditionFilteredComparables.length,
    adjustments,
    metadata.conditionType
  );

  return {
    estimatedValue: Math.round(weightedAverage),
    confidence,
    confidenceScore,
    priceRange,
    rollingAverage: rollingAverages,
    comparablesUsed: withoutOutliers.length,
    adjustments,
    methodology,
  };
}

// ============================================
// CONDITION TYPE FILTERING
// ============================================

/**
 * Filter comparables to only include items matching the target condition type.
 * This ensures we're comparing sealed to sealed, CIB to CIB, loose to loose.
 */
function filterByConditionType(
  comparables: MarketComparable[],
  targetCondition?: 'sealed' | 'cib' | 'loose'
): MarketComparable[] {
  if (!targetCondition) return comparables;

  const conditionKeywords: Record<string, string[]> = {
    'sealed': ['sealed', 'new', 'factory sealed', 'brand new', 'mint sealed', 'new/sealed'],
    'cib': ['cib', 'complete', 'complete in box', 'with box', 'with manual', 'box and manual'],
    'loose': ['loose', 'cart only', 'cartridge only', 'disc only', 'game only', 'no box', 'no manual'],
  };

  // Also check for explicit condition field from API
  const conditionFieldMatch: Record<string, string[]> = {
    'sealed': ['new', 'sealed', 'new/sealed', 'factory sealed'],
    'cib': ['cib', 'complete', 'very good', 'good'],
    'loose': ['loose', 'acceptable', 'cart', 'disc'],
  };

  const targetKeywords = conditionKeywords[targetCondition] || [];
  const targetConditionFields = conditionFieldMatch[targetCondition] || [];

  return comparables.filter(comp => {
    const nameLower = comp.name.toLowerCase();
    const conditionLower = (comp.condition || '').toLowerCase();

    // Check if condition field matches
    if (conditionLower) {
      const conditionMatches = targetConditionFields.some(kw => conditionLower.includes(kw));
      if (conditionMatches) return true;
      
      // Exclude if condition clearly indicates different type
      if (targetCondition !== 'sealed' && 
          (conditionLower.includes('sealed') || conditionLower.includes('new'))) {
        return false;
      }
      if (targetCondition !== 'loose' && conditionLower.includes('loose')) {
        return false;
      }
    }

    // Check name for condition keywords
    const nameMatches = targetKeywords.some(kw => nameLower.includes(kw));
    if (nameMatches) return true;

    // Exclude items that clearly have different condition in name
    if (targetCondition !== 'sealed' && 
        (nameLower.includes('sealed') || nameLower.includes('factory new'))) {
      return false;
    }
    if (targetCondition !== 'loose' && 
        (nameLower.includes('loose') || nameLower.includes('cart only') || 
         nameLower.includes('disc only'))) {
      return false;
    }
    if (targetCondition !== 'cib' && 
        (nameLower.includes('cib') || nameLower.includes('complete in box'))) {
      return false;
    }

    // If we can't determine condition, include it (PriceCharting returns condition-specific)
    return true;
  });
}

// ============================================
// SIMILARITY SCORING
// ============================================

function scoreComparable(
  comparable: MarketComparable,
  target: AssetMetadata
): ScoredComparable {
  let similarityScore = 0;
  let maxScore = 0;

  const compName = comparable.name.toLowerCase();
  const targetName = target.name.toLowerCase();

  // Base name matching (40 points max)
  maxScore += 40;
  similarityScore += scoreNameSimilarity(compName, targetName) * 40;

  // Video game specific matching (60 points max)
  maxScore += 60;
  similarityScore += scoreVideoGameAttributes(comparable, target) * 60;

  const normalizedScore = Math.round((similarityScore / maxScore) * 100);
  const timeWeight = calculateTimeWeight(comparable.soldDate);
  const finalWeight = (normalizedScore / 100) * timeWeight;

  return {
    ...comparable,
    similarityScore: normalizedScore,
    timeWeight,
    finalWeight,
    adjustedPrice: comparable.soldPrice,
  };
}

function scoreNameSimilarity(compName: string, targetName: string): number {
  const compWords = new Set(compName.split(/\s+/).filter(w => w.length > 2));
  const targetWords = new Set(targetName.split(/\s+/).filter(w => w.length > 2));
  
  if (targetWords.size === 0) return 0;

  let matchCount = 0;
  for (const word of targetWords) {
    if (compWords.has(word)) {
      matchCount++;
    } else {
      for (const compWord of compWords) {
        if (compWord.includes(word) || word.includes(compWord)) {
          matchCount += 0.5;
          break;
        }
      }
    }
  }

  return matchCount / targetWords.size;
}

function scoreVideoGameAttributes(
  comparable: MarketComparable,
  target: AssetMetadata
): number {
  const compName = comparable.name.toLowerCase();
  const compCondition = comparable.condition?.toLowerCase() || '';
  let score = 0;
  let factors = 0;

  // Platform matching (critical)
  if (target.platform) {
    factors += 3;
    if (compName.includes(target.platform.toLowerCase())) {
      score += 3;
    }
  }

  // Condition type (sealed/CIB/loose)
  if (target.conditionType) {
    factors += 2;
    const conditionMap: Record<string, string[]> = {
      'sealed': ['sealed', 'new', 'factory', 'wata', 'vga'],
      'cib': ['cib', 'complete', 'box'],
      'loose': ['loose', 'cart', 'disc only', 'cartridge'],
    };
    const keywords = conditionMap[target.conditionType] || [];
    if (keywords.some(kw => compName.includes(kw) || compCondition.includes(kw))) {
      score += 2;
    }
  }

  // Grading company match
  if (target.gradingCompany && target.gradingCompany !== 'raw') {
    factors += 2;
    if (compName.includes(target.gradingCompany.toLowerCase()) ||
        compCondition.includes(target.gradingCompany.toLowerCase())) {
      score += 1.5;
      // Grade number match
      if (target.grade && (compName.includes(String(target.grade)) || 
          compCondition.includes(String(target.grade)))) {
        score += 0.5;
      }
    }
  }

  // Region matching
  if (target.region) {
    factors += 1;
    const regionKeywords: Record<string, string[]> = {
      'NTSC': ['ntsc', 'usa', 'us version'],
      'PAL': ['pal', 'europe', 'uk', 'eu'],
      'NTSC-J': ['ntsc-j', 'japan', 'jp', 'japanese'],
    };
    const keywords = regionKeywords[target.region] || [];
    if (keywords.some(kw => compName.includes(kw))) {
      score += 1;
    }
  }

  return factors > 0 ? score / factors : 0.5;
}

// ============================================
// TIME WEIGHTING
// ============================================

function calculateTimeWeight(soldDateStr: string): number {
  const soldDate = new Date(soldDateStr);
  const now = new Date();
  const daysDiff = Math.floor((now.getTime() - soldDate.getTime()) / (1000 * 60 * 60 * 24));

  const brackets = Object.entries(TIME_DECAY_CONFIG)
    .map(([days, weight]) => ({ days: parseInt(days), weight }))
    .sort((a, b) => a.days - b.days);

  for (let i = brackets.length - 1; i >= 0; i--) {
    if (daysDiff >= brackets[i].days) {
      if (i < brackets.length - 1) {
        const lower = brackets[i];
        const upper = brackets[i + 1];
        const ratio = (daysDiff - lower.days) / (upper.days - lower.days);
        return lower.weight - (lower.weight - upper.weight) * ratio;
      }
      return brackets[i].weight;
    }
  }

  return 1.0;
}

// ============================================
// STATISTICAL ANALYSIS
// ============================================

function removeOutliers(comparables: ScoredComparable[]): ScoredComparable[] {
  if (comparables.length < 4) return comparables;

  const prices = comparables.map(c => c.adjustedPrice);
  const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
  const stdDev = Math.sqrt(
    prices.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / prices.length
  );

  const lowerBound = mean - 2 * stdDev;
  const upperBound = mean + 2 * stdDev;

  return comparables.filter(c => 
    c.adjustedPrice >= lowerBound && c.adjustedPrice <= upperBound
  );
}

function calculateRollingAverages(
  comparables: ScoredComparable[]
): ValuationResult['rollingAverage'] {
  const now = new Date();
  
  const filterByDays = (days: number) => {
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    return comparables.filter(c => new Date(c.soldDate) >= cutoff);
  };

  const calcWeightedAvg = (items: ScoredComparable[]): number | null => {
    if (items.length === 0) return null;
    const totalWeight = items.reduce((sum, c) => sum + c.finalWeight, 0);
    if (totalWeight === 0) return null;
    return items.reduce((sum, c) => sum + c.adjustedPrice * c.finalWeight, 0) / totalWeight;
  };

  return {
    days30: calcWeightedAvg(filterByDays(30)),
    days90: calcWeightedAvg(filterByDays(90)),
    days180: calcWeightedAvg(filterByDays(180)),
  };
}

function calculateWeightedAverage(
  comparables: ScoredComparable[],
  metadata: AssetMetadata
): { weightedAverage: number; adjustments: PriceAdjustment[] } {
  const adjustments: PriceAdjustment[] = [];

  // Calculate base weighted average
  const totalWeight = comparables.reduce((sum, c) => sum + c.finalWeight, 0);
  let weightedAverage = totalWeight > 0
    ? comparables.reduce((sum, c) => sum + c.adjustedPrice * c.finalWeight, 0) / totalWeight
    : comparables.reduce((sum, c) => sum + c.adjustedPrice, 0) / comparables.length;

  // Apply grade adjustment if graded
  // Since PriceCharting's graded prices are averages, adjust based on specific grade
  if (metadata.grade !== undefined && metadata.gradingCompany && metadata.gradingCompany !== 'raw') {
    const gradeMultiplier = getGradeMultiplier(metadata.grade);
    const baseGradeMultiplier = getGradeMultiplier(8.5); // Assume average graded sale is ~8.5
    
    if (gradeMultiplier !== baseGradeMultiplier) {
      const adjustment = gradeMultiplier / baseGradeMultiplier;
      weightedAverage *= adjustment;
      adjustments.push({
        type: 'grade',
        factor: adjustment,
        reason: `Adjusted for ${metadata.gradingCompany} ${metadata.grade} grade`,
      });
    }
  }

  // Note: We no longer apply condition adjustments here because we pre-filter
  // comparables by condition type. This ensures apples-to-apples comparison.

  return { weightedAverage, adjustments };
}

function getGradeMultiplier(grade: number): number {
  const grades = Object.keys(GRADE_MULTIPLIERS).map(Number).sort((a, b) => b - a);
  for (const g of grades) {
    if (grade >= g) {
      return GRADE_MULTIPLIERS[g];
    }
  }
  return GRADE_MULTIPLIERS[5.0];
}

function calculatePriceRange(comparables: ScoredComparable[]): ValuationResult['priceRange'] {
  const prices = comparables.map(c => c.adjustedPrice).sort((a, b) => a - b);
  
  const percentile = (arr: number[], p: number) => {
    const index = Math.ceil((p / 100) * arr.length) - 1;
    return arr[Math.max(0, Math.min(index, arr.length - 1))];
  };

  return {
    low: Math.round(percentile(prices, 25)),
    median: Math.round(percentile(prices, 50)),
    high: Math.round(percentile(prices, 75)),
  };
}

// ============================================
// CONFIDENCE CALCULATION
// ============================================

function calculateConfidence(
  comparables: ScoredComparable[],
  totalFound: number
): { confidence: 'high' | 'medium' | 'low'; confidenceScore: number } {
  const avgSimilarity = comparables.reduce((sum, c) => sum + c.similarityScore, 0) / comparables.length;
  const count = comparables.length;

  let confidenceScore = 0;
  confidenceScore += Math.min(count * 8, 40);
  confidenceScore += (avgSimilarity / 100) * 40;
  const avgTimeWeight = comparables.reduce((sum, c) => sum + c.timeWeight, 0) / count;
  confidenceScore += avgTimeWeight * 20;

  let confidence: 'high' | 'medium' | 'low' = 'low';
  
  if (count >= CONFIDENCE_THRESHOLDS.high.minComparables && 
      avgSimilarity >= CONFIDENCE_THRESHOLDS.high.minAvgSimilarity) {
    confidence = 'high';
  } else if (count >= CONFIDENCE_THRESHOLDS.medium.minComparables && 
             avgSimilarity >= CONFIDENCE_THRESHOLDS.medium.minAvgSimilarity) {
    confidence = 'medium';
  }

  return { confidence, confidenceScore: Math.round(confidenceScore) };
}

// ============================================
// HELPERS
// ============================================

function buildMethodology(
  usedCount: number,
  totalCount: number,
  adjustments: PriceAdjustment[],
  conditionType?: string
): string {
  const parts: string[] = [];
  
  if (conditionType) {
    parts.push(`Based on ${usedCount} ${conditionType.toUpperCase()} sales`);
  } else {
    parts.push(`Based on ${usedCount} comparable sales`);
  }
  
  if (totalCount > usedCount) {
    parts.push(`(${totalCount - usedCount} outliers excluded)`);
  }
  
  if (adjustments.length > 0) {
    const adjNames = adjustments.map(a => a.type).join(', ');
    parts.push(`with ${adjNames} adjustments applied`);
  }

  parts.push('using time-weighted rolling average');

  return parts.join(' ');
}

function createEmptyResult(reason: string): ValuationResult {
  return {
    estimatedValue: 0,
    confidence: 'low',
    confidenceScore: 0,
    priceRange: { low: 0, median: 0, high: 0 },
    rollingAverage: { days30: null, days90: null, days180: null },
    comparablesUsed: 0,
    adjustments: [],
    methodology: reason,
  };
}
