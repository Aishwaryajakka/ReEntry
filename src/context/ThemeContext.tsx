import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useSession } from '@/ctx';
import { fetchUserPreferences, updateAppearance, type Appearance } from '@/db/api';

export type { Appearance };

interface ThemeContextType {
  theme: Appearance;
  isDark: boolean;
  initialized: boolean;
  toggleTheme: () => Promise<void>;
  setTheme: (theme: Appearance) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { session } = useSession();
  const userId = session?.user?.id;

  // This is the authenticated user's preference. Auth screens never have a session,
  // so we force the active theme to 'light' while the user is signed out.
  const [userTheme, setUserTheme] = useState<Appearance>('light');
  const [initialized, setInitialized] = useState(false);
  const userOverrideRef = useRef(false);

  const activeTheme = userId ? userTheme : 'light';
  const isDark = activeTheme === 'dark';

  // Load the current user's saved preference exactly once when they sign in.
  // If the user changes the preference before the fetch completes, the fetch
  // result is ignored so the newer local selection is not overwritten.
  useEffect(() => {
    if (!userId) {
      setInitialized(false);
      return;
    }

    let cancelled = false;
    userOverrideRef.current = false;
    const load = async () => {
      try {
        const prefs = await fetchUserPreferences(userId);
        if (cancelled || userOverrideRef.current) return;
        setUserTheme(prefs?.appearance === 'dark' ? 'dark' : 'light');
      } catch (e) {
        console.error('ThemeProvider load failed', e);
      } finally {
        if (!cancelled) setInitialized(true);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const setTheme = async (value: Appearance) => {
    if (!userId) {
      setUserTheme('light');
      return;
    }

    userOverrideRef.current = true;
    const previous = userTheme;
    setUserTheme(value);

    try {
      await updateAppearance(userId, value);
    } catch (e) {
      // Revert only on confirmed failure so the UI matches the persisted state.
      setUserTheme(previous);
      throw new Error('Failed to save appearance. Please try again.');
    }
  };

  const toggleTheme = async () => {
    await setTheme(userTheme === 'light' ? 'dark' : 'light');
  };

  return (
    <ThemeContext.Provider
      value={{ theme: activeTheme, isDark, initialized, toggleTheme, setTheme }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
