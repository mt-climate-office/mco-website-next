// Top-level sections (rebuild plan §4.2: six, so the bar fits one row).
// The hubs arrive in Phase 3; until then these links 404 on staging.
export const NAV = [
  { label: 'Conditions', path: 'conditions/' },
  { label: 'Drought', path: 'drought/' },
  { label: 'Mesonet', path: 'mesonet/' },
  { label: 'Research', path: 'research/' },
  { label: 'News', path: 'news/' },
  { label: 'About', path: 'about/' },
] as const;
