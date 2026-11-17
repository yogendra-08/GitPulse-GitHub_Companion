/** Message types exchanged between extension pages and the background worker. */
export const MESSAGE = {
  /** Ask the worker to re-check notifications immediately. */
  pollNow: 'gitpulse:poll-now',
} as const;

export interface ExtensionMessage {
  type: (typeof MESSAGE)[keyof typeof MESSAGE];
}

/** Fire-and-forget message to the background worker. Safe outside the extension. */
export async function sendToBackground(message: ExtensionMessage): Promise<void> {
  if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) return;
  try {
    await chrome.runtime.sendMessage(message);
  } catch {
    /* the worker may be starting up; the next alarm will catch up */
  }
}
