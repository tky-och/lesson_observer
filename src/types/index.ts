export interface SessionMetadata {
  title: string;
  observer: string;
  subject: string;
  grade: string;
  teacher: string;
}

export interface Stroke {
  id: string;
  points: number[][]; // [x, y, pressure]
  color: string;
  size: number;
  timestamp: number;
}

export interface MaterialAnnotations {
  [pageNumber: number]: Stroke[];
}

export interface MaterialTab {
  id: string;
  name: string;
  type: 'image' | 'pdf';
  data: ArrayBuffer;
  currentPage: number;
  annotations: MaterialAnnotations;
}

export interface Session {
  sessionId: string;
  createdAt: number;
  updatedAt: number;
  metadata: SessionMetadata;
  textNotes: string;
  freehandStrokes: Stroke[];
  materials: MaterialTab[];
}

export interface QuickPhrase {
  id: string;
  text: string;
  sortOrder: number;
}

export interface AppSettings {
  quickPhrases: QuickPhrase[];
  defaultPenColor: string;
  defaultPenSize: number;
  observerName: string;
}

export const DEFAULT_QUICK_PHRASES: QuickPhrase[] = [
  { id: 'qp1', text: '教師の発問', sortOrder: 0 },
  { id: 'qp2', text: '生徒の反応', sortOrder: 1 },
  { id: 'qp3', text: '板書内容', sortOrder: 2 },
  { id: 'qp4', text: '机間指導', sortOrder: 3 },
  { id: 'qp5', text: 'グループ活動', sortOrder: 4 },
];

export const DEFAULT_SETTINGS: AppSettings = {
  quickPhrases: DEFAULT_QUICK_PHRASES,
  defaultPenColor: '#000000',
  defaultPenSize: 4,
  observerName: '',
};

export const PEN_COLORS = ['#000000', '#ef4444', '#3b82f6', '#22c55e'];
export const PEN_SIZES = [
  { label: '細', value: 2 },
  { label: '中', value: 4 },
  { label: '太', value: 8 },
];
