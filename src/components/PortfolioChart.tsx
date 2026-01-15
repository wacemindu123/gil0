import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { PortfolioDataPoint, TimePeriod, timePeriods, getDataByPeriod } from '@/utils/portfolioHistory';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface PortfolioChartProps {
  data: PortfolioDataPoint[];
  selectedPeriod: TimePeriod;
  onPeriodChange: (period: TimePeriod) => void;
  currentValue: number;
  gain: number;
  gainPercentage: number;
}

const formatCurrency = (value: number) => {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(2)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(1)}K`;
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const dataPoint = payload[0]?.payload;
    return (
      <div className="bg-card/95 backdrop-blur-sm border border-border rounded-lg px-3 py-2 shadow-lg">
        <p className="text-xs text-muted-foreground">
          {new Date(dataPoint?.date).toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric',
            year: 'numeric'
          })}
        </p>
        <p className="text-sm font-semibold text-foreground">
          {formatCurrency(payload[0].value)}
        </p>
      </div>
    );
  }
  return null;
};

export const PortfolioChart = ({
  data,
  selectedPeriod,
  onPeriodChange,
  currentValue,
  gain,
  gainPercentage,
}: PortfolioChartProps) => {
  const filteredData = getDataByPeriod(data, selectedPeriod);
  const isPositive = gain >= 0;
  const hasData = currentValue > 0;

  // Period labels for display
  const periodLabels: Record<TimePeriod, string> = {
    '1W': 'Past Week',
    '1M': 'Past Month',
    '3M': 'Past 3 Months',
    '6M': 'Past 6 Months',
    '1Y': 'Past Year',
    'ALL': 'All Time',
  };

  return (
    <div>
      {/* Value Display */}
      <div className="mb-4">
        <div className="flex items-baseline gap-3 flex-wrap">
          <span className="text-3xl font-bold font-display text-foreground">
            {formatCurrency(currentValue)}
          </span>
          {hasData && (
            <div className={`flex items-center gap-1 text-sm ${isPositive ? 'text-success' : 'text-destructive'}`}>
              {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              <span>{isPositive ? '+' : ''}{formatCurrency(Math.abs(gain))}</span>
              <span className="text-muted-foreground">({isPositive ? '+' : ''}{gainPercentage.toFixed(1)}%)</span>
            </div>
          )}
        </div>
        {hasData && (
          <p className="text-xs text-muted-foreground mt-1">{periodLabels[selectedPeriod]}</p>
        )}
      </div>

      {/* Time Period Selector */}
      <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
        {timePeriods.map((period) => (
          <button
            key={period}
            onClick={() => onPeriodChange(period)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all whitespace-nowrap ${
              selectedPeriod === period
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-muted-foreground hover:text-foreground'
            }`}
          >
            {period}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="h-48 -mx-2">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={filteredData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
              <defs>
                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={isPositive ? "hsl(var(--success))" : "hsl(var(--destructive))"} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={isPositive ? "hsl(var(--success))" : "hsl(var(--destructive))"} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                dy={10}
                interval="preserveStartEnd"
              />
              <YAxis
                hide
                domain={['dataMin - 5%', 'dataMax + 5%']}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="value"
                stroke={isPositive ? "hsl(var(--success))" : "hsl(var(--destructive))"}
                strokeWidth={2}
                fill="url(#chartGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
            Add games to see your portfolio grow
          </div>
        )}
      </div>
    </div>
  );
};
