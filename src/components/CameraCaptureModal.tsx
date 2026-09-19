import React, { useRef, useState, useEffect } from 'react';
import { Camera, RefreshCw, X, AlertCircle } from 'lucide-react';

interface CameraCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (imageDataUrl: string) => void;
  currentCount?: number;
  maxCount?: number;
}

export const CameraCaptureModal: React.FC<CameraCaptureModalProps> = ({
  isOpen,
  onClose,
  onCapture,
  currentCount = 0,
  maxCount = 10,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isInitializing, setIsInitializing] = useState(false);
  const [justSnapped, setJustSnapped] = useState(false);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, facingMode]);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const startCamera = async () => {
    setError(null);
    setIsInitializing(true);
    stopCamera();

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err: any) {
      console.warn('Camera error:', err);
      // Try fallback without facingMode constraints
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
        streamRef.current = fallbackStream;
        if (videoRef.current) {
          videoRef.current.srcObject = fallbackStream;
          await videoRef.current.play();
        }
      } catch (fallbackErr: any) {
        setError(
          'Could not access camera. Please ensure camera permissions are allowed in your browser or upload an image file instead.'
        );
      }
    } finally {
      setIsInitializing(false);
    }
  };

  const handleCapture = (keepOpen: boolean = false) => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    
    onCapture(dataUrl);

    if (keepOpen && currentCount + 1 < maxCount) {
      setJustSnapped(true);
      setTimeout(() => setJustSnapped(false), 1200);
    } else {
      stopCamera();
      onClose();
    }
  };

  const toggleCameraFacing = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  if (!isOpen) return null;

  const canSnapMore = currentCount + 1 < maxCount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl border border-teal-100">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 bg-teal-50/50">
          <div className="flex items-center space-x-2">
            <Camera className="w-5 h-5 text-teal-700" />
            <h3 className="font-semibold text-slate-900">Capture Medicine Package</h3>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800">
              {currentCount}/{maxCount} Images
            </span>
          </div>
          <button
            id="close-camera-modal-btn"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video Viewport */}
        <div className="relative aspect-4/3 w-full bg-slate-950 flex items-center justify-center overflow-hidden">
          {error ? (
            <div className="p-6 text-center text-rose-300 flex flex-col items-center">
              <AlertCircle className="w-10 h-10 mb-2 text-rose-400" />
              <p className="text-sm font-medium text-white">{error}</p>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                playsInline
                autoPlay
                muted
                className="h-full w-full object-cover"
              />
              {/* Guided targeting overlay rectangle */}
              <div className="pointer-events-none absolute inset-8 rounded-xl border-2 border-dashed border-teal-400/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)] flex items-center justify-center">
                <span className="bg-slate-900/80 text-teal-200 text-xs px-3 py-1 rounded-full font-medium backdrop-blur-xs">
                  Align medicine text & batch inside frame
                </span>
              </div>

              {justSnapped && (
                <div className="absolute inset-0 bg-teal-900/60 flex items-center justify-center text-white font-bold text-sm backdrop-blur-2xs transition-opacity">
                  Photo Captured! Add next or finish below.
                </div>
              )}
            </>
          )}

          {isInitializing && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 text-white text-sm">
              <RefreshCw className="w-6 h-6 animate-spin mr-2 text-teal-400" />
              Starting camera...
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-4 bg-white border-t border-slate-100">
          <button
            id="flip-camera-btn"
            type="button"
            onClick={toggleCameraFacing}
            disabled={!!error || isInitializing}
            className="inline-flex items-center space-x-1.5 text-xs font-medium text-slate-600 hover:text-teal-700 p-2 rounded-lg hover:bg-teal-50 transition-colors disabled:opacity-40"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Switch Lens</span>
          </button>

          <div className="flex items-center space-x-2">
            {canSnapMore && (
              <button
                id="snap-add-another-btn"
                type="button"
                onClick={() => handleCapture(true)}
                disabled={!!error || isInitializing || currentCount >= maxCount}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-semibold border border-teal-200 transition-all disabled:opacity-50"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Snap & Add Another</span>
              </button>
            )}

            <button
              id="capture-photo-btn"
              type="button"
              onClick={() => handleCapture(false)}
              disabled={!!error || isInitializing}
              className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-md hover:shadow-teal-500/25 transition-all disabled:opacity-50"
            >
              <Camera className="w-4 h-4" />
              <span>{currentCount > 0 ? 'Snap & Finish' : 'Snap Photo'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
