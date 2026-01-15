import { RefreshCw, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react';
import { isPriceChartingConfigured } from '@/config/api';

// PriceCharting aggregates data from these sources
const dataSources = [
  { 
    name: 'eBay Sold', 
    color: '#e53238', 
    description: 'Completed auction & BIN sales',
    primary: true 
  },
  { 
    name: 'PC Marketplace', 
    color: '#6366f1', 
    description: 'PriceCharting marketplace sales',
    primary: true 
  },
];

// Condition types we track
const conditionTypes = [
  { name: 'Loose', color: '#f59e0b' },
  { name: 'CIB', color: '#3b82f6' },
  { name: 'Sealed', color: '#8b5cf6' },
  { name: 'Graded', color: '#10b981' },
];

export const MarketSources = () => {
  const isConnected = isPriceChartingConfigured();

  return (
    <div className="card-premium p-4 mb-6">
      {/* Header with connection status */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="font-display text-sm font-semibold text-foreground">Market Data</h3>
          {isConnected ? (
            <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-success/20 text-success">
              <CheckCircle2 className="w-3 h-3" />
              Live
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-500">
              <AlertCircle className="w-3 h-3" />
              No API Key
            </span>
          )}
        </div>
        <a 
          href="https://www.pricecharting.com" 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
        >
          <span>PriceCharting</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {/* Data Sources */}
      <div className="mb-3">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Data Sources</p>
        <div className="flex flex-wrap gap-2">
          {dataSources.map((source) => (
            <div
              key={source.name}
              className="flex items-center gap-2 px-3 py-1.5 bg-secondary rounded-full"
              title={source.description}
            >
              <div 
                className="w-2 h-2 rounded-full animate-pulse"
                style={{ backgroundColor: isConnected ? source.color : '#666' }}
              />
              <span className="text-xs text-secondary-foreground">{source.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Condition Types */}
      <div>
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Tracked Conditions</p>
        <div className="flex flex-wrap gap-1.5">
          {conditionTypes.map((condition) => (
            <span
              key={condition.name}
              className="text-[10px] px-2 py-1 rounded-md font-medium"
              style={{ 
                backgroundColor: `${condition.color}20`,
                color: condition.color 
              }}
            >
              {condition.name}
            </span>
          ))}
        </div>
      </div>

      {/* Methodology note */}
      <p className="text-[10px] text-muted-foreground mt-3 leading-relaxed">
        Prices based on actual sold listings, filtered by condition type. 
        Shipping excluded. Outliers automatically removed.
      </p>
    </div>
  );
};
