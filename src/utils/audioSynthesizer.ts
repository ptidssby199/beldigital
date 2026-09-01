import { BuiltinChime, BuiltinChimeId } from '../types';

let audioCtx: AudioContext | null = null;

export function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export async function unlockAudio(): Promise<boolean> {
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
    // Play silent tiny buffer to unlock iOS and mobile safari/chrome
    const buffer = ctx.createBuffer(1, 1, 22050);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(0);
    return true;
  } catch (err) {
    console.error('Failed to unlock audio context', err);
    return false;
  }
}

export const BUILTIN_CHIMES: BuiltinChime[] = [
  {
    id: 'airport',
    name: 'Airport Chime (Ding-Dong)',
    description: 'Nada klasik 2-nada lembut khas bandara / kantor modern.',
    duration: '2.5 dtk',
    category: 'office'
  },
  {
    id: 'westminster',
    name: 'Westminster Quarters (4 Nada)',
    description: 'Melodi bel menara jam legendaris yang berwibawa.',
    duration: '4.0 dtk',
    category: 'classic'
  },
  {
    id: 'modern_tri',
    name: 'Modern 3-Tone Ascending',
    description: 'Nada harmonik ceria untuk pengumuman atau peralihan waktu.',
    duration: '2.8 dtk',
    category: 'melodic'
  },
  {
    id: 'gentle_ding',
    name: 'Crystal Ding Tunggal',
    description: 'Dentang jernih kristal tunggal, elegan & tidak mengagetkan.',
    duration: '2.0 dtk',
    category: 'office'
  },
  {
    id: 'classic_bell',
    name: 'Bel Elektrik / Kantor Klasik',
    description: 'Suara bel getar mekanik khas kantor / pabrik / sekolah.',
    duration: '3.5 dtk',
    category: 'classic'
  },
  {
    id: 'marimba',
    name: 'Warm Marimba Riff',
    description: 'Irama perkusi kayu lembut & profesional.',
    duration: '3.0 dtk',
    category: 'melodic'
  },
  {
    id: 'urgent_alert',
    name: 'Urgent Alert / Perhatian Darurat',
    description: 'Sinyal nada ganda tegas untuk pengumuman penting atau darurat.',
    duration: '2.5 dtk',
    category: 'alert'
  }
];

export function playSynthesizedChime(chimeId: BuiltinChimeId, volumePercent = 100): Promise<void> {
  return new Promise((resolve) => {
    try {
      const ctx = getAudioContext();
      const masterGain = ctx.createGain();
      const gainValue = Math.max(0.01, Math.min(1.0, (volumePercent / 100) * 0.9));
      masterGain.gain.setValueAtTime(gainValue, ctx.currentTime);
      masterGain.connect(ctx.destination);

      const now = ctx.currentTime;

      switch (chimeId) {
        case 'airport': {
          // G4 (392Hz) -> C5 (523.25Hz) with soft sine + harmonics
          playToneWithHarmonics(ctx, masterGain, 392.00, now, 1.2, 0.8);
          playToneWithHarmonics(ctx, masterGain, 523.25, now + 0.65, 1.6, 0.9);
          setTimeout(resolve, 2400);
          break;
        }

        case 'westminster': {
          // Melody: E4 (329.63), C4 (261.63), D4 (293.66), G3 (196.00)
          const notes = [
            { freq: 329.63, time: 0.0, dur: 0.9 },
            { freq: 261.63, time: 0.75, dur: 0.9 },
            { freq: 293.66, time: 1.5, dur: 0.9 },
            { freq: 196.00, time: 2.25, dur: 1.8 }
          ];
          notes.forEach((n) => {
            playTubularBellTone(ctx, masterGain, n.freq, now + n.time, n.dur);
          });
          setTimeout(resolve, 4200);
          break;
        }

        case 'modern_tri': {
          // E5 (659.25), G#5 (830.61), B5 (987.77)
          const notes = [
            { freq: 659.25, time: 0.0 },
            { freq: 830.61, time: 0.35 },
            { freq: 987.77, time: 0.7 }
          ];
          notes.forEach((n) => {
            playModernGlockenspiel(ctx, masterGain, n.freq, now + n.time, 1.6);
          });
          setTimeout(resolve, 2600);
          break;
        }

        case 'gentle_ding': {
          playCrystalDing(ctx, masterGain, 880, now, 2.2);
          setTimeout(resolve, 2200);
          break;
        }

        case 'classic_bell': {
          // Mechanical vibrating bell
          playMechanicalElectricBell(ctx, masterGain, now, 3.2);
          setTimeout(resolve, 3400);
          break;
        }

        case 'marimba': {
          const notes = [
            { freq: 261.63, time: 0.0 }, // C4
            { freq: 329.63, time: 0.22 }, // E4
            { freq: 392.00, time: 0.44 }, // G4
            { freq: 523.25, time: 0.66 }, // C5
            { freq: 659.25, time: 0.95 }  // E5
          ];
          notes.forEach((n) => {
            playMarimbaTone(ctx, masterGain, n.freq, now + n.time);
          });
          setTimeout(resolve, 2800);
          break;
        }

        case 'urgent_alert': {
          // 2 sharp alarm bursts
          for (let i = 0; i < 3; i++) {
            playUrgentPulse(ctx, masterGain, now + i * 0.45);
          }
          setTimeout(resolve, 2200);
          break;
        }

        default: {
          playToneWithHarmonics(ctx, masterGain, 440, now, 1.0, 0.8);
          setTimeout(resolve, 1200);
        }
      }
    } catch (err) {
      console.error('Error playing synthesized chime:', err);
      resolve();
    }
  });
}

