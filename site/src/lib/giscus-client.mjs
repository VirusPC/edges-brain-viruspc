import { GISCUS, GISCUS_ORIGIN, discussionPath, giscusReady, giscusTheme } from './reader-feedback.mjs';

export function giscusScriptAttributes(pathname, theme) {
  return {
    src: 'https://giscus.app/client.js',
    crossorigin: 'anonymous',
    'data-repo': GISCUS.repo,
    'data-repo-id': GISCUS.repoId,
    'data-category': GISCUS.category,
    'data-category-id': GISCUS.categoryId,
    'data-mapping': 'specific',
    'data-term': discussionPath(pathname),
    'data-strict': '1',
    'data-reactions-enabled': '1',
    'data-emit-metadata': '0',
    'data-input-position': 'bottom',
    'data-theme': theme,
    'data-lang': GISCUS.lang,
    'data-loading': 'lazy',
  };
}

/** Tell an existing giscus frame to follow the site theme. The target origin is fixed. */
export function postGiscusTheme(iframe, theme) {
  if (!iframe?.contentWindow) return false;
  iframe.contentWindow.postMessage({ giscus: { setConfig: { theme } } }, GISCUS_ORIGIN);
  return true;
}

export function mountGiscus(root, view = window) {
  if (!giscusReady() || !root) return () => {};
  const slot = root.querySelector('[data-giscus]');
  if (!slot) return () => {};
  const doc = view.document;
  let loaded = false;

  const themeNow = () =>
    giscusTheme(doc.documentElement.getAttribute('data-theme'), view.matchMedia('(prefers-color-scheme: dark)').matches);

  const load = () => {
    if (loaded) return;
    loaded = true;
    const script = doc.createElement('script');
    const attrs = giscusScriptAttributes(view.location.pathname, themeNow());
    script.src = attrs.src;
    script.async = true;
    script.crossOrigin = 'anonymous';
    for (const [key, value] of Object.entries(attrs)) {
      if (key === 'src' || key === 'crossorigin') continue;
      script.setAttribute(key, value);
    }
    slot.append(script);
  };

  const observer = new IntersectionObserver(
    (entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      load();
      observer.disconnect();
    },
    { rootMargin: '240px 0px' },
  );
  observer.observe(slot);

  const onTheme = () => {
    postGiscusTheme(root.querySelector('iframe.giscus-frame'), themeNow());
  };
  view.addEventListener('themechange', onTheme);
  const media = view.matchMedia('(prefers-color-scheme: dark)');
  const onSystem = () => {
    if (doc.documentElement.hasAttribute('data-theme')) return;
    onTheme();
  };
  media.addEventListener?.('change', onSystem);

  return () => {
    observer.disconnect();
    view.removeEventListener('themechange', onTheme);
    media.removeEventListener?.('change', onSystem);
  };
}
