import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, Pause, Save, X, AlertCircle } from 'lucide-react';
import { CustomAudioItem } from '../types';
import { saveCustomAudio } from '../utils/indexedDbAudio';
import { unlockAudio } from '../utils/audioSynthesizer';

interface AudioRecorderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (item: CustomAudioItem) => void;
}

export const AudioRecorderModal: React.FC<AudioRecorderModalProps> = ({
  isOpen,
  onClose,
  onSaved
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [soundName, setSoundName] = useState('');
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [audioLevels, setAudioLevels] = useState<number[]>([10, 15, 8, 20, 14, 25, 10, 18, 12, 16]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSoundName(`Pengumuman Suara ${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`);
      setRecordedBlob(null);
      setAudioUrl(null);
      setRecordingSeconds(0);
      setIsRecording(false);
      setPermissionError(null);
    } else {
      cleanup();
    }
    return () => cleanup();
  }, [isOpen]);

  const cleanup = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current = null;
    }
    setIsPlayingPreview(false);
  };

  const startRecording = async () => {
    try {
      await unlockAudio();
      setPermissionError(null);
      audioChunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Setup Analyser for visualizer
      const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const analyser = audioCtx.createAnalyser();
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);
      analyser.fftSize = 64;
      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setRecordedBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);

        // Stop media stream tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      setRecordingSeconds(0);

      // Start timer
      timerRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);

      // Start visualizer loop
      const updateVisualizer = () => {
        if (analyserRef.current) {
          const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(dataArray);
          const sampled: number[] = [];
          const step = Math.floor(dataArray.length / 12);
          for (let i = 0; i < 12; i++) {
            const val = dataArray[i * step] || 0;
            sampled.push(Math.max(8, Math.min(100, Math.round((val / 255) * 100))));
          }
          setAudioLevels(sampled);
        }
        animationFrameRef.current = requestAnimationFrame(updateVisualizer);
      };
      updateVisualizer();

    } catch (err: unknown) {
      console.error('Error accessing microphone', err);
      setPermissionError('Izin mikrofon ditolak atau mikrofon tidak terdeteksi. Harap periksa izin browser.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    }
  };

  const togglePlayPreview = () => {
    if (!audioUrl) return;

    if (isPlayingPreview && audioElementRef.current) {
      audioElementRef.current.pause();
      setIsPlayingPreview(false);
    } else {
      const audio = new Audio(audioUrl);
      audioElementRef.current = audio;
      audio.onended = () => setIsPlayingPreview(false);
      audio.play();
      setIsPlayingPreview(true);
    }
  };

  const handleSave = async () => {
    if (!recordedBlob) return;

    // Convert blob to Data URL for persistence
    const reader = new FileReader();
    reader.readAsDataURL(recordedBlob);
    reader.onloadend = async () => {
      const base64data = reader.result as string;
      const newItem: CustomAudioItem = {
        id: 'rec_' + Date.now(),
        name: soundName.trim() || 'Rekaman Suara',
        dataUrl: base64data,
        duration: recordingSeconds || 3,
        fileSize: recordedBlob.size,
        createdAt: new Date().toISOString(),
        type: 'mic_record'
      };

      await saveCustomAudio(newItem);
      onSaved(newItem);
      onClose();
    };
  };

  if (!isOpen) return null;

  return (
    <div id="audio-recorder-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="relative w-full max-w-md rounded-2xl border border-[#27272a] bg-[#111114] p-6 text-[#fafafa] shadow-2xl shadow-black/80">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 rounded-xl p-2 text-[#71717a] hover:bg-[#18181b] hover:text-[#fafafa] transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-500/10 text-red-400 border border-red-500/20">
            <Mic className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#fafafa]">Rekam Suara Pengumuman</h3>
            <p className="text-xs text-[#71717a]">Rekam instruksi atau pengumuman khusus ruangan</p>
          </div>
        </div>

        {permissionError && (
          <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{permissionError}</span>
          </div>
        )}

        {/* Visualizer & Timer Display */}
        <div className="my-5 flex flex-col items-center justify-center rounded-xl border border-[#27272a] bg-[#09090b] p-6">
          <div className="font-mono-num text-3xl font-bold tracking-wider text-[#fafafa]">
            {Math.floor(recordingSeconds / 60).toString().padStart(2, '0')}:
            {(recordingSeconds % 60).toString().padStart(2, '0')}
          </div>
          <span className="mt-1 text-xs uppercase tracking-widest text-[#71717a]">
            {isRecording ? 'MEREKAM AUDIO...' : recordedBlob ? 'REKAMAN SELESAI' : 'SIAP MEREKAM'}
          </span>

          {/* Waveform visualizer */}
          <div className="mt-5 flex h-14 w-full items-center justify-center gap-1.5 px-4">
            {audioLevels.map((lvl, idx) => (
              <div
                key={idx}
                className={`w-2 rounded-full transition-all duration-75 ${
                  isRecording
                    ? 'bg-red-500 shadow-md shadow-red-500/40'
                    : recordedBlob
                    ? 'bg-emerald-500'
                    : 'bg-[#27272a]'
                }`}
                style={{ height: `${Math.max(10, lvl)}%` }}
              />
            ))}
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-4 my-4">
          {!isRecording ? (
            <button
              id="btn-start-record"
              onClick={startRecording}
              className="flex items-center gap-2 rounded-xl bg-red-600 px-6 py-3 font-semibold text-white shadow-lg shadow-red-600/30 hover:bg-red-500 active:scale-95 transition-all"
            >
              <Mic className="h-5 w-5" />
              <span>{recordedBlob ? 'Rekam Ulang' : 'Mulai Rekam'}</span>
            </button>
          ) : (
            <button
              id="btn-stop-record"
              onClick={stopRecording}
              className="flex items-center gap-2 rounded-xl bg-[#18181b] border border-red-500/50 px-6 py-3 font-semibold text-red-400 shadow-lg shadow-red-500/20 hover:bg-[#27272a] active:scale-95 transition-all animate-pulse"
            >
              <Square className="h-5 w-5 fill-current" />
              <span>Hentikan Rekam</span>
            </button>
          )}

          {recordedBlob && !isRecording && (
            <button
              id="btn-play-preview-record"
              onClick={togglePlayPreview}
              className="flex items-center gap-2 rounded-xl border border-[#27272a] bg-[#18181b] px-4 py-3 font-medium text-[#fafafa] hover:bg-[#27272a] active:scale-95 transition-all"
            >
              {isPlayingPreview ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              <span>{isPlayingPreview ? 'Jeda' : 'Dengarkan'}</span>
            </button>
          )}
        </div>

        {/* Name input & Save */}
        {recordedBlob && !isRecording && (
          <div className="mt-5 border-t border-[#27272a] pt-4 space-y-3">
            <div>
              <label className="block text-xs font-semibold text-[#a1a1aa] mb-1">
                Nama Audio / Pengumuman
              </label>
              <input
                id="input-record-sound-name"
                type="text"
                value={soundName}
                onChange={(e) => setSoundName(e.target.value)}
                placeholder="Contoh: Pengumuman Ruang Rapat"
                className="w-full rounded-xl border border-[#27272a] bg-[#18181b] px-3.5 py-2.5 text-sm text-[#fafafa] placeholder-[#71717a] focus:border-[#3f3f46] focus:outline-none"
              />
            </div>

            <button
              id="btn-save-record-sound"
              onClick={handleSave}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 font-semibold text-white shadow-lg shadow-blue-600/30 hover:bg-blue-500 active:scale-95 transition-all"
            >
              <Save className="h-4 w-4" />
              <span>Simpan ke Koleksi Suara</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
