export type SoundType = 'chime' | 'tts' | 'custom' | 'chime_tts' | 'chime_tts_chime' | 'custom_tts';

export type BuiltinChimeId = 
  | 'westminster'
  | 'airport'
  | 'station_kai'
  | 'shinkansen_station'
  | 'subway_station'
  | 'modern_tri'
  | 'classic_bell'
  | 'gentle_ding'
  | 'urgent_alert'
  | 'marimba';

export interface BuiltinChime {
  id: BuiltinChimeId;
  name: string;
  description: string;
  duration: string;
  category: 'office' | 'alert' | 'classic' | 'melodic' | 'station';
}

export interface CustomAudioItem {
  id: string;
  name: string;
  dataUrl: string; // Base64 data URL or IndexedDB key
  duration: number; // in seconds
  fileSize: number; // in bytes
  createdAt: string;
  type: 'upload' | 'mic_record';
}

export interface ScheduleItem {
  id: string;
  title: string;
  time: string; // '08:00' (24 hour format)
  days: number[]; // 0 = Minggu, 1 = Senin, 2 = Selasa, 3 = Rabu, 4 = Kamis, 5 = Jumat, 6 = Sabtu
  soundType: SoundType;
  chimeId?: BuiltinChimeId;
  postludeChimeId?: BuiltinChimeId; // Chime penutup setelah TTS
  customAudioId?: string;
  ttsText?: string;
  room: string;
  volume: number; // 0 - 100
  enabled: boolean;
  category?: 'work' | 'break' | 'announcement' | 'custom';
}

export interface SchedulePreset {
  id: string;
  name: string;
  description: string;
  schedules: ScheduleItem[];
}

export interface RoomZone {
  id: string;
  name: string;
  description?: string;
  isDefault?: boolean;
}

export interface TTSConfig {
  voiceURI: string;
  lang: string;
  rate: number; // 0.5 - 2.0 (default 0.95 for clear announcement)
  pitch: number; // 0.5 - 2.0 (default 1.0)
  chimeBeforeAnnouncement: boolean;
  preludeChimeId: BuiltinChimeId;
  chimeAfterAnnouncement: boolean;
  postludeChimeId: BuiltinChimeId;
  repeatCount: number; // 1 or 2
}

export interface TimeSyncConfig {
  mode: 'system' | 'ntp';
  ntpServerUrl: string;
  manualOffsetMs: number;
  lastSyncedAt: string | null;
  autoSyncIntervalMinutes: number;
  currentOffsetMs: number;
  status: 'synced' | 'syncing' | 'failed' | 'manual';
  latencyMs?: number;
}

export interface AppSettings {
  officeName: string;
  subtitle: string;
  adminPin: string;
  theme: 'dark' | 'light' | 'amoled';
  displayMode: 'standard' | 'minimal' | 'fullscreen_clock';
  muteAll: boolean;
  generalVolume: number; // 0 - 100
  showSeconds: boolean;
  timeFormat24h: boolean;
  autoPlayUnlocked: boolean;
}

export interface BellExecutionEvent {
  scheduleId: string;
  title: string;
  time: string;
  executedAt: string;
  room: string;
  soundType: SoundType;
}
