export interface HandwritingNote {
  id: string;
  userId: string;
  familyMemberId?: string;
  type: 'note' | 'shopping';
  originalImage: string; // base64
  recognizedText: string;
  editedText?: string;
  createdAt: number;
  updatedAt: number;
  isArchived: boolean;
}

export interface CanvasSettings {
  width: number;
  height: number;
  strokeColor: string;
  strokeWidth: number;
  backgroundColor: string;
}

export const DEFAULT_CANVAS_SETTINGS: CanvasSettings = {
  width: 1000,
  height: 600,
  strokeColor: '#1a1a1a',
  strokeWidth: 4,
  backgroundColor: '#fffef7',
};
