import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { readStorage, writeStorage } from '../lib/storage';
import {
  applyBrandPalette,
  brandIdFromIndex,
} from '../lib/themes';

const CAR_KEY = 'receipt-tracker-car-logo';
const DARK_MODE_KEY = 'receipt-tracker-dark-mode';

function getInitialBrandIndex() {
  return readStorage(CAR_KEY, 0) % 5;
}

function getInitialDarkMode() {
  return readStorage(DARK_MODE_KEY, false);
}

if (typeof document !== 'undefined') {
  const initialBrand = brandIdFromIndex(getInitialBrandIndex());
  const initialDark = getInitialDarkMode();
  applyBrandPalette(initialBrand, initialDark);
  document.documentElement.classList.toggle('dark', initialDark);
}

interface ThemeContextValue {
  brandId: BrandId;
  brandIndex: number;
  darkMode: boolean;
  setBrandIndex: (index: number) => void;
  cycleBrand: () => void;
  toggleDarkMode: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [brandIndex, setBrandIndexState] = useState(getInitialBrandIndex);
  const [darkMode, setDarkMode] = useState(getInitialDarkMode);

  const brandId = brandIdFromIndex(brandIndex);

  useEffect(() => {
    applyBrandPalette(brandId, darkMode);
    document.documentElement.classList.toggle('dark', darkMode);
  }, [brandId, darkMode]);

  const setBrandIndex = useCallback((index: number) => {
    const normalized = ((index % 5) + 5) % 5;
    setBrandIndexState(normalized);
    writeStorage(CAR_KEY, normalized);
  }, []);

  const cycleBrand = useCallback(() => {
    setBrandIndexState((prev) => {
      const next = (prev + 1) % 5;
      writeStorage(CAR_KEY, next);
      return next;
    });
  }, []);

  const toggleDarkMode = useCallback(() => {
    setDarkMode((prev) => {
      const next = !prev;
      writeStorage(DARK_MODE_KEY, next);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      brandId,
      brandIndex,
      darkMode,
      setBrandIndex,
      cycleBrand,
      toggleDarkMode,
    }),
    [brandId, brandIndex, darkMode, setBrandIndex, cycleBrand, toggleDarkMode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
