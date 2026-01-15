/**
 * Portfolio History Generator
 * 
 * Generates real portfolio value history based on actual assets,
 * their purchase dates, and current values.
 */

import { Asset } from '@/types/asset';

export interface PortfolioDataPoint {
  date: string;
  label: string;
  value: number;
}

export type TimePeriod = '1W' | '1M' | '3M' | '6M' | '1Y' | 'ALL';

export const timePeriods: TimePeriod[] = ['1W', '1M', '3M', '6M', '1Y', 'ALL'];

/**
 * Generate portfolio history based on actual assets
 */
export function generatePortfolioHistory(assets: Asset[]): PortfolioDataPoint[] {
  if (assets.length === 0) {
    return generateEmptyHistory();
  }

  const now = new Date();
  const data: PortfolioDataPoint[] = [];
  
  // Find the earliest purchase date
  const purchaseDates = assets.map(a => new Date(a.purchaseDate).getTime());
  const earliestDate = new Date(Math.min(...purchaseDates));
  
  // Determine how many days of history we need
  const daysSinceEarliest = Math.ceil((now.getTime() - earliestDate.getTime()) / (1000 * 60 * 60 * 24));
  const historyDays = Math.min(Math.max(daysSinceEarliest, 7), 365); // Between 7 and 365 days
  
  // For each day, calculate the portfolio value
  for (let i = historyDays; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);
    
    let dayValue = 0;
    
    for (const asset of assets) {
      const purchaseDate = new Date(asset.purchaseDate);
      purchaseDate.setHours(0, 0, 0, 0);
      
      // Only count assets that were purchased by this date
      if (date >= purchaseDate) {
        // Calculate value on this day
        // Linear interpolation from purchase price to current value
        const daysOwned = Math.ceil((now.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24));
        const daysSincePurchase = Math.ceil((date.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysOwned <= 0) {
          // Purchased today
          dayValue += asset.currentValue;
        } else {
          // Interpolate value
          const valueGrowth = asset.currentValue - asset.purchasePrice;
          const progress = Math.min(daysSincePurchase / daysOwned, 1);
          const valueOnDay = asset.purchasePrice + (valueGrowth * progress);
          dayValue += valueOnDay;
        }
      }
    }
    
    // Format label
    const label = formatDateLabel(date, i, historyDays);
    
    data.push({
      date: date.toISOString().split('T')[0],
      label,
      value: Math.round(dayValue * 100) / 100,
    });
  }
  
  return data;
}

/**
 * Generate empty history for when there are no assets
 */
function generateEmptyHistory(): PortfolioDataPoint[] {
  const data: PortfolioDataPoint[] = [];
  const now = new Date();
  
  for (let i = 30; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    
    data.push({
      date: date.toISOString().split('T')[0],
      label: formatDateLabel(date, i, 30),
      value: 0,
    });
  }
  
  return data;
}

/**
 * Format date label based on position
 */
function formatDateLabel(date: Date, daysAgo: number, totalDays: number): string {
  if (daysAgo === 0) {
    return 'Today';
  } else if (daysAgo <= 7) {
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  } else if (daysAgo <= 90) {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } else {
    return date.toLocaleDateString('en-US', { month: 'short' });
  }
}

/**
 * Filter data by time period
 */
export function getDataByPeriod(data: PortfolioDataPoint[], period: TimePeriod): PortfolioDataPoint[] {
  const periodDays: Record<TimePeriod, number> = {
    '1W': 7,
    '1M': 30,
    '3M': 90,
    '6M': 180,
    '1Y': 365,
    'ALL': data.length,
  };
  
  const days = Math.min(periodDays[period], data.length);
  const slicedData = data.slice(-days);
  
  // Re-format labels for the selected period with appropriate intervals
  return slicedData.map((point, index) => {
    const totalPoints = slicedData.length;
    let label = '';
    
    // Determine label interval based on period
    let interval = 1;
    if (period === '1W') {
      interval = 1; // Show every day
    } else if (period === '1M') {
      interval = 5; // Every 5 days
    } else if (period === '3M') {
      interval = 15; // Every 2 weeks
    } else if (period === '6M') {
      interval = 30; // Monthly
    } else {
      interval = Math.ceil(totalPoints / 6); // ~6 labels
    }
    
    // Show label at intervals and always at the end
    if (index % interval === 0 || index === totalPoints - 1) {
      const date = new Date(point.date);
      if (index === totalPoints - 1) {
        label = 'Now';
      } else if (period === '1W') {
        label = date.toLocaleDateString('en-US', { weekday: 'short' });
      } else if (period === '1M' || period === '3M') {
        label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      } else {
        label = date.toLocaleDateString('en-US', { month: 'short' });
      }
    }
    
    return { ...point, label };
  });
}

/**
 * Calculate gain/loss for a specific time period
 */
export function calculatePeriodGain(data: PortfolioDataPoint[], period: TimePeriod): {
  gain: number;
  gainPercentage: number;
  startValue: number;
  endValue: number;
} {
  const filteredData = getDataByPeriod(data, period);
  
  if (filteredData.length < 2) {
    return { gain: 0, gainPercentage: 0, startValue: 0, endValue: 0 };
  }
  
  const startValue = filteredData[0].value;
  const endValue = filteredData[filteredData.length - 1].value;
  const gain = endValue - startValue;
  const gainPercentage = startValue > 0 ? (gain / startValue) * 100 : 0;
  
  return { gain, gainPercentage, startValue, endValue };
}
