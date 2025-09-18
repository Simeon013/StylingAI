import React, { useCallback, useRef, useState } from 'react';
import { CameraCapture } from './CameraCapture';

interface ImageUploaderProps {
  id: string;
  title: string;
  onImageSelect: (file: File | null) => void;
  imagePreviewUrl: string;
  showCameraButton?: boolean;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ id, title, onImageSelect, imagePreviewUrl, showCameraButton }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    onImageSelect(file || null);
  };
  
  const handleClear = (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      if(fileInputRef.current) {
          fileInputRef.current.value = "";
      }
      onImageSelect(null);
  }

  const handleDrop = useCallback((event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const file = event.dataTransfer.files?.[0];
    onImageSelect(file || null);
  }, [onImageSelect]);

  const handleDragOver = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const openCamera = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsCameraOpen(true);
  };
  
  const handleCapture = (file: File) => {
    onImageSelect(file);
    setIsCameraOpen(false);
  };

  return (
    <div className="w-full">
      <h2 className="text-xl font-semibold mb-2 text-center text-slate-700 dark:text-slate-300">{title}</h2>
      <div className="aspect-w-1 aspect-h-1">
        <input
          id={id}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
          ref={fileInputRef}
        />
        <label
          htmlFor={id}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          className={`
            cursor-pointer w-full h-full flex items-center justify-center
            border-2 border-dashed border-slate-300 dark:border-slate-600 
            rounded-lg transition-all duration-300 
            hover:border-indigo-500 hover:bg-slate-50 dark:hover:bg-slate-800/50
            relative group
            ${imagePreviewUrl ? 'border-solid' : 'flex-col p-4'}
          `}
        >
          {imagePreviewUrl ? (
            <>
              <img src={imagePreviewUrl} alt="Preview" className="w-full h-full object-cover rounded-lg" />
              <button 
                onClick={handleClear}
                className="absolute top-2 right-2 bg-black bg-opacity-50 text-white rounded-full w-8 h-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Supprimer l'image">
                  <i className="fas fa-times"></i>
              </button>
            </>
          ) : (
            <div className="text-center text-slate-500 dark:text-slate-400">
              <i className="fas fa-cloud-upload-alt text-4xl mb-2"></i>
              <p className="font-semibold">Cliquez pour choisir un fichier</p>
              <p className="text-sm">ou glissez-déposez</p>
              {showCameraButton && (
                <>
                  <div className="my-2 text-xs font-semibold text-slate-400 dark:text-slate-500">OU</div>
                  <button
                    onClick={openCamera}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    <i className="fas fa-camera mr-2"></i>
                    Prendre une photo
                  </button>
                </>
              )}
            </div>
          )}
        </label>
      </div>
      {isCameraOpen && (
        <CameraCapture onCapture={handleCapture} onClose={() => setIsCameraOpen(false)} />
      )}
    </div>
  );
};
