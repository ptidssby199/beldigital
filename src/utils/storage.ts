import { AppSettings, RoomZone, ScheduleItem, SchedulePreset, TimeSyncConfig, TTSConfig } from '../types';
import { DEFAULT_TIME_SYNC_CONFIG } from './timeSync';

const STORAGE_KEY_SCHEDULES = 'bel_kantor_schedules_v1';
const STORAGE_KEY_SETTINGS = 'bel_kantor_settings_v1';
const STORAGE_KEY_TTS = 'bel_kantor_tts_v1';
const STORAGE_KEY_TIMESYNC = 'bel_kantor_timesync_v1';
const STORAGE_KEY_ROOMS = 'bel_kantor_rooms_v1';
const STORAGE_KEY_PRESETS = 'bel_kantor_presets_v1';

export const DEFAULT_ROOMS: RoomZone[] = [
  { id: 'all', name: 'Semua Ruangan (Broadcast)', description: 'Disiarkan ke seluruh penjuru kantor', isDefault: true },
  { id: 'work_area', name: 'Ruang Kerja Utama', description: 'Area kerja staf dan operasional' },
  { id: 'meeting_room', name: 'Ruang Rapat & Meeting', description: 'Ruang diskusi dan presentasi' },
  { id: 'lobby', name: 'Lobby & Resepsionis', description: 'Area depan dan ruang tunggu tamu' },
  { id: 'pantry_break', name: 'Kantin & Area Istirahat', description: 'Pantry dan ruang santai karyawan' },
  { id: 'warehouse', name: 'Gudang & Produksi', description: 'Area logistik dan gudang penyimpanan' }
];

export const DEFAULT_SCHEDULES: ScheduleItem[] = [
  {
    id: 'sch_1',
    title: 'Peringatan Masuk Kerja (5 Menit Lagi)',
    time: '07:55',
    days: [1, 2, 3, 4, 5],
    soundType: 'chime_tts',
    chimeId: 'modern_tri',
    ttsText: 'Perhatian kepada seluruh staf, 5 menit lagi jam kerja pagi akan segera dimulai. Silakan mempersiapkan meja kerja Anda.',
    room: 'Semua Ruangan (Broadcast)',
    volume: 85,
    enabled: true,
    category: 'work'
  },
  {
    id: 'sch_2',
    title: 'Jam Masuk Kerja Pagi',
    time: '08:00',
    days: [1, 2, 3, 4, 5],
    soundType: 'chime_tts',
    chimeId: 'westminster',
    ttsText: 'Selamat pagi rekan-rekan. Jam kerja resmi telah dimulai. Selamat beraktivitas dan mari bekerja dengan semangat dan profesionalisme.',
    room: 'Semua Ruangan (Broadcast)',
    volume: 100,
    enabled: true,
    category: 'work'
  },
  {
    id: 'sch_3',
    title: 'Waktu Peregangan Ringan (Ice Breaking)',
    time: '10:00',
    days: [1, 2, 3, 4, 5],
    soundType: 'chime_tts',
    chimeId: 'marimba',
    ttsText: 'Waktunya peregangan sejenak. Silakan berdiri, regangkan otot bahu dan mata, serta minum air putih agar tetap fokus dan segar.',
    room: 'Ruang Kerja Utama',
    volume: 80,
    enabled: true,
    category: 'break'
  },
  {
    id: 'sch_4',
    title: 'Istirahat Siang & Makan Siang (Senin - Kamis)',
    time: '12:00',
    days: [1, 2, 3, 4],
    soundType: 'chime_tts',
    chimeId: 'airport',
    ttsText: 'Perhatian, waktu istirahat siang telah tiba. Selamat menikmati istirahat makan siang dan ibadah bagi yang menjalankan.',
    room: 'Semua Ruangan (Broadcast)',
    volume: 95,
    enabled: true,
    category: 'break'
  },
  {
    id: 'sch_5',
    title: 'Peringatan Selesai Istirahat Siang',
    time: '12:55',
    days: [1, 2, 3, 4],
    soundType: 'chime_tts',
    chimeId: 'gentle_ding',
    ttsText: 'Waktu istirahat akan berakhir dalam 5 menit. Dimohon untuk segera bersiap kembali ke meja kerja.',
    room: 'Kantin & Area Istirahat',
    volume: 85,
    enabled: true,
    category: 'break'
  },
  {
    id: 'sch_6',
    title: 'Kembali Bekerja Sesi Siang',
    time: '13:00',
    days: [1, 2, 3, 4],
    soundType: 'chime_tts',
    chimeId: 'modern_tri',
    ttsText: 'Waktu istirahat telah selesai. Selamat melanjutkan pekerjaan untuk sesi siang.',
    room: 'Semua Ruangan (Broadcast)',
    volume: 90,
    enabled: true,
    category: 'work'
  },
  {
    id: 'sch_7',
    title: 'Istirahat Sholat Jumat & Makan (Khusus Jumat)',
    time: '11:30',
    days: [5],
    soundType: 'chime_tts',
    chimeId: 'airport',
    ttsText: 'Perhatian, waktu istirahat dan persiapan ibadah Sholat Jumat telah tiba. Selamat menunaikan ibadah Sholat Jumat bagi karyawan muslim.',
    room: 'Semua Ruangan (Broadcast)',
    volume: 95,
    enabled: true,
    category: 'break'
  },
  {
    id: 'sch_8',
    title: 'Kembali Bekerja Setelah Sholat Jumat',
    time: '13:30',
    days: [5],
    soundType: 'chime_tts',
    chimeId: 'modern_tri',
    ttsText: 'Waktu istirahat hari Jumat telah berakhir. Mari kembali melanjutkan pekerjaan sore.',
    room: 'Semua Ruangan (Broadcast)',
    volume: 90,
    enabled: true,
    category: 'work'
  },
  {
    id: 'sch_9',
    title: 'Briefing Evaluasi Sore',
    time: '16:30',
    days: [1, 2, 3, 4, 5],
    soundType: 'chime',
    chimeId: 'gentle_ding',
    ttsText: '',
    room: 'Ruang Rapat & Meeting',
    volume: 80,
    enabled: false,
    category: 'announcement'
  },
  {
    id: 'sch_10',
    title: 'Jam Pulang Kerja & Selesai Operasional',
    time: '17:00',
    days: [1, 2, 3, 4, 5],
    soundType: 'chime_tts',
    chimeId: 'westminster',
    ttsText: 'Perhatian, jam operasional kantor hari ini telah selesai. Terima kasih atas dedikasi dan kerja keras Anda hari ini. Harap matikan komputer, AC, dan lampu kerja sebelum meninggalkan ruangan. Selamat beristirahat dan sampai jumpa esok hari.',
    room: 'Semua Ruangan (Broadcast)',
    volume: 100,
    enabled: true,
    category: 'work'
  }
];

