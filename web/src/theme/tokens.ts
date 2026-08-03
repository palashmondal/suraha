// Design tokens for Suraha.
//
// Sourced by sampling the concept_ui/ screenshots with ImageMagick (Figma Dev Mode MCP
// requires a paid seat and was unavailable). The sampling revealed the design is built on
// the **Material Design 3 baseline (purple seed)** — the exact M3 role values appear in the
// mockups: secondaryContainer #E8DEF8, primaryContainer #EADDFF, surface #FEF7FF. On top of
// that baseline sit three custom module-accent bands and the M3 error red for destructive
// actions. Values below are those measured/derived roles.

export const palette = {
  // Material 3 baseline (purple).
  primary: '#6750A4',
  onPrimary: '#FFFFFF',
  primaryContainer: '#EADDFF',
  onPrimaryContainer: '#21005D',
  secondary: '#625B71',
  secondaryContainer: '#E8DEF8', // active nav pill (measured)
  onSecondaryContainer: '#1D192B',
  error: '#B3261E', // destructive action "জন্ম নিবন্ধন তৈরি করুন"

  // Per-module accent header bands (dashboard summary cards) — measured from Dashboard.png.
  moduleOfficer: '#4F378B', // কর্মকর্তা — purple
  modulePregnancy: '#1D192B', // প্রসূতি কল্যাণ — near-black navy
  moduleBirth: '#633B48', // জন্ম সনদ — maroon
  moduleBirthAlt: '#B3261E', // M3 error red (destructive)

  // Small count badge on list-card titles (measured).
  countBadge: '#C3534C',

  // Semantic status pills (bg / fg).
  status: {
    pending: { bg: '#FEF0C7', fg: '#B54708' }, // অপেক্ষমান / এন্ট্রি হয়নি (bg measured)
    success: { bg: '#D1FADF', fg: '#067647' }, // অনুমোদিত / ডেলিভারি হয়েছে
    danger: { bg: '#FEE4E2', fg: '#B42318' }, // ডেলিভারি হয়নি / নাকচ
    info: { bg: '#E6DFEC', fg: '#6750A4' }, // শিডিউল করা হয়েছে (bg measured)
  },

  // Surfaces (measured from Dashboard.png). The sidebar + top bar are lavender; the main
  // content is a white panel; summary-card bodies are lavender with white tiles.
  light: {
    pageBg: '#F7F2FA', // lavender base (sidebar + top bar)
    surface: '#FFFFFF', // white content panel + list/stat cards
    sidebar: '#F7F2FA', // lavender (matches page)
    cardBody: '#F7F2FA', // summary-card body behind tiles
    switcher: '#E6E0E9', // top-bar upazila switcher (M3 surfaceVariant)
    border: '#E7E2EB', // subtle tile/card outline (measured)
    textPrimary: '#1D1B20', // M3 onSurface
    textSecondary: '#49454F', // M3 onSurfaceVariant
  },
  dark: {
    pageBg: '#141218', // M3 dark surface
    surface: '#211F26', // slightly raised content panel
    sidebar: '#141218',
    cardBody: '#1D1B20',
    switcher: '#2B2930',
    border: '#49454F',
    textPrimary: '#E6E0E9', // M3 dark onSurface
    textSecondary: '#CAC4D0', // M3 dark onSurfaceVariant
  },
} as const;

export const radius = {
  sm: 8, // chips / small
  md: 12, // cards (M3 medium)
  lg: 16,
  xl: 28, // active nav pill (M3 large)
  pill: 999,
} as const;

// Google Bangla webfont. Tiro Bangla is a single-weight (400) family, so bold weights
// fall back to Hind Siliguri (also Google Bangla).
export const fontFamily =
  '"Tiro Bangla", "Hind Siliguri", "Noto Sans Bengali", "Segoe UI", system-ui, sans-serif';
