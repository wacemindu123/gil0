/**
 * Market Page
 * 
 * Search or scan games to check their market value without adding to collection
 */

import { useState, useRef } from 'react';
import { Search, Camera, Loader2, TrendingUp, X, ScanBarcode } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { lookupPrice } from '@/services/priceLookup';

interface PriceResult {
  name: string;
  platform: string;
  conditionType: string;
  estimatedValue: number;
  priceRange?: { low: number; median: number; high: number };
  confidence: string;
}

// Common platforms for quick selection
const platforms = [
  'NES', 'SNES', 'N64', 'GameCube', 'Wii', 'Switch',
  'PS1', 'PS2', 'PS3', 'PS4', 'PS5',
  'Xbox', 'Xbox 360', 'Xbox One',
  'Game Boy', 'GBA', 'DS', '3DS',
];

const conditionTypes = [
  { value: 'loose', label: 'Loose', icon: '💿' },
  { value: 'cib', label: 'CIB', icon: '📦' },
  { value: 'sealed', label: 'Sealed', icon: '🔒' },
];

export const MarketPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState('');
  const [selectedCondition, setSelectedCondition] = useState('cib');
  const [isSearching, setIsSearching] = useState(false);
  const [result, setResult] = useState<PriceResult | null>(null);
  const [recentSearches, setRecentSearches] = useState<PriceResult[]>([]);
  const [showCamera, setShowCamera] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSearch = async () => {
    if (!searchQuery.trim() || !selectedPlatform) return;

    setIsSearching(true);
    setResult(null);

    try {
      const priceData = await lookupPrice({
        category: 'video-games',
        name: searchQuery,
        details: {
          platform: selectedPlatform,
          conditionType: selectedCondition,
        },
      });

      const newResult: PriceResult = {
        name: searchQuery,
        platform: selectedPlatform,
        conditionType: selectedCondition,
        estimatedValue: priceData.estimatedValue,
        priceRange: priceData.priceRange,
        confidence: priceData.confidence,
      };

      setResult(newResult);
      
      // Add to recent searches
      setRecentSearches(prev => [newResult, ...prev.slice(0, 4)]);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  };

  // Start camera
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setShowCamera(true);
    } catch (error) {
      console.error('Camera error:', error);
      // Fallback to file input
      fileInputRef.current?.click();
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
  };

  // Capture photo from camera
  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setCapturedImage(dataUrl);
        stopCamera();
        // In a real app, we'd send this to an OCR/barcode API
        // For now, just show a message
      }
    }
  };

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setCapturedImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="container max-w-lg mx-auto px-4 py-6">
        {/* Header */}
        <header className="mb-6">
          <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-primary" />
            Price Lookup
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Check game values without adding to your collection
          </p>
        </header>

        {/* Camera View */}
        {showCamera && (
          <div className="fixed inset-0 z-50 bg-black flex flex-col">
            <div className="flex items-center justify-between p-4">
              <span className="text-white font-medium">Scan Barcode or Take Photo</span>
              <button 
                type="button"
                onClick={stopCamera}
                className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
            <div className="flex-1 relative">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              {/* Scan overlay */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-64 h-40 border-2 border-white/50 rounded-lg">
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-lg" />
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-lg" />
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-lg" />
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-lg" />
                </div>
              </div>
            </div>
            <div className="p-6 flex justify-center">
              <button
                type="button"
                onClick={capturePhoto}
                className="w-16 h-16 rounded-full bg-white flex items-center justify-center"
              >
                <div className="w-14 h-14 rounded-full border-4 border-black" />
              </button>
            </div>
          </div>
        )}

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileUpload}
          className="hidden"
        />

        {/* Search Form */}
        <div className="card-premium p-4 space-y-4 mb-6">
          {/* Scan/Photo Buttons */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={startCamera}
              className="flex-1 border-dashed"
            >
              <ScanBarcode className="w-4 h-4 mr-2" />
              Scan Barcode
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 border-dashed"
            >
              <Camera className="w-4 h-4 mr-2" />
              Take Photo
            </Button>
          </div>

          {/* Captured Image Preview */}
          {capturedImage && (
            <div className="relative">
              <img 
                src={capturedImage} 
                alt="Captured" 
                className="w-full h-32 object-cover rounded-lg"
              />
              <button
                type="button"
                onClick={() => setCapturedImage(null)}
                className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/50 flex items-center justify-center"
              >
                <X className="w-4 h-4 text-white" />
              </button>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                📷 Photo captured! Enter the game name below to search.
              </p>
            </div>
          )}

          <div className="flex items-center gap-2">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">or search manually</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Game Name */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Enter game name..."
              className="pl-10 bg-secondary border-border"
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>

          {/* Platform Selection */}
          <div>
            <label className="text-xs text-muted-foreground mb-2 block">Platform</label>
            <div className="flex flex-wrap gap-2">
              {platforms.map(platform => (
                <button
                  key={platform}
                  type="button"
                  onClick={() => setSelectedPlatform(platform)}
                  className={`px-3 py-2 text-xs rounded-lg transition-all touch-manipulation ${
                    selectedPlatform === platform
                      ? 'bg-primary text-primary-foreground font-medium'
                      : 'bg-secondary text-muted-foreground hover:text-foreground active:bg-primary/20'
                  }`}
                >
                  {platform}
                </button>
              ))}
            </div>
          </div>

          {/* Condition Selection */}
          <div>
            <label className="text-xs text-muted-foreground mb-2 block">Condition</label>
            <div className="grid grid-cols-3 gap-2">
              {conditionTypes.map(condition => (
                <button
                  key={condition.value}
                  type="button"
                  onClick={() => setSelectedCondition(condition.value)}
                  className={`flex items-center justify-center gap-2 px-3 py-3 rounded-lg transition-all touch-manipulation ${
                    selectedCondition === condition.value
                      ? 'bg-primary text-primary-foreground font-medium'
                      : 'bg-secondary text-muted-foreground hover:text-foreground active:bg-primary/20'
                  }`}
                >
                  <span>{condition.icon}</span>
                  <span className="text-sm">{condition.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Search Button */}
          <Button
            type="button"
            onClick={handleSearch}
            disabled={!searchQuery.trim() || !selectedPlatform || isSearching}
            className="w-full bg-gradient-to-r from-violet-500 to-purple-600 hover:opacity-90"
          >
            {isSearching ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Search className="w-4 h-4 mr-2" />
                Look Up Price
              </>
            )}
          </Button>
        </div>

        {/* Result */}
        {result && (
          <div className="card-premium p-4 mb-6 animate-slide-up">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-semibold text-foreground">{result.name}</h3>
                <p className="text-xs text-muted-foreground">
                  {result.platform} • {result.conditionType.toUpperCase()}
                </p>
              </div>
              <span className={`text-xs px-2 py-1 rounded ${
                result.confidence === 'high' ? 'bg-success/20 text-success' :
                result.confidence === 'medium' ? 'bg-primary/20 text-primary' :
                'bg-muted text-muted-foreground'
              }`}>
                {result.confidence}
              </span>
            </div>

            <div className="text-center py-4 border-y border-border">
              <p className="text-xs text-muted-foreground mb-1">Estimated Value</p>
              <p className="text-4xl font-display font-bold text-foreground">
                ${result.estimatedValue.toLocaleString()}
              </p>
            </div>

            {result.priceRange && (
              <div className="grid grid-cols-3 gap-4 mt-4 text-center">
                <div>
                  <p className="text-xs text-muted-foreground">Low</p>
                  <p className="font-semibold text-foreground">${result.priceRange.low}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Median</p>
                  <p className="font-semibold text-foreground">${result.priceRange.median}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">High</p>
                  <p className="font-semibold text-foreground">${result.priceRange.high}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Recent Searches */}
        {recentSearches.length > 0 && (
          <div>
            <h3 className="font-display font-semibold text-foreground mb-3">Recent Searches</h3>
            <div className="space-y-2">
              {recentSearches.map((search, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                  <div>
                    <p className="text-sm font-medium text-foreground">{search.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {search.platform} • {search.conditionType.toUpperCase()}
                    </p>
                  </div>
                  <p className="font-semibold text-foreground">${search.estimatedValue.toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
