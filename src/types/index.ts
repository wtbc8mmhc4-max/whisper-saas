export interface User {
  id: string;
  email: string;
  name?: string;
  subscription: Subscription;
  usage: UserUsage;
  createdAt: Date;
}

export interface Subscription {
  id: string;
  userId: string;
  planId: string;
  status: 'active' | 'canceled' | 'past_due' | 'inactive';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  stripeSubscriptionId?: string;
}

export interface UserUsage {
  id: string;
  userId: string;
  currentPeriodMinutes: number;
  totalMinutes: number;
  transcriptionsCount: number;
  lastReset: Date;
}

export interface Transcription {
  id: string;
  userId: string;
  title: string;
  audioUrl?: string;
  text: string;
  chunks: TranscriptionChunk[];
  duration: number;
  model: string;
  language?: string;
  status: 'processing' | 'completed' | 'failed';
  createdAt: Date;
  updatedAt: Date;
}

export interface TranscriptionChunk {
  text: string;
  timestamp: [number, number | null];
}

export interface TranscriberData {
  isBusy: boolean;
  text: string;
  chunks: TranscriptionChunk[];
}

export interface ProgressItem {
  file: string;
  loaded: number;
  progress: number;
  total: number;
  name: string;
  status: string;
}

export interface TranscriberConfig {
  model: string;
  multilingual: boolean;
  quantized: boolean;
  subtask: string;
  language?: string;
}

export interface Transcriber {
  onInputChange: () => void;
  isBusy: boolean;
  isModelLoading: boolean;
  progressItems: ProgressItem[];
  start: (audioData: AudioBuffer | undefined) => void;
  output?: TranscriberData;
  model: string;
  setModel: (model: string) => void;
  multilingual: boolean;
  setMultilingual: (multilingual: boolean) => void;
  quantized: boolean;
  setQuantized: (quantized: boolean) => void;
  subtask: string;
  setSubtask: (subtask: string) => void;
  language?: string;
  setLanguage: (language: string) => void;
}

export enum AudioSource {
  URL = "URL",
  FILE = "FILE",
  RECORDING = "RECORDING",
}

export interface AudioData {
  buffer: AudioBuffer;
  url: string;
  source: AudioSource;
  mimeType: string;
}

export interface DashboardStats {
  totalTranscriptions: number;
  minutesUsed: number;
  minutesRemaining: number;
  planName: string;
}