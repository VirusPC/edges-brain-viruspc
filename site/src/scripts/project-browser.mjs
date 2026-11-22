const STORAGE_PREFIX = 'project-browser:';

/**
 * Chevron expands one preview. The title link is a separate control.
 * Back navigation prefers the browser's own page cache. A full reload
 * restores the expanded ids and scroll once fonts have settled.
 * A hash on a direct visit scrolls to that target and does not need saved state.
 */
export function installProjectBrowser() {
  const browser = document.querySelector('[data-project-browser]');
  if (!browser || browser.dataset.projectReady === 'true') return;
  browser.dataset.projectReady = 'true';
  const key = `${STORAGE_PREFIX}${location.pathname}`;

  const toggles = () => [...browser.querySelectorAll('[data-project-toggle]')];
  const statementButton = browser.querySelector('[data-project-statement]');

  function setToggle(button, open) {
    const panel = document.getElementById(button.getAttribute('aria-controls') || '');
    button.setAttribute('aria-expanded', open ? 'true' : 'false');
    const title = button.getAttribute('data-project-title') || '';
    button.setAttribute('aria-label', `${open ? '收起' : '展开'} ${title}`);
    if (panel) panel.hidden = !open;
  }

  function setStatement(open) {
    if (!statementButton) return;
    const panel = document.getElementById(statementButton.getAttribute('aria-controls') || '');
    statementButton.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (panel) panel.hidden = !open;
  }

  function snapshot() {
    return {
      expanded: toggles()
        .filter((button) => button.getAttribute('aria-expanded') === 'true')
        .map((button) => button.getAttribute('data-project-toggle')),
      statement: statementButton?.getAttribute('aria-expanded') === 'true',
      scrollY: window.scrollY,
    };
  }

  function save() {
    try {
      sessionStorage.setItem(key, JSON.stringify(snapshot()));
    } catch {
      /* private mode or a full store */
    }
  }

  function read() {
    try {
      const raw = sessionStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
      return null;
    }
  }

  function decodeHash(hash) {
    const raw = hash.replace(/^#/, '');
    if (!raw) return '';
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  }

  function revealHash() {
    const id = decodeHash(location.hash);
    if (!id) return;
    const target = document.getElementById(id);
    if (!target) return;
    const panel = target.closest('[data-project-panel]');
    if (panel) {
      const button = toggles().find((item) => item.getAttribute('aria-controls') === panel.id);
      if (button) setToggle(button, true);
    }
    target.scrollIntoView();
  }

  async function restore(saved) {
    if (saved) {
      const open = new Set(Array.isArray(saved.expanded) ? saved.expanded : []);
      for (const button of toggles()) {
        setToggle(button, open.has(button.getAttribute('data-project-toggle')));
      }
      if (typeof saved.statement === 'boolean') setStatement(saved.statement);
    }
    if (location.hash) {
      revealHash();
      return;
    }
    if (!saved || typeof saved.scrollY !== 'number') return;
    if (document.fonts?.ready) {
      try {
        await document.fonts.ready;
      } catch {
        /* layout can still move */
      }
    }
    const y = saved.scrollY;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => window.scrollTo(0, y));
    });
  }

  for (const button of toggles()) {
    button.addEventListener('click', () => {
      setToggle(button, button.getAttribute('aria-expanded') !== 'true');
      save();
    });
  }
  statementButton?.addEventListener('click', () => {
    setStatement(statementButton.getAttribute('aria-expanded') !== 'true');
    save();
  });

  window.addEventListener('pagehide', save);
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) return;
    restore(read());
  });
  if (document.readyState === 'complete') restore(read());
}

installProjectBrowser();
