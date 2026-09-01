// Web Worker based timer to ensure 100% reliable execution even when the browser tab is minimized or in the background.
// Standard window.setInterval is heavily throttled by browsers (Chrome, Edge, Firefox) when a tab is in background,
// but Web Workers run continuously without background throttling.

export function createBackgroundInterval(callback: () => void, intervalMs: number = 800): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  // Check Web Worker support
  if (typeof Worker !== 'undefined') {
    try {
      const workerBlob = new Blob([
        `
        let timer = null;
        self.onmessage = function(e) {
          if (e.data.action === 'start') {
            if (timer) clearInterval(timer);
            timer = setInterval(function() {
              self.postMessage('tick');
            }, e.data.interval || 800);
          } else if (e.data.action === 'stop') {
            if (timer) clearInterval(timer);
            timer = null;
          }
        };
        `
      ], { type: 'application/javascript' });

      const workerUrl = URL.createObjectURL(workerBlob);
      const worker = new Worker(workerUrl);

      worker.onmessage = (e) => {
        if (e.data === 'tick') {
          callback();
        }
      };

      worker.postMessage({ action: 'start', interval: intervalMs });

      return () => {
        worker.postMessage({ action: 'stop' });
        worker.terminate();
        URL.revokeObjectURL(workerUrl);
      };
    } catch (e) {
      console.warn('Web Worker timer fallback to setInterval:', e);
    }
  }

  // Fallback to standard setInterval if Worker creation fails
  const intervalId = setInterval(callback, intervalMs);
  return () => clearInterval(intervalId);
}
