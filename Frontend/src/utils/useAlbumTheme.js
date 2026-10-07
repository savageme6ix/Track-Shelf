import { useCallback, useEffect, useState } from 'react';
import { DEFAULT_THEME, extractTheme, toHex } from '../utils/color';

// Holds the extracted theme and syncs it to CSS variables on <html>.
export function useAlbumTheme() {
  const [theme, setTheme] = useState(DEFAULT_THEME);

  const processImage = useCallback((img) => {
    try {
      setTheme(extractTheme(img));
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--bg1', toHex(theme.bg));
    root.style.setProperty('--accent', toHex(theme.accent));
    root.style.setProperty('--text', toHex(theme.text));
  }, [theme]);

  return { theme, processImage };
}
