import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { buildTheme } from './theme';

type Mode = 'light' | 'dark';
const ColorModeContext = createContext<{ mode: Mode; toggle: () => void }>({
  mode: 'light',
  toggle: () => {},
});

export function useColorMode() {
  return useContext(ColorModeContext);
}

const STORAGE_KEY = 'suraha:mode';

export function ColorModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<Mode>(
    () => (localStorage.getItem(STORAGE_KEY) as Mode) || 'light',
  );

  const value = useMemo(
    () => ({
      mode,
      toggle: () =>
        setMode((m) => {
          const next = m === 'light' ? 'dark' : 'light';
          localStorage.setItem(STORAGE_KEY, next);
          return next;
        }),
    }),
    [mode],
  );

  const theme = useMemo(() => buildTheme(mode), [mode]);

  return (
    <ColorModeContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
}
