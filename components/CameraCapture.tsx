import React, { useState, useEffect, useRef, useCallback } from 'react';

interface CameraCaptureProps {
  onCapture: (file: File) => void;
  onClose: () => void;
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const startCamera = async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error("L'API de la caméra n'est pas disponible sur ce navigateur.");
        }
        const mediaStream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'user' } 
        });
        streamRef.current = mediaStream;
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err) {
        console.error("Erreur d'accès à la caméra:", err);
        setError("Impossible d'accéder à la caméra. Veuillez vérifier les permissions dans les paramètres de votre navigateur.");
      }
    };

    startCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleCapturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const context = canvas.getContext('2d');
    if (context) {
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      setCapturedImage(canvas.toDataURL('image/jpeg'));
    }
  }, []);

  const handleRetake = () => {
    setCapturedImage(null);
  };

  const handleUsePhoto = () => {
    if (!canvasRef.current) return;
    canvasRef.current.toBlob(blob => {
      if (blob) {
        const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
        onCapture(file);
      }
    }, 'image/jpeg', 0.95);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" aria-modal="true" role="dialog">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-4 sm:p-6 w-full max-w-lg text-center relative">
        <button onClick={onClose} className="absolute top-2 right-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200" aria-label="Fermer">
          <i className="fas fa-times text-2xl"></i>
        </button>
        
        <h3 className="text-xl font-semibold mb-4 text-slate-800 dark:text-slate-200">Prendre une photo</h3>

        {error ? (
          <div className="text-red-500 p-4">
            <p>{error}</p>
          </div>
        ) : (
          <div className="relative w-full aspect-[4/3] bg-slate-200 dark:bg-slate-700 rounded-md overflow-hidden">
            {capturedImage ? (
              <img src={capturedImage} alt="Capture" className="w-full h-full object-contain" />
            ) : (
              <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover transform -scale-x-100"></video>
            )}
          </div>
        )}

        {!error && (
            <div className="mt-6 flex justify-center gap-4">
            {capturedImage ? (
                <>
                <button onClick={handleRetake} className="px-6 py-3 bg-slate-600 text-white font-semibold rounded-lg hover:bg-slate-700 transition-colors">
                    <i className="fas fa-redo-alt mr-2"></i>
                    Reprendre
                </button>
                <button onClick={handleUsePhoto} className="px-6 py-3 bg-gradient-to-r from-sky-500 to-indigo-600 text-white font-bold rounded-lg shadow-lg hover:shadow-xl transition-all duration-300">
                    <i className="fas fa-check mr-2"></i>
                    Utiliser la photo
                </button>
                </>
            ) : (
                <button 
                    onClick={handleCapturePhoto} 
                    className="w-16 h-16 rounded-full bg-white border-4 border-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-indigo-500" 
                    aria-label="Prendre la photo">
                </button>
            )}
            </div>
        )}
        <canvas ref={canvasRef} className="hidden"></canvas>
      </div>
    </div>
  );
};