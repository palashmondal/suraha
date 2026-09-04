import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { bnStrings as S } from '../i18n';
import { bn } from '../utils/bnNum';

// Guided intro for first-time officers. Steps are declared once for the whole app and filtered
// down to whatever is actually on screen, so each role gets a tour of its own sidebar/dashboard
// without a per-role step list to keep in sync.
const SEEN_KEY = 'suraha.tour.v1';

type Side = 'left' | 'right' | 'top' | 'bottom';

const STEPS: { el: string; title: string; desc: string; side: Side }[] = [
  { el: '[data-tour="sidebar"]', ...S.tour.sidebar, side: 'right' },
  { el: '[data-tour="services"]', ...S.tour.services, side: 'right' },
  { el: '[data-tour="search"]', ...S.tour.search, side: 'bottom' },
  { el: '[data-tour="summary"]', ...S.tour.summary, side: 'bottom' },
  { el: '[data-tour="recent"]', ...S.tour.recent, side: 'top' },
  { el: '[data-tour="notifications"]', ...S.tour.notifications, side: 'bottom' },
  { el: '[data-tour="profile"]', ...S.tour.profile, side: 'bottom' },
  { el: '[data-tour="help"]', ...S.tour.help, side: 'bottom' },
];

export function startTour() {
  const steps = STEPS.filter((s) => document.querySelector(s.el)).map((s) => ({
    element: s.el,
    popover: { title: s.title, description: s.desc, side: s.side, align: 'start' as const },
  }));
  if (steps.length === 0) return;

  driver({
    steps,
    showProgress: true,
    progressText: '{{current}} / {{total}}',
    nextBtnText: S.common.next,
    prevBtnText: S.common.prev,
    doneBtnText: S.tour.done,
    popoverClass: 'suraha-tour',
    // The whole UI is in Bangla numerals; the progress counter is the one string driver.js
    // renders itself, so it gets converted after render.
    onPopoverRender: (p) => {
      const el = p.wrapper.querySelector('.driver-popover-progress-text');
      if (el?.textContent) el.textContent = bn(el.textContent);
    },
  }).drive();
}

/** Runs the tour once per browser, the first time an officer lands on the dashboard. */
export function autoStartTour() {
  try {
    if (localStorage.getItem(SEEN_KEY)) return;
    localStorage.setItem(SEEN_KEY, '1');
  } catch {
    return; // storage blocked (private window) — never show a tour we cannot remember dismissing
  }
  startTour();
}
