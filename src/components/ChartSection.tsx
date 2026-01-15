import { useState, useMemo } from 'react';
import { PortfolioChart } from './PortfolioChart';
import { Asset } from '@/types/asset';
import {
  generatePortfolioHistory,
  calculatePeriodGain,
  TimePeriod,
} from '@/utils/portfolioHistory';

interface ChartSectionProps {
  assets: Asset[];
  portfolioStats: {
    totalValue: number;
    totalGain: number;
    gainPercentage: number;
  };
}

export const ChartSection = ({ assets, portfolioStats }: ChartSectionProps) => {
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('1M');

  // Generate portfolio history from real assets
  const portfolioHistory = useMemo(() => {
    return generatePortfolioHistory(assets);
  }, [assets]);

  // Calculate gain for the selected period
  const periodStats = useMemo(() => {
    return calculatePeriodGain(portfolioHistory, selectedPeriod);
  }, [portfolioHistory, selectedPeriod]);

  return (
    <section className="mb-6">
      <div className="card-premium p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-semibold text-foreground">Portfolio Value</h3>
        </div>

        <PortfolioChart
          data={portfolioHistory}
          selectedPeriod={selectedPeriod}
          onPeriodChange={setSelectedPeriod}
          currentValue={portfolioStats.totalValue}
          gain={periodStats.gain}
          gainPercentage={periodStats.gainPercentage}
        />
      </div>
    </section>
  );
};
