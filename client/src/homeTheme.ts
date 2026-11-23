export type HomeTheme = 'original' | 'gta' | 'new-year' | 'new-york';

export const HOMEPAGE_THEME: HomeTheme = 'gta';

/** URL overrides are intentionally kept for private previews and QA. */
export function getHomeTheme(): HomeTheme | null {
  if (typeof window !== 'undefined') {
    const requestedTheme = new URLSearchParams(window.location.search).get('theme');
    if (requestedTheme === 'gta' || requestedTheme === 'original' || requestedTheme === 'new-year' || requestedTheme === 'new-york') {
      return requestedTheme;
    }
  }
  return null;
}
