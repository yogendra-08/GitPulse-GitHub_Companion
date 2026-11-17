/** Open a URL in a new tab. Uses the Tabs API inside the extension (no extra permission needed). */
export function openUrl(url: string): void {
  if (typeof chrome !== 'undefined' && chrome.tabs?.create) {
    void chrome.tabs.create({ url });
  } else {
    window.open(url, '_blank', 'noopener');
  }
}

/** Absolute URL of a dashboard route, e.g. dashboardUrl('/pulls'). */
export function dashboardUrl(path = '/'): string {
  const base = typeof chrome !== 'undefined' && chrome.runtime?.getURL ? chrome.runtime.getURL('app.html') : '/app.html';
  return `${base}#${path}`;
}
