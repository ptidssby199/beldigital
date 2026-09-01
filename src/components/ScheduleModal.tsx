import React, { useState, useEffect } from 'react';
import { 
  X, Bell, Volume2, Sparkles, Play, 
  Square, Calendar, Building2, MessageSquare, Check, Mic
} from 'lucide-react';
import { 
  BuiltinChimeId, CustomAudioItem, RoomZone, 
  ScheduleItem, SoundType, TTSConfig 
} from '../types';
import { BUILTIN_CHIMES, playSynthesizedChime } from '../utils/audioSynthesizer';
import { INDONESIAN_ANNOUNCEMENT_TEMPLATES, speakText, stopSpeaking } from '../utils/speechService';
import { playAudioDataUrl } from '../utils/soundManager';

interface ScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: ScheduleItem) => void;
  initialItem?: ScheduleItem | null;
  rooms: RoomZone[];
  customAudios: CustomAudioItem[];
  ttsConfig: TTSConfig;
  onOpenRecordModal: () => void;
}

const DAYS_MAP = [
  { val: 1, label: 'Senin', short: 'Sen' },
  { val: 2, label: 'Selasa', short: 'Sel' },
  { val: 3, label: 'Rabu', short: 'Rab' },
  { val: 4, label: 'Kamis', short: 'Kam' },
  { val: 5, label: 'Jumat', short: 'Jum' },
  { val: 6, label: 'Sabtu', short: 'Sab' },
  { val: 0, label: 'Minggu', short: 'Min' }
];

