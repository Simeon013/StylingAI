
import React, { useState, useCallback, useEffect } from 'react';
import { ImageUploader } from './components/ImageUploader';
import { Spinner } from './components/Spinner';
import { generateOutfitImage, analyzeImageItems } from './services/geminiService';
import type { ImageState, GenerationStep } from './types';

const loadingMessages = [
  "Préparation des images...",
  "L'IA analyse votre style...",
  "Création de votre nouvel look...",
  "Un instant, la magie opère...",
  "Finalisation de l'image..."
];

const App: React.FC = () => {
  const [personImage, setPersonImage] = useState<ImageState>({ file: null, previewUrl: '' });
  const [clothingImage, setClothingImage] = useState<ImageState>({ file: null, previewUrl: '' });
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState<string>('');

  const [generationStep, setGenerationStep] = useState<GenerationStep>('idle');
  const [detectedItems, setDetectedItems] = useState<string[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  const isLoading = generationStep === 'analyzing' || generationStep === 'generating';

  useEffect(() => {
    if (generationStep !== 'generating') {
      return;
    }

    setLoadingMessage(loadingMessages[0]);
    let i = 1;
    const interval = setInterval(() => {
      setLoadingMessage(loadingMessages[i % loadingMessages.length]);
      i++;
    }, 2500);

    return () => clearInterval(interval);
  }, [generationStep]);

  const handlePersonImageSelect = (file: File | null) => {
    if (personImage.previewUrl) {
      URL.revokeObjectURL(personImage.previewUrl);
    }
    if (file) {
      setPersonImage({ file, previewUrl: URL.createObjectURL(file) });
    } else {
      setPersonImage({ file: null, previewUrl: '' });
    }
  };

  const handleClothingImageSelect = (file: File | null) => {
    if (clothingImage.previewUrl) {
      URL.revokeObjectURL(clothingImage.previewUrl);
    }
    if (file) {
      setClothingImage({ file, previewUrl: URL.createObjectURL(file) });
    } else {
      setClothingImage({ file: null, previewUrl: '' });
    }
  };

  const handleAnalyze = async () => {
    if (!clothingImage.file) {
      setError("Veuillez télécharger l'image du vêtement/accessoire.");
      return;
    }

    setError(null);
    setGeneratedImage(null);
    setGenerationStep('analyzing');

    try {
      const items = await analyzeImageItems(clothingImage.file);
      if (items.length === 0) {
        const defaultItem = "L'ensemble du vêtement/accessoire";
        setDetectedItems([defaultItem]);
        setSelectedItems([defaultItem]);
      } else {
        setDetectedItems(items);
        setSelectedItems(items);
      }
      setGenerationStep('selecting');
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Une erreur inconnue est survenue lors de l'analyse.");
      setGenerationStep('error');
    }
  };

  const handleItemSelectionChange = (item: string) => {
    setSelectedItems(prev =>
      prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]
    );
  };

  const handleFinalGenerate = async () => {
    if (!personImage.file || !clothingImage.file) {
      setError("Les images source sont manquantes.");
      setGenerationStep('error');
      return;
    }
    if (selectedItems.length === 0) {
      setError("Veuillez sélectionner au moins un article à générer.");
      return;
    }

    setError(null);
    setGenerationStep('generating');
    try {
      const resultImageUrl = await generateOutfitImage(personImage.file, clothingImage.file, selectedItems);
      setGeneratedImage(resultImageUrl);
      setGenerationStep('finished');
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Une erreur inconnue est survenue.");
      setGenerationStep('error');
    }
  };

  const handleReset = () => {
    if (personImage.previewUrl) {
      URL.revokeObjectURL(personImage.previewUrl);
    }
    if (clothingImage.previewUrl) {
      URL.revokeObjectURL(clothingImage.previewUrl);
    }
    setPersonImage({ file: null, previewUrl: '' });
    setClothingImage({ file: null, previewUrl: '' });
    setGeneratedImage(null);
    setError(null);
    setGenerationStep('idle');
    setDetectedItems([]);
    setSelectedItems([]);
  };

  const handleDownload = () => {
    if (!generatedImage) return;

    const link = document.createElement('a');
    link.href = generatedImage;
    const mimeType = generatedImage.split(';')[0].split(':')[1];
    const extension = mimeType.split('/')[1] || 'png';
    link.download = `mon-style-virtuel.${extension}`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isButtonDisabled = !personImage.file || !clothingImage.file || isLoading;

  return (
    <div className="min-h-screen text-slate-800 dark:text-slate-200 p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-600">
            Bonjour !
          </h1>
          <p className="mt-2 text-lg text-slate-600 dark:text-slate-400">
            Prêt(e) à essayer de nouveaux styles ?
          </p>
        </header>

        <main>
          <div className="max-w-4xl mx-auto text-center mb-10 bg-white dark:bg-slate-800/50 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-3">
              <i className="fas fa-circle-info mr-2 text-indigo-500"></i>
              Comment ça marche ?
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-lg leading-relaxed">
              C'est très simple ! Importez votre photo dans le cadre <strong>"Votre Photo"</strong> et l'image du produit dans <strong>"Vêtement & Accessoires"</strong>. Cliquez ensuite sur "Générer mon Style" et laissez la magie opérer !
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <ImageUploader
              id="person-uploader"
              title="Étape 1: Votre Photo"
              onImageSelect={handlePersonImageSelect}
              imagePreviewUrl={personImage.previewUrl}
              showCameraButton={true}
            />
            <ImageUploader
              id="clothing-uploader"
              title="Étape 2: Vêtement & Accessoires"
              onImageSelect={handleClothingImageSelect}
              imagePreviewUrl={clothingImage.previewUrl}
            />
          </div>

          <div className="text-center mb-8 min-h-[8rem] flex flex-col justify-center items-center">
            {generationStep === 'idle' && (
              <button
                onClick={handleAnalyze}
                disabled={isButtonDisabled}
                className="px-8 py-4 bg-gradient-to-r from-sky-500 to-indigo-600 text-white font-bold text-lg rounded-lg shadow-lg hover:shadow-xl disabled:bg-gradient-to-r disabled:from-slate-400 disabled:to-slate-500 disabled:opacity-70 disabled:cursor-not-allowed disabled:shadow-none disabled:transform-none transition-all duration-300 transform hover:-translate-y-1"
              >
                <i className="fa-solid fa-wand-magic-sparkles mr-2"></i>
                Générer mon Style
              </button>
            )}

            {generationStep === 'analyzing' && (
              <Spinner message="Analyse des articles..." />
            )}

            {generationStep === 'selecting' && (
              <div className="w-full max-w-2xl mx-auto p-4 bg-white dark:bg-slate-800 rounded-lg shadow-md animate-fade-in">
                <h3 className="text-xl font-semibold mb-3 text-slate-800 dark:text-slate-200">Quels éléments inclure ?</h3>
                {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-left mb-4">
                  {detectedItems.map(item => (
                    <label key={item} className="flex items-center space-x-2 p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={selectedItems.includes(item)}
                        onChange={() => handleItemSelectionChange(item)}
                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-slate-700 dark:text-slate-300 select-none">{item}</span>
                    </label>
                  ))}
                </div>
                <div className="flex justify-center gap-4">
                  <button
                    onClick={handleFinalGenerate}
                    disabled={selectedItems.length === 0}
                    className="px-6 py-3 bg-gradient-to-r from-sky-500 to-indigo-600 text-white font-bold rounded-lg shadow-lg hover:shadow-xl disabled:from-slate-400 disabled:to-slate-500 disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-300"
                  >
                    <i className="fas fa-check mr-2"></i>
                    Appliquer la sélection
                  </button>
                  <button
                    onClick={() => setGenerationStep('idle')}
                    className="px-6 py-3 bg-slate-600 text-white font-semibold rounded-lg hover:bg-slate-700 transition-colors"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )}

          </div>

          <div className="w-full min-h-[30rem] bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-4 sm:p-8 flex items-center justify-center">
            {(() => {
              switch (generationStep) {
                case 'generating':
                  return <Spinner message={loadingMessage} />;
                case 'error':
                  return (
                    <div className="text-center">
                      <i className="fas fa-exclamation-triangle text-5xl text-red-500 mb-4"></i>
                      <p className="text-red-500 font-semibold">Erreur de génération</p>
                      <p className="text-slate-500 dark:text-slate-400 mt-2">{error}</p>
                       <div className="mt-6 flex justify-center items-center gap-4">
                        <button
                          onClick={handleFinalGenerate}
                          className="px-6 py-2 bg-gradient-to-r from-sky-500 to-indigo-600 text-white font-semibold rounded-lg hover:shadow-lg transition-all duration-300 transform hover:-translate-y-0.5">
                            <i className="fas fa-bolt mr-2"></i>
                            Regénérer
                        </button>
                        <button
                          onClick={handleReset}
                          className="px-6 py-2 bg-slate-600 text-white font-semibold rounded-lg hover:bg-slate-700 transition-colors">
                            <i className="fas fa-sync-alt mr-2"></i>
                            Réinitialiser
                        </button>
                      </div>
                    </div>
                  );
                case 'finished':
                  return generatedImage ? (
                    <div className="text-center w-full">
                      <h2 className="text-2xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-600">Votre nouveau look !</h2>
                      <img src={generatedImage} alt="Generated outfit" className="max-w-full max-h-[28rem] h-auto mx-auto rounded-lg shadow-md" />
                      <div className="mt-6 flex justify-center items-center gap-4">
                        <button
                          onClick={handleDownload}
                          className="px-6 py-2 bg-gradient-to-r from-green-500 to-teal-600 text-white font-semibold rounded-lg hover:shadow-lg transition-all duration-300 transform hover:-translate-y-0.5">
                          <i className="fas fa-download mr-2"></i>
                          Télécharger
                        </button>
                        <button
                          onClick={handleFinalGenerate}
                          className="px-6 py-2 bg-gradient-to-r from-sky-500 to-indigo-600 text-white font-semibold rounded-lg hover:shadow-lg transition-all duration-300 transform hover:-translate-y-0.5">
                            <i className="fas fa-bolt mr-2"></i>
                            Regénérer
                        </button>
                        <button
                          onClick={handleReset}
                          className="px-6 py-2 bg-slate-600 text-white font-semibold rounded-lg hover:bg-slate-700 transition-colors">
                          <i className="fas fa-sync-alt mr-2"></i>
                          Réinitialiser
                        </button>
                      </div>
                    </div>
                  ) : null;
                 case 'selecting':
                    return (
                        <div className="text-center text-slate-500 dark:text-slate-400">
                            <i className="fas fa-tasks text-6xl mb-4"></i>
                            <p className="font-semibold text-xl">Faites votre choix ci-dessus.</p>
                            <p>Sélectionnez les articles que vous souhaitez essayer.</p>
                        </div>
                    );
                case 'idle':
                case 'analyzing':
                default:
                  return (
                    <div className="text-center text-slate-500 dark:text-slate-400">
                      <i className="fas fa-palette text-6xl mb-4"></i>
                      <p className="font-semibold text-xl">Le résultat apparaîtra ici.</p>
                      <p>Prêt à libérer votre créativité ?</p>
                    </div>
                  );
              }
            })()}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
