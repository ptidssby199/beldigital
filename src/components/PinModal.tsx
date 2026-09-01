import React, { useState, useEffect } from 'react';
import { Lock, X, Delete, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  correctPin: string;
}

export const PinModal: React.FC<PinModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  correctPin
}) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      setPin('');
      setError(false);
      setErrorMessage('');
    }
  }, [isOpen]);

  // Handle keyboard typing
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, pin]);

  const handleDigit = (digit: string) => {
    if (pin.length < 4) {
      const nextPin = pin + digit;
      setPin(nextPin);
      setError(false);

      if (nextPin.length === 4) {
        verifyPin(nextPin);
      }
    }
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
    setError(false);
  };

  const handleClear = () => {
    setPin('');
    setError(false);
    setErrorMessage('');
  };

  const verifyPin = (inputPin: string) => {
    if (inputPin === correctPin) {
      onSuccess();
    } else {
      setError(true);
      setErrorMessage('PIN Salah! Silakan coba lagi.');
      setTimeout(() => {
        setPin('');
        setError(false);
      }, 700);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div 
        id="pin-modal-backdrop" 
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-sm rounded-2xl border border-[#27272a] bg-[#111114] p-6 sm:p-7 text-[#fafafa] shadow-2xl shadow-black/80"
        >
          {/* Close button */}
          <button
            id="btn-close-pin-modal"
            onClick={onClose}
            className="absolute top-4 right-4 rounded-xl p-2 text-[#71717a] hover:bg-[#18181b] hover:text-[#fafafa] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Header */}
          <div className="flex flex-col items-center text-center">
            <div className="mb-3 flex h-13 w-13 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Lock className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold tracking-tight text-[#fafafa]">
              Akses Menu Admin
            </h3>
            <p className="mt-1 text-xs text-[#71717a]">
              Masukkan 4 digit PIN keamanan untuk mengelola jadwal & suara bel.
            </p>
          </div>

          {/* PIN Dots Indicator */}
          <div className="my-6 flex justify-center items-center gap-4">
            {[0, 1, 2, 3].map((index) => {
              const isFilled = index < pin.length;
              return (
                <motion.div
                  key={index}
                  animate={
                    error
                      ? { x: [-8, 8, -6, 6, -3, 3, 0] }
                      : { scale: isFilled ? [1, 1.2, 1] : 1 }
                  }
                  transition={{ duration: 0.3 }}
                  className={`h-4 w-4 rounded-full border transition-all duration-200 ${
                    error
                      ? 'border-red-500 bg-red-500 shadow-lg shadow-red-500/40'
                      : isFilled
                      ? 'border-blue-500 bg-blue-500 shadow-md shadow-blue-500/30'
                      : 'border-[#27272a] bg-[#18181b]'
                  }`}
                />
              );
            })}
          </div>

          {/* Error Message */}
          {errorMessage && (
            <p className="text-center text-xs font-semibold text-red-400 mb-4 animate-bounce">
              {errorMessage}
            </p>
          )}

          {/* Keypad */}
          <div className="grid grid-cols-3 gap-2.5">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
              <button
                key={num}
                id={`btn-pin-key-${num}`}
                type="button"
                onClick={() => handleDigit(num)}
                className="flex h-12 items-center justify-center rounded-xl border border-[#27272a] bg-[#18181b] text-lg font-bold text-[#fafafa] hover:bg-[#27272a] hover:border-[#3f3f46] active:scale-95 transition-all font-mono-num"
              >
                {num}
              </button>
            ))}
            <button
              id="btn-pin-clear"
              type="button"
              onClick={handleClear}
              className="flex h-12 items-center justify-center rounded-xl border border-[#27272a] bg-[#18181b] text-xs font-semibold text-[#71717a] hover:bg-[#27272a] hover:text-[#fafafa] active:scale-95 transition-all uppercase tracking-wider"
            >
              Hapus
            </button>
            <button
              id="btn-pin-key-0"
              type="button"
              onClick={() => handleDigit('0')}
              className="flex h-12 items-center justify-center rounded-xl border border-[#27272a] bg-[#18181b] text-lg font-bold text-[#fafafa] hover:bg-[#27272a] hover:border-[#3f3f46] active:scale-95 transition-all font-mono-num"
            >
              0
            </button>
            <button
              id="btn-pin-backspace"
              type="button"
              onClick={handleBackspace}
              className="flex h-12 items-center justify-center rounded-xl border border-[#27272a] bg-[#18181b] text-[#71717a] hover:bg-[#27272a] hover:text-red-400 active:scale-95 transition-all"
            >
              <Delete className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-5 text-center flex items-center justify-center gap-1.5 text-xs text-[#71717a]">
            <ShieldCheck className="h-3.5 w-3.5 text-blue-400" />
            <span>PIN Default: <strong className="text-[#a1a1aa] font-mono-num">1234</strong> (dapat diubah di Admin)</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
