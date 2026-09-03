import { Network } from '@capacitor/network';
import { useEffect, useState } from 'react';

// Live online/offline state. Capacitor's Network plugin works on-device; in the browser dev build
// it falls back to navigator.onLine.
export function useOnline(): boolean {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    let handle: { remove: () => void } | undefined;
    Network.getStatus().then((s) => setOnline(s.connected)).catch(() => setOnline(navigator.onLine));
    Network.addListener('networkStatusChange', (s) => setOnline(s.connected)).then((h) => {
      handle = h;
    });
    return () => handle?.remove();
  }, []);

  return online;
}

export async function isOnline(): Promise<boolean> {
  try {
    return (await Network.getStatus()).connected;
  } catch {
    return navigator.onLine;
  }
}
