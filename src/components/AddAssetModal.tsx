import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Camera, 
  ChevronLeft, 
  ChevronRight, 
  Loader2, 
  TrendingUp,
  AlertCircle,
  Check,
  Sparkles,
  Database,
  Wifi,
  WifiOff,
  Gamepad2,
  ImageIcon,
  Upload,
  RefreshCw,
  ScanBarcode,
  X
} from 'lucide-react';
import { AssetCategory, MarketComparable } from '@/types/asset';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { PhotoCapture } from '@/components/PhotoCapture';
import { lookupPrice, isAnyApiConfigured } from '@/services/priceLookup';
import { getGameCoverImage } from '@/services/gameImageService';
import { lookupByUPC } from '@/services/priceChartingApi';
import Quagga from '@ericblade/quagga2';

interface AddAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (asset: {
    name: string;
    category: AssetCategory;
    purchasePrice: number;
    source: string;
    imageUrl?: string;
    photos?: string[];
    estimatedValue?: number;
    categoryDetails?: Record<string, unknown>;
  }) => void;
}

type Step = 'method' | 'photo' | 'details' | 'pricing' | 'review';

// Video Game Platforms
const platforms = [
  'NES', 'SNES', 'N64', 'GameCube', 'Wii', 'Wii U', 'Switch',
  'Game Boy', 'GBA', 'DS', '3DS',
  'PS1', 'PS2', 'PS3', 'PS4', 'PS5', 'PSP', 'PS Vita',
  'Xbox', 'Xbox 360', 'Xbox One', 'Xbox Series X',
  'Sega Genesis', 'Sega Saturn', 'Dreamcast',
  'Atari 2600', 'TurboGrafx-16', 'Neo Geo',
  'Other'
];

