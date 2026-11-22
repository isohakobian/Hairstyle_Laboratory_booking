export type HomeTheme = 'original' | 'gta' | 'new-year';

/**
 * Safe default: the original public homepage remains active until the owner
 * explicitly switches the temporary campaign theme.
 */
export const HOMEPAGE_THEME: HomeTheme = 'gta';

export function getHomeTheme(): HomeTheme {
  if (typeof window !== 'undefined') {
    const requestedTheme = new URLSearchParams(window.location.search).get('theme');
    if (requestedTheme === 'gta' || requestedTheme === 'original' || requestedTheme === 'new-year') {
      return requestedTheme;
    }
  }

  const today = new Date();
  const month = today.getMonth();
  const day = today.getDate();
  const isNewYearWindow = (month === 11 && day >= 1) || (month === 0 && day <= 7);
  if (isNewYearWindow) return 'new-year';

  return HOMEPAGE_THEME;
}
