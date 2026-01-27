
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

  const startCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: 400, height: 400 } 
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setIsCameraActive(true);
    } catch (err) {
      console.error("Error accessing camera:", err);
      alert("Please allow camera access to take a photo.");
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCameraActive(false);
  }, [stream]);

  const capturePhoto = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.8);
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
          onCapture(result);
          stopCamera();
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="relative w-48 h-48 rounded-full overflow-hidden border-4 border-amber-500 bg-slate-800 flex items-center justify-center group shadow-xl transition-all duration-300">
        {isCameraActive ? (
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            className="w-full h-full object-cover scale-x-[-1]"
          />
        ) : currentPhoto ? (
          <img src={currentPhoto} alt="Profile" className="w-full h-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-2 text-slate-500">
            <CameraIcon />
            <span className="text-[10px] font-bold uppercase tracking-widest opacity-50">Profile Photo</span>
          </div>
        )}
        
        {/* Overlay when photo exists */}
        {currentPhoto && !isCameraActive && (
          <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <p className="text-[10px] font-black text-amber-500 uppercase tracking-tighter">Change Photo</p>
          </div>
        )}
      </div>
      
      <div className="flex flex-wrap justify-center gap-2">
        {!isCameraActive ? (
          <>
            <button
              type="button"
              onClick={startCamera}
              className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition flex items-center gap-2 text-xs font-bold uppercase tracking-wider"
            >
              <CameraIcon /> {currentPhoto ? 'Retake' : 'Camera'}
            </button>
            <button
              type="button"
              onClick={triggerFileUpload}
              className="px-4 py-2 bg-slate-800 text-slate-300 border border-slate-700 rounded-lg hover:bg-slate-700 transition flex items-center gap-2 text-xs font-bold uppercase tracking-wider"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              Upload
            </button>
          </>
        ) : (
          <div className="flex gap-2">
             <button
              type="button"
              onClick={capturePhoto}
              className="px-6 py-2 bg-amber-500 text-slate-900 rounded-lg hover:bg-amber-400 transition flex items-center gap-2 text-xs font-black uppercase tracking-tighter shadow-lg shadow-amber-500/20"
            >
              <CheckIcon /> Capture Now
            </button>
            <button
              type="button"
              onClick={stopCamera}
              className="px-4 py-2 bg-slate-800 text-slate-400 rounded-lg hover:bg-slate-700 transition text-xs font-bold uppercase tracking-wider"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept="image/*" 
        onChange={handleFileUpload}
      />
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default CameraCapture;