export const AddAssetModal = ({ isOpen, onClose, onAdd }: AddAssetModalProps) => {
  const [step, setStep] = useState<Step>('method');
  const [name, setName] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [source, setSource] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [customImage, setCustomImage] = useState<string | null>(null);
  
  // Ref for image upload input
  const imageUploadRef = useRef<HTMLInputElement>(null);
  
  // Barcode scanning state
  const [showScanner, setShowScanner] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [isLookingUpBarcode, setIsLookingUpBarcode] = useState(false);
  const scannerRef = useRef<HTMLDivElement>(null);
  
  // Video game specific fields
  const [platform, setPlatform] = useState('');
  const [region, setRegion] = useState<'NTSC' | 'PAL' | 'NTSC-J' | 'other'>('NTSC');
  const [conditionType, setConditionType] = useState<'sealed' | 'cib' | 'loose'>('cib');
  const [gradingCompany, setGradingCompany] = useState<'WATA' | 'VGA' | 'CGC' | 'raw'>('raw');
  const [grade, setGrade] = useState('');
  const [sealRating, setSealRating] = useState('');
  
  // Cover image state
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [isLoadingCover, setIsLoadingCover] = useState(false);
  
  // Price lookup state
  const [isLookingUpPrice, setIsLookingUpPrice] = useState(false);
  const [estimatedValue, setEstimatedValue] = useState<number | null>(null);
  const [priceConfidence, setPriceConfidence] = useState<'high' | 'medium' | 'low' | null>(null);
  const [confidenceScore, setConfidenceScore] = useState<number>(0);
  const [comparables, setComparables] = useState<MarketComparable[]>([]);
  const [priceRange, setPriceRange] = useState<{ low: number; median: number; high: number } | null>(null);
  const [rollingAverage, setRollingAverage] = useState<{ days30: number | null; days90: number | null; days180: number | null } | null>(null);
  const [adjustments, setAdjustments] = useState<Array<{ type: string; factor: number; reason: string }>>([]);
  const [methodology, setMethodology] = useState<string>('');
  const [priceSource, setPriceSource] = useState<'pricecharting' | 'ebay' | 'mock' | 'combined' | null>(null);

  // Barcode scanner functions
  const startScanner = useCallback(() => {
    setScanError(null);
    setShowScanner(true);
    
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
          readers: ["upc_reader", "upc_e_reader", "ean_reader", "ean_8_reader"],
        },
        locate: true,
      }, (err) => {
        if (err) {
          console.error('Scanner init error:', err);
          setScanError('Could not access camera');
          setShowScanner(false);
          return;
        }
        Quagga.start();
        setIsScanning(true);
      });
    }, 100);
  }, []);

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
        stopScanner();
        setIsLookingUpBarcode(true);
        
        try {
          const gameInfo = await lookupByUPC(code);
          
          if (gameInfo) {
            setName(gameInfo.name);
            setPlatform(gameInfo.platform);
            
            // Set estimated value from scanned data
            const price = gameInfo.prices.cib || gameInfo.prices.loose || gameInfo.prices.sealed || 0;
            if (price > 0) {
              setEstimatedValue(price);
            }
            
            // Skip to pricing step since we have the game info
            setStep('pricing');
          } else {
            setScanError(`No game found for barcode: ${code}. Try manual entry.`);
          }
        } catch (error) {
          console.error('UPC lookup error:', error);
          setScanError('Failed to look up barcode');
        } finally {
          setIsLookingUpBarcode(false);
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

  // Cleanup scanner on unmount or close
  useEffect(() => {
    if (!isOpen && isScanning) {
      Quagga.stop();
      setIsScanning(false);
      setShowScanner(false);
    }
  }, [isOpen, isScanning]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setStep('method');
        setName('');
        setPurchasePrice('');
        setSource('');
        setPhotos([]);
        setPlatform('');
        setShowScanner(false);
        setIsScanning(false);
        setScanError(null);
        setRegion('NTSC');
        setConditionType('cib');
        setGradingCompany('raw');
        setGrade('');
        setSealRating('');
        setEstimatedValue(null);
        setPriceConfidence(null);
        setConfidenceScore(0);
        setComparables([]);
        setPriceRange(null);
        setRollingAverage(null);
        setAdjustments([]);
        setMethodology('');
        setPriceSource(null);
        setCoverImageUrl(null);
        setIsLoadingCover(false);
        setCustomImage(null);
      }, 200);
    }
  }, [isOpen]);

  // Handle custom image upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setCustomImage(dataUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePhotoCapture = (photoDataUrl: string) => {
    setPhotos([...photos, photoDataUrl]);
    setStep('details');
  };

  const handleSkipPhoto = () => {
    setStep('details');
  };

  const getCategoryDetails = () => ({
    platform,
    region,
    conditionType,
    gradingCompany,
    grade: grade ? parseFloat(grade) : undefined,
    sealRating: sealRating || undefined,
  });

  // Fetch game cover image from RAWG API
  const fetchCoverImage = async () => {
    // Skip if user already took a photo
    if (photos.length > 0) return;
    
    setIsLoadingCover(true);
    try {
      const imageUrl = await getGameCoverImage(name, platform);
      if (imageUrl) {
        setCoverImageUrl(imageUrl);
      }
    } catch (error) {
      console.error('Failed to fetch cover image:', error);
    } finally {
      setIsLoadingCover(false);
    }
  };

  const lookupMarketPrice = async () => {
    setIsLookingUpPrice(true);
    
    // Fetch cover image in parallel with price lookup
    fetchCoverImage();
    
    try {
      const result = await lookupPrice({
        category: 'video-games',
        name,
        details: getCategoryDetails(),
      });
      
      setEstimatedValue(result.estimatedValue);
      setPriceConfidence(result.confidence);
      setConfidenceScore(result.confidenceScore);
      setComparables(result.comparables);
      setPriceRange(result.priceRange);
      setRollingAverage(result.rollingAverage);
      setAdjustments(result.adjustments);
      setMethodology(result.methodology);
      setPriceSource(result.source);
    } catch (error) {
      console.error('Price lookup failed:', error);
      setPriceSource('mock');
    } finally {
      setIsLookingUpPrice(false);
    }
  };

  const handleSubmit = () => {
    if (name && purchasePrice && source) {
      // Priority: custom uploaded > user photo > auto-fetched cover > placeholder
      const imageUrl = customImage || photos[0] || coverImageUrl || '/placeholder.svg';
      
      onAdd({
        name,
        category: 'video-games',
        purchasePrice: parseFloat(purchasePrice),
        source,
        imageUrl,
        photos: photos.length > 0 ? photos : undefined,
        estimatedValue: estimatedValue || undefined,
        categoryDetails: getCategoryDetails(),
      });
      onClose();
    }
  };
  
  // Get the best available image for display
  // Priority: custom uploaded > user photo > auto-fetched cover
  const getDisplayImage = () => {
    if (customImage) return customImage;
    if (photos.length > 0) return photos[0];
    if (coverImageUrl) return coverImageUrl;
    return null;
  };

  const getStepNumber = () => {
    const steps: Step[] = ['method', 'photo', 'details', 'pricing', 'review'];
    return steps.indexOf(step) + 1;
  };

  const canProceedFromDetails = () => {
    return name.trim().length > 0 && platform.length > 0;
  };

  const canProceedFromPricing = () => {
    return purchasePrice.trim().length > 0 && source.trim().length > 0;
  };

  const renderStepIndicator = () => {
    if (step === 'method') return null;
    
    return (
      <div className="flex items-center justify-center gap-1 mb-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className={`h-1 w-10 rounded-full transition-colors ${
              i < getStepNumber() - 1 ? 'bg-primary' : 'bg-secondary'
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl text-foreground flex items-center gap-2">
            <Gamepad2 className="w-5 h-5 text-primary" />
            {step === 'method' && 'Add Video Game'}
            {step === 'photo' && 'Capture Game'}
            {step === 'details' && 'Game Details'}
            {step === 'pricing' && 'Pricing & Source'}
            {step === 'review' && 'Review & Confirm'}
          </DialogTitle>
        </DialogHeader>

        {renderStepIndicator()}

        {/* Barcode Scanner Modal */}
        {showScanner && (
          <div className="fixed inset-0 z-[100] bg-black flex flex-col">
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
                  <div className="absolute left-2 right-2 h-0.5 bg-primary animate-pulse" 
                       style={{ top: '50%', boxShadow: '0 0 10px hsl(var(--primary))' }} />
                </div>
              </div>
              
              {isLookingUpBarcode && (
                <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
                  <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-2" />
                    <p className="text-white">Looking up game...</p>
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-4 bg-black/80 text-center">
              <p className="text-white/60 text-sm">Align the barcode within the frame</p>
            </div>
          </div>
        )}

        {/* Step 1: Method Selection */}
        {step === 'method' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              How would you like to add your game?
            </p>
            
            {scanError && (
              <div className="p-3 rounded-lg bg-destructive/20 border border-destructive/30 flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0" />
                <div>
                  <p className="text-sm text-destructive">{scanError}</p>
                  <button 
                    onClick={() => setScanError(null)}
                    className="text-xs text-destructive/70 hover:text-destructive mt-1"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-1 gap-3">
              {/* Barcode Scan Option */}
              <button
                onClick={startScanner}
                className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-primary/20 to-primary/10 border border-primary/30 hover:border-primary/50 transition-all group"
              >
                <div className="w-12 h-12 rounded-full bg-primary/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <ScanBarcode className="w-6 h-6 text-primary" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-foreground">Scan Barcode</p>
                  <p className="text-xs text-muted-foreground">Instantly look up game by UPC</p>
                </div>
                <Sparkles className="w-5 h-5 text-primary ml-auto" />
              </button>
              
              {/* Photo Option */}
              <button
                onClick={() => setStep('photo')}
                className="flex items-center gap-4 p-4 rounded-xl bg-secondary hover:bg-secondary/80 border border-border/50 hover:border-border transition-all group"
              >
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Camera className="w-6 h-6 text-muted-foreground" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-foreground">Take Photo</p>
                  <p className="text-xs text-muted-foreground">Capture your game with camera</p>
                </div>
              </button>

              {/* Manual Entry Option */}
              <button
                onClick={() => setStep('details')}
                className="flex items-center gap-4 p-4 rounded-xl bg-secondary hover:bg-secondary/80 border border-border/50 hover:border-border transition-all"
              >
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                  <span className="text-2xl">✏️</span>
                </div>
                <div className="text-left">
                  <p className="font-semibold text-foreground">Manual Entry</p>
                  <p className="text-xs text-muted-foreground">Enter details without photo</p>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Photo Capture */}
        {step === 'photo' && (
          <PhotoCapture
            onPhotoCapture={handlePhotoCapture}
            onCancel={handleSkipPhoto}
            existingPhotos={photos}
          />
        )}

        {/* Step 3: Game Details */}
        {step === 'details' && (
          <div className="space-y-4">
            {photos.length > 0 && (
              <div className="relative aspect-video bg-black rounded-xl overflow-hidden mb-4">
                <img 
                  src={photos[0]} 
                  alt="Captured game" 
                  className="w-full h-full object-contain"
                />
              </div>
            )}

          <div className="space-y-2">
              <Label htmlFor="name" className="text-sm text-muted-foreground">
                Game Title <span className="text-primary">*</span>
              </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Super Mario Bros."
              className="bg-secondary border-border focus:border-primary"
            />
          </div>

          <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">
                Platform <span className="text-primary">*</span>
              </Label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="w-full h-10 px-3 rounded-md bg-secondary border border-border text-foreground text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">Select platform...</option>
                {platforms.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Region</Label>
                <select
                  value={region}
                  onChange={(e) => setRegion(e.target.value as typeof region)}
                  className="w-full h-10 px-3 rounded-md bg-secondary border border-border text-foreground text-sm focus:border-primary focus:outline-none"
                >
                  <option value="NTSC">NTSC (US)</option>
                  <option value="PAL">PAL (EU)</option>
                  <option value="NTSC-J">NTSC-J (Japan)</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Condition</Label>
                <select
                  value={conditionType}
                  onChange={(e) => setConditionType(e.target.value as typeof conditionType)}
                  className="w-full h-10 px-3 rounded-md bg-secondary border border-border text-foreground text-sm focus:border-primary focus:outline-none"
                >
                  <option value="sealed">Sealed</option>
                  <option value="cib">CIB (Complete)</option>
                  <option value="loose">Loose</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Grading</Label>
                <select
                  value={gradingCompany}
                  onChange={(e) => setGradingCompany(e.target.value as typeof gradingCompany)}
                  className="w-full h-10 px-3 rounded-md bg-secondary border border-border text-foreground text-sm focus:border-primary focus:outline-none"
                >
                  <option value="raw">Ungraded</option>
                  <option value="WATA">WATA</option>
                  <option value="VGA">VGA</option>
                  <option value="CGC">CGC</option>
                </select>
              </div>

              {gradingCompany !== 'raw' && (
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Grade</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    placeholder="e.g., 9.4"
                    className="bg-secondary border-border focus:border-primary"
                  />
                </div>
              )}
            </div>

            {conditionType === 'sealed' && gradingCompany !== 'raw' && (
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Seal Rating</Label>
                <select
                  value={sealRating}
                  onChange={(e) => setSealRating(e.target.value)}
                  className="w-full h-10 px-3 rounded-md bg-secondary border border-border text-foreground text-sm focus:border-primary focus:outline-none"
                >
                  <option value="">Select seal rating...</option>
                  <option value="A++">A++ (Perfect)</option>
                  <option value="A+">A+ (Near Perfect)</option>
                  <option value="A">A (Excellent)</option>
                  <option value="B+">B+ (Very Good)</option>
                  <option value="B">B (Good)</option>
                  <option value="C">C (Fair)</option>
                </select>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setStep(photos.length > 0 ? 'photo' : 'method')}
                className="flex-1"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
              <Button
                onClick={() => {
                  setStep('pricing');
                  lookupMarketPrice();
                }}
                disabled={!canProceedFromDetails()}
                className="flex-1 btn-premium"
              >
                Get Price
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Pricing & Source */}
        {step === 'pricing' && (
          <div className="space-y-4">
            {/* Hidden file input for image upload */}
            <input
              ref={imageUploadRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />

            {/* Game Preview with Cover Art - Compact */}
            <div className="flex gap-3 p-3 rounded-xl bg-secondary/30">
              {/* Image */}
              <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-black/50 flex-shrink-0">
                {isLoadingCover ? (
                  <div className="w-full h-full flex items-center justify-center">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : getDisplayImage() ? (
                  <img 
                    src={getDisplayImage()!} 
                    alt={name} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary">
                    <ImageIcon className="w-6 h-6 text-muted-foreground" />
                  </div>
                )}
          </div>

              {/* Game info */}
              <div className="flex-1 min-w-0 flex flex-col justify-between">
                <div>
                  <h4 className="font-semibold text-foreground truncate">{name}</h4>
                  <p className="text-xs text-muted-foreground">
                    {platform} • {conditionType.toUpperCase()}
                    {gradingCompany !== 'raw' && ` • ${gradingCompany}`}
                  </p>
          </div>

                {/* Image action buttons */}
                <div className="flex items-center gap-2 mt-1">
                  <button
                    onClick={() => imageUploadRef.current?.click()}
                    className="flex items-center gap-1 px-2 py-1 rounded bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground text-[10px] font-medium transition-colors"
                  >
                    <Upload className="w-3 h-3" />
                    {getDisplayImage() ? 'Change image' : 'Add image'}
                  </button>
                  {getDisplayImage() && !customImage && !photos.length && (
                    <span className="text-[10px] text-muted-foreground">Auto</span>
                  )}
                  {customImage && (
                    <span className="text-[10px] text-primary">Custom</span>
                  )}
                </div>
              </div>
            </div>

            {/* API Status Banner */}
            {!isAnyApiConfigured() && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-500">
                <WifiOff className="w-4 h-4 flex-shrink-0" />
                <p className="text-xs">
                  Using demo data. Add API keys to <code className="bg-amber-500/20 px-1 rounded">.env</code> for real prices.
                </p>
              </div>
            )}

            {/* Market Value Lookup */}
            <div className="p-4 rounded-xl bg-secondary/50 border border-border/50 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">Market Value Estimate</span>
                </div>
                <div className="flex items-center gap-2">
                  {priceSource && (
                    <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${
                      priceSource === 'mock' ? 'bg-muted text-muted-foreground' :
                      'bg-accent/20 text-accent'
                    }`}>
                      {priceSource === 'mock' ? (
                        <><Database className="w-3 h-3" /> Demo</>
                      ) : priceSource === 'pricecharting' ? (
                        <><Wifi className="w-3 h-3" /> PriceCharting</>
                      ) : priceSource === 'ebay' ? (
                        <><Wifi className="w-3 h-3" /> eBay</>
                      ) : (
                        <><Wifi className="w-3 h-3" /> Live</>
                      )}
                    </span>
                  )}
                  {priceConfidence && (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      priceConfidence === 'high' ? 'bg-success/20 text-success' :
                      priceConfidence === 'medium' ? 'bg-primary/20 text-primary' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {priceConfidence}
                    </span>
                  )}
                </div>
              </div>

              {/* Condition Badge */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Comparing:</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  conditionType === 'sealed' ? 'bg-violet-500/20 text-violet-400' :
                  conditionType === 'cib' ? 'bg-blue-500/20 text-blue-400' :
                  'bg-amber-500/20 text-amber-400'
                }`}>
                  {conditionType === 'sealed' ? '🔒 Sealed Only' :
                   conditionType === 'cib' ? '📦 CIB Only' :
                   '💿 Loose Only'}
                </span>
                {gradingCompany !== 'raw' && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-success/20 text-success font-medium">
                    ⭐ Graded
                  </span>
                )}
              </div>

              {isLookingUpPrice ? (
                <div className="flex items-center justify-center py-4 gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">
                    {isAnyApiConfigured() ? `Fetching ${conditionType.toUpperCase()} prices...` : 'Analyzing comparables...'}
                  </span>
                </div>
              ) : estimatedValue ? (
                <div className="space-y-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-display font-bold text-foreground">
                      ${estimatedValue.toLocaleString()}
                    </span>
                    {confidenceScore > 0 && (
                      <span className="text-xs text-muted-foreground">
                        ({confidenceScore}% confidence)
                      </span>
                    )}
                  </div>
                  {priceRange && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>Low: ${priceRange.low.toLocaleString()}</span>
                      <span>•</span>
                      <span>Median: ${priceRange.median.toLocaleString()}</span>
                      <span>•</span>
                      <span>High: ${priceRange.high.toLocaleString()}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">No market data found</span>
                </div>
              )}

              {comparables.length > 0 && (
                <div className="pt-2 border-t border-border/50">
                  <p className="text-xs text-muted-foreground mb-2">
                    Comparable {conditionType.toUpperCase()} sales:
                  </p>
                  <div className="space-y-1.5 max-h-28 overflow-y-auto">
                    {comparables.slice(0, 5).map((comp, idx) => (
                      <div key={idx} className="flex justify-between items-center text-xs">
                        <span className="text-foreground/80 truncate max-w-[55%]">{comp.name}</span>
                        <div className="flex items-center gap-2">
                          {comp.condition && (
                            <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                              comp.condition.toLowerCase().includes('seal') || comp.condition.toLowerCase() === 'new' ? 'bg-violet-500/20 text-violet-400' :
                              comp.condition.toLowerCase() === 'cib' || comp.condition.toLowerCase() === 'complete' ? 'bg-blue-500/20 text-blue-400' :
                              comp.condition.toLowerCase() === 'loose' ? 'bg-amber-500/20 text-amber-400' :
                              'bg-muted text-muted-foreground'
                            }`}>
                              {comp.condition}
                            </span>
                          )}
                          <span className="text-success font-medium">${comp.soldPrice.toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Rolling Averages */}
              {rollingAverage && (rollingAverage.days30 || rollingAverage.days90 || rollingAverage.days180) && (
                <div className="pt-2 border-t border-border/50">
                  <p className="text-xs text-muted-foreground mb-2">Rolling Averages:</p>
                  <div className="grid grid-cols-3 gap-2">
                    {rollingAverage.days30 && (
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">30 Day</p>
                        <p className="text-sm font-semibold text-foreground">${Math.round(rollingAverage.days30).toLocaleString()}</p>
                      </div>
                    )}
                    {rollingAverage.days90 && (
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">90 Day</p>
                        <p className="text-sm font-semibold text-foreground">${Math.round(rollingAverage.days90).toLocaleString()}</p>
                      </div>
                    )}
                    {rollingAverage.days180 && (
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">180 Day</p>
                        <p className="text-sm font-semibold text-foreground">${Math.round(rollingAverage.days180).toLocaleString()}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Adjustments Applied */}
              {adjustments.length > 0 && (
                <div className="pt-2 border-t border-border/50">
                  <p className="text-xs text-muted-foreground mb-2">Adjustments Applied:</p>
                  <div className="space-y-1">
                    {adjustments.map((adj, idx) => (
                      <div key={idx} className="flex justify-between text-xs">
                        <span className="text-foreground/80">{adj.reason}</span>
                        <span className={adj.factor >= 1 ? 'text-success' : 'text-amber-500'}>
                          {adj.factor >= 1 ? '+' : ''}{((adj.factor - 1) * 100).toFixed(0)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Methodology */}
              {methodology && (
                <p className="text-xs text-muted-foreground italic pt-2 border-t border-border/50">
                  {methodology}
                </p>
              )}
          </div>

            {/* Purchase Info */}
            <div className="space-y-3">
          <div className="space-y-2">
                <Label htmlFor="price" className="text-sm text-muted-foreground">
                  Your Purchase Price ($) <span className="text-primary">*</span>
                </Label>
            <Input
              id="price"
              type="number"
              value={purchasePrice}
              onChange={(e) => setPurchasePrice(e.target.value)}
              placeholder="0.00"
              className="bg-secondary border-border focus:border-primary"
            />
          </div>

          <div className="space-y-2">
                <Label htmlFor="source" className="text-sm text-muted-foreground">
                  Purchase Source <span className="text-primary">*</span>
                </Label>
            <Input
              id="source"
              value={source}
              onChange={(e) => setSource(e.target.value)}
                  placeholder="e.g., eBay, Heritage Auctions, Local Game Store"
              className="bg-secondary border-border focus:border-primary"
            />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setStep('details')}
                className="flex-1"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
              <Button
                onClick={() => setStep('review')}
                disabled={!canProceedFromPricing()}
                className="flex-1 btn-premium"
              >
                Review
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 5: Review & Confirm */}
        {step === 'review' && (
          <div className="space-y-4">
            {/* Asset Preview Card */}
            <div className="rounded-xl bg-secondary/30 border border-border overflow-hidden">
              {/* Show image: user photo or fetched cover */}
              {getDisplayImage() ? (
                <div className="aspect-video bg-black">
                  <img 
                    src={getDisplayImage()!} 
                    alt={name} 
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="aspect-video bg-gradient-to-br from-primary/10 to-secondary flex items-center justify-center">
                  <Gamepad2 className="w-16 h-16 text-primary/40" />
                </div>
              )}
              <div className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-foreground">{name}</p>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <span>🎮</span>
                      {platform} • {conditionType.toUpperCase()}
                      {gradingCompany !== 'raw' && ` • ${gradingCompany} ${grade}`}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
                  <div>
                    <p className="text-xs text-muted-foreground">Purchase Price</p>
                    <p className="font-semibold text-foreground">
                      ${parseFloat(purchasePrice).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Est. Market Value</p>
                    <p className={`font-semibold ${
                      estimatedValue && estimatedValue > parseFloat(purchasePrice) 
                        ? 'text-success' 
                        : 'text-foreground'
                    }`}>
                      {estimatedValue ? `$${estimatedValue.toLocaleString()}` : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Source</p>
                    <p className="text-sm text-foreground">{source}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Region</p>
                    <p className="text-sm text-foreground">{region}</p>
                  </div>
                </div>

                {estimatedValue && parseFloat(purchasePrice) > 0 && (
                  <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                    <p className="text-xs text-muted-foreground mb-1">Potential Gain/Loss</p>
                    <p className={`text-lg font-bold ${
                      estimatedValue > parseFloat(purchasePrice) ? 'text-success' : 'text-destructive'
                    }`}>
                      {estimatedValue > parseFloat(purchasePrice) ? '+' : ''}
                      ${(estimatedValue - parseFloat(purchasePrice)).toLocaleString()}
                      <span className="text-sm font-normal ml-1">
                        ({((estimatedValue - parseFloat(purchasePrice)) / parseFloat(purchasePrice) * 100).toFixed(1)}%)
                      </span>
                    </p>
                  </div>
                )}
              </div>
          </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setStep('pricing')}
                className="flex-1"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
          <Button 
                onClick={handleSubmit}
                className="flex-1 btn-premium"
          >
                <Check className="w-4 h-4 mr-1" />
                Add Game
          </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
