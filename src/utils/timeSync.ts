import { TimeSyncConfig } from '../types';

export const DEFAULT_TIME_SYNC_CONFIG: TimeSyncConfig = {
  mode: 'ntp',
  ntpServerUrl: 'https://worldtimeapi.org/api/timezone/Etc/UTC',
  manualOffsetMs: 0,
  lastSyncedAt: null,
  autoSyncIntervalMinutes: 30,
  currentOffsetMs: 0,
  status: 'system' as unknown as 'synced',
  latencyMs: 0
};

export async function synchronizeNetworkTime(
  config: TimeSyncConfig
): Promise<{ offsetMs: number; latencyMs: number; error?: string }> {
  // Method 1: Try WorldTimeAPI
  try {
    const t0 = performance.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch('https://worldtimeapi.org/api/timezone/Etc/UTC', {
      signal: controller.signal,
      cache: 'no-store'
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const t1 = performance.now();
      const roundTripMs = t1 - t0;
      const data = await res.json();
      const serverEpochMs = new Date(data.utc_datetime).getTime();
      const localEpochMs = Date.now();
      // Offset = ServerTime + (RTT / 2) - LocalTime
      const estimatedServerTime = serverEpochMs + Math.round(roundTripMs / 2);
      const offsetMs = estimatedServerTime - localEpochMs;

      return {
        offsetMs,
        latencyMs: Math.round(roundTripMs)
      };
    }
  } catch (err) {
    console.warn('WorldTimeAPI sync attempt failed, trying fallback source...', err);
  }

  // Method 2: Fallback to TimeAPI.io
  try {
    const t0 = performance.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch('https://timeapi.io/api/time/current/zone?timeZone=UTC', {
      signal: controller.signal,
      cache: 'no-store'
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const t1 = performance.now();
      const roundTripMs = t1 - t0;
      const data = await res.json();
      const serverEpochMs = new Date(data.dateTime + 'Z').getTime();
      const localEpochMs = Date.now();
      const offsetMs = (serverEpochMs + Math.round(roundTripMs / 2)) - localEpochMs;

      return {
        offsetMs,
        latencyMs: Math.round(roundTripMs)
      };
    }
  } catch (err) {
    console.warn('TimeAPI.io sync attempt failed, trying HTTP header timestamp...', err);
  }

  // Method 3: Fallback to HTTP Head Date header (works on any static host / CDN)
  try {
    const t0 = performance.now();
    const res = await fetch(window.location.href, {
      method: 'HEAD',
      cache: 'no-store'
    });
    const t1 = performance.now();
    const dateHeader = res.headers.get('date');
    if (dateHeader) {
      const serverEpochMs = new Date(dateHeader).getTime();
      const roundTripMs = t1 - t0;
      const offsetMs = (serverEpochMs + Math.round(roundTripMs / 2)) - Date.now();
      return {
        offsetMs,
        latencyMs: Math.round(roundTripMs)
      };
    }
  } catch (err) {
    console.warn('HTTP header date sync failed', err);
  }

  return {
    offsetMs: 0,
    latencyMs: 0,
    error: 'Tidak dapat terhubung ke server waktu (offline). Menggunakan jam sistem lokal.'
  };
}

export function getSynchronizedDate(config: TimeSyncConfig): Date {
  const totalOffset = (config.currentOffsetMs || 0) + (config.manualOffsetMs || 0);
  return new Date(Date.now() + totalOffset);
}

export function formatIndonesianDate(date: Date): {
  dayName: string;
  formattedDate: string;
  timeStr: string;
  secondsStr: string;
  period: string;
} {
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const dayName = days[date.getDay()];
  const day = date.getDate().toString().padStart(2, '0');
  const month = months[date.getMonth()];
  const year = date.getFullYear();

  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');

  const period = date.getHours() < 12 ? 'PAGI' : date.getHours() < 15 ? 'SIANG' : date.getHours() < 18 ? 'SORE' : 'MALAM';

  return {
    dayName,
    formattedDate: `${dayName}, ${day} ${month} ${year}`,
    timeStr: `${hours}:${minutes}`,
    secondsStr: seconds,
    period
  };
}
