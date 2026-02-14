
import React, { useRef, useState, useCallback, useEffect } from 'react';
import { CameraIcon, CheckIcon } from './Icons';

interface CameraCaptureProps {
  onCapture: (dataUrl: string) => void;
  currentPhoto?: string;
}

const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, currentPhoto }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCameraActive(false);
  }, [stream]);

  const startCamera = useCallback(async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert("Your browser does not support camera access.");
      return;
    }

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'user', 
          width: { ideal: 400 }, // Reduced from 640
          height: { ideal: 400 },
          aspectRatio: { ideal: 1 }
        },
        audio: false
      });
      
      setStream(mediaStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        try {
          await videoRef.current.play();
        } catch (playErr) {
          console.error("Video play error:", playErr);
        }
      }
      setIsCameraActive(true);
    } catch (err: any) {
      console.error("Error accessing camera:", err);
      alert("Could not start camera. Please upload a photo instead.");
    }
  }, []);

  const capturePhoto = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        
        // Optimized capture size
        canvas.width = 400;
        canvas.height = 400;
        
        context.translate(canvas.width, 0);
        context.scale(-1, 1);
        
        // Draw centered and cropped
        const size = Math.min(video.videoWidth, video.videoHeight);
        const xOffset = (video.videoWidth - size) / 2;
        const yOffset = (video.videoHeight - size) / 2;
        
        context.drawImage(video, xOffset, yOffset, size, size, 0, 0, 400, 400);
        
        context.setTransform(1, 0, 0, 1, 0, 0);
        
        // Reduced quality to 0.6 to save massive storage space
        const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
        onCapture(dataUrl);
        stopCamera();
      }
    }
  }, [onCapture, stopCamera]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        if (result) {
          // Downsize large uploads too
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = 400;
            canvas.height = 400;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0, 400, 400);
              onCapture(canvas.toDataURL('image/jpeg', 0.6));
            }
          };
          img.src = result;
        }
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="relative w-48 h-48 rounded-full overflow-hidden border-4 border-amber-500 bg-slate-800 flex items-center justify-center group shadow-xl">
        {isCameraActive ? (
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
        ) : currentPhoto ? (
          <img src={currentPhoto} alt="Profile" className="w-full h-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-2 text-slate-500">
            <CameraIcon />
            <span className="text-[10px] font-bold uppercase tracking-widest opacity-50">Profile Photo</span>
          </div>
        )}
      </div>
      
      <div className="flex flex-wrap justify-center gap-2">
        {!isCameraActive ? (
          <>
            <button type="button" onClick={startCamera} className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
              <CameraIcon /> {currentPhoto ? 'Retake' : 'Camera'}
            </button>
            <button type="button" onClick={() => fileInputRef.current?.click()} className="px-4 py-2 bg-slate-800 text-slate-300 border border-slate-700 rounded-lg hover:bg-slate-700 transition flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
              Upload
            </button>
          </>
        ) : (
          <div className="flex gap-2">
             <button type="button" onClick={capturePhoto} className="px-6 py-2 bg-amber-500 text-slate-900 rounded-lg font-black uppercase text-xs shadow-lg">
              Capture
            </button>
            <button type="button" onClick={stopCamera} className="px-4 py-2 bg-slate-800 text-slate-400 rounded-lg text-xs font-bold uppercase">
              Cancel
            </button>
          </div>
        )}
      </div>
      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default CameraCapture;
