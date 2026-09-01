import { TTSConfig } from '../types';

export interface TTSVoiceOption {
  name: string;
  lang: string;
  voiceURI: string;
  default: boolean;
  isIndonesian: boolean;
}

export const INDONESIAN_ANNOUNCEMENT_TEMPLATES = [
  {
    title: 'Jam Masuk Kerja Pagi',
    text: 'Perhatian kepada seluruh staf dan karyawan. Jam kerja pagi telah dimulai. Selamat beraktivitas dan selamat bekerja dengan penuh semangat.'
  },
  {
    title: 'Istirahat Siang / Makan & Sholat',
    text: 'Perhatian kepada seluruh karyawan. Waktu istirahat siang telah tiba. Selamat menikmati waktu istirahat dan santap siang.'
  },
  {
    title: 'Selesai Istirahat Siang',
    text: 'Waktu istirahat telah berakhir. Dimohon kepada seluruh staf untuk segera kembali ke ruang kerja masing-masing.'
  },
  {
    title: 'Jam Pulang Kerja Sore',
    text: 'Perhatian, jam kerja hari ini telah selesai. Terima kasih atas kerja keras dan dedikasi Anda. Harap pastikan peralatan kerja, AC, dan komputer telah dimatikan sebelum meninggalkan ruangan. Selamat beristirahat.'
  },
  {
    title: 'Briefing / Rapat Harian',
    text: 'Panggilan kepada seluruh staf. Diharapkan untuk berkumpul di ruang rapat utama untuk mengikuti briefing harian.'
  },
  {
    title: 'Waktu Peregangan (Ice Breaking)',
    text: 'Waktunya relaksasi sejenak. Seluruh staf disarankan untuk melakukan peregangan otot ringan dan minum air putih untuk menjaga kesehatan.'
  },
  {
    title: 'Peringatan Hari Jumat (Sholat Jumat)',
    text: 'Perhatian, waktu persiapan ibadah Sholat Jumat telah tiba. Bagi karyawan muslim disilakan untuk bersiap-siap menuju masjid.'
  },
  {
    title: 'Pemberitahuan Tamu / Resepsionis',
    text: 'Panggilan bagian resepsionis. Terdapat tamu yang menunggu di lobby utama.'
  },
  {
    title: 'Pengumuman Darurat (Evakuasi)',
    text: 'PERHATIAN PENTING! Seluruh staf dimohon untuk tetap tenang, tinggalkan ruangan melalui tangga darurat dan berkumpul di titik kumpul yang telah ditentukan.'
  }
];

export function getAvailableVoices(): Promise<TTSVoiceOption[]> {
  return new Promise((resolve) => {
    if (!('speechSynthesis' in window)) {
      resolve([]);
      return;
    }

    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        const options: TTSVoiceOption[] = voices.map((v) => {
          const isIndo = v.lang.toLowerCase().startsWith('id') || v.name.toLowerCase().includes('indonesia');
          return {
            name: v.name,
            lang: v.lang,
            voiceURI: v.voiceURI,
            default: v.default,
            isIndonesian: isIndo
          };
        });

        // Sort indonesian voices first
        options.sort((a, b) => {
          if (a.isIndonesian && !b.isIndonesian) return -1;
          if (!a.isIndonesian && b.isIndonesian) return 1;
          return a.name.localeCompare(b.name);
        });

        resolve(options);
      }
    };

    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    // Fallback if voices take a moment to load
    setTimeout(() => {
      loadVoices();
    }, 300);
  });
}

// Set to prevent garbage collection of active utterances in Chromium/WebKit engines
const activeUtterances = new Set<SpeechSynthesisUtterance>();

export function stopSpeaking(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // ignore
    }
    activeUtterances.clear();
  }
}

export function speakText(
  text: string,
  config: Partial<TTSConfig> = {},
  onStart?: () => void,
  onEnd?: () => void,
  onError?: (err: unknown) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      console.warn('SpeechSynthesis API not supported in this browser.');
      resolve();
      return;
    }

    const trimmedText = text?.trim();
    if (!trimmedText) {
      resolve();
      return;
    }

    try {
      // Resume if paused (Chrome bug workaround)
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }

      // If already speaking, cancel gently
      if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
        window.speechSynthesis.cancel();
      }

      // Small delay after cancel ensures Chrome clears the internal queue properly
      setTimeout(() => {
        try {
          const utterance = new SpeechSynthesisUtterance(trimmedText);
          activeUtterances.add(utterance);

          // Apply voice selection
          const voices = window.speechSynthesis.getVoices();
          if (config.voiceURI) {
            const selected = voices.find((v) => v.voiceURI === config.voiceURI);
            if (selected) {
              utterance.voice = selected;
            }
          } else {
            // Find default indonesian voice if available
            const indoVoice = voices.find(
              (v) => v.lang.toLowerCase().startsWith('id') || v.name.toLowerCase().includes('indonesia')
            );
            if (indoVoice) {
              utterance.voice = indoVoice;
            }
          }

          utterance.lang = config.lang || 'id-ID';
          utterance.rate = config.rate ?? 0.95;
          utterance.pitch = config.pitch ?? 1.0;
          utterance.volume = 1.0;

          // Safety timeout in case browser TTS hangs without firing onend/onerror
          const estimatedDurationMs = Math.max(4000, (trimmedText.length / 10) * 1000 + 5000);
          const safetyTimer = setTimeout(() => {
            if (activeUtterances.has(utterance)) {
              activeUtterances.delete(utterance);
              resolve();
            }
          }, estimatedDurationMs);

          utterance.onstart = () => {
            onStart?.();
          };

          utterance.onend = () => {
            clearTimeout(safetyTimer);
            activeUtterances.delete(utterance);
            onEnd?.();
            resolve();
          };

          utterance.onerror = (event: SpeechSynthesisErrorEvent) => {
            clearTimeout(safetyTimer);
            activeUtterances.delete(utterance);

            // 'canceled' and 'interrupted' are natural lifecycle events when playback is stopped
            if (event.error === 'canceled' || event.error === 'interrupted') {
              resolve();
              return;
            }

            console.warn(`SpeechSynthesis notice (${event.error || 'unspecified'})`);
            onError?.(event);
            resolve(); // resolve so subsequent sequence is not blocked
          };

          window.speechSynthesis.speak(utterance);
        } catch (innerErr) {
          console.warn('SpeechSynthesis invocation error:', innerErr);
          onError?.(innerErr);
          resolve();
        }
      }, 50);
    } catch (err) {
      console.warn('SpeechSynthesis initialization error:', err);
      onError?.(err);
      resolve();
    }
  });
}
