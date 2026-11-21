export const THEME_KEY = 'theme';

/**
 * @param {Pick<Storage, 'getItem'> | null | undefined} storage
 */
export function readStoredTheme(storage) {
  try {
    const value = storage?.getItem(THEME_KEY);
    return value === 'light' || value === 'dark' ? value : null;
  } catch {
    return null;
  }
}

/**
 * @param {Pick<Storage, 'setItem'> | null | undefined} storage
 * @param {'light' | 'dark'} theme
 */
export function writeStoredTheme(storage, theme) {
  try {
    storage?.setItem(THEME_KEY, theme);
    return true;
  } catch {
    return false;
  }
}

/**
 * @param {string | null} explicit
 * @param {boolean} systemDark
 */
export function resolvedTheme(explicit, systemDark) {
  if (explicit === 'light' || explicit === 'dark') return explicit;
  return systemDark ? 'dark' : 'light';
}

/**
 * @param {Document} [doc]
 * @param {Window} [view]
 * @param {Storage | null} [storage]
 */
export function bindThemeToggle(doc = document, view = window, storage = null) {
  const store = storage === null ? view.localStorage : storage;
  const button = doc.querySelector('[data-theme-toggle]');
  if (!button) return () => {};
  const media = view.matchMedia('(prefers-color-scheme: dark)');
  const root = doc.documentElement;

  const labelFor = (theme) => (theme === 'dark' ? '切换为白天模式' : '切换为黑夜模式');

  const sync = () => {
    const theme = resolvedTheme(root.getAttribute('data-theme'), media.matches);
    button.setAttribute('aria-label', labelFor(theme));
    button.setAttribute('aria-pressed', root.hasAttribute('data-theme') ? 'true' : 'false');
  };

  const notify = () => {
    view.dispatchEvent(new Event('themechange'));
    sync();
  };

  const onClick = () => {
    const current = resolvedTheme(root.getAttribute('data-theme'), media.matches);
    const next = current === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    writeStoredTheme(store, next);
    notify();
  };

  const onSystem = () => {
    if (root.hasAttribute('data-theme')) return;
    notify();
  };

  button.addEventListener('click', onClick);
  media.addEventListener?.('change', onSystem);
  sync();
  return () => {
    button.removeEventListener('click', onClick);
    media.removeEventListener?.('change', onSystem);
  };
}
