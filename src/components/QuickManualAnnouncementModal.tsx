import React, { useState } from 'react';
import { Megaphone, X, Play, Volume2, Sparkles, Building2 } from 'lucide-react';
import { BuiltinChimeId, RoomZone, TTSConfig } from '../types';
import { BUILTIN_CHIMES, playSynthesizedChime, unlockAudio } from '../utils/audioSynthesizer';
import { INDONESIAN_ANNOUNCEMENT_TEMPLATES, speakText } from '../utils/speechService';

interface QuickManualAnnouncementModalProps {
  isOpen: boolean;
  onClose: () => void;
  rooms: RoomZone[];
  ttsConfig: TTSConfig;
  generalVolume: number;
}

export const QuickManualAnnouncementModal: React.FC<QuickManualAnnouncementModalProps> = ({
  isOpen,
  onClose,
  rooms,
  ttsConfig,
  generalVolume
}) => {
  const [announcementText, setAnnouncementText] = useState('');
  const [selectedChime, setSelectedChime] = useState<BuiltinChimeId>('airport');
  const [selectedRoom, setSelectedRoom] = useState('Semua Ruangan (Broadcast)');
  const [includeChime, setIncludeChime] = useState(true);
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  if (!isOpen) return null;

  const handleBroadcast = async () => {
    if (!announcementText.trim()) return;

    setIsBroadcasting(true);
    await unlockAudio();

    try {
      if (includeChime) {
        await playSynthesizedChime(selectedChime, generalVolume);
        await new Promise((r) => setTimeout(r, 400));
      }

      await speakText(announcementText, ttsConfig);
      onClose();
    } catch (err) {
      console.error('Error broadcasting manual announcement', err);
    } finally {
      setIsBroadcasting(false);
    }
  };

  const handleChimeOnly = async () => {
    await unlockAudio();
    await playSynthesizedChime(selectedChime, generalVolume);
    onClose();
  };

  return (
    <div id="quick-manual-announcement-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="relative w-full max-w-lg rounded-2xl border border-[#27272a] bg-[#111114] p-6 text-[#fafafa] shadow-2xl shadow-black/80">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 rounded-xl p-2 text-[#71717a] hover:bg-[#18181b] hover:text-[#fafafa] transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Megaphone className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#fafafa]">Siaran / Panggilan Spontan</h3>
            <p className="text-xs text-[#71717a]">Kirim panggilan darurat atau pengumuman langsung sekarang</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Target room */}
          <div>
            <label className="block text-xs font-semibold text-[#a1a1aa] mb-1.5 flex items-center gap-1">
              <Building2 className="h-3.5 w-3.5 text-blue-400" />
              Target Ruangan / Zona Siaran
            </label>
            <select
              value={selectedRoom}
              onChange={(e) => setSelectedRoom(e.target.value)}
              className="w-full rounded-xl border border-[#27272a] bg-[#18181b] px-3 py-2 text-xs text-[#fafafa] focus:border-[#3f3f46] focus:outline-none"
            >
              {rooms.map((r) => (
                <option key={r.id} value={r.name}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          {/* Quick template buttons */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-[#a1a1aa] flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                Template Cepat
              </label>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[
                'Panggilan ke Ruang Rapat',
                'Ada Tamu di Lobby',
                'Istirahat Sholat',
                'Waktu Peregangan',
                'Evakuasi Darurat'
              ].map((tmplTitle, idx) => {
                const fullText = INDONESIAN_ANNOUNCEMENT_TEMPLATES.find((t) => t.title.includes(tmplTitle.split(' ')[0]))?.text || tmplTitle;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setAnnouncementText(fullText)}
                    className="rounded-lg border border-[#27272a] bg-[#18181b] px-2.5 py-1 text-[11px] font-medium text-[#a1a1aa] hover:border-[#3f3f46] hover:text-[#fafafa] transition-all"
                  >
                    {tmplTitle}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Text Area */}
          <div>
            <label className="block text-xs font-semibold text-[#a1a1aa] mb-1">
              Teks Pengumuman Siaran
            </label>
            <textarea
              rows={3}
              value={announcementText}
              onChange={(e) => setAnnouncementText(e.target.value)}
              placeholder="Ketik pengumuman yang ingin disiarkan langsung ke speaker..."
              className="w-full rounded-xl border border-[#27272a] bg-[#18181b] p-3 text-xs text-[#fafafa] placeholder-[#71717a] focus:border-[#3f3f46] focus:outline-none"
            />
          </div>

          {/* Chime prelude options */}
          <div className="flex items-center justify-between rounded-xl border border-[#27272a] bg-[#18181b] p-3">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="check-prelude"
                checked={includeChime}
                onChange={(e) => setIncludeChime(e.target.checked)}
                className="rounded border-[#27272a] bg-[#111114] text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="check-prelude" className="text-xs text-[#a1a1aa] cursor-pointer">
                Bunyikan nada pembuka sebelum bicara
              </label>
            </div>

            <select
              value={selectedChime}
              onChange={(e) => setSelectedChime(e.target.value as BuiltinChimeId)}
              className="rounded-lg border border-[#27272a] bg-[#111114] px-2 py-1 text-xs text-[#fafafa]"
            >
              {BUILTIN_CHIMES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={handleChimeOnly}
              className="flex items-center gap-1.5 rounded-xl border border-[#27272a] bg-[#18181b] px-4 py-2.5 text-xs font-medium text-[#a1a1aa] hover:bg-[#27272a] hover:text-[#fafafa] transition-colors"
            >
              <Volume2 className="h-4 w-4" />
              <span>Bunyikan Nada Saja</span>
            </button>

            <button
              id="btn-send-instant-broadcast"
              type="button"
              disabled={isBroadcasting || !announcementText.trim()}
              onClick={handleBroadcast}
              className="flex items-center gap-2 rounded-xl bg-amber-600 px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-amber-600/30 hover:bg-amber-500 disabled:opacity-50 active:scale-95 transition-all"
            >
              <Play className="h-4 w-4 fill-current" />
              <span>{isBroadcasting ? 'Menyiarkan...' : 'Siarkan Pengumuman'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
