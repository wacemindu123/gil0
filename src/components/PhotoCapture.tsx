import { useRef } from 'react';
import { Camera, Upload, X, Check, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

interface PhotoCaptureProps {
  onPhotoCapture: (photoDataUrl: string) => void;
  onCancel: () => void;
  existingPhotos?: string[];
}

export const PhotoCapture = ({ onPhotoCapture, onCancel, existingPhotos = [] }: PhotoCaptureProps) => {
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  
  // Separate refs for camera and gallery
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Handle file/photo selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setCapturedPhoto(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  const confirmPhoto = () => {
    if (capturedPhoto) {
      onPhotoCapture(capturedPhoto);
    }
  };

  const retake = () => {
    setCapturedPhoto(null);
  };

  return (
    <div className="space-y-4">
      {/* Hidden file inputs - one for camera, one for gallery */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
        aria-hidden="true"
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        aria-hidden="true"
      />

      {/* Photo Preview Mode */}
      {capturedPhoto ? (
        <div className="space-y-4">
          <div className="relative aspect-[4/3] bg-black rounded-xl overflow-hidden">
            <img
              src={capturedPhoto}
              alt="Captured"
              className="w-full h-full object-contain"
            />
          </div>

          <p className="text-center text-sm text-muted-foreground">
            Is this photo clear and well-lit?
          </p>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={retake}
              className="flex-1"
            >
              <X className="w-4 h-4 mr-2" />
              Retake
            </Button>
            <Button
              onClick={confirmPhoto}
              className="flex-1 bg-gradient-to-r from-violet-500 to-purple-600"
            >
              <Check className="w-4 h-4 mr-2" />
              Use Photo
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Existing photos preview */}
          {existingPhotos.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Captured photos:</p>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {existingPhotos.map((photo, idx) => (
                  <div key={idx} className="relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border border-border">
                    <img src={photo} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Selection options */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="flex flex-col items-center justify-center gap-3 p-6 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/30 transition-all hover:border-primary/50 active:scale-95"
            >
              <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center">
                <Camera className="w-7 h-7 text-primary" />
              </div>
              <span className="text-sm font-medium text-foreground">Take Photo</span>
              <span className="text-xs text-muted-foreground text-center">Use camera</span>
            </button>

            <button
              type="button"
              onClick={() => galleryInputRef.current?.click()}
              className="flex flex-col items-center justify-center gap-3 p-6 rounded-xl bg-secondary hover:bg-secondary/80 border border-border/50 transition-all hover:border-border active:scale-95"
            >
              <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
                <Upload className="w-7 h-7 text-muted-foreground" />
              </div>
              <span className="text-sm font-medium text-foreground">Upload</span>
              <span className="text-xs text-muted-foreground text-center">From gallery</span>
            </button>
          </div>

          <Button variant="ghost" onClick={onCancel} className="w-full">
            Skip Photo
          </Button>
        </div>
      )}
    </div>
  );
};
