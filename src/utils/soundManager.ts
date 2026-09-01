import { BuiltinChimeId, CustomAudioItem, ScheduleItem, TTSConfig } from '../types';
import { playSynthesizedChime, unlockAudio } from './audioSynthesizer';
import { getCustomAudioById } from './indexedDbAudio';
import { speakText, stopSpeaking } from './speechService';

let activeAudioElement: HTMLAudioElement | null = null;
let isCurrentlyPlaying = false;
let currentPlayingTitle: string | null = null;
let currentPlayingRoom: string | null = null;

export interface PlayStateListener {
  (isPlaying: boolean, title: string | null, room: string | null): void;
}

const listeners: Set<PlayStateListener> = new Set();

export function subscribeToPlayState(listener: PlayStateListener): () => void {
  listeners.add(listener);
  listener(isCurrentlyPlaying, currentPlayingTitle, currentPlayingRoom);
  return () => {
    listeners.delete(listener);
  };
}

function notifyState(isPlaying: boolean, title: string | null = null, room: string | null = null) {
  isCurrentlyPlaying = isPlaying;
  currentPlayingTitle = title;
  currentPlayingRoom = room;
  listeners.forEach((fn) => fn(isPlaying, title, room));
}

export function stopAllPlayback(): void {
  if (activeAudioElement) {
    activeAudioElement.pause();
    activeAudioElement.currentTime = 0;
    activeAudioElement = null;
  }
  stopSpeaking();
  notifyState(false, null, null);
}

export function isAudioPlaying(): boolean {
  return isCurrentlyPlaying;
}

export async function executeScheduleSound(
  item: ScheduleItem,
  ttsConfig: TTSConfig,
  generalVolume = 100,
  muteAll = false
): Promise<void> {
  if (muteAll) {
    console.log('Playback cancelled: Mute is active');
    return;
  }

  await unlockAudio();
  const effectiveVolume = Math.round(((item.volume || 100) * (generalVolume / 100)));

  notifyState(true, item.title, item.room);

  try {
    switch (item.soundType) {
      case 'chime': {
        const chimeId = item.chimeId || 'airport';
        await playSynthesizedChime(chimeId, effectiveVolume);
        break;
      }

      case 'custom': {
        if (item.customAudioId) {
          const customAudio = await getCustomAudioById(item.customAudioId);
          if (customAudio) {
            await playAudioDataUrl(customAudio.dataUrl, effectiveVolume);
          } else {
            // Fallback to chime if custom audio not found
            await playSynthesizedChime('airport', effectiveVolume);
          }
        } else {
          await playSynthesizedChime('airport', effectiveVolume);
        }
        break;
      }

      case 'tts': {
        if (item.ttsText && item.ttsText.trim().length > 0) {
          if (ttsConfig.chimeBeforeAnnouncement) {
            await playSynthesizedChime(ttsConfig.preludeChimeId || 'airport', effectiveVolume);
            await new Promise((r) => setTimeout(r, 400));
          }
          await speakText(item.ttsText, ttsConfig);
        } else {
          await playSynthesizedChime('airport', effectiveVolume);
        }
        break;
      }

      case 'chime_tts': {
        const chimeId = item.chimeId || 'airport';
        await playSynthesizedChime(chimeId, effectiveVolume);
        await new Promise((r) => setTimeout(r, 600));

        if (item.ttsText && item.ttsText.trim().length > 0) {
          await speakText(item.ttsText, ttsConfig);
        }
        break;
      }

      case 'custom_tts': {
        if (item.customAudioId) {
          const customAudio = await getCustomAudioById(item.customAudioId);
          if (customAudio) {
            await playAudioDataUrl(customAudio.dataUrl, effectiveVolume);
            await new Promise((r) => setTimeout(r, 600));
          }
        }
        if (item.ttsText && item.ttsText.trim().length > 0) {
          await speakText(item.ttsText, ttsConfig);
        }
        break;
      }
    }
  } catch (err) {
    console.error('Error during schedule playback:', err);
  } finally {
    notifyState(false, null, null);
  }
}

export function playAudioDataUrl(dataUrl: string, volumePercent = 100): Promise<void> {
  return new Promise((resolve) => {
    try {
      const audio = new Audio(dataUrl);
      activeAudioElement = audio;
      audio.volume = Math.max(0, Math.min(1.0, volumePercent / 100));

      audio.onended = () => {
        activeAudioElement = null;
        resolve();
      };

      audio.onerror = (err) => {
        console.error('Audio playback error', err);
        activeAudioElement = null;
        resolve();
      };

      audio.play().catch((err) => {
        console.error('Failed to play audio element', err);
        activeAudioElement = null;
        resolve();
      });
    } catch (err) {
      console.error('Audio initialization error', err);
      resolve();
    }
  });
}