export const ScheduleModal: React.FC<ScheduleModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialItem,
  rooms,
  customAudios,
  ttsConfig,
  onOpenRecordModal
}) => {
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('08:00');
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [soundType, setSoundType] = useState<SoundType>('chime_tts');
  const [chimeId, setChimeId] = useState<BuiltinChimeId>('airport');
  const [customAudioId, setCustomAudioId] = useState<string>('');
  const [ttsText, setTtsText] = useState('');
  const [room, setRoom] = useState('Semua Ruangan (Broadcast)');
  const [volume, setVolume] = useState(90);
  const [enabled, setEnabled] = useState(true);
  const [isPlayingTest, setIsPlayingTest] = useState(false);

  useEffect(() => {
    if (initialItem) {
      setTitle(initialItem.title);
      setTime(initialItem.time);
      setSelectedDays(initialItem.days);
      setSoundType(initialItem.soundType);
      setChimeId(initialItem.chimeId || 'airport');
      setCustomAudioId(initialItem.customAudioId || (customAudios[0]?.id || ''));
      setTtsText(initialItem.ttsText || '');
      setRoom(initialItem.room || (rooms[0]?.name || 'Semua Ruangan (Broadcast)'));
      setVolume(initialItem.volume ?? 90);
      setEnabled(initialItem.enabled ?? true);
    } else {
      setTitle('');
      setTime('08:00');
      setSelectedDays([1, 2, 3, 4, 5]);
      setSoundType('chime_tts');
      setChimeId('airport');
      setCustomAudioId(customAudios[0]?.id || '');
      setTtsText('Perhatian kepada seluruh staf, jam kerja telah dimulai.');
      setRoom(rooms[0]?.name || 'Semua Ruangan (Broadcast)');
      setVolume(90);
      setEnabled(true);
    }
    setIsPlayingTest(false);
  }, [initialItem, isOpen]);

  const toggleDay = (dayVal: number) => {
    if (selectedDays.includes(dayVal)) {
      if (selectedDays.length > 1) {
        setSelectedDays(selectedDays.filter((d) => d !== dayVal));
      }
    } else {
      setSelectedDays([...selectedDays, dayVal].sort());
    }
  };

  const setWeekdayPreset = () => setSelectedDays([1, 2, 3, 4, 5]);
  const setAllDaysPreset = () => setSelectedDays([0, 1, 2, 3, 4, 5, 6]);

  const handleTestSound = async () => {
    if (isPlayingTest) {
      stopSpeaking();
      setIsPlayingTest(false);
      return;
    }

    setIsPlayingTest(true);
    try {
      if (soundType === 'chime' || soundType === 'chime_tts') {
        await playSynthesizedChime(chimeId, volume);
        if (soundType === 'chime_tts' && ttsText.trim()) {
          await new Promise((r) => setTimeout(r, 400));
          await speakText(ttsText, ttsConfig);
        }
      } else if (soundType === 'custom' || soundType === 'custom_tts') {
        const audio = customAudios.find((a) => a.id === customAudioId);
        if (audio) {
          await playAudioDataUrl(audio.dataUrl, volume);
          if (soundType === 'custom_tts' && ttsText.trim()) {
            await new Promise((r) => setTimeout(r, 400));
            await speakText(ttsText, ttsConfig);
          }
        } else {
          await playSynthesizedChime('airport', volume);
        }
      } else if (soundType === 'tts') {
        if (ttsConfig.chimeBeforeAnnouncement) {
          await playSynthesizedChime(ttsConfig.preludeChimeId || 'airport', volume);
          await new Promise((r) => setTimeout(r, 300));
        }
        await speakText(ttsText || 'Tes pengumuman Text to Speech', ttsConfig);
      }
    } finally {
      setIsPlayingTest(false);
    }
  };

  const handleApplyTemplate = (templateText: string, templateTitle: string) => {
    setTtsText(templateText);
    if (!title || title.trim() === '') {
      setTitle(templateTitle);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const newItem: ScheduleItem = {
      id: initialItem?.id || 'sch_' + Date.now(),
      title: title.trim(),
      time,
      days: selectedDays,
      soundType,
      chimeId: soundType.includes('chime') ? chimeId : undefined,
      customAudioId: soundType.includes('custom') ? customAudioId : undefined,
      ttsText: soundType.includes('tts') ? ttsText.trim() : undefined,
      room,
      volume,
      enabled
    };

    onSave(newItem);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div id="schedule-modal-backdrop" className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
      <div className="relative my-8 w-full max-w-2xl rounded-2xl border border-[#27272a] bg-[#111114] text-[#fafafa] shadow-2xl shadow-black/80 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#27272a] px-6 py-4 bg-[#18181b]/50">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#fafafa]">
                {initialItem ? 'Edit Jadwal Bel' : 'Tambah Jadwal Bel Otomatis'}
              </h3>
              <p className="text-xs text-[#71717a]">Atur waktu, nada bunyi, pengumuman suara, dan ruangan tujuan</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-[#71717a] hover:bg-[#18181b] hover:text-[#fafafa] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSave} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Row 1: Title & Time */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-[#a1a1aa] mb-1.5">
                Nama / Keterangan Bel *
              </label>
              <input
                id="input-schedule-title"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Contoh: Bel Masuk Kerja Pagi"
                className="w-full rounded-xl border border-[#27272a] bg-[#18181b] px-3.5 py-2.5 text-sm text-[#fafafa] placeholder-[#71717a] focus:border-[#3f3f46] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#a1a1aa] mb-1.5">
                Waktu Bunyi (24 Jam) *
              </label>
              <input
                id="input-schedule-time"
                type="time"
                required
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full rounded-xl border border-[#27272a] bg-[#18181b] px-3.5 py-2.5 text-base font-bold text-blue-400 focus:border-[#3f3f46] focus:outline-none font-mono-num"
              />
            </div>
          </div>

          {/* Row 2: Days Selector */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-[#a1a1aa]">
                Hari Beroperasi
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={setWeekdayPreset}
                  className="text-[11px] font-medium text-blue-400 hover:text-blue-300 hover:underline"
                >
                  Senin - Jumat
                </button>
                <span className="text-[#3f3f46]">|</span>
                <button
                  type="button"
                  onClick={setAllDaysPreset}
                  className="text-[11px] font-medium text-blue-400 hover:text-blue-300 hover:underline"
                >
                  Setiap Hari
                </button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {DAYS_MAP.map((day) => {
                const isSelected = selectedDays.includes(day.val);
                return (
                  <button
                    key={day.val}
                    type="button"
                    onClick={() => toggleDay(day.val)}
                    className={`flex flex-col items-center justify-center py-2.5 rounded-xl border text-xs font-semibold transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-500/20 text-[#fafafa] shadow-sm'
                        : 'border-[#27272a] bg-[#18181b] text-[#71717a] hover:border-[#3f3f46] hover:text-[#fafafa]'
                    }`}
                  >
                    <span>{day.short}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Row 3: Target Room */}
          <div>
            <label className="block text-xs font-semibold text-[#a1a1aa] mb-1.5">
              <Building2 className="inline h-3.5 w-3.5 mr-1 text-blue-400" />
              Target Ruangan / Zona
            </label>
            <select
              id="select-schedule-room"
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              className="w-full rounded-xl border border-[#27272a] bg-[#18181b] px-3.5 py-2.5 text-sm text-[#fafafa] focus:border-[#3f3f46] focus:outline-none"
            >
              {rooms.map((r) => (
                <option key={r.id} value={r.name}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          {/* Row 4: Sound Type Picker */}
          <div>
            <label className="block text-xs font-semibold text-[#a1a1aa] mb-2">
              Jenis Suara & Pengumuman
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { id: 'chime_tts', label: 'Nada + Pengumuman TTS', desc: 'Chime diikuti suara pembaca' },
                { id: 'chime', label: 'Nada Bel Saja', desc: 'Chime nada klasik kantor' },
                { id: 'tts', label: 'Pengumuman TTS Saja', desc: 'Membacakan teks pengumuman' },
                { id: 'custom', label: 'Audio / Rekaman Kustom', desc: 'File rekaman kustom' },
                { id: 'custom_tts', label: 'Audio Kustom + TTS', desc: 'Audio kustom lalu TTS' }
              ].map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setSoundType(st.id as SoundType)}
                  className={`flex flex-col text-left p-2.5 rounded-xl border transition-all ${
                    soundType === st.id
                      ? 'border-blue-500 bg-blue-500/15 text-[#fafafa] ring-1 ring-blue-500'
                      : 'border-[#27272a] bg-[#18181b] text-[#71717a] hover:border-[#3f3f46] hover:text-[#fafafa]'
                  }`}
                >
                  <span className="text-xs font-bold text-[#fafafa]">{st.label}</span>
                  <span className="text-[10px] text-[#71717a] mt-0.5">{st.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Sound Details Config */}
          <div className="rounded-xl border border-[#27272a] bg-[#18181b] p-4 space-y-4">
            {/* Chime selection */}
            {(soundType === 'chime' || soundType === 'chime_tts') && (
              <div>
                <label className="block text-xs font-semibold text-[#a1a1aa] mb-1.5">
                  Pilih Nada Bel (Chime)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {BUILTIN_CHIMES.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setChimeId(c.id)}
                      className={`flex items-center justify-between p-2.5 rounded-xl border text-xs text-left transition-all ${
                        chimeId === c.id
                          ? 'border-blue-500 bg-blue-500/20 text-[#fafafa] font-semibold'
                          : 'border-[#27272a] bg-[#111114] text-[#a1a1aa] hover:border-[#3f3f46] hover:text-[#fafafa]'
                      }`}
                    >
                      <div>
                        <div className="font-medium text-[#fafafa]">{c.name}</div>
                        <div className="text-[10px] text-[#71717a]">{c.duration} • {c.category}</div>
                      </div>
                      {chimeId === c.id && <Check className="h-4 w-4 text-blue-400" />}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Custom Audio selection */}
            {(soundType === 'custom' || soundType === 'custom_tts') && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-[#a1a1aa]">
                    Pilih File / Rekaman Audio
                  </label>
                  <button
                    type="button"
                    onClick={onOpenRecordModal}
                    className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300"
                  >
                    <Mic className="h-3 w-3" />
                    <span>Rekam Baru</span>
                  </button>
                </div>
                {customAudios.length > 0 ? (
                  <select
                    value={customAudioId}
                    onChange={(e) => setCustomAudioId(e.target.value)}
                    className="w-full rounded-xl border border-[#27272a] bg-[#111114] px-3 py-2 text-xs text-[#fafafa] focus:border-[#3f3f46] focus:outline-none"
                  >
                    {customAudios.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.duration}s)
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="p-3 text-center border border-dashed border-[#27272a] rounded-xl text-xs text-[#71717a]">
                    Belum ada audio kustom tersimpan. Klik "Rekam Baru" atau unggah file di tab Suara.
                  </div>
                )}
              </div>
            )}

            {/* TTS Text input & Template Picker */}
            {(soundType === 'tts' || soundType === 'chime_tts' || soundType === 'custom_tts') && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-[#a1a1aa] flex items-center gap-1.5">
                    <MessageSquare className="h-3.5 w-3.5 text-blue-400" />
                    Teks Pengumuman Text-to-Speech (TTS)
                  </label>
                  
                  {/* Template Dropdown */}
                  <div className="relative group">
                    <button
                      type="button"
                      className="flex items-center gap-1 text-[11px] font-medium text-blue-400 hover:text-blue-300"
                    >
                      <Sparkles className="h-3 w-3" />
                      <span>Gunakan Template Kantor</span>
                    </button>
                    <div className="absolute right-0 top-full mt-1 hidden group-hover:block w-72 rounded-xl border border-[#27272a] bg-[#111114] p-2 shadow-2xl z-20">
                      <p className="text-[10px] uppercase font-bold text-[#71717a] px-2 py-1">Pilih Template Otomatis:</p>
                      {INDONESIAN_ANNOUNCEMENT_TEMPLATES.map((tmpl, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleApplyTemplate(tmpl.text, tmpl.title)}
                          className="w-full text-left rounded-lg p-2 text-xs text-[#a1a1aa] hover:bg-[#27272a] hover:text-[#fafafa] transition-colors"
                        >
                          <div className="font-semibold text-[#fafafa]">{tmpl.title}</div>
                          <div className="text-[10px] text-[#71717a] truncate">{tmpl.text}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <textarea
                  id="textarea-schedule-tts"
                  rows={3}
                  value={ttsText}
                  onChange={(e) => setTtsText(e.target.value)}
                  placeholder="Masukkan kalimat pengumuman yang akan dibacakan otomatis saat jadwal tiba..."
                  className="w-full rounded-xl border border-[#27272a] bg-[#111114] p-3 text-xs text-[#fafafa] placeholder-[#71717a] focus:border-[#3f3f46] focus:outline-none"
                />
              </div>
            )}

            {/* Test Sound Button */}
            <div className="flex items-center justify-between pt-2 border-t border-[#27272a]">
              <button
                type="button"
                onClick={handleTestSound}
                className="flex items-center gap-2 rounded-xl border border-blue-500/30 bg-blue-500/10 px-3.5 py-1.5 text-xs font-semibold text-blue-400 hover:bg-blue-500/20 transition-all"
              >
                {isPlayingTest ? (
                  <>
                    <Square className="h-3.5 w-3.5 fill-current" />
                    <span>Hentikan Suara Tes</span>
                  </>
                ) : (
                  <>
                    <Play className="h-3.5 w-3.5 fill-current" />
                    <span>Tes Bunyi Sekarang</span>
                  </>
                )}
              </button>

              <div className="flex items-center gap-2 text-xs text-[#71717a]">
                <Volume2 className="h-3.5 w-3.5" />
                <span>Volume Jadwal:</span>
                <input
                  type="range"
                  min="20"
                  max="100"
                  value={volume}
                  onChange={(e) => setVolume(Number(e.target.value))}
                  className="w-24 accent-blue-500 cursor-pointer"
                />
                <span className="font-mono-num font-bold text-[#fafafa]">{volume}%</span>
              </div>
            </div>
          </div>

          {/* Enabled Switch */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs font-semibold text-[#a1a1aa]">Status Aktif Jadwal</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-[#27272a] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#27272a]">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-[#27272a] bg-[#18181b] px-5 py-2.5 text-xs font-semibold text-[#a1a1aa] hover:bg-[#27272a] hover:text-[#fafafa] transition-colors"
            >
              Batal
            </button>
            <button
              id="btn-save-schedule"
              type="submit"
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-xs font-semibold text-white shadow-lg shadow-blue-600/30 hover:bg-blue-500 transition-all active:scale-95"
            >
              <Bell className="h-4 w-4" />
              <span>Simpan Jadwal</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
