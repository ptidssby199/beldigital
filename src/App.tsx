import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  AppSettings, CustomAudioItem, RoomZone, 
  ScheduleItem, TimeSyncConfig, TTSConfig 
} from './types';
import { 
  loadStoredRooms, loadStoredSchedules, loadStoredSettings, 
  loadStoredTimeSync, loadStoredTTSConfig, saveStoredRooms, 
  saveStoredSchedules, saveStoredSettings, saveStoredTimeSync, 
  saveStoredTTSConfig 
} from './utils/storage';
import { getAllCustomAudios } from './utils/indexedDbAudio';
import { 
  executeScheduleSound, subscribeToPlayState 
} from './utils/soundManager';
import { getSynchronizedDate, synchronizeNetworkTime } from './utils/timeSync';
import { unlockAudio } from './utils/audioSynthesizer';
import { createBackgroundInterval } from './utils/backgroundTimer';
import { ClockDisplay } from './components/ClockDisplay';
import { AdminDashboard } from './components/AdminDashboard';
import { PinModal } from './components/PinModal';
import { ScheduleModal } from './components/ScheduleModal';
import { AudioRecorderModal } from './components/AudioRecorderModal';
import { QuickManualAnnouncementModal } from './components/QuickManualAnnouncementModal';

export default function App() {
  // Core App State
  const [view, setView] = useState<'clock' | 'admin'>('clock');
  const [settings, setSettings] = useState<AppSettings>(() => loadStoredSettings());
  const [schedules, setSchedules] = useState<ScheduleItem[]>(() => loadStoredSchedules());
  const [rooms, setRooms] = useState<RoomZone[]>(() => loadStoredRooms());
  const [ttsConfig, setTTSConfig] = useState<TTSConfig>(() => loadStoredTTSConfig());
  const [timeSyncConfig, setTimeSyncConfig] = useState<TimeSyncConfig>(() => loadStoredTimeSync());
  const [customAudios, setCustomAudios] = useState<CustomAudioItem[]>([]);

  // Sound & Playback State
  const [isAudioUnlocked, setIsAudioUnlocked] = useState(false);
  const [isPlayingSound, setIsPlayingSound] = useState(false);
  const [currentPlayingTitle, setCurrentPlayingTitle] = useState<string | null>(null);
  const [currentPlayingRoom, setCurrentPlayingRoom] = useState<string | null>(null);

  // Modals
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [selectedScheduleForEdit, setSelectedScheduleForEdit] = useState<ScheduleItem | null>(null);
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);

  // Deduplication tracker for fired bells
  const firedBellsTrackerRef = useRef<Set<string>>(new Set());

  // Load custom audio files from IndexedDB
  const refreshCustomAudios = useCallback(async () => {
    try {
      const audios = await getAllCustomAudios();
      setCustomAudios(audios);
    } catch (err) {
      console.error('Failed to load custom audios', err);
    }
  }, []);

  useEffect(() => {
    refreshCustomAudios();
  }, [refreshCustomAudios]);

  // Subscribe to audio player state
  useEffect(() => {
    const unsubscribe = subscribeToPlayState((playing, title, room) => {
      setIsPlayingSound(playing);
      setCurrentPlayingTitle(title);
      setCurrentPlayingRoom(room);
    });
    return () => unsubscribe();
  }, []);

  // Sync network time on startup
  useEffect(() => {
    synchronizeNetworkTime(timeSyncConfig).then((res) => {
      if (!res.error) {
        const updated = {
          ...timeSyncConfig,
          currentOffsetMs: res.offsetMs,
          latencyMs: res.latencyMs,
          lastSyncedAt: new Date().toISOString(),
          status: 'synced' as const
        };
        setTimeSyncConfig(updated);
        saveStoredTimeSync(updated);
      }
    });
  }, []);

  // Periodic NTP background synchronization every 30 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      synchronizeNetworkTime(timeSyncConfig).then((res) => {
        if (!res.error) {
          setTimeSyncConfig((prev) => {
            const updated = {
              ...prev,
              currentOffsetMs: res.offsetMs,
              latencyMs: res.latencyMs,
              lastSyncedAt: new Date().toISOString(),
              status: 'synced' as const
            };
            saveStoredTimeSync(updated);
            return updated;
          });
        }
      });
    }, (timeSyncConfig.autoSyncIntervalMinutes || 30) * 60 * 1000);

    return () => clearInterval(interval);
  }, [timeSyncConfig]);

  // Main Bell Automation Engine: Runs reliably in foreground and background (Web Worker)
  useEffect(() => {
    const stopScheduler = createBackgroundInterval(() => {
      const synDate = getSynchronizedDate(timeSyncConfig);
      const dayOfWeek = synDate.getDay(); // 0-6
      const hours = synDate.getHours().toString().padStart(2, '0');
      const minutes = synDate.getMinutes().toString().padStart(2, '0');
      const seconds = synDate.getSeconds();
      const currentHM = `${hours}:${minutes}`;
      const dateKey = `${synDate.getFullYear()}-${synDate.getMonth()}-${synDate.getDate()}`;

      // Check each enabled schedule
      schedules.forEach((sch) => {
        if (!sch.enabled) return;
        if (!sch.days.includes(dayOfWeek)) return;
        if (sch.time !== currentHM) return;

        const bellEventKey = `${dateKey}_${sch.id}_${currentHM}`;

        if (!firedBellsTrackerRef.current.has(bellEventKey)) {
          // Trigger the bell
          firedBellsTrackerRef.current.add(bellEventKey);
          console.log(`[BEL TRIGGERED] ${sch.time} - ${sch.title} (Room: ${sch.room})`);

          executeScheduleSound(
            sch,
            ttsConfig,
            settings.generalVolume,
            settings.muteAll
          );
        }
      });

      // Cleanup tracker memory for old days at midnight
      if (currentHM === '00:00' && seconds === 1) {
        firedBellsTrackerRef.current.clear();
      }
    }, 800);

    return () => stopScheduler();
  }, [schedules, timeSyncConfig, ttsConfig, settings.generalVolume, settings.muteAll]);

  // State update helpers with localStorage persistence
  const handleSaveSchedules = (newSchedules: ScheduleItem[]) => {
    setSchedules(newSchedules);
    saveStoredSchedules(newSchedules);
  };

  const handleSaveSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    saveStoredSettings(newSettings);
  };

  const handleSaveRooms = (newRooms: RoomZone[]) => {
    setRooms(newRooms);
    saveStoredRooms(newRooms);
  };

  const handleSaveTTSConfig = (newTTS: TTSConfig) => {
    setTTSConfig(newTTS);
    saveStoredTTSConfig(newTTS);
  };

  const handleSaveTimeSync = (newSync: TimeSyncConfig) => {
    setTimeSyncConfig(newSync);
    saveStoredTimeSync(newSync);
  };

  const handleUnlockAudio = async () => {
    await unlockAudio();
    setIsAudioUnlocked(true);
  };

  const handleOpenScheduleModal = (item?: ScheduleItem | null) => {
    setSelectedScheduleForEdit(item || null);
    setIsScheduleModalOpen(true);
  };

  const handleSaveScheduleItem = (savedItem: ScheduleItem) => {
    const exists = schedules.some((s) => s.id === savedItem.id);
    if (exists) {
      handleSaveSchedules(schedules.map((s) => (s.id === savedItem.id ? savedItem : s)));
    } else {
      handleSaveSchedules([...schedules, savedItem]);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-slate-100 antialiased selection:bg-indigo-500 selection:text-white">
      {/* Primary Views */}
      {view === 'clock' ? (
        <ClockDisplay
          settings={settings}
          schedules={schedules}
          timeSyncConfig={timeSyncConfig}
          ttsConfig={ttsConfig}
          rooms={rooms}
          onOpenPinModal={() => setIsPinModalOpen(true)}
          onOpenManualModal={() => setIsManualModalOpen(true)}
          onToggleMute={() => handleSaveSettings({ ...settings, muteAll: !settings.muteAll })}
          onUnlockAudio={handleUnlockAudio}
          isAudioUnlocked={isAudioUnlocked}
          isPlayingSound={isPlayingSound}
          currentPlayingTitle={currentPlayingTitle}
          currentPlayingRoom={currentPlayingRoom}
        />
      ) : (
        <AdminDashboard
          onBackToClock={() => setView('clock')}
          schedules={schedules}
          onSaveSchedules={handleSaveSchedules}
          rooms={rooms}
          onSaveRooms={handleSaveRooms}
          ttsConfig={ttsConfig}
          onSaveTTSConfig={handleSaveTTSConfig}
          timeSyncConfig={timeSyncConfig}
          onSaveTimeSyncConfig={handleSaveTimeSync}
          settings={settings}
          onSaveSettings={handleSaveSettings}
          customAudios={customAudios}
          onRefreshCustomAudios={refreshCustomAudios}
          onOpenScheduleModal={handleOpenScheduleModal}
          onOpenRecordModal={() => setIsRecordModalOpen(true)}
        />
      )}

      {/* 4-Digit PIN Security Modal */}
      <PinModal
        isOpen={isPinModalOpen}
        onClose={() => setIsPinModalOpen(false)}
        onSuccess={() => {
          setIsPinModalOpen(false);
          setView('admin');
        }}
        correctPin={settings.adminPin || '1234'}
      />

      {/* Schedule Create / Edit Modal */}
      <ScheduleModal
        isOpen={isScheduleModalOpen}
        onClose={() => {
          setIsScheduleModalOpen(false);
          setSelectedScheduleForEdit(null);
        }}
        onSave={handleSaveScheduleItem}
        initialItem={selectedScheduleForEdit}
        rooms={rooms}
        customAudios={customAudios}
        ttsConfig={ttsConfig}
        onOpenRecordModal={() => setIsRecordModalOpen(true)}
      />

      {/* Live Mic Audio Recording Modal */}
      <AudioRecorderModal
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        onSaved={async () => {
          await refreshCustomAudios();
        }}
      />

      {/* Quick Instant Broadcast / Panggilan Spontan Modal */}
      <QuickManualAnnouncementModal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        rooms={rooms}
        ttsConfig={ttsConfig}
        generalVolume={settings.generalVolume}
      />
    </div>
  );
}
