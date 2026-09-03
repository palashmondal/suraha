import { useEffect, useState } from 'react';

// Reactive navigator.onLine. Note: onLine only guarantees *no* network when false; true can still
// mean a captive/flaky link, so the SyncProvider treats a failed flush as "stay queued", not success.
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState<boolean>(
    typeof navigator === 'undefined' ? true : navigator.onLine,
  );
  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, []);
  return online;
}
