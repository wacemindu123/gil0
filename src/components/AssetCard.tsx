import { Asset } from '@/types/asset';
import { TrendingUp, TrendingDown, ExternalLink, Gamepad2 } from 'lucide-react';

interface AssetCardProps {
  asset: Asset;
  index: number;
  onClick?: () => void;
}

export const AssetCard = ({ asset, index, onClick }: AssetCardProps) => {
  const gain = asset.currentValue - asset.purchasePrice;
  const gainPercentage = ((gain / asset.purchasePrice) * 100);
  const isPositive = gain >= 0;

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
    }).format(value);
  };

  // Get condition badge text
  const getConditionBadge = () => {
    const details = asset.videoGameDetails;
    if (!details) return null;
    
    if (details.gradingCompany && details.gradingCompany !== 'raw' && details.grade) {
      return `${details.gradingCompany} ${details.grade}`;
    }
    
    return details.conditionType?.toUpperCase() || null;
  };

  const conditionBadge = getConditionBadge();

  return (
    <div 
      className="card-premium p-4 animate-slide-up cursor-pointer group"
      style={{ animationDelay: `${index * 50}ms` }}
      onClick={onClick}
    >
      <div className="flex gap-4">
        {/* Image - Larger size */}
        <div className="w-24 h-24 md:w-28 md:h-28 rounded-xl bg-muted flex-shrink-0 overflow-hidden relative shadow-lg">
          {asset.imageUrl && asset.imageUrl !== '/placeholder.svg' ? (
            <img 
              src={asset.imageUrl} 
              alt={asset.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary">
              <Gamepad2 className="w-10 h-10 text-primary/60" />
            </div>
          )}
          {/* Platform badge */}
          {asset.videoGameDetails?.platform && (
            <div className="absolute bottom-1.5 left-1.5 right-1.5 text-center">
              <span className="text-[10px] font-semibold bg-black/80 text-white px-2 py-0.5 rounded-md backdrop-blur-sm">
                {asset.videoGameDetails.platform}
              </span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-display font-semibold text-foreground truncate group-hover:text-primary transition-colors">
              {asset.name}
            </h3>
            <ExternalLink className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
          </div>
          
          <div className="flex items-center gap-2 mb-2">
            {conditionBadge && (
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                asset.videoGameDetails?.gradingCompany && asset.videoGameDetails.gradingCompany !== 'raw'
                  ? 'bg-primary/20 text-primary'
                  : 'bg-muted text-muted-foreground'
              }`}>
                {conditionBadge}
              </span>
            )}
            <span className="text-xs text-muted-foreground">
              via {asset.source}
            </span>
          </div>

          <div className="flex items-end justify-between">
            <div>
              <p className="text-xl font-display font-bold text-foreground">
                {formatCurrency(asset.currentValue)}
              </p>
              <p className="text-xs text-muted-foreground">
                Paid {formatCurrency(asset.purchasePrice)}
              </p>
            </div>

            <div className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold ${
              isPositive 
                ? 'bg-success/10 text-success' 
                : 'bg-destructive/10 text-destructive'
            }`}>
              {isPositive ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              <span>{isPositive ? '+' : ''}{gainPercentage.toFixed(1)}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
