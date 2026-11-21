export type HomeTheme = 'original' | 'gta';

/**
 * Safe default: the original public homepage remains active until the owner
 * explicitly switches the temporary campaign theme.
 */
export const HOMEPAGE_THEME: HomeTheme = 'gta';

export function getHomeTheme(): HomeTheme {
  if (typeof window !== 'undefined') {
    const requestedTheme = new URLSearchParams(window.location.search).get('theme');
    if (requestedTheme === 'gta' || requestedTheme === 'original') {
      return requestedTheme;
    }
  }

  return HOMEPAGE_THEME;
}
