// The summaries of the card on Ikhtisar as last read, and the requests still being written, per project. Ikhtisar is
// drawn again whenever the project bar's period or platforms change; the card reads from here first, so the summary
// stays on screen while the page reloads, and an answer that arrives while no card is there is kept for the next one.

const kept = new Map();      // project -> the stored state the server last sent (GET …/summary), with answers added
const running = new Map();   // `${project}|${format}` -> the request being written

/** The state last read or written for a project, or null. */
export function stored(topicId) {
  return kept.get(topicId) || null;
}

/** Keep what the server sent for a project. */
export function keep(topicId, data) {
  kept.set(topicId, data);
  return data;
}

/** Forget a project (tests, or a project that was deleted). */
export function forget(topicId) {
  kept.delete(topicId);
  for (const key of running.keys()) if (key.startsWith(topicId + '|')) running.delete(key);
}

/** The request writing this format for this project, or null. */
export function writing(topicId, format) {
  return running.get(`${topicId}|${format}`) || null;
}

/**
 * Write one format through `request` (a function returning the server's answer), once at a time per project and
 * format. The answer is kept whether or not a card is mounted when it arrives.
 * @returns {Promise<object>} the answer; a failure is passed on and nothing is kept
 */
export function write(topicId, format, request) {
  const key = `${topicId}|${format}`;
  if (running.has(key)) return running.get(key);
  // The request starts at once; one that throws before it returns is a failure like any other.
  const promise = new Promise(resolve => resolve(request())).then(made => {
    const current = kept.get(topicId) || { summaries: {} };
    kept.set(topicId, { ...current, summaries: { ...(current.summaries || {}), [format]: made } });
    return made;
  }).finally(() => { running.delete(key); });
  running.set(key, promise);
  return promise;
}
