import { describe, expect, it } from 'vitest';

// The tour points at [data-tour="..."] anchors that live in other components. Nothing else ties
// the two together, so a renamed or deleted anchor would silently drop a step at runtime. This
// asserts every selector the tour declares still has a matching attribute somewhere in src/.
// import.meta.glob keeps it a plain Vite import — no node types needed.
const sources = import.meta.glob('../**/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

describe('tour anchors', () => {
  const entries = Object.entries(sources);
  // Vite normalises same-directory hits to './tour.ts'.
  const tour = entries.find(([path]) => path === './tour.ts')![1];
  const selectors = [...tour.matchAll(/\[data-tour="([a-z]+)"\]/g)].map((m) => m[1]);
  const rendered = entries
    .filter(([path]) => !path.startsWith('./'))
    .map(([, code]) => code)
    .join('\n');

  it('declares steps', () => {
    expect(selectors.length).toBeGreaterThan(0);
  });

  it.each(selectors)('has a rendered anchor for "%s"', (name) => {
    expect(rendered).toContain(`data-tour="${name}"`);
  });
});
