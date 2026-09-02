import { useEffect, useState } from 'react';
import { getHostContext, type HostContext } from '../api/registry';

// Host context is fixed for the lifetime of the page (it depends only on the hostname), so we
// fetch it once and share the resolved value across every component that asks.
let cached: HostContext | null = null;
let inflight: Promise<HostContext> | null = null;

// The tab title names the upazila on its own subdomain (সুরাহা - গলাচিপা উপজেলা) and marks the
// central SEAL host as সুরাহা - এডমিন. It is the same on every page of a host, and host context
// resolves once per page load, so setting it here covers the whole app with no per-route wiring.
// index.html carries the plain সুরাহা as the pre-hydration default.
function applyDocumentTitle(ctx: HostContext): void {
  document.title = ctx.kind === 'upazila' && ctx.name_bn
    ? `সুরাহা - ${ctx.name_bn} উপজেলা`
    : 'সুরাহা - এডমিন';
}

function load(): Promise<HostContext> {
  if (cached) return Promise.resolve(cached);
  if (!inflight) {
    inflight = getHostContext()
      .then((ctx) => {
        cached = ctx;
        applyDocumentTitle(ctx);
        return ctx;
      })
      .catch(() => {
        // Fall back to central so the UI stays usable if the lookup fails.
        cached = { kind: 'central', slug: null, name_bn: null };
        applyDocumentTitle(cached);
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
