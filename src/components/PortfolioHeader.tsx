import { TrendingUp, TrendingDown, Wallet } from 'lucide-react';

interface PortfolioHeaderProps {
  totalValue: number;
  totalGain: number;
  gainPercentage: number;
}

export const PortfolioHeader = ({ totalValue, totalGain, gainPercentage }: PortfolioHeaderProps) => {
  const isPositive = totalGain >= 0;
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="card-premium p-6 mb-6 animate-fade-in">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg bg-primary/10">
          <Wallet className="w-5 h-5 text-primary" />
        </div>
        <span className="text-muted-foreground text-sm font-medium">Total Portfolio Value</span>
      </div>
      
      <h1 className="font-display text-4xl md:text-5xl font-bold text-gradient-gold mb-3">
        {formatCurrency(totalValue)}
      </h1>
      
      <div className="flex items-center gap-2">
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold ${
          isPositive 
            ? 'bg-success/10 text-success' 
            : 'bg-destructive/10 text-destructive'
        }`}>
          {isPositive ? (
            <TrendingUp className="w-4 h-4" />
          ) : (
            <TrendingDown className="w-4 h-4" />
          )}
          <span>{isPositive ? '+' : ''}{gainPercentage.toFixed(2)}%</span>
        </div>
        <span className={`text-sm font-medium ${isPositive ? 'text-success' : 'text-destructive'}`}>
          {isPositive ? '+' : ''}{formatCurrency(totalGain)} all time
        </span>
      </div>
    </div>
  );
};
