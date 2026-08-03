import { createTheme, type Theme } from '@mui/material/styles';
import { palette, radius, fontFamily } from './tokens';

// Extra theme values used across the design system (module accents + status pills),
// exposed on theme so components read one source of truth in both light and dark.
declare module '@mui/material/styles' {
  interface Theme {
    suraha: {
      module: { officer: string; pregnancy: string; birth: string; birthAlt: string };
      status: typeof palette.status;
      sidebarBg: string;
      activePillBg: string;
      activePillText: string;
    };
  }
  interface ThemeOptions {
    suraha?: Theme['suraha'];
  }
}

export function buildTheme(mode: 'light' | 'dark'): Theme {
  const c = mode === 'light' ? palette.light : palette.dark;

  return createTheme({
    palette: {
      mode,
      primary: { main: palette.primary, contrastText: palette.onPrimary },
      error: { main: palette.error },
      background: { default: c.pageBg, paper: c.surface },
      text: { primary: c.textPrimary, secondary: c.textSecondary },
      divider: c.border,
    },
    typography: {
      fontFamily,
      h5: { fontWeight: 700 },
      h6: { fontWeight: 700 },
      subtitle1: { fontWeight: 600 },
      subtitle2: { fontWeight: 600 },
      button: { textTransform: 'none', fontWeight: 600 },
    },
    shape: { borderRadius: radius.md },
    suraha: {
      module: {
        officer: palette.moduleOfficer,
        pregnancy: palette.modulePregnancy,
        birth: palette.moduleBirth,
        birthAlt: palette.moduleBirthAlt,
      },
      status: palette.status,
      sidebarBg: c.sidebar,
      activePillBg: mode === 'light' ? palette.secondaryContainer : '#4A4458',
      activePillText: mode === 'light' ? palette.onSecondaryContainer : '#E8DEF8',
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: { backgroundColor: c.pageBg },
          '*::-webkit-scrollbar': { width: 8, height: 8 },
          '*::-webkit-scrollbar-thumb': {
            background: c.border,
            borderRadius: 8,
          },
        },
      },
      MuiPaper: {
        styleOverrides: { root: { backgroundImage: 'none' } },
      },
      MuiButton: {
        styleOverrides: { root: { borderRadius: radius.pill } },
      },
    },
  });
}