function playToneWithHarmonics(
  ctx: AudioContext,
  dest: GainNode,
  freq: number,
  startTime: number,
  duration: number,
  volume = 0.8
) {
  // Fundamental
  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(freq, startTime);

  // 2nd Harmonic
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(freq * 2, startTime);

  // Envelope
  gain1.gain.setValueAtTime(0.001, startTime);
  gain1.gain.linearRampToValueAtTime(volume * 0.7, startTime + 0.03);
  gain1.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  gain2.gain.setValueAtTime(0.001, startTime);
  gain2.gain.linearRampToValueAtTime(volume * 0.25, startTime + 0.02);
  gain2.gain.exponentialRampToValueAtTime(0.0001, startTime + duration * 0.7);

  osc1.connect(gain1);
  osc2.connect(gain2);
  gain1.connect(dest);
  gain2.connect(dest);

  osc1.start(startTime);
  osc2.start(startTime);
  osc1.stop(startTime + duration + 0.1);
  osc2.stop(startTime + duration + 0.1);
}

function playTubularBellTone(
  ctx: AudioContext,
  dest: GainNode,
  freq: number,
  startTime: number,
  duration: number
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, startTime);

  // Inharmonic upper chime tone
  const overtone = ctx.createOscillator();
  const overGain = ctx.createGain();
  overtone.type = 'sine';
  overtone.frequency.setValueAtTime(freq * 2.76, startTime);

  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.linearRampToValueAtTime(0.65, startTime + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  overGain.gain.setValueAtTime(0.0001, startTime);
  overGain.gain.linearRampToValueAtTime(0.2, startTime + 0.01);
  overGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration * 0.4);

  osc.connect(gain);
  gain.connect(dest);
  overtone.connect(overGain);
  overGain.connect(dest);

  osc.start(startTime);
  overtone.start(startTime);
  osc.stop(startTime + duration + 0.05);
  overtone.stop(startTime + duration * 0.4 + 0.05);
}

function playModernGlockenspiel(
  ctx: AudioContext,
  dest: GainNode,
  freq: number,
  startTime: number,
  duration: number
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(freq, startTime);

  gain.gain.setValueAtTime(0.001, startTime);
  gain.gain.linearRampToValueAtTime(0.5, startTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  osc.connect(gain);
  gain.connect(dest);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.05);
}

function playCrystalDing(
  ctx: AudioContext,
  dest: GainNode,
  freq: number,
  startTime: number,
  duration: number
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, startTime);

  const shimmer = ctx.createOscillator();
  const shimmerGain = ctx.createGain();
  shimmer.type = 'sine';
  shimmer.frequency.setValueAtTime(freq * 3.01, startTime);

  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.linearRampToValueAtTime(0.7, startTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  shimmerGain.gain.setValueAtTime(0.0001, startTime);
  shimmerGain.gain.linearRampToValueAtTime(0.18, startTime + 0.008);
  shimmerGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration * 0.5);

  osc.connect(gain);
  gain.connect(dest);
  shimmer.connect(shimmerGain);
  shimmerGain.connect(dest);

  osc.start(startTime);
  shimmer.start(startTime);
  osc.stop(startTime + duration + 0.05);
  shimmer.stop(startTime + duration * 0.5 + 0.05);
}

function playMarimbaTone(ctx: AudioContext, dest: GainNode, freq: number, startTime: number) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, startTime);

  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.linearRampToValueAtTime(0.6, startTime + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.6);

  osc.connect(gain);
  gain.connect(dest);
  osc.start(startTime);
  osc.stop(startTime + 0.65);
}

function playMechanicalElectricBell(ctx: AudioContext, dest: GainNode, startTime: number, duration: number) {
  // Mechanical bell strike with rapid AM pulsation
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(740, startTime);

  // Second gong
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.type = 'sawtooth';
  osc2.frequency.setValueAtTime(880, startTime);

  // Tremolo/Clapper LFO
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  lfo.frequency.setValueAtTime(18, startTime); // 18 strikes per second
  lfoGain.gain.setValueAtTime(0.4, startTime);

  gain.gain.setValueAtTime(0.001, startTime);
  gain.gain.linearRampToValueAtTime(0.5, startTime + 0.05);
  gain.gain.setValueAtTime(0.5, startTime + duration - 0.2);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  gain2.gain.setValueAtTime(0.001, startTime);
  gain2.gain.linearRampToValueAtTime(0.25, startTime + 0.05);
  gain2.gain.setValueAtTime(0.25, startTime + duration - 0.2);
  gain2.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  lfo.connect(gain.gain);
  osc.connect(gain);
  osc2.connect(gain2);
  gain.connect(dest);
  gain2.connect(dest);

  lfo.start(startTime);
  osc.start(startTime);
  osc2.start(startTime);

  lfo.stop(startTime + duration);
  osc.stop(startTime + duration);
  osc2.stop(startTime + duration);
}

function playUrgentPulse(ctx: AudioContext, dest: GainNode, startTime: number) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(800, startTime);
  osc.frequency.linearRampToValueAtTime(600, startTime + 0.25);

  gain.gain.setValueAtTime(0.001, startTime);
  gain.gain.linearRampToValueAtTime(0.6, startTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.3);

  osc.connect(gain);
  gain.connect(dest);
  osc.start(startTime);
  osc.stop(startTime + 0.32);
}