export const DEFAULT_PRESETS: SchedulePreset[] = [
  {
    id: 'standard_office',
    name: 'Kantor Reguler (Senin - Jumat)',
    description: 'Jadwal 8 jam kerja dengan jeda peregangan, istirahat siang, dan penutupan operasional.',
    schedules: DEFAULT_SCHEDULES
  },
  {
    id: 'school_institute',
    name: 'Instansi Pendidikan / Sekolah',
    description: 'Jadwal pergantian jam pelajaran, bel istirahat, dan bel pulang sekolah.',
    schedules: [
      {
        id: 'sch_sch1',
        title: 'Bel Masuk Sekolah & Upacara/Doa',
        time: '07:00',
        days: [1, 2, 3, 4, 5, 6],
        soundType: 'chime_tts',
        chimeId: 'classic_bell',
        ttsText: 'Bel masuk berbunyi. Seluruh siswa dan guru dimohon segera memasuki ruangan kelas.',
        room: 'Semua Ruangan (Broadcast)',
        volume: 100,
        enabled: true
      },
      {
        id: 'sch_sch2',
        title: 'Istirahat Pertama',
        time: '09:30',
        days: [1, 2, 3, 4, 5, 6],
        soundType: 'chime_tts',
        chimeId: 'airport',
        ttsText: 'Waktu istirahat pertama telah tiba. Selamat beristirahat.',
        room: 'Semua Ruangan (Broadcast)',
        volume: 95,
        enabled: true
      },
      {
        id: 'sch_sch3',
        title: 'Masuk Kelas Jam Kedua',
        time: '10:00',
        days: [1, 2, 3, 4, 5, 6],
        soundType: 'chime',
        chimeId: 'classic_bell',
        ttsText: '',
        room: 'Semua Ruangan (Broadcast)',
        volume: 95,
        enabled: true
      },
      {
        id: 'sch_sch4',
        title: 'Bel Pulang Sekolah',
        time: '14:00',
        days: [1, 2, 3, 4, 5],
        soundType: 'chime_tts',
        chimeId: 'westminster',
        ttsText: 'Waktu belajar hari ini telah selesai. Harap rapikan meja dan bersihkan kelas sebelum pulang. Berhati-hatilah di jalan.',
        room: 'Semua Ruangan (Broadcast)',
        volume: 100,
        enabled: true
      }
    ]
  }
];

