/**
 * Unified admin navigation — single source of truth shared by the legacy SINAR
 * admin shell (App.jsx) and the new Command Center shell (CommandCenter.jsx).
 * Keeping both sidebars from one config is what makes them identical, so the
 * user perceives a single application instead of two.
 *
 * - OPERASI_ITEMS render in the legacy admin (mode==='admin') via its internal
 *   `adSideTab` state. From the Command Center they are links to /admin?tab=<id>.
 * - COMMAND_CENTER_ITEMS render in the Command Center router. From the legacy
 *   admin they are links to /command-center/<id>.
 */

// Valid legacy admin section ids (must match App.jsx adSideTab cases).
export const OPERASI_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
  { id: 'misi', label: 'Manajemen Misi', icon: 'assignment' },
  { id: 'agents', label: 'Anggota', icon: 'group' },
  { id: 'broadcast', label: 'Broadcast', icon: 'campaign' },
  { id: 'settings', label: 'Pengaturan', icon: 'settings' },
];

export const OPERASI_IDS = OPERASI_ITEMS.map((i) => i.id);

export const COMMAND_CENTER_ITEMS = [
  { id: 'pulse', label: 'Pulse', sub: 'Social Listening', icon: 'sensors', enabled: true },
  { id: 'survey', label: 'Survey', sub: 'Polling & Hasil', icon: 'ballot', enabled: true },
  { id: 'studio', label: 'Studio', sub: 'Konten AI', icon: 'auto_awesome', enabled: true },
  { id: 'scheduler', label: 'Scheduler', sub: 'Distribusi', icon: 'schedule', enabled: true },
  { id: 'rally', label: 'Rally', sub: 'Engagement', icon: 'groups', enabled: false },
  { id: 'campaigns', label: 'Campaigns', sub: 'Orkestrasi', icon: 'flag', enabled: false },
];

export const adminTabHref = (id) => `/admin?tab=${id}`;
export const commandCenterHref = (id) => `/command-center/${id}`;
