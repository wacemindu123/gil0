import { useState, useRef, useCallback } from 'react';
import { Camera, Upload, X, RotateCcw, Check, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PhotoCaptureProps {
  onPhotoCapture: (photoDataUrl: string) => void;
  onCancel: () => void;
  existingPhotos?: string[];
}

export const PhotoCapture = ({ onPhotoCapture, onCancel, existingPhotos = [] }: PhotoCaptureProps) => {
  const [mode, setMode] = useState<'select' | 'camera' | 'preview'>('select');
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startCamera = useCallback(async () => {
    try {
      setCameraError(null);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment', // Use back camera on mobile
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });
      
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setMode('camera');
    } catch (err) {
      console.error('Camera error:', err);
      setCameraError('Unable to access camera. Please check permissions or use file upload.');
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  }, [stream]);

  const capturePhoto = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        setCapturedPhoto(dataUrl);
        stopCamera();
        setMode('preview');
      }
    }
  }, [stopCamera]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setCapturedPhoto(dataUrl);
        setMode('preview');
      };
      reader.readAsDataURL(file);
    }
  };

  const retake = () => {
    setCapturedPhoto(null);
    setMode('select');
  };

  const confirmPhoto = () => {
    if (capturedPhoto) {
      onPhotoCapture(capturedPhoto);
    }
  };

  const handleCancel = () => {
    stopCamera();
    onCancel();
  };

  return (
    <div className="space-y-4">
      {/* Hidden canvas for photo capture */}
      <canvas ref={canvasRef} className="hidden" />
      
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileUpload}
        className="hidden"
      />

      {mode === 'select' && (
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
              onClick={startCamera}
              className="flex flex-col items-center justify-center gap-3 p-6 rounded-xl bg-secondary hover:bg-secondary/80 border border-border/50 transition-all hover:border-primary/30"
            >
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                <Camera className="w-7 h-7 text-primary" />
              </div>
              <span className="text-sm font-medium text-foreground">Take Photo</span>
              <span className="text-xs text-muted-foreground text-center">Use your camera</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center gap-3 p-6 rounded-xl bg-secondary hover:bg-secondary/80 border border-border/50 transition-all hover:border-primary/30"
            >
              <div className="w-14 h-14 rounded-full bg-accent/10 flex items-center justify-center">
                <Upload className="w-7 h-7 text-accent" />
              </div>
              <span className="text-sm font-medium text-foreground">Upload</span>
              <span className="text-xs text-muted-foreground text-center">From gallery</span>
            </button>
          </div>

          {cameraError && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <p className="text-sm text-destructive">{cameraError}</p>
            </div>
          )}

          <Button variant="ghost" onClick={handleCancel} className="w-full">
            Skip Photo
          </Button>
        </div>
      )}

      {mode === 'camera' && (
        <div className="space-y-4">
          <div className="relative aspect-[4/3] bg-black rounded-xl overflow-hidden">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            
            {/* Camera overlay guides */}
            <div className="absolute inset-4 border-2 border-white/30 rounded-lg pointer-events-none">
              <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-primary rounded-tl-lg" />
              <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-primary rounded-tr-lg" />
              <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-primary rounded-bl-lg" />
              <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-primary rounded-br-lg" />
            </div>
          </div>

          <p className="text-center text-sm text-muted-foreground">
            Position the item clearly in frame
          </p>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => {
                stopCamera();
                setMode('select');
              }}
              className="flex-1"
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={capturePhoto}
              className="flex-1 btn-premium"
            >
              <Camera className="w-4 h-4 mr-2" />
              Capture
            </Button>
          </div>
        </div>
      )}

      {mode === 'preview' && capturedPhoto && (
        <div className="space-y-4">
          <div className="relative aspect-[4/3] bg-black rounded-xl overflow-hidden">
            <img
              src={capturedPhoto}
              alt="Captured"
              className="w-full h-full object-cover"
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
              <RotateCcw className="w-4 h-4 mr-2" />
              Retake
            </Button>
            <Button
              onClick={confirmPhoto}
              className="flex-1 btn-premium"
            >
              <Check className="w-4 h-4 mr-2" />
              Use Photo
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