export const DEFAULT_SETTINGS: AppSettings = {
  officeName: 'KANTOR UTAMA',
  subtitle: 'Sistem Bel & Pengumuman Otomatis',
  adminPin: '1234',
  theme: 'dark',
  displayMode: 'standard',
  muteAll: false,
  generalVolume: 95,
  showSeconds: true,
  timeFormat24h: true,
  autoPlayUnlocked: false
};

export const DEFAULT_TTS_CONFIG: TTSConfig = {
  voiceURI: '',
  lang: 'id-ID',
  rate: 0.92,
  pitch: 1.0,
  chimeBeforeAnnouncement: true,
  preludeChimeId: 'airport',
  repeatCount: 1
};

export function loadStoredSchedules(): ScheduleItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SCHEDULES);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Error loading schedules from localStorage', err);
  }
  return DEFAULT_SCHEDULES;
}

export function saveStoredSchedules(items: ScheduleItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_SCHEDULES, JSON.stringify(items));
  } catch (err) {
    console.error('Error saving schedules', err);
  }
}

export function loadStoredSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SETTINGS);
    if (raw) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    }
  } catch (err) {
    console.error('Error loading settings', err);
  }
  return DEFAULT_SETTINGS;
}

export function saveStoredSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
  } catch (err) {
    console.error('Error saving settings', err);
  }
}

export function loadStoredTTSConfig(): TTSConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TTS);
    if (raw) {
      return { ...DEFAULT_TTS_CONFIG, ...JSON.parse(raw) };
    }
  } catch (err) {
    console.error('Error loading TTS config', err);
  }
  return DEFAULT_TTS_CONFIG;
}

export function saveStoredTTSConfig(config: TTSConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY_TTS, JSON.stringify(config));
  } catch (err) {
    console.error('Error saving TTS config', err);
  }
}

export function loadStoredTimeSync(): TimeSyncConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TIMESYNC);
    if (raw) {
      return { ...DEFAULT_TIME_SYNC_CONFIG, ...JSON.parse(raw) };
    }
  } catch (err) {
    console.error('Error loading TimeSync config', err);
  }
  return DEFAULT_TIME_SYNC_CONFIG;
}

export function saveStoredTimeSync(config: TimeSyncConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY_TIMESYNC, JSON.stringify(config));
  } catch (err) {
    console.error('Error saving TimeSync config', err);
  }
}

export function loadStoredRooms(): RoomZone[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ROOMS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Error loading rooms', err);
  }
  return DEFAULT_ROOMS;
}

export function saveStoredRooms(rooms: RoomZone[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_ROOMS, JSON.stringify(rooms));
  } catch (err) {
    console.error('Error saving rooms', err);
  }
}

export function exportFullBackupJSON(): string {
  const data = {
    appName: 'Bel Kantor Digital',
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    settings: loadStoredSettings(),
    schedules: loadStoredSchedules(),
    ttsConfig: loadStoredTTSConfig(),
    timeSync: loadStoredTimeSync(),
    rooms: loadStoredRooms()
  };
  return JSON.stringify(data, null, 2);
}

export function importFullBackupJSON(jsonStr: string): boolean {
  try {
    const data = JSON.parse(jsonStr);
    if (data && typeof data === 'object') {
      if (data.settings) saveStoredSettings(data.settings);
      if (data.schedules && Array.isArray(data.schedules)) saveStoredSchedules(data.schedules);
      if (data.ttsConfig) saveStoredTTSConfig(data.ttsConfig);
      if (data.timeSync) saveStoredTimeSync(data.timeSync);
      if (data.rooms && Array.isArray(data.rooms)) saveStoredRooms(data.rooms);
      return true;
    }
  } catch (err) {
    console.error('Import backup failed', err);
  }
  return false;
}
