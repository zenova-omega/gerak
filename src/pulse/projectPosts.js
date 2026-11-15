import { createContext, useSyncExternalStore } from 'react';
/** The posts of the project in the current scope, for small previews (account card, top posts of a day)
 * that need them far from where the data was loaded. Null outside a project page. */
export const ProjectPostsContext = createContext(null);

// The posts a project page loaded for the project bar's period, for what sits outside the page and counts from the
// same selection: the project bar above it (its coverage badge) and Sumber & Cakupan. One list at a time, the one
// the page holds anyway; it is named by project and period, so a list loaded for other days is never read as these.
const EMPTY = Object.freeze({ key: '', posts: null });
let shared = EMPTY;
const listeners = new Set();
const keyOf = (topicId, period) => (topicId ? `${topicId}|${period?.from || ''}|${period?.to || ''}` : '');
const subscribe = listener => { listeners.add(listener); return () => listeners.delete(listener); };

/** Called by whoever loaded a project's posts for a period (all platforms, as the server sent them). */
export function shareProjectPosts(topicId, period, posts) {
  const key = Array.isArray(posts) ? keyOf(topicId, period) : '';
  if (!key || (shared.key === key && shared.posts === posts)) return;
  shared = { key, posts };
  listeners.forEach(listener => listener());
}

/** The shared posts of this project and period, or null when no page has loaded them. */
export function useSharedProjectPosts(topicId, period) {
  const snapshot = useSyncExternalStore(subscribe, () => shared, () => EMPTY);
  return snapshot.key && snapshot.key === keyOf(topicId, period) ? snapshot.posts : null;
}
