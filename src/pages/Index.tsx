import { useState, useMemo } from 'react';
import { useUser, UserButton } from '@clerk/clerk-react';
import { PortfolioHeader } from '@/components/PortfolioHeader';
import { AssetCard } from '@/components/AssetCard';
import { AddAssetButton } from '@/components/AddAssetButton';
import { AddAssetModal } from '@/components/AddAssetModal';
import { GameDetailModal } from '@/components/GameDetailModal';
import { SearchBar } from '@/components/SearchBar';
import { MarketSources } from '@/components/MarketSources';
import { BottomNav } from '@/components/BottomNav';
import { ChartSection } from '@/components/ChartSection';
import { useGames } from '@/hooks/useGames';
import { Asset, AssetCategory } from '@/types/asset';
import { MarketPage } from './Market';
import { AlertsPage } from './Alerts';
import { ProfilePage } from './Profile';
import { Loader2 } from 'lucide-react';

const isClerkConfigured = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

const Index = () => {
  // Get user from Clerk (if configured)
  const { user } = isClerkConfigured ? useUser() : { user: null };
  const userId = user?.id || null;
  
  // Use the new useGames hook for data persistence
  const { games: assets, loading, addGame, updateGame, deleteGame } = useGames(userId);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [activeNav, setActiveNav] = useState<'portfolio' | 'market' | 'alerts' | 'profile'>('portfolio');

  const filteredAssets = useMemo(() => {
    return assets.filter((asset) => {
      return asset.name.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [assets, searchQuery]);

  const portfolioStats = useMemo(() => {
    const totalValue = assets.reduce((sum, a) => sum + a.currentValue, 0);
    const totalCost = assets.reduce((sum, a) => sum + a.purchasePrice, 0);
    const totalGain = totalValue - totalCost;
    const gainPercentage = totalCost > 0 ? (totalGain / totalCost) * 100 : 0;
    return { totalValue, totalGain, gainPercentage };
  }, [assets]);

  const handleAddAsset = async (newAsset: {
    name: string;
    category: AssetCategory;
    purchasePrice: number;
    source: string;
    imageUrl?: string;
    photos?: string[];
    estimatedValue?: number;
    categoryDetails?: Record<string, unknown>;
  }) => {
    // Use estimated value from market data, or default to purchase price
    const currentValue = newAsset.estimatedValue || newAsset.purchasePrice;
    
    const asset: Asset = {
      id: Date.now().toString(),
      name: newAsset.name,
      category: 'video-games',
      imageUrl: newAsset.imageUrl || '/placeholder.svg',
      photos: newAsset.photos,
      currentValue,
      estimatedValue: newAsset.estimatedValue,
      purchasePrice: newAsset.purchasePrice,
      purchaseDate: new Date().toISOString().split('T')[0],
      source: newAsset.source,
      lastUpdated: new Date().toISOString().split('T')[0],
      videoGameDetails: newAsset.categoryDetails as Asset['videoGameDetails'],
    };
    
    await addGame(asset);
  };

  const handleUpdateGame = async (game: Asset) => {
    await updateGame(game);
  };

  // Render content based on active tab
  const renderContent = () => {
    switch (activeNav) {
      case 'market':
        return <MarketPage />;
      case 'alerts':
        return <AlertsPage games={assets} onUpdateGame={handleUpdateGame} />;
      case 'profile':
        return <ProfilePage totalGames={assets.length} totalValue={portfolioStats.totalValue} />;
      default:
        return renderPortfolio();
    }
  };

  const renderPortfolio = () => {
    if (loading) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading your collection...</p>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-background pb-24">
        <div className="container max-w-lg mx-auto px-4 py-6">
          {/* Header */}
          <header className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <img src="/logo.svg" alt="gil0" className="h-10 w-auto" />
              <div>
                <p className="text-muted-foreground text-xs">
                  {user ? `Welcome, ${user.firstName || 'Collector'}` : 'Track your collection'}
                </p>
              </div>
            </div>
            {isClerkConfigured && user ? (
              <UserButton 
                appearance={{
                  elements: {
                    avatarBox: 'w-10 h-10',
                  }
                }}
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                <span className="text-white font-bold text-sm">G</span>
              </div>
            )}
          </header>

          {/* Portfolio Value - only show if we have assets */}
          {assets.length > 0 && (
            <>
              <PortfolioHeader 
                totalValue={portfolioStats.totalValue}
                totalGain={portfolioStats.totalGain}
                gainPercentage={portfolioStats.gainPercentage}
              />

              {/* Charts Section */}
              <ChartSection 
                assets={assets}
                portfolioStats={portfolioStats}
              />
            </>
          )}

          {/* Market Sources - only show if we have assets */}
          {assets.length > 0 && <MarketSources />}

          {/* Search - only show if we have assets */}
          {assets.length > 0 && (
            <>
              <SearchBar value={searchQuery} onChange={setSearchQuery} />

              {/* Collection Stats */}
              <div className="flex items-center justify-between mb-4 px-1">
                <h3 className="font-display font-semibold text-foreground">Your Collection</h3>
                <span className="text-sm text-muted-foreground">{assets.length} games</span>
              </div>
            </>
          )}

          {/* Asset List */}
          <div className="space-y-3">
            {filteredAssets.length > 0 ? (
              filteredAssets.map((asset, index) => (
                <AssetCard 
                  key={asset.id} 
                  asset={asset} 
                  index={index} 
                  onClick={() => {
                    setSelectedAsset(asset);
                    setIsDetailModalOpen(true);
                  }}
                />
              ))
            ) : assets.length > 0 && searchQuery ? (
              // No search results
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">🔍</span>
                </div>
                <h3 className="font-display font-semibold text-foreground mb-2">No Results</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  No games found matching "{searchQuery}"
                </p>
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-primary text-sm font-medium hover:underline"
                >
                  Clear search
                </button>
              </div>
            ) : (
              // Empty collection
              <div className="text-center py-16">
                <img src="/logo.svg" alt="gil0" className="h-20 w-auto mx-auto mb-4 opacity-60" />
                <h3 className="font-display font-semibold text-foreground mb-2">Start Your Collection</h3>
                <p className="text-sm text-muted-foreground mb-6 max-w-xs mx-auto">
                  Add your first video game to track its value with real market data
                </p>
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="bg-gradient-to-r from-violet-500 to-purple-600 text-white px-6 py-2.5 rounded-lg font-semibold text-sm hover:opacity-90 transition-opacity"
                >
                  + Add Your First Game
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Add Asset FAB - only show on portfolio tab */}
        <AddAssetButton onClick={() => setIsAddModalOpen(true)} />

        {/* Add Asset Modal */}
        <AddAssetModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onAdd={handleAddAsset}
        />

        {/* Game Detail Modal */}
        <GameDetailModal
          asset={selectedAsset}
          isOpen={isDetailModalOpen}
          onClose={() => {
            setIsDetailModalOpen(false);
            setSelectedAsset(null);
          }}
          onDelete={async (assetId) => {
            await deleteGame(assetId);
            setIsDetailModalOpen(false);
            setSelectedAsset(null);
          }}
        />
      </div>
    );
  };

  return (
    <>
      {renderContent()}
      
      {/* Bottom Navigation - always visible */}
      <BottomNav activeItem={activeNav} onItemChange={setActiveNav} />
    </>
  );
};

export default Index;
