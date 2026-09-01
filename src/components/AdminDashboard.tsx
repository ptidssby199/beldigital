import React, { useState, useEffect, useRef } from 'react';
import { 
  Calendar, Volume2, Mic, Building2, Clock, 
  ShieldCheck, ArrowLeft, Plus, Edit2, 
  Trash2, Copy, Play, Square, Upload, 
  Download, RefreshCw, CheckCircle2, AlertTriangle, 
  HelpCircle, Sparkles, Sliders, Music, VolumeX, Save
} from 'lucide-react';
import { 
  AppSettings, BuiltinChimeId, CustomAudioItem, 
  RoomZone, ScheduleItem, TimeSyncConfig, TTSConfig 
} from '../types';
import { BUILTIN_CHIMES, playSynthesizedChime } from '../utils/audioSynthesizer';
import { deleteCustomAudio, saveCustomAudio } from '../utils/indexedDbAudio';
import { getAvailableVoices, speakText, stopSpeaking, TTSVoiceOption } from '../utils/speechService';
import { synchronizeNetworkTime } from '../utils/timeSync';
import { DEFAULT_PRESETS, exportFullBackupJSON, importFullBackupJSON } from '../utils/storage';
import { playAudioDataUrl } from '../utils/soundManager';

interface AdminDashboardProps {
  onBackToClock: () => void;
  schedules: ScheduleItem[];
  onSaveSchedules: (schedules: ScheduleItem[]) => void;
  rooms: RoomZone[];
  onSaveRooms: (rooms: RoomZone[]) => void;
  ttsConfig: TTSConfig;
  onSaveTTSConfig: (config: TTSConfig) => void;
  timeSyncConfig: TimeSyncConfig;
  onSaveTimeSyncConfig: (config: TimeSyncConfig) => void;
  settings: AppSettings;
  onSaveSettings: (settings: AppSettings) => void;
  customAudios: CustomAudioItem[];
  onRefreshCustomAudios: () => void;
  onOpenScheduleModal: (item?: ScheduleItem | null) => void;
  onOpenRecordModal: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onBackToClock,
  schedules,
  onSaveSchedules,
  rooms,
  onSaveRooms,
  ttsConfig,
  onSaveTTSConfig,
  timeSyncConfig,
  onSaveTimeSyncConfig,
  settings,
  onSaveSettings,
  customAudios,
  onRefreshCustomAudios,
  onOpenScheduleModal,
  onOpenRecordModal
}) => {
  const [activeTab, setActiveTab] = useState<'schedules' | 'tts' | 'sounds' | 'rooms' | 'sync' | 'security' | 'backup'>('schedules');
  
  // Schedules filters
  const [dayFilter, setDayFilter] = useState<number | 'all'>('all');
  const [roomFilter, setRoomFilter] = useState<string>('all');
  
  // Audio playback testing
  const [activePlayingId, setActivePlayingId] = useState<string | null>(null);

  // TTS settings state
  const [voices, setVoices] = useState<TTSVoiceOption[]>([]);
  const [ttsTestText, setTtsTestText] = useState('Perhatian, ini adalah pengujian suara Text-to-Speech untuk sistem bel kantor digital.');
  const [isTestingTTS, setIsTestingTTS] = useState(false);

  // Time Sync state
  const [isSyncingTime, setIsSyncingTime] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // Security PIN state
  const [currentPinInput, setCurrentPinInput] = useState('');
  const [newPinInput, setNewPinInput] = useState('');
  const [confirmPinInput, setConfirmPinInput] = useState('');
  const [pinChangeMsg, setPinChangeMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Room management state
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomDesc, setNewRoomDesc] = useState('');

  // Backup & Import
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const audioFileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    getAvailableVoices().then((v) => setVoices(v));
  }, []);

  const handleToggleSchedule = (id: string) => {
    const updated = schedules.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s));
    onSaveSchedules(updated);
  };

  const handleDeleteSchedule = (id: string) => {
    if (window.confirm('Hapus jadwal bel ini?')) {
      const updated = schedules.filter((s) => s.id !== id);
      onSaveSchedules(updated);
    }
  };

  const handleDuplicateSchedule = (item: ScheduleItem) => {
    const duplicated: ScheduleItem = {
      ...item,
      id: 'sch_' + Date.now(),
      title: `${item.title} (Salinan)`,
      enabled: true
    };
    onSaveSchedules([...schedules, duplicated]);
  };

  const handleApplyPreset = (presetId: string) => {
    const preset = DEFAULT_PRESETS.find((p) => p.id === presetId);
    if (preset) {
      if (window.confirm(`Terapkan preset "${preset.name}"? Jadwal saat ini akan diperbarui.`)) {
        onSaveSchedules(preset.schedules);
      }
    }
  };

  // Play test handlers
  const handleTestChime = async (chimeId: BuiltinChimeId) => {
    if (activePlayingId === chimeId) {
      setActivePlayingId(null);
      return;
    }
    setActivePlayingId(chimeId);
    await playSynthesizedChime(chimeId, settings.generalVolume);
    setActivePlayingId(null);
  };

  const handleTestCustomAudio = async (audio: CustomAudioItem) => {
    if (activePlayingId === audio.id) {
      setActivePlayingId(null);
      return;
    }
    setActivePlayingId(audio.id);
    await playAudioDataUrl(audio.dataUrl, settings.generalVolume);
    setActivePlayingId(null);
  };

  const handleDeleteCustomAudioItem = async (id: string) => {
    if (window.confirm('Hapus file audio ini?')) {
      await deleteCustomAudio(id);
      onRefreshCustomAudios();
    }
  };

  const handleUploadAudioFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      const newItem: CustomAudioItem = {
        id: 'aud_' + Date.now(),
        name: file.name.replace(/\.[^/.]+$/, ''),
        dataUrl,
        duration: 3, // estimated default
        fileSize: file.size,
        createdAt: new Date().toISOString(),
        type: 'upload'
      };

      await saveCustomAudio(newItem);
      onRefreshCustomAudios();
      if (audioFileInputRef.current) audioFileInputRef.current.value = '';
    };
    reader.readAsDataURL(file);
  };

  const handleTestTTS = async () => {
    if (isTestingTTS) {
      stopSpeaking();
      setIsTestingTTS(false);
      return;
    }

    setIsTestingTTS(true);
    try {
      if (ttsConfig.chimeBeforeAnnouncement) {
        await playSynthesizedChime(ttsConfig.preludeChimeId || 'airport', settings.generalVolume);
        await new Promise((r) => setTimeout(r, 400));
      }
      await speakText(ttsTestText, ttsConfig);
      if (ttsConfig.chimeAfterAnnouncement) {
        await new Promise((r) => setTimeout(r, 400));
        await playSynthesizedChime(ttsConfig.postludeChimeId || 'gentle_ding', settings.generalVolume);
      }
    } finally {
      setIsTestingTTS(false);
    }
  };

  const handleManualSyncNow = async () => {
    setIsSyncingTime(true);
    setSyncFeedback(null);
    try {
      const result = await synchronizeNetworkTime(timeSyncConfig);
      if (result.error) {
        setSyncFeedback(`Gagal: ${result.error}`);
        onSaveTimeSyncConfig({
          ...timeSyncConfig,
          status: 'failed'
        });
      } else {
        const updated: TimeSyncConfig = {
          ...timeSyncConfig,
          currentOffsetMs: result.offsetMs,
          latencyMs: result.latencyMs,
          lastSyncedAt: new Date().toISOString(),
          status: 'synced'
        };
        onSaveTimeSyncConfig(updated);
        setSyncFeedback(`Berhasil disinkronkan! Offset waktu: ${result.offsetMs} ms (Latensi: ${result.latencyMs} ms)`);
      }
    } catch (err) {
      setSyncFeedback('Terjadi kesalahan saat sinkronisasi');
    } finally {
      setIsSyncingTime(false);
    }
  };

  const handleChangePin = (e: React.FormEvent) => {
    e.preventDefault();
    setPinChangeMsg(null);

    if (currentPinInput !== settings.adminPin) {
      setPinChangeMsg({ type: 'error', text: 'PIN saat ini tidak cocok!' });
      return;
    }
    if (newPinInput.length !== 4 || !/^\d{4}$/.test(newPinInput)) {
      setPinChangeMsg({ type: 'error', text: 'PIN baru harus terdiri dari 4 digit angka!' });
      return;
    }
    if (newPinInput !== confirmPinInput) {
      setPinChangeMsg({ type: 'error', text: 'Konfirmasi PIN baru tidak sama!' });
      return;
    }

    onSaveSettings({ ...settings, adminPin: newPinInput });
    setPinChangeMsg({ type: 'success', text: 'PIN Admin berhasil diubah!' });
    setCurrentPinInput('');
    setNewPinInput('');
    setConfirmPinInput('');
  };

  const handleAddRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;

    const newRoom: RoomZone = {
      id: 'room_' + Date.now(),
      name: newRoomName.trim(),
      description: newRoomDesc.trim() || undefined
    };

    onSaveRooms([...rooms, newRoom]);
    setNewRoomName('');
    setNewRoomDesc('');
  };

  const handleDeleteRoom = (id: string) => {
    if (rooms.length <= 1) {
      alert('Harus ada setidaknya satu ruangan/zona.');
      return;
    }
    if (window.confirm('Hapus ruangan ini?')) {
      onSaveRooms(rooms.filter((r) => r.id !== id));
    }
  };

  const handleDownloadBackup = () => {
    const jsonStr = exportFullBackupJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bel_kantor_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const content = reader.result as string;
      const success = importFullBackupJSON(content);
      if (success) {
        setImportStatus('Backup berhasil dipulihkan! Memuat ulang konfigurasi...');
        setTimeout(() => window.location.reload(), 1200);
      } else {
        setImportStatus('Gagal memulihkan file backup. Format tidak sesuai.');
      }
    };
    reader.readAsText(file);
  };

  // Filtered schedules
  const filteredSchedules = schedules
    .filter((s) => {
      if (dayFilter === 'all') return true;
      return s.days.includes(dayFilter);
    })
    .filter((s) => {
      if (roomFilter === 'all') return true;
      return s.room === roomFilter;
    })
    .sort((a, b) => a.time.localeCompare(b.time));

  return (
    <div id="admin-dashboard-root" className="min-h-screen bg-[#09090b] text-[#fafafa] pb-16">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 border-b border-[#27272a] bg-[#09090b]/90 backdrop-blur-md px-4 sm:px-8 py-3.5">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              id="btn-back-to-clock"
              onClick={onBackToClock}
              className="flex items-center gap-2 rounded-xl border border-[#27272a] bg-[#18181b] px-3.5 py-2 text-xs font-semibold text-[#fafafa] hover:bg-[#27272a] hover:border-[#3f3f46] active:scale-95 transition-all"
            >
              <ArrowLeft className="h-4 w-4 text-blue-400" />
              <span>Kembali ke Jam Layar</span>
            </button>
            <div className="hidden sm:block">
              <h1 className="text-base font-bold text-[#fafafa] flex items-center gap-2">
                <span>Dashboard Admin</span>
                <span className="rounded-md bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-400 border border-blue-500/20">
                  {settings.officeName}
                </span>
              </h1>
              <p className="text-xs text-[#71717a]">Konfigurasi Jadwal Otomatis, TTS & Sistem Audio</p>
            </div>
          </div>

          {/* Header Quick Controls */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-xl border border-[#27272a] bg-[#18181b] px-3 py-1.5 text-xs text-[#fafafa]">
              <Volume2 className="h-4 w-4 text-[#71717a]" />
              <input
                type="range"
                min="0"
                max="100"
                value={settings.generalVolume}
                onChange={(e) => onSaveSettings({ ...settings, generalVolume: Number(e.target.value) })}
                className="w-20 accent-blue-500 cursor-pointer"
              />
              <span className="font-mono-num font-bold text-[#fafafa]">{settings.generalVolume}%</span>
            </div>

            <button
              onClick={() => onSaveSettings({ ...settings, muteAll: !settings.muteAll })}
              className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all ${
                settings.muteAll
                  ? 'border-red-500/40 bg-red-500/10 text-red-400'
                  : 'border-[#27272a] bg-[#18181b] text-[#fafafa] hover:bg-[#27272a]'
              }`}
            >
              {settings.muteAll ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4 text-emerald-400" />}
              <span className="hidden md:inline">{settings.muteAll ? 'Suara Senyap' : 'Audio Aktif'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-7xl px-4 sm:px-8 pt-6">
        {/* Navigation Tabs */}
        <div className="flex overflow-x-auto pb-2 border-b border-[#27272a] gap-1.5 scrollbar-none mb-6">
          {[
            { id: 'schedules', label: 'Jadwal Bel', icon: Calendar, badge: schedules.length },
            { id: 'tts', label: 'Pengumuman TTS', icon: Sparkles },
            { id: 'sounds', label: 'Suara & Rekaman', icon: Music, badge: customAudios.length },
            { id: 'rooms', label: 'Zona Ruangan', icon: Building2, badge: rooms.length },
            { id: 'sync', label: 'Sinkronisasi Waktu', icon: Clock },
            { id: 'security', label: 'PIN & Keamanan', icon: ShieldCheck },
            { id: 'backup', label: 'Backup & GitHub Pages', icon: Download }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`tab-admin-${tab.id}`}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-xs font-semibold transition-all ${
                  isActive
                    ? 'border border-blue-500/30 bg-blue-500/10 text-blue-400 shadow-sm'
                    : 'border border-transparent text-[#71717a] hover:bg-[#18181b] hover:text-[#fafafa]'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                    isActive ? 'bg-blue-600 text-white' : 'bg-[#27272a] text-[#71717a]'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* TAB 1: SCHEDULES */}
        {activeTab === 'schedules' && (
          <div className="space-y-6">
            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-[#27272a] bg-[#111114] p-4">
              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="flex items-center gap-1 text-xs text-[#71717a]">
                  <span>Hari:</span>
                  <select
                    value={dayFilter}
                    onChange={(e) => setDayFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                    className="rounded-lg border border-[#27272a] bg-[#18181b] px-2.5 py-1.5 text-xs text-[#fafafa] focus:outline-none"
                  >
                    <option value="all">Semua Hari</option>
                    <option value={1}>Senin</option>
                    <option value={2}>Selasa</option>
                    <option value={3}>Rabu</option>
                    <option value={4}>Kamis</option>
                    <option value={5}>Jumat</option>
                    <option value={6}>Sabtu</option>
                    <option value={0}>Minggu</option>
                  </select>
                </div>

                <div className="flex items-center gap-1 text-xs text-[#71717a]">
                  <span>Ruangan:</span>
                  <select
                    value={roomFilter}
                    onChange={(e) => setRoomFilter(e.target.value)}
                    className="rounded-lg border border-[#27272a] bg-[#18181b] px-2.5 py-1.5 text-xs text-[#fafafa] focus:outline-none"
                  >
                    <option value="all">Semua Ruangan</option>
                    {rooms.map((r) => (
                      <option key={r.id} value={r.name}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Preset Switcher */}
                <div className="relative group">
                  <button className="flex items-center gap-1.5 rounded-lg border border-[#27272a] bg-[#18181b] px-3 py-1.5 text-xs font-medium text-[#fafafa] hover:border-[#3f3f46]">
                    <Sliders className="h-3.5 w-3.5 text-blue-400" />
                    <span>Template Jadwal</span>
                  </button>
                  <div className="absolute left-0 top-full mt-1 hidden group-hover:block w-72 rounded-xl border border-[#27272a] bg-[#111114] p-2 shadow-2xl z-20">
                    <p className="text-[10px] uppercase font-bold text-[#71717a] px-2 py-1">Terapkan Preset:</p>
                    {DEFAULT_PRESETS.map((pr) => (
                      <button
                        key={pr.id}
                        onClick={() => handleApplyPreset(pr.id)}
                        className="w-full text-left rounded-lg p-2 text-xs text-[#fafafa] hover:bg-[#27272a] transition-colors"
                      >
                        <div className="font-semibold">{pr.name}</div>
                        <div className="text-[10px] text-[#71717a]">{pr.description}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Add schedule button */}
              <button
                id="btn-add-new-schedule"
                onClick={() => onOpenScheduleModal(null)}
                className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-blue-600/30 hover:bg-blue-500 active:scale-95 transition-all"
              >
                <Plus className="h-4 w-4" />
                <span>Tambah Jadwal Bel</span>
              </button>
            </div>

            {/* Schedules Grid / List */}
            {filteredSchedules.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredSchedules.map((sch) => {
                  const daysNames = sch.days.map((d) => ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'][d]).join(', ');
                  return (
                    <div
                      key={sch.id}
                      className={`relative flex flex-col justify-between rounded-2xl border p-5 transition-all ${
                        sch.enabled
                          ? 'border-[#27272a] bg-[#111114] shadow-lg hover:border-[#3f3f46]'
                          : 'border-[#27272a]/40 bg-[#111114]/40 opacity-60'
                      }`}
                    >
                      <div>
                        {/* Card Header: Time & Enable Switch */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2.5">
                            <span className="font-mono-num text-2xl font-bold tracking-tight text-[#fafafa]">
                              {sch.time}
                            </span>
                            <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                              sch.soundType === 'chime_tts_chime'
                                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                                : sch.soundType.includes('tts')
                                ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            }`}>
                              {sch.soundType === 'chime_tts_chime' ? '🔔 Bel + TTS + Bel' : sch.soundType === 'chime_tts' ? 'Chime + TTS' : sch.soundType === 'tts' ? 'TTS Saja' : sch.soundType === 'chime' ? 'Chime Saja' : 'Audio Kustom'}
                            </span>
                          </div>

                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={sch.enabled}
                              onChange={() => handleToggleSchedule(sch.id)}
                              className="sr-only peer"
                            />
                            <div className="w-9 h-5 bg-[#27272a] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                          </label>
                        </div>

                        {/* Title & Description */}
                        <h4 className="text-sm font-bold text-[#fafafa] line-clamp-1">{sch.title}</h4>
                        
                        {sch.ttsText && (
                          <p className="mt-1.5 text-xs text-[#a1a1aa] line-clamp-2 italic bg-[#18181b] p-2 rounded-lg border border-[#27272a]">
                            "{sch.ttsText}"
                          </p>
                        )}

                        {/* Meta Tags */}
                        <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-[#71717a]">
                          <span className="flex items-center gap-1 rounded bg-[#18181b] px-2 py-0.5 text-[#a1a1aa]">
                            <Calendar className="h-3 w-3 text-blue-400" />
                            {daysNames}
                          </span>
                          <span className="flex items-center gap-1 rounded bg-[#18181b] px-2 py-0.5 text-[#a1a1aa]">
                            <Building2 className="h-3 w-3 text-blue-400" />
                            {sch.room}
                          </span>
                          <span className="flex items-center gap-1 rounded bg-[#18181b] px-2 py-0.5 font-mono-num text-[#a1a1aa]">
                            <Volume2 className="h-3 w-3 text-[#71717a]" />
                            {sch.volume}%
                          </span>
                        </div>
                      </div>

                      {/* Card Footer Actions */}
                      <div className="mt-4 flex items-center justify-between border-t border-[#27272a] pt-3">
                        <button
                          type="button"
                          onClick={() => {
                            if (sch.chimeId) handleTestChime(sch.chimeId);
                            else if (sch.customAudioId) {
                              const aud = customAudios.find((a) => a.id === sch.customAudioId);
                              if (aud) handleTestCustomAudio(aud);
                            } else if (sch.ttsText) {
                              speakText(sch.ttsText, ttsConfig);
                            }
                          }}
                          className="flex items-center gap-1 text-xs font-semibold text-blue-400 hover:text-blue-300"
                        >
                          <Play className="h-3.5 w-3.5 fill-current" />
                          <span>Tes Suara</span>
                        </button>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            title="Duplikasi Jadwal"
                            onClick={() => handleDuplicateSchedule(sch)}
                            className="rounded-lg p-1.5 text-[#71717a] hover:bg-[#18181b] hover:text-[#fafafa] transition-colors"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            title="Edit Jadwal"
                            onClick={() => onOpenScheduleModal(sch)}
                            className="rounded-lg p-1.5 text-[#71717a] hover:bg-[#18181b] hover:text-[#fafafa] transition-colors"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            title="Hapus Jadwal"
                            onClick={() => handleDeleteSchedule(sch.id)}
                            className="rounded-lg p-1.5 text-[#71717a] hover:bg-red-500/10 hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-[#27272a] bg-[#111114] p-12 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20 mb-4">
                  <Calendar className="h-7 w-7" />
                </div>
                <h3 className="text-base font-bold text-[#fafafa]">Tidak Ada Jadwal Bel</h3>
                <p className="mt-1 text-xs text-[#71717a] max-w-sm">
                  Tidak ada jadwal yang cocok dengan filter atau daftar jadwal masih kosong. Silakan tambah jadwal baru atau gunakan template kantor.
                </p>
                <button
                  onClick={() => onOpenScheduleModal(null)}
                  className="mt-4 flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-xs font-semibold text-white hover:bg-blue-500"
                >
                  <Plus className="h-4 w-4" />
                  <span>Tambah Jadwal Pertama</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: TTS CONFIGURATION */}
        {activeTab === 'tts' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: TTS Parameters */}
            <div className="lg:col-span-2 space-y-6">
              <div className="rounded-2xl border border-[#27272a] bg-[#111114] p-6 space-y-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#fafafa]">Pengaturan Suara Text-to-Speech (TTS)</h3>
                    <p className="text-xs text-[#71717a]">Pilih suara, kecepatan pengucapan, dan nada pendahuluan</p>
                  </div>
                </div>

                {/* Voice picker */}
                <div>
                  <label className="block text-xs font-semibold text-[#a1a1aa] mb-1.5">
                    Pilihan Suara (Voice Engine)
                  </label>
                  <select
                    value={ttsConfig.voiceURI}
                    onChange={(e) => onSaveTTSConfig({ ...ttsConfig, voiceURI: e.target.value })}
                    className="w-full rounded-xl border border-[#27272a] bg-[#18181b] p-3 text-xs text-[#fafafa] focus:border-[#3f3f46] focus:outline-none"
                  >
                    <option value="">-- Suara Bahasa Indonesia Default --</option>
                    {voices.map((v) => (
                      <option key={v.voiceURI} value={v.voiceURI}>
                        {v.isIndonesian ? '🇮🇩 ' : '🌐 '} {v.name} ({v.lang})
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-[11px] text-[#71717a]">
                    Sistem otomatis mendeteksi suara Bahasa Indonesia terpasang di perangkat Anda (seperti Google Bahasa Indonesia atau Microsoft Gadis/Ardi).
                  </p>
                </div>

                {/* Rate & Pitch Sliders */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="rounded-xl border border-[#27272a] bg-[#18181b] p-4">
                    <div className="flex justify-between items-center text-xs font-semibold text-[#a1a1aa] mb-2">
                      <span>Kecepatan Bicara (Speed):</span>
                      <span className="font-mono-num text-blue-400">{ttsConfig.rate}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.6"
                      max="1.4"
                      step="0.05"
                      value={ttsConfig.rate}
                      onChange={(e) => onSaveTTSConfig({ ...ttsConfig, rate: Number(e.target.value) })}
                      className="w-full accent-blue-500 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-[#71717a] mt-1">
                      <span>Lambat (0.6x)</span>
                      <span>Normal (1.0x)</span>
                      <span>Cepat (1.4x)</span>
                    </div>
                  </div>

                  <div className="rounded-xl border border-[#27272a] bg-[#18181b] p-4">
                    <div className="flex justify-between items-center text-xs font-semibold text-[#a1a1aa] mb-2">
                      <span>Tinggi Nada (Pitch):</span>
                      <span className="font-mono-num text-blue-400">{ttsConfig.pitch}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.7"
                      max="1.3"
                      step="0.05"
                      value={ttsConfig.pitch}
                      onChange={(e) => onSaveTTSConfig({ ...ttsConfig, pitch: Number(e.target.value) })}
                      className="w-full accent-blue-500 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-[#71717a] mt-1">
                      <span>Berat (0.7x)</span>
                      <span>Alami (1.0x)</span>
                      <span>Tinggi (1.3x)</span>
                    </div>
                  </div>
                </div>

                {/* Prelude Chime Toggle */}
                <div className="rounded-xl border border-[#27272a] bg-[#18181b] p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-[#fafafa]">Bunyikan Chime Sebelum Pengumuman (Pembuka)</div>
                      <div className="text-[11px] text-[#71717a]">Memberikan sinyal nada pembuka agar audiens memperhatikan</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={ttsConfig.chimeBeforeAnnouncement}
                        onChange={(e) => onSaveTTSConfig({ ...ttsConfig, chimeBeforeAnnouncement: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5 bg-[#27272a] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  {ttsConfig.chimeBeforeAnnouncement && (
                    <div className="pt-2 border-t border-[#27272a]">
                      <label className="block text-xs font-medium text-[#a1a1aa] mb-1">
                        Pilihan Nada Pembuka:
                      </label>
                      <select
                        value={ttsConfig.preludeChimeId}
                        onChange={(e) => onSaveTTSConfig({ ...ttsConfig, preludeChimeId: e.target.value as BuiltinChimeId })}
                        className="w-full rounded-lg border border-[#27272a] bg-[#111114] px-3 py-2 text-xs text-[#fafafa]"
                      >
                        {BUILTIN_CHIMES.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({c.duration})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Postlude Chime Toggle (Bel Penutup) */}
                <div className="rounded-xl border border-[#27272a] bg-[#18181b] p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-[#fafafa]">Bunyikan Chime Setelah Pengumuman (Penutup)</div>
                      <div className="text-[11px] text-[#71717a]">Menutup pengumuman suara dengan nada akhir (Format: Bel + TTS + Bel)</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={ttsConfig.chimeAfterAnnouncement}
                        onChange={(e) => onSaveTTSConfig({ ...ttsConfig, chimeAfterAnnouncement: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5 bg-[#27272a] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-600"></div>
                    </label>
                  </div>

                  {ttsConfig.chimeAfterAnnouncement && (
                    <div className="pt-2 border-t border-[#27272a]">
                      <label className="block text-xs font-medium text-amber-400 mb-1">
                        Pilihan Nada Penutup:
                      </label>
                      <select
                        value={ttsConfig.postludeChimeId}
                        onChange={(e) => onSaveTTSConfig({ ...ttsConfig, postludeChimeId: e.target.value as BuiltinChimeId })}
                        className="w-full rounded-lg border border-[#27272a] bg-[#111114] px-3 py-2 text-xs text-[#fafafa]"
                      >
                        {BUILTIN_CHIMES.map((c) => (
                          <option key={`post-${c.id}`} value={c.id}>
                            {c.name} ({c.duration})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Test TTS Box */}
                <div className="pt-2 space-y-2">
                  <label className="block text-xs font-semibold text-[#a1a1aa]">
                    Uji Coba Teks TTS Langsung
                  </label>
                  <textarea
                    rows={3}
                    value={ttsTestText}
                    onChange={(e) => setTtsTestText(e.target.value)}
                    className="w-full rounded-xl border border-[#27272a] bg-[#18181b] p-3 text-xs text-[#fafafa] placeholder-[#71717a] focus:border-[#3f3f46] focus:outline-none"
                  />
                  <div className="flex justify-end">
                    <button
                      id="btn-test-tts-speech"
                      type="button"
                      onClick={handleTestTTS}
                      className="flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-purple-600/30 hover:bg-purple-500 active:scale-95 transition-all"
                    >
                      {isTestingTTS ? <Square className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current" />}
                      <span>{isTestingTTS ? 'Hentikan Suara' : 'Uji Dengarkan Suara'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Office Announcement Recommendations */}
            <div className="space-y-4">
              <div className="rounded-2xl border border-[#27272a] bg-[#111114] p-5">
                <h4 className="text-sm font-bold text-[#fafafa] mb-2 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-purple-400" />
                  <span>Tips Pengumuman Jernih</span>
                </h4>
                <ul className="text-xs text-[#71717a] space-y-2 list-disc list-inside">
                  <li>Gunakan tanda titik (.) untuk jeda antar kalimat agar suara pembaca terdengar natural.</li>
                  <li>Gunakan kecepatan <strong className="text-[#fafafa]">0.90x - 0.95x</strong> untuk kejernihan suara di ruangan luas atau bergaung.</li>
                  <li>Aktifkan nada pembuka (chime) agar perhatian karyawan tertuju sebelum pengumuman dimulai.</li>
                  <li>Fitur TTS sepenuhnya berjalan lokal di browser tanpa biaya API dan berfungsi offline.</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: SOUNDS & CUSTOM AUDIO */}
        {activeTab === 'sounds' && (
          <div className="space-y-6">
            {/* Builtin Chimes Section */}
            <div className="rounded-2xl border border-[#27272a] bg-[#111114] p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    <Music className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#fafafa]">Koleksi Nada Chime Bawaan (Synthesizer HD)</h3>
                    <p className="text-xs text-[#71717a]">Nada sintetis Web Audio API tanpa latensi & kualitas studio</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {BUILTIN_CHIMES.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between rounded-xl border border-[#27272a] bg-[#18181b] p-3.5 hover:border-[#3f3f46] transition-all"
                  >
                    <div>
                      <div className="text-xs font-bold text-[#fafafa]">{c.name}</div>
                      <div className="text-[11px] text-[#71717a] mt-0.5">{c.description}</div>
                      <span className="inline-block mt-1 text-[10px] font-mono-num text-blue-400 bg-blue-500/10 px-1.5 py-0.2 rounded border border-blue-500/20">
                        {c.duration}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleTestChime(c.id)}
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition-all ${
                        activePlayingId === c.id
                          ? 'border-blue-500 bg-blue-600 text-white animate-pulse'
                          : 'border-[#27272a] bg-[#111114] text-[#fafafa] hover:border-blue-500 hover:text-white'
                      }`}
                    >
                      {activePlayingId === c.id ? <Square className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current" />}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Custom Audio & Recordings Section */}
            <div className="rounded-2xl border border-[#27272a] bg-[#111114] p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 text-red-400 border border-red-500/20">
                    <Mic className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#fafafa]">Audio & Rekaman Kustom</h3>
                    <p className="text-xs text-[#71717a]">Unggah file audio MP3/WAV atau rekam suara langsung dari mikrofon</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={onOpenRecordModal}
                    className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-red-600/30 hover:bg-red-500 transition-all"
                  >
                    <Mic className="h-4 w-4" />
                    <span>Rekam Suara Mic</span>
                  </button>

                  <label className="flex items-center gap-2 rounded-xl border border-[#27272a] bg-[#18181b] px-4 py-2 text-xs font-semibold text-[#fafafa] hover:bg-[#27272a] cursor-pointer transition-all">
                    <Upload className="h-4 w-4" />
                    <span>Unggah File Audio</span>
                    <input
                      ref={audioFileInputRef}
                      type="file"
                      accept="audio/*"
                      onChange={handleUploadAudioFile}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {customAudios.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {customAudios.map((aud) => (
                    <div
                      key={aud.id}
                      className="flex items-center justify-between rounded-xl border border-[#27272a] bg-[#18181b] p-3.5"
                    >
                      <div className="truncate pr-2">
                        <div className="text-xs font-bold text-[#fafafa] truncate">{aud.name}</div>
                        <div className="text-[10px] text-[#71717a] mt-0.5">
                          {aud.type === 'mic_record' ? '🎙️ Rekaman Mikrofon' : '📁 File Upload'} • {(aud.fileSize / 1024).toFixed(0)} KB
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleTestCustomAudio(aud)}
                          className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-all ${
                            activePlayingId === aud.id
                              ? 'border-blue-500 bg-blue-600 text-white animate-pulse'
                              : 'border-[#27272a] bg-[#111114] text-[#fafafa] hover:text-white'
                          }`}
                        >
                          <Play className="h-3.5 w-3.5 fill-current" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCustomAudioItem(aud.id)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-[#71717a] hover:bg-red-500/10 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-[#27272a] p-8 text-center">
                  <p className="text-xs text-[#71717a]">Belum ada file audio atau rekaman suara kustom tersimpan.</p>
                  <p className="text-[11px] text-[#71717a]/80 mt-1">Gunakan tombol di atas untuk merekam suara langsung atau mengunggah jingle kantor.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: ROOMS & ZONES */}
        {activeTab === 'rooms' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Add New Room */}
            <div className="rounded-2xl border border-[#27272a] bg-[#111114] p-6">
              <h3 className="text-base font-bold text-[#fafafa] mb-1 flex items-center gap-2">
                <Building2 className="h-5 w-5 text-blue-400" />
                <span>Tambah Zona Ruangan</span>
              </h3>
              <p className="text-xs text-[#71717a] mb-4">Buat target ruangan untuk membedakan bel atau pengumuman</p>

              <form onSubmit={handleAddRoom} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-[#a1a1aa] mb-1">
                    Nama Ruangan *
                  </label>
                  <input
                    type="text"
                    required
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    placeholder="Contoh: Lantai 2 / Ruang Produksi"
                    className="w-full rounded-xl border border-[#27272a] bg-[#18181b] px-3 py-2 text-xs text-[#fafafa] placeholder-[#71717a] focus:border-[#3f3f46] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#a1a1aa] mb-1">
                    Keterangan (Opsional)
                  </label>
                  <input
                    type="text"
                    value={newRoomDesc}
                    onChange={(e) => setNewRoomDesc(e.target.value)}
                    placeholder="Contoh: Khusus divisi teknis dan developer"
                    className="w-full rounded-xl border border-[#27272a] bg-[#18181b] px-3 py-2 text-xs text-[#fafafa] placeholder-[#71717a] focus:border-[#3f3f46] focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-xs font-semibold text-white hover:bg-blue-500 transition-all"
                >
                  <Plus className="h-4 w-4" />
                  <span>Tambah Ruangan</span>
                </button>
              </form>
            </div>

            {/* Right: Room list */}
            <div className="lg:col-span-2 space-y-3">
              <h3 className="text-sm font-bold text-[#a1a1aa]">Daftar Ruangan & Zona Aktif ({rooms.length})</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {rooms.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between rounded-xl border border-[#27272a] bg-[#111114] p-4"
                  >
                    <div>
                      <div className="text-xs font-bold text-[#fafafa] flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5 text-blue-400" />
                        <span>{r.name}</span>
                        {r.isDefault && (
                          <span className="rounded bg-blue-500/10 text-blue-400 text-[10px] px-1.5 py-0.2 border border-blue-500/20">
                            Utama
                          </span>
                        )}
                      </div>
                      {r.description && <div className="text-[11px] text-[#71717a] mt-1">{r.description}</div>}
                    </div>

                    {!r.isDefault && (
                      <button
                        onClick={() => handleDeleteRoom(r.id)}
                        className="rounded-lg p-2 text-[#71717a] hover:bg-red-500/10 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: TIME SYNCHRONIZATION */}
        {activeTab === 'sync' && (
          <div className="max-w-3xl space-y-6">
            <div className="rounded-2xl border border-[#27272a] bg-[#111114] p-6 space-y-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#fafafa]">Sinkronisasi Waktu Jam Kantor</h3>
                  <p className="text-xs text-[#71717a]">
                    Memastikan seluruh perangkat display klien berbunyi pada detik yang 100% presisi dan seragam
                  </p>
                </div>
              </div>

              {/* Status card */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-xl border border-[#27272a] bg-[#18181b] p-4">
                  <div className="text-[11px] font-semibold text-[#71717a] uppercase tracking-wider">Status Sinkronisasi</div>
                  <div className="mt-1 flex items-center gap-1.5 text-sm font-bold text-emerald-400">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>{timeSyncConfig.status === 'synced' ? 'Tersinkron Presisi' : 'Jam Sistem Standar'}</span>
                  </div>
                </div>

                <div className="rounded-xl border border-[#27272a] bg-[#18181b] p-4">
                  <div className="text-[11px] font-semibold text-[#71717a] uppercase tracking-wider">Koreksi Offset Waktu</div>
                  <div className="mt-1 font-mono-num text-sm font-bold text-sky-400">
                    {timeSyncConfig.currentOffsetMs >= 0 ? `+${timeSyncConfig.currentOffsetMs}` : timeSyncConfig.currentOffsetMs} ms
                  </div>
                </div>

                <div className="rounded-xl border border-[#27272a] bg-[#18181b] p-4">
                  <div className="text-[11px] font-semibold text-[#71717a] uppercase tracking-wider">Latensi Jaringan</div>
                  <div className="mt-1 font-mono-num text-sm font-bold text-[#fafafa]">
                    {timeSyncConfig.latencyMs || 0} ms
                  </div>
                </div>
              </div>

              {/* Sync Button */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2">
                <button
                  id="btn-sync-time-now"
                  type="button"
                  disabled={isSyncingTime}
                  onClick={handleManualSyncNow}
                  className="flex items-center gap-2 rounded-xl bg-sky-600 px-6 py-2.5 text-xs font-semibold text-white shadow-lg shadow-sky-600/30 hover:bg-sky-500 disabled:opacity-50 active:scale-95 transition-all"
                >
                  <RefreshCw className={`h-4 w-4 ${isSyncingTime ? 'animate-spin' : ''}`} />
                  <span>{isSyncingTime ? 'Menghubungi Server Waktu...' : 'Sinkronkan Waktu Sekarang (NTP)'}</span>
                </button>

                <span className="text-[11px] text-[#71717a]">
                  Terakhir disinkronkan: {timeSyncConfig.lastSyncedAt ? new Date(timeSyncConfig.lastSyncedAt).toLocaleTimeString('id-ID') : 'Belum pernah'}
                </span>
              </div>

              {syncFeedback && (
                <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 p-3 text-xs text-sky-300">
                  {syncFeedback}
                </div>
              )}

              {/* Manual offset adjustment */}
              <div className="pt-4 border-t border-[#27272a] space-y-3">
                <label className="block text-xs font-semibold text-[#a1a1aa]">
                  Kalibrasi Manual (Jika jam perangkat lokal berbeda dengan jam dinding kantor)
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onSaveTimeSyncConfig({ ...timeSyncConfig, manualOffsetMs: timeSyncConfig.manualOffsetMs - 1000 })}
                    className="rounded-lg border border-[#27272a] bg-[#18181b] px-3 py-1.5 text-xs font-mono-num text-[#fafafa] hover:bg-[#27272a]"
                  >
                    -1 Detik
                  </button>
                  <button
                    type="button"
                    onClick={() => onSaveTimeSyncConfig({ ...timeSyncConfig, manualOffsetMs: timeSyncConfig.manualOffsetMs + 1000 })}
                    className="rounded-lg border border-[#27272a] bg-[#18181b] px-3 py-1.5 text-xs font-mono-num text-[#fafafa] hover:bg-[#27272a]"
                  >
                    +1 Detik
                  </button>
                  <button
                    type="button"
                    onClick={() => onSaveTimeSyncConfig({ ...timeSyncConfig, manualOffsetMs: 0 })}
                    className="rounded-lg border border-[#27272a] bg-[#18181b] px-3 py-1.5 text-xs text-[#71717a] hover:bg-[#27272a] hover:text-[#fafafa]"
                  >
                    Reset Kalibrasi
                  </button>
                  <span className="text-xs text-[#71717a] ml-2">
                    Offset Manual Aktif: <strong className="font-mono-num text-[#fafafa]">{timeSyncConfig.manualOffsetMs / 1000}s</strong>
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: SECURITY & PIN */}
        {activeTab === 'security' && (
          <div className="max-w-xl space-y-6">
            <div className="rounded-2xl border border-[#27272a] bg-[#111114] p-6 space-y-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#fafafa]">Ganti PIN Keamanan Admin</h3>
                  <p className="text-xs text-[#71717a]">PIN 4-digit diperlukan saat masuk ke dashboard admin</p>
                </div>
              </div>

              {pinChangeMsg && (
                <div className={`rounded-xl border p-3 text-xs ${
                  pinChangeMsg.type === 'success'
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                    : 'border-red-500/40 bg-red-500/10 text-red-300'
                }`}>
                  {pinChangeMsg.text}
                </div>
              )}

              <form onSubmit={handleChangePin} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#a1a1aa] mb-1">
                    PIN Saat Ini *
                  </label>
                  <input
                    type="password"
                    maxLength={4}
                    required
                    value={currentPinInput}
                    onChange={(e) => setCurrentPinInput(e.target.value)}
                    placeholder="Masukkan 4 digit PIN lama"
                    className="w-full rounded-xl border border-[#27272a] bg-[#18181b] px-3.5 py-2.5 text-sm text-[#fafafa] placeholder-[#71717a] focus:border-[#3f3f46] focus:outline-none font-mono-num"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#a1a1aa] mb-1">
                      PIN Baru (4 Digit) *
                    </label>
                    <input
                      type="password"
                      maxLength={4}
                      required
                      value={newPinInput}
                      onChange={(e) => setNewPinInput(e.target.value)}
                      placeholder="Contoh: 5678"
                      className="w-full rounded-xl border border-[#27272a] bg-[#18181b] px-3.5 py-2.5 text-sm text-[#fafafa] placeholder-[#71717a] focus:border-[#3f3f46] focus:outline-none font-mono-num"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#a1a1aa] mb-1">
                      Konfirmasi PIN Baru *
                    </label>
                    <input
                      type="password"
                      maxLength={4}
                      required
                      value={confirmPinInput}
                      onChange={(e) => setConfirmPinInput(e.target.value)}
                      placeholder="Ulangi 4 digit PIN baru"
                      className="w-full rounded-xl border border-[#27272a] bg-[#18181b] px-3.5 py-2.5 text-sm text-[#fafafa] placeholder-[#71717a] focus:border-[#3f3f46] focus:outline-none font-mono-num"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-amber-600 py-3 text-xs font-semibold text-white shadow-lg shadow-amber-600/30 hover:bg-amber-500 transition-all"
                >
                  <Save className="h-4 w-4" />
                  <span>Simpan PIN Keamanan Baru</span>
                </button>
              </form>
            </div>

            {/* Office Branding */}
            <div className="rounded-2xl border border-[#27272a] bg-[#111114] p-6 space-y-4">
              <h3 className="text-sm font-bold text-[#fafafa]">Identitas Kantor & Nama Aplikasi</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-[#a1a1aa] mb-1">
                    Nama Kantor / Instansi
                  </label>
                  <input
                    type="text"
                    value={settings.officeName}
                    onChange={(e) => onSaveSettings({ ...settings, officeName: e.target.value })}
                    className="w-full rounded-xl border border-[#27272a] bg-[#18181b] px-3.5 py-2.5 text-xs text-[#fafafa] focus:border-[#3f3f46] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#a1a1aa] mb-1">
                    Subjudul / Slogan
                  </label>
                  <input
                    type="text"
                    value={settings.subtitle}
                    onChange={(e) => onSaveSettings({ ...settings, subtitle: e.target.value })}
                    className="w-full rounded-xl border border-[#27272a] bg-[#18181b] px-3.5 py-2.5 text-xs text-[#fafafa] focus:border-[#3f3f46] focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 7: BACKUP & GITHUB PAGES EXPORT */}
        {activeTab === 'backup' && (
          <div className="max-w-3xl space-y-6">
            <div className="rounded-2xl border border-[#27272a] bg-[#111114] p-6 space-y-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Download className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#fafafa]">Backup & Pemulihan Data</h3>
                  <p className="text-xs text-[#71717a]">Unduh seluruh konfigurasi jadwal, suara, dan pengaturan ke file JSON</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  id="btn-download-backup-json"
                  onClick={handleDownloadBackup}
                  className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-emerald-600/30 hover:bg-emerald-500 transition-all"
                >
                  <Download className="h-4 w-4" />
                  <span>Download Backup JSON</span>
                </button>

                <label className="flex items-center gap-2 rounded-xl border border-[#27272a] bg-[#18181b] px-5 py-2.5 text-xs font-semibold text-[#fafafa] hover:bg-[#27272a] cursor-pointer transition-all">
                  <Upload className="h-4 w-4" />
                  <span>Restore / Upload File Backup</span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json,application/json"
                    onChange={handleImportBackup}
                    className="hidden"
                  />
                </label>
              </div>

              {importStatus && (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300">
                  {importStatus}
                </div>
              )}
            </div>

            {/* GitHub Pages Deployment Guide */}
            <div className="rounded-2xl border border-[#27272a] bg-[#111114] p-6 space-y-4">
              <h3 className="text-base font-bold text-[#fafafa] flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-blue-400" />
                <span>Panduan Deploy ke GitHub Pages (100% Gratis)</span>
              </h3>
              <p className="text-xs text-[#71717a]">
                Aplikasi ini dibangun menggunakan arsitektur Single Page Application (SPA) client-side murni dengan sintesis Web Audio API & TTS native, sehingga 100% siap dihosting langsung di GitHub Pages tanpa backend server!
              </p>

              <div className="rounded-xl bg-[#09090b] p-4 font-mono text-xs text-[#a1a1aa] space-y-2 border border-[#27272a]">
                <div className="text-[#71717a] font-sans font-semibold">Langkah Deploy ke GitHub Pages:</div>
                <p>1. Inisialisasi git repository di folder ini:</p>
                <code className="text-blue-300 block bg-[#18181b] p-2 rounded">git init && git add . && git commit -m "Deploy Bel Kantor Digital"</code>
                <p>2. Buat repository baru di GitHub dan hubungkan:</p>
                <code className="text-blue-300 block bg-[#18181b] p-2 rounded">git remote add origin https://github.com/USERNAME/bel-kantor-digital.git</code>
                <p>3. Build file statis untuk GitHub Pages:</p>
                <code className="text-blue-300 block bg-[#18181b] p-2 rounded">npm run build</code>
                <p>4. Buka tab <strong>Settings</strong> di repository GitHub &gt; <strong>Pages</strong> &gt; pilih source <strong>GitHub Actions</strong> atau branch <strong>gh-pages / dist</strong>.</p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
