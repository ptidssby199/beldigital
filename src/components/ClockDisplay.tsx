import React, { useState, useEffect } from 'react';
import { 
  Lock, Volume2, VolumeX, Maximize2, Minimize2, 
  Megaphone, Bell, Clock, Building2, CheckCircle2, 
  Sparkles, Square, Play, AlertTriangle, Calendar
} from 'lucide-react';
import { AppSettings, RoomZone, ScheduleItem, TimeSyncConfig, TTSConfig } from '../types';
import { formatIndonesianDate, getSynchronizedDate } from '../utils/timeSync';
import { stopAllPlayback } from '../utils/soundManager';
import { unlockAudio } from '../utils/audioSynthesizer';

interface ClockDisplayProps {
  settings: AppSettings;
  schedules: ScheduleItem[];
  timeSyncConfig: TimeSyncConfig;
  ttsConfig: TTSConfig;
  rooms: RoomZone[];
  onOpenPinModal: () => void;
  onOpenManualModal: () => void;
  onToggleMute: () => void;
  onUnlockAudio: () => void;
  isAudioUnlocked: boolean;
  isPlayingSound: boolean;
  currentPlayingTitle: string | null;
  currentPlayingRoom: string | null;
}

export const ClockDisplay: React.FC<ClockDisplayProps> = ({
  settings,
  schedules,
  timeSyncConfig,
  onOpenPinModal,
  onOpenManualModal,
  onToggleMute,
  onUnlockAudio,
  isAudioUnlocked,
  isPlayingSound,
  currentPlayingTitle,
  currentPlayingRoom
}) => {
  const [currentDate, setCurrentDate] = useState<Date>(() => getSynchronizedDate(timeSyncConfig));
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeTabDay, setActiveTabDay] = useState<number>(() => new Date().getDay());

  // High precision timer: tick every 200ms to stay tight on the second
  useEffect(() => {
    const timer = setInterval(() => {
      const synDate = getSynchronizedDate(timeSyncConfig);
      setCurrentDate(synDate);
    }, 250);
    return () => clearInterval(timer);
  }, [timeSyncConfig]);

  const dateInfo = formatIndonesianDate(currentDate);
  const currentDayOfWeek = currentDate.getDay(); // 0-6
  const currentHourMinute = `${currentDate.getHours().toString().padStart(2, '0')}:${currentDate.getMinutes().toString().padStart(2, '0')}`;
  const currentSecondsNum = currentDate.getSeconds();

  // Find next upcoming schedule for today
  const todaysSchedules = schedules
    .filter((s) => s.enabled && s.days.includes(currentDayOfWeek))
    .sort((a, b) => a.time.localeCompare(b.time));

  const nextSchedule = todaysSchedules.find((s) => s.time > currentHourMinute) || null;

  // Calculate countdown to next schedule
  let countdownText = '';
  if (nextSchedule) {
    const [targetH, targetM] = nextSchedule.time.split(':').map(Number);
    const targetDate = new Date(currentDate);
    targetDate.setHours(targetH, targetM, 0, 0);
    const diffMs = targetDate.getTime() - currentDate.getTime();
    if (diffMs > 0) {
      const diffSecsTotal = Math.floor(diffMs / 1000);
      const hours = Math.floor(diffSecsTotal / 3600);
      const minutes = Math.floor((diffSecsTotal % 3600) / 60);
      const seconds = diffSecsTotal % 60;
      if (hours > 0) {
        countdownText = `dalam ${hours} jam ${minutes} mnt`;
      } else if (minutes > 0) {
        countdownText = `dalam ${minutes} mnt ${seconds} dtk`;
      } else {
        countdownText = `dalam ${seconds} detik!`;
      }
    }
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  return (
    <div id="clock-display-screen" className="relative flex min-h-screen flex-col justify-between bg-[#09090b] text-[#fafafa] overflow-hidden select-none p-4 sm:p-8 lg:p-10 font-sans">
      {/* Subtle Dark Ambient Gradients */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-white/[0.02] rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[500px] h-[350px] bg-blue-500/[0.015] rounded-full blur-3xl pointer-events-none" />

      {/* HEADER SECTION */}
      <header className="relative z-20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
        {/* Office Branding */}
        <div className="flex flex-col">
          <h1 className="text-xs uppercase tracking-[0.3em] text-[#71717a] font-bold">
            {settings.subtitle || 'SISTEM BEL KANTOR PRESISI'}
          </h1>
          <p className="text-xl sm:text-2xl font-medium mt-1 text-[#fafafa] tracking-tight">
            {settings.officeName || 'Grand Tower Headquarters'}
          </p>
        </div>

        {/* Status Indicators & Action Controls */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-5 self-end sm:self-auto">
          {/* Synchronized NTP Status */}
          <div className="flex flex-col items-end mr-1">
            <span className="text-[10px] uppercase tracking-widest text-[#10b981] flex items-center gap-2 font-semibold">
              <span className="w-1.5 h-1.5 bg-[#10b981] rounded-full animate-pulse"></span>
              {timeSyncConfig.status === 'synced' ? 'Synchronized' : 'Local Clock'}
            </span>
            <span className="text-xs text-[#71717a]">
              {timeSyncConfig.status === 'synced' 
                ? `NTP Stratum-1 (${timeSyncConfig.currentOffsetMs >= 0 ? '+' : ''}${timeSyncConfig.currentOffsetMs}ms)`
                : 'Sinkronisasi NTP Tersedia'}
            </span>
          </div>

          {/* Audio Permission Alert */}
          {!isAudioUnlocked && (
            <button
              id="btn-unlock-sound"
              onClick={async () => {
                await unlockAudio();
                onUnlockAudio();
              }}
              className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2 text-xs font-semibold text-amber-300 hover:bg-amber-500/20 active:scale-95 transition-all"
            >
              <AlertTriangle className="h-4 w-4" />
              <span>Aktifkan Audio</span>
            </button>
          )}

          {/* Quick Controls Pill Group */}
          <div className="flex items-center gap-1.5 bg-[#18181b] border border-[#27272a] p-1 rounded-xl">
            {/* Mute Toggle */}
            <button
              id="btn-toggle-mute"
              onClick={onToggleMute}
              className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all ${
                settings.muteAll
                  ? 'bg-red-500/20 text-red-400'
                  : 'text-[#71717a] hover:bg-[#27272a] hover:text-[#fafafa]'
              }`}
              title={settings.muteAll ? 'Suara Dibisukan' : 'Suara Aktif'}
            >
              {settings.muteAll ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>

            {/* Manual Announcement */}
            <button
              id="btn-open-manual-broadcast"
              onClick={onOpenManualModal}
              className="flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-[#71717a] hover:bg-[#27272a] hover:text-[#fafafa] transition-all"
              title="Panggilan Spontan / Darurat"
            >
              <Megaphone className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Spontan</span>
            </button>

            {/* Fullscreen TV Mode */}
            <button
              id="btn-fullscreen-toggle"
              onClick={toggleFullscreen}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[#71717a] hover:bg-[#27272a] hover:text-[#fafafa] transition-all"
              title="Layar Penuh TV"
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
          </div>

          {/* Admin Panel Button */}
          <button
            id="btn-open-admin-pin"
            onClick={onOpenPinModal}
            className="bg-[#18181b] border border-[#27272a] p-2 sm:py-2 sm:px-3.5 rounded-xl flex items-center gap-3 cursor-pointer hover:bg-[#27272a] transition-all text-[#fafafa] active:scale-95"
          >
            <div className="w-7 h-7 rounded-lg bg-[#3f3f46] flex items-center justify-center text-xs">
              <Lock className="h-3.5 w-3.5 text-[#fafafa]" />
            </div>
            <span className="text-xs sm:text-sm font-medium pr-1">Admin Panel</span>
          </button>
        </div>
      </header>

      {/* ACTIVE RINGING NOTIFICATION BANNER */}
      {isPlayingSound && (
        <div className="relative z-30 mx-auto w-full max-w-4xl mb-4">
          <div className="flex items-center justify-between rounded-2xl border border-blue-500/40 bg-[#111114] p-4 sm:p-5 shadow-2xl shadow-blue-500/10 animate-glow">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 animate-bell">
                <Bell className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded bg-blue-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-400 border border-blue-500/30">
                    SEDANG BERBUNYI
                  </span>
                  {currentPlayingRoom && (
                    <span className="text-xs text-[#71717a] flex items-center gap-1">
                      <Building2 className="h-3 w-3 text-[#71717a]" />
                      {currentPlayingRoom}
                    </span>
                  )}
                </div>
                <h3 className="text-base sm:text-lg font-bold text-[#fafafa] mt-1">
                  {currentPlayingTitle || 'Pengumuman / Bel Kantor'}
                </h3>
              </div>
            </div>

            <button
              id="btn-stop-active-playback"
              onClick={() => stopAllPlayback()}
              className="flex items-center gap-2 rounded-xl bg-red-600/90 hover:bg-red-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-red-600/20 active:scale-95 transition-all"
            >
              <Square className="h-3.5 w-3.5 fill-current" />
              <span>Hentikan Suara</span>
            </button>
          </div>
        </div>
      )}

      {/* MAIN CENTER CLOCK SECTION */}
      <main className="relative z-10 flex-grow flex flex-col justify-center items-center my-4 sm:my-8 text-center">
        <div className="relative">
          {/* Live Clock Pill Tag */}
          <div className="inline-flex items-center gap-2 bg-[#10b981]/10 text-[#10b981] px-4 py-1.5 rounded-full border border-[#10b981]/20 text-xs sm:text-sm font-semibold tracking-wider uppercase mb-3 sm:mb-4">
            <span className="w-1.5 h-1.5 bg-[#10b981] rounded-full animate-ping"></span>
            <span>LIVE CLOCK</span>
          </div>

          {/* GIANT HIGH-PRECISION DIGITAL CLOCK */}
          <div 
            className="text-[72px] sm:text-[120px] md:text-[160px] lg:text-[180px] font-mono leading-none tracking-tighter text-white font-bold opacity-90 select-none"
            style={{ textShadow: '0 0 40px rgba(255,255,255,0.08)' }}
          >
            {dateInfo.timeStr}:{dateInfo.secondsStr}
          </div>
        </div>

        {/* ELEGANT SUBTITLE DATE */}
        <div className="mt-4 sm:mt-6 text-[#71717a] text-sm sm:text-xl md:text-2xl font-light tracking-[0.2em] uppercase">
          {dateInfo.formattedDate} <span className="text-[#3f3f46]">•</span> <span className="text-[#a1a1aa] font-medium">{dateInfo.period}</span>
        </div>

        {/* Seconds Smooth Progress Bar */}
        <div className="mt-5 w-48 sm:w-72 h-1 rounded-full bg-[#18181b] overflow-hidden">
          <div
            className="h-full bg-[#3f3f46] transition-all duration-300 ease-linear rounded-full"
            style={{ width: `${((currentSecondsNum + 1) / 60) * 100}%` }}
          />
        </div>
      </main>

      {/* FOOTER 3-CARD STRUCTURE (Matches Elegant Dark Archetype) */}
      <footer className="relative z-20 grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mt-4 sm:mt-8">
        {/* CARD 1: Next Bell Sequence */}
        <div className="bg-[#111114] border border-[#27272a] rounded-2xl p-5 sm:p-6 flex flex-col justify-between gap-3 hover:border-[#3f3f46] transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                <Bell className="h-4 w-4" />
              </div>
              <span className="text-xs uppercase tracking-widest text-[#71717a] font-bold">
                Next Bell Sequence
              </span>
            </div>
            {countdownText && (
              <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
                {countdownText}
              </span>
            )}
          </div>

          <div className="flex flex-col">
            <span className="text-2xl font-semibold text-[#fafafa] font-mono-num">
              {nextSchedule ? `${nextSchedule.time}:00` : '--:--:--'}
            </span>
            <span className="text-xs text-[#71717a] truncate mt-0.5">
              {nextSchedule ? `${nextSchedule.title} (${nextSchedule.room})` : 'Semua jadwal bel hari ini telah selesai'}
            </span>
          </div>
        </div>

        {/* CARD 2: TTS Announcement Preview */}
        <div className="bg-[#111114] border border-[#27272a] rounded-2xl p-5 sm:p-6 flex flex-col justify-between gap-3 hover:border-[#3f3f46] transition-all">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 rounded-lg text-amber-400">
              <Megaphone className="h-4 w-4" />
            </div>
            <span className="text-xs uppercase tracking-widest text-[#71717a] font-bold">
              TTS Announcement
            </span>
          </div>

          <div className="flex flex-col">
            <span className="text-sm font-medium text-[#fafafa] leading-snug line-clamp-2 italic">
              {nextSchedule?.ttsText ? `"${nextSchedule.ttsText}"` : '"Sistem audio & Text-to-Speech aktif otomatis sesuai jadwal."'}
            </span>
            <span className="text-xs text-amber-400/70 mt-1 italic">
              {nextSchedule ? `${nextSchedule.title} • ${nextSchedule.time}` : 'Siap Menyiarkan'}
            </span>
          </div>
        </div>

        {/* CARD 3: Admin & Schedule Timeline Strip */}
        <div className="bg-[#111114] border border-[#27272a] rounded-2xl p-5 sm:p-6 flex flex-col justify-between gap-3 hover:border-[#3f3f46] transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#18181b] rounded-lg border border-[#27272a] text-[#71717a]">
                <Calendar className="h-4 w-4" />
              </div>
              <span className="text-xs uppercase tracking-widest text-[#71717a] font-bold">
                Jadwal Hari Ini ({todaysSchedules.length})
              </span>
            </div>
            <button 
              onClick={onOpenPinModal}
              className="text-[10px] uppercase font-bold text-[#71717a] hover:text-[#fafafa] transition-colors"
            >
              Kelola
            </button>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none">
            {todaysSchedules.length > 0 ? (
              todaysSchedules.slice(0, 4).map((item) => {
                const isPast = item.time < currentHourMinute;
                const isNext = nextSchedule?.id === item.id;
                return (
                  <div
                    key={item.id}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono-num transition-all shrink-0 ${
                      isNext
                        ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40 font-bold'
                        : isPast
                        ? 'bg-[#18181b]/50 text-[#71717a] line-through'
                        : 'bg-[#18181b] text-[#a1a1aa] border border-[#27272a]'
                    }`}
                  >
                    <span>{item.time}</span>
                  </div>
                );
              })
            ) : (
              <span className="text-xs text-[#71717a] italic">Tidak ada jadwal aktif</span>
            )}
            {todaysSchedules.length > 4 && (
              <span className="text-[10px] text-[#71717a] px-1 shrink-0">
                +{todaysSchedules.length - 4}
              </span>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
};
