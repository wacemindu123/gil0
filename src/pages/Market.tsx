/**
 * Market Page
 * 
 * Search or scan games to check their market value without adding to collection
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { Search, Camera, Loader2, TrendingUp, X, ScanBarcode, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { lookupPrice } from '@/services/priceLookup';
import { lookupByUPC } from '@/services/priceChartingApi';
import Quagga from '@ericblade/quagga2';

interface PriceResult {
  name: string;
  platform: string;
  conditionType: string;
  estimatedValue: number;
  priceRange?: { low: number; median: number; high: number };
  confidence: string;
  allPrices?: {
    loose?: number;
    cib?: number;
    sealed?: number;
  };
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
  
  // Scanner state
  const [showScanner, setShowScanner] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const scannerRef = useRef<HTMLDivElement>(null);
  
  // Photo state
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Start barcode scanner
  const startScanner = useCallback(() => {
    setScannerError(null);
    setShowScanner(true);
    setScannedCode(null);
    
    // Wait for DOM to update
    setTimeout(() => {
      if (!scannerRef.current) return;
      
      Quagga.init({
        inputStream: {
          name: "Live",
          type: "LiveStream",
          target: scannerRef.current,
          constraints: {
            facingMode: "environment",
            width: { min: 640, ideal: 1280, max: 1920 },
            height: { min: 480, ideal: 720, max: 1080 },
          },
        },
        decoder: {
          readers: [
            "upc_reader",
            "upc_e_reader",
            "ean_reader",
            "ean_8_reader",
          ],
        },
        locate: true,
        locator: {
          patchSize: "medium",
          halfSample: true,
        },
      }, (err) => {
        if (err) {
          console.error('Scanner init error:', err);
          setScannerError('Could not access camera. Please check permissions.');
          setShowScanner(false);
          return;
        }
        Quagga.start();
        setIsScanning(true);
      });
    }, 100);
  }, []);

  // Stop scanner
  const stopScanner = useCallback(() => {
    if (isScanning) {
      Quagga.stop();
      setIsScanning(false);
    }
    setShowScanner(false);
  }, [isScanning]);

  // Handle barcode detection
  useEffect(() => {
    const handleDetected = async (data: { codeResult: { code: string } }) => {
      const code = data.codeResult.code;
      if (code && code.length >= 8) {
        // Stop scanning
        stopScanner();
        setScannedCode(code);
        
        // Look up the UPC
        setIsSearching(true);
        try {
          const gameInfo = await lookupByUPC(code);
          
          if (gameInfo) {
            // Determine best price based on condition
            let price = gameInfo.prices.cib || gameInfo.prices.loose || gameInfo.prices.sealed || 0;
            let condition = 'cib';
            
            if (gameInfo.prices.cib) {
              price = gameInfo.prices.cib;
              condition = 'cib';
            } else if (gameInfo.prices.loose) {
              price = gameInfo.prices.loose;
              condition = 'loose';
            } else if (gameInfo.prices.sealed) {
              price = gameInfo.prices.sealed;
              condition = 'sealed';
            }
            
            const newResult: PriceResult = {
              name: gameInfo.name,
              platform: gameInfo.platform,
              conditionType: condition,
              estimatedValue: price,
              confidence: 'high',
              allPrices: gameInfo.prices,
            };
            
            setResult(newResult);
            setRecentSearches(prev => [newResult, ...prev.slice(0, 4)]);
          } else {
            setScannerError(`No game found for barcode: ${code}`);
          }
        } catch (error) {
          console.error('UPC lookup error:', error);
          setScannerError('Failed to look up barcode');
        } finally {
          setIsSearching(false);
        }
      }
    };

    if (isScanning) {
      Quagga.onDetected(handleDetected);
    }

    return () => {
      Quagga.offDetected(handleDetected);
    };
  }, [isScanning, stopScanner]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isScanning) {
        Quagga.stop();
      }
    };
  }, [isScanning]);

  // Manual search
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
      setRecentSearches(prev => [newResult, ...prev.slice(0, 4)]);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  };

  // Handle photo for game identification
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setCapturedImage(event.target?.result as string);
        // Note: Full image recognition would require an OCR API
        // For now, we capture the image and prompt for manual entry
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Barcode Scanner Modal */}
      {showScanner && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
          <div className="flex items-center justify-between p-4 bg-black/80">
            <div>
              <span className="text-white font-medium">Scan Barcode</span>
              <p className="text-white/60 text-xs">Point at UPC barcode on game case</p>
            </div>
            <button 
              type="button"
              onClick={stopScanner}
              className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
          
          <div className="flex-1 relative">
            <div ref={scannerRef} className="w-full h-full" />
            
            {/* Scan overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-72 h-32 border-2 border-primary rounded-lg relative">
                <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-primary rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-primary rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-primary rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-primary rounded-br-lg" />
                
                {/* Scanning line animation */}
                <div className="absolute left-2 right-2 h-0.5 bg-primary animate-pulse" 
                     style={{ top: '50%', boxShadow: '0 0 10px hsl(var(--primary))' }} />
              </div>
            </div>
          </div>
          
          <div className="p-4 bg-black/80 text-center">
            <p className="text-white/60 text-sm">
              Align the barcode within the frame
            </p>
          </div>
        </div>
      )}

      {/* Hidden photo input */}
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handlePhotoSelect}
        className="hidden"
      />

      <div className="container max-w-lg mx-auto px-4 py-6">
        {/* Header */}
        <header className="mb-6">
          <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-primary" />
            Price Lookup
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Scan a barcode or search to check game values
          </p>
        </header>

        {/* Error Message */}
        {scannerError && (
          <div className="mb-4 p-3 rounded-lg bg-destructive/20 border border-destructive/30 flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-destructive">{scannerError}</p>
              <button 
                onClick={() => setScannerError(null)}
                className="text-xs text-destructive/70 hover:text-destructive mt-1"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Scanned Code Display with Search Option */}
        {scannedCode && !result && (
          <div className="mb-4 p-3 rounded-lg bg-primary/20 border border-primary/30">
            <p className="text-xs text-muted-foreground">Scanned Barcode:</p>
            <p className="font-mono text-foreground mb-2">{scannedCode}</p>
            {scannerError && (
              <p className="text-xs text-muted-foreground mb-2">
                UPC not in database. Try searching by game name below, or scan a different barcode.
              </p>
            )}
            <button
              type="button"
              onClick={() => {
                setScannedCode(null);
                setScannerError(null);
              }}
              className="text-xs text-primary hover:underline"
            >
              Clear & try again
            </button>
          </div>
        )}

        {/* Search Form */}
        <div className="card-premium p-4 space-y-4 mb-6">
          {/* Scan/Photo Buttons */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={startScanner}
              disabled={isSearching}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-4 rounded-lg bg-gradient-to-r from-violet-500 to-purple-600 text-white font-medium transition-all active:scale-95 disabled:opacity-50"
            >
              <ScanBarcode className="w-5 h-5" />
              <span>Scan Barcode</span>
            </button>
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-4 rounded-lg border-2 border-dashed border-border bg-secondary/50 text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all active:scale-95"
            >
              <Camera className="w-5 h-5" />
              <span>Photo</span>
            </button>
          </div>

          {/* Captured Image Preview */}
          {capturedImage && (
            <div className="relative">
              <img 
                src={capturedImage} 
                alt="Captured" 
                className="w-full h-40 object-cover rounded-lg"
              />
              <button
                type="button"
                onClick={() => setCapturedImage(null)}
                className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/70 flex items-center justify-center hover:bg-black transition-colors"
              >
                <X className="w-4 h-4 text-white" />
              </button>
              <div className="absolute bottom-2 left-2 right-2 bg-black/70 rounded-lg px-3 py-2">
                <p className="text-xs text-white text-center">
                  📷 Enter the game name below to search for pricing
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">or search manually</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Game Name */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
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
                  className={`px-3 py-2 text-xs rounded-lg transition-all active:scale-95 ${
                    selectedPlatform === platform
                      ? 'bg-primary text-primary-foreground font-medium'
                      : 'bg-secondary text-muted-foreground hover:text-foreground'
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
                  className={`flex items-center justify-center gap-2 px-3 py-3 rounded-lg transition-all active:scale-95 ${
                    selectedCondition === condition.value
                      ? 'bg-primary text-primary-foreground font-medium'
                      : 'bg-secondary text-muted-foreground hover:text-foreground'
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
            className="w-full bg-gradient-to-r from-violet-500 to-purple-600 hover:opacity-90 h-12"
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
                  {result.platform}
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

            {/* All Prices from Barcode Scan */}
            {result.allPrices && (
              <div className="grid grid-cols-3 gap-2 mb-4">
                {result.allPrices.loose && (
                  <div className="text-center p-3 rounded-lg bg-secondary/50">
                    <p className="text-xs text-muted-foreground">Loose</p>
                    <p className="font-semibold text-foreground">${result.allPrices.loose}</p>
                  </div>
                )}
                {result.allPrices.cib && (
                  <div className="text-center p-3 rounded-lg bg-primary/20 border border-primary/30">
                    <p className="text-xs text-muted-foreground">CIB</p>
                    <p className="font-semibold text-foreground">${result.allPrices.cib}</p>
                  </div>
                )}
                {result.allPrices.sealed && (
                  <div className="text-center p-3 rounded-lg bg-secondary/50">
                    <p className="text-xs text-muted-foreground">Sealed</p>
                    <p className="font-semibold text-foreground">${result.allPrices.sealed}</p>
                  </div>
                )}
              </div>
            )}

            {/* Single Price Result (from manual search) */}
            {!result.allPrices && (
              <>
                <div className="text-center py-4 border-y border-border">
                  <p className="text-xs text-muted-foreground mb-1">
                    {result.conditionType.toUpperCase()} Value
                  </p>
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
              </>
            )}
          </div>
        )}

        {/* Recent Searches */}
        {recentSearches.length > 0 && (
          <div>
            <h3 className="font-display font-semibold text-foreground mb-3">Recent Lookups</h3>
            <div className="space-y-2">
              {recentSearches.map((search, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                  <div>
                    <p className="text-sm font-medium text-foreground">{search.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {search.platform}
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
