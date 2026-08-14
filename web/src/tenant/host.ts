import { useEffect, useState } from 'react';
import { getHostContext, type HostContext } from '../api/registry';

// Host context is fixed for the lifetime of the page (it depends only on the hostname), so we
// fetch it once and share the resolved value across every component that asks.
let cached: HostContext | null = null;
let inflight: Promise<HostContext> | null = null;

function load(): Promise<HostContext> {
  if (cached) return Promise.resolve(cached);
  if (!inflight) {
    inflight = getHostContext()
      .then((ctx) => {
        cached = ctx;
        return ctx;
      })
      .catch(() => {
        // Fall back to central so the UI stays usable if the lookup fails.
        cached = { kind: 'central', slug: null, name_bn: null };
        return cached;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

/** Resolved host context, or `null` while the one-time lookup is still in flight. */
export function useHostContext(): HostContext | null {
  const [ctx, setCtx] = useState<HostContext | null>(cached);

  useEffect(() => {
    if (ctx) return;
    let alive = true;
    load().then((c) => {
      if (alive) setCtx(c);
    });
    return () => {
      alive = false;
    };
  }, [ctx]);

  return ctx;
}
