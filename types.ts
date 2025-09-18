
export interface ImageState {
  file: File | null;
  previewUrl: string;
}

export type GenerationStep = 'idle' | 'analyzing' | 'selecting' | 'generating' | 'finished' | 'error';
