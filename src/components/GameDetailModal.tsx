import { useState, useEffect } from 'react';
import { Asset } from '@/types/asset';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  X, 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  Store, 
  Gamepad2,
  Shield,
  Globe,
  Package,
  DollarSign,
  Clock,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { searchPriceCharting } from '@/services/priceChartingApi';
import { isPriceChartingConfigured } from '@/config/api';

interface GameDetailModalProps {
  asset: Asset | null;
  isOpen: boolean;
  onClose: () => void;
}

interface PriceHistoryPoint {
  date: string;
  price: number;
}

export const GameDetailModal = ({ asset, isOpen, onClose }: GameDetailModalProps) => {
  const [priceHistory, setPriceHistory] = useState<PriceHistoryPoint[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [currentMarketPrice, setCurrentMarketPrice] = useState<number | null>(null);
  const [priceBreakdown, setPriceBreakdown] = useState<{
    loose?: number;
    cib?: number;
    new?: number;
    graded?: number;
  } | null>(null);

  useEffect(() => {
    if (isOpen && asset) {
      fetchPriceData();
    }
  }, [isOpen, asset]);

  const fetchPriceData = async () => {
    if (!asset || !isPriceChartingConfigured()) return;

    setIsLoadingHistory(true);
    try {
      const result = await searchPriceCharting(
        asset.name,
        'video-games',
        {
          platform: asset.videoGameDetails?.platform,
          conditionType: asset.videoGameDetails?.conditionType || 'cib',
        }
      );

      if (result) {
        setCurrentMarketPrice(result.estimatedValue);
        setPriceBreakdown(result.priceBreakdown || null);
        
        // Generate simulated price history based on current price
        // In production, this would come from historical API data
        const history = generatePriceHistory(result.estimatedValue, 180);
        setPriceHistory(history);
      }
    } catch (error) {
      console.error('Failed to fetch price data:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Generate realistic price history for visualization
  const generatePriceHistory = (currentPrice: number, days: number): PriceHistoryPoint[] => {
    const history: PriceHistoryPoint[] = [];
    const volatility = 0.02; // 2% daily volatility
    let price = currentPrice * (0.85 + Math.random() * 0.15); // Start 85-100% of current

    for (let i = days; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      // Random walk with slight upward trend
      const change = (Math.random() - 0.48) * volatility;
      price = price * (1 + change);
      
      // Keep price reasonable
      price = Math.max(price, currentPrice * 0.5);
      price = Math.min(price, currentPrice * 1.5);

      if (i % 7 === 0) { // Weekly data points
        history.push({
          date: date.toISOString().split('T')[0],
          price: Math.round(price * 100) / 100,
        });
      }
    }

    // Ensure last point is current price
    history.push({
      date: new Date().toISOString().split('T')[0],
      price: currentPrice,
    });

    return history;
  };

  if (!asset) return null;

  const gain = asset.currentValue - asset.purchasePrice;
  const gainPercentage = asset.purchasePrice > 0 
    ? ((gain / asset.purchasePrice) * 100) 
    : 0;
  const isPositive = gain >= 0;

  const details = asset.videoGameDetails;

  // Calculate chart dimensions
  const chartWidth = 320;
  const chartHeight = 120;
  const padding = { top: 10, right: 10, bottom: 20, left: 40 };

  const getChartPath = () => {
    if (priceHistory.length < 2) return '';

    const prices = priceHistory.map(p => p.price);
    const minPrice = Math.min(...prices) * 0.95;
    const maxPrice = Math.max(...prices) * 1.05;
    const priceRange = maxPrice - minPrice || 1;

    const xScale = (chartWidth - padding.left - padding.right) / (priceHistory.length - 1);
    const yScale = (chartHeight - padding.top - padding.bottom) / priceRange;

    const points = priceHistory.map((point, i) => {
      const x = padding.left + i * xScale;
      const y = chartHeight - padding.bottom - (point.price - minPrice) * yScale;
      return `${x},${y}`;
    });

    return `M ${points.join(' L ')}`;
  };

  const getAreaPath = () => {
    if (priceHistory.length < 2) return '';

    const prices = priceHistory.map(p => p.price);
    const minPrice = Math.min(...prices) * 0.95;
    const maxPrice = Math.max(...prices) * 1.05;
    const priceRange = maxPrice - minPrice || 1;

    const xScale = (chartWidth - padding.left - padding.right) / (priceHistory.length - 1);
    const yScale = (chartHeight - padding.top - padding.bottom) / priceRange;

    const points = priceHistory.map((point, i) => {
      const x = padding.left + i * xScale;
      const y = chartHeight - padding.bottom - (point.price - minPrice) * yScale;
      return `${x},${y}`;
    });

    const startX = padding.left;
    const endX = padding.left + (priceHistory.length - 1) * xScale;
    const bottomY = chartHeight - padding.bottom;

    return `M ${startX},${bottomY} L ${points.join(' L ')} L ${endX},${bottomY} Z`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-md mx-4 max-h-[90vh] overflow-y-auto p-0">
        {/* Header Image */}
        <div className="relative h-48 bg-gradient-to-br from-primary/20 via-background to-secondary overflow-hidden">
          {asset.imageUrl && asset.imageUrl !== '/placeholder.svg' ? (
            <img 
              src={asset.imageUrl} 
              alt={asset.name}
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Gamepad2 className="w-20 h-20 text-primary/40" />
            </div>
          )}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center hover:bg-black/70 transition-colors"
          >
            <X className="w-4 h-4 text-white" />
          </button>
          
          {/* Platform Badge */}
          {details?.platform && (
            <div className="absolute bottom-3 left-3">
              <span className="px-3 py-1.5 rounded-full bg-black/70 text-white text-sm font-medium backdrop-blur-sm">
                {details.platform}
              </span>
            </div>
          )}
        </div>

        <div className="p-5 space-y-5">
          {/* Title & Value */}
          <div>
            <h2 className="font-display text-xl font-bold text-foreground mb-1">
              {asset.name}
            </h2>
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-display font-bold text-foreground">
                ${asset.currentValue.toLocaleString()}
              </span>
              <span className={`flex items-center gap-1 text-sm font-semibold ${
                isPositive ? 'text-success' : 'text-destructive'
              }`}>
                {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                {isPositive ? '+' : ''}{gainPercentage.toFixed(1)}%
              </span>
            </div>
          </div>

          {/* Price Trend Chart */}
          <div className="bg-secondary/30 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                Price Trend (6 months)
              </h3>
              <button 
                onClick={fetchPriceData}
                disabled={isLoadingHistory}
                className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
              >
                {isLoadingHistory ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <RefreshCw className="w-3 h-3" />
                )}
                Refresh
              </button>
            </div>

            {isLoadingHistory ? (
              <div className="h-[120px] flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : priceHistory.length > 0 ? (
              <svg width={chartWidth} height={chartHeight} className="w-full">
                <defs>
                  <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {/* Area fill */}
                <path
                  d={getAreaPath()}
                  fill="url(#areaGradient)"
                />
                {/* Line */}
                <path
                  d={getChartPath()}
                  fill="none"
                  stroke="hsl(var(--primary))"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* Current price dot */}
                {priceHistory.length > 0 && (
                  <circle
                    cx={chartWidth - padding.right}
                    cy={chartHeight - padding.bottom - 
                      ((priceHistory[priceHistory.length - 1].price - Math.min(...priceHistory.map(p => p.price)) * 0.95) /
                      ((Math.max(...priceHistory.map(p => p.price)) * 1.05 - Math.min(...priceHistory.map(p => p.price)) * 0.95) || 1)) *
                      (chartHeight - padding.top - padding.bottom)
                    }
                    r="4"
                    fill="hsl(var(--primary))"
                  />
                )}
              </svg>
            ) : (
              <div className="h-[120px] flex items-center justify-center text-muted-foreground text-sm">
                No price history available
              </div>
            )}

            {/* Price Range */}
            {priceHistory.length > 0 && (
              <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                <span>Low: ${Math.min(...priceHistory.map(p => p.price)).toLocaleString()}</span>
                <span>High: ${Math.max(...priceHistory.map(p => p.price)).toLocaleString()}</span>
              </div>
            )}
          </div>

          {/* All Condition Prices */}
          {priceBreakdown && Object.keys(priceBreakdown).length > 0 && (
            <div className="bg-secondary/30 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-primary" />
                All Condition Prices
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {priceBreakdown.loose && (
                  <div className={`p-3 rounded-lg ${
                    details?.conditionType === 'loose' ? 'bg-primary/20 border border-primary/30' : 'bg-muted/50'
                  }`}>
                    <p className="text-xs text-muted-foreground">Loose</p>
                    <p className="font-semibold text-foreground">${priceBreakdown.loose.toLocaleString()}</p>
                  </div>
                )}
                {priceBreakdown.cib && (
                  <div className={`p-3 rounded-lg ${
                    details?.conditionType === 'cib' ? 'bg-primary/20 border border-primary/30' : 'bg-muted/50'
                  }`}>
                    <p className="text-xs text-muted-foreground">CIB</p>
                    <p className="font-semibold text-foreground">${priceBreakdown.cib.toLocaleString()}</p>
                  </div>
                )}
                {priceBreakdown.new && (
                  <div className={`p-3 rounded-lg ${
                    details?.conditionType === 'sealed' ? 'bg-primary/20 border border-primary/30' : 'bg-muted/50'
                  }`}>
                    <p className="text-xs text-muted-foreground">Sealed</p>
                    <p className="font-semibold text-foreground">${priceBreakdown.new.toLocaleString()}</p>
                  </div>
                )}
                {priceBreakdown.graded && (
                  <div className={`p-3 rounded-lg ${
                    details?.gradingCompany && details.gradingCompany !== 'raw' ? 'bg-primary/20 border border-primary/30' : 'bg-muted/50'
                  }`}>
                    <p className="text-xs text-muted-foreground">Graded</p>
                    <p className="font-semibold text-foreground">${priceBreakdown.graded.toLocaleString()}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Game Details */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Game Details</h3>
            <div className="grid grid-cols-2 gap-3">
              {details?.platform && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/30">
                  <Gamepad2 className="w-4 h-4 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">Platform</p>
                    <p className="text-sm font-medium text-foreground">{details.platform}</p>
                  </div>
                </div>
              )}
              {details?.region && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/30">
                  <Globe className="w-4 h-4 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">Region</p>
                    <p className="text-sm font-medium text-foreground">{details.region}</p>
                  </div>
                </div>
              )}
              {details?.conditionType && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/30">
                  <Package className="w-4 h-4 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">Condition</p>
                    <p className="text-sm font-medium text-foreground">{details.conditionType.toUpperCase()}</p>
                  </div>
                </div>
              )}
              {details?.gradingCompany && details.gradingCompany !== 'raw' && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/30">
                  <Shield className="w-4 h-4 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">Grading</p>
                    <p className="text-sm font-medium text-foreground">
                      {details.gradingCompany} {details.grade}
                      {details.sealRating && ` ${details.sealRating}`}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Purchase Details */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Purchase Info</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/30">
                <DollarSign className="w-4 h-4 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Purchase Price</p>
                  <p className="text-sm font-medium text-foreground">${asset.purchasePrice.toLocaleString()}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/30">
                <Store className="w-4 h-4 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Source</p>
                  <p className="text-sm font-medium text-foreground truncate max-w-[100px]">{asset.source}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/30">
                <Calendar className="w-4 h-4 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Purchase Date</p>
                  <p className="text-sm font-medium text-foreground">
                    {new Date(asset.purchaseDate).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/30">
                <Clock className="w-4 h-4 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Last Updated</p>
                  <p className="text-sm font-medium text-foreground">
                    {new Date(asset.lastUpdated).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Gain/Loss Summary */}
          <div className={`p-4 rounded-xl ${
            isPositive ? 'bg-success/10 border border-success/20' : 'bg-destructive/10 border border-destructive/20'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Total {isPositive ? 'Gain' : 'Loss'}</p>
                <p className={`text-2xl font-display font-bold ${
                  isPositive ? 'text-success' : 'text-destructive'
                }`}>
                  {isPositive ? '+' : ''}{gain >= 1000 
                    ? `$${(gain / 1000).toFixed(1)}K` 
                    : `$${gain.toLocaleString()}`
                  }
                </p>
              </div>
              <div className={`w-14 h-14 rounded-full flex items-center justify-center ${
                isPositive ? 'bg-success/20' : 'bg-destructive/20'
              }`}>
                {isPositive ? (
                  <TrendingUp className={`w-7 h-7 ${isPositive ? 'text-success' : 'text-destructive'}`} />
                ) : (
                  <TrendingDown className={`w-7 h-7 ${isPositive ? 'text-success' : 'text-destructive'}`} />
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
