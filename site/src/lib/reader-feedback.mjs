/** Public repository node id from the GitHub API (`node_id`). This is not a Discussion category id. */
export const REPO = 'VirusPC/edges-brain-viruspc';
export const REPO_ID = 'R_kgDOQzfxSQ';
export const GISCUS_ORIGIN = 'https://giscus.app';
export const ISSUE_TEMPLATE = 'reader-feedback.yml';

/** Comments category id read from GitHub after Discussions were enabled. */
export const GISCUS = {
  repo: REPO,
  repoId: REPO_ID,
  category: 'Comments',
  categoryId: 'DIC_kwDOQzfxSc4DLqmP',
  lang: 'zh-CN',
};

export function giscusReady(config = GISCUS) {
  return [config.repo, config.repoId, config.category, config.categoryId].every(
    (value) => typeof value === 'string' && value.trim() !== '',
  );
}

/** Pathname including the site base, with one trailing slash, and no query or hash. */
export function discussionPath(pathname) {
  const raw = typeof pathname === 'string' && pathname.startsWith('/') ? pathname : '/';
  if (raw === '/') return '/';
  return `${raw.replace(/\/+$/, '')}/`;
}

export function pageUrlForFeedback(href, origin) {
  try {
    const url = new URL(href, origin);
    if (url.origin !== origin) return '';
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return '';
    url.hash = '';
    return url.toString();
  } catch {
    return '';
  }
}

export function feedbackIssueUrl(pageUrl = '') {
  const url = new URL(`https://github.com/${REPO}/issues/new`);
  url.searchParams.set('template', ISSUE_TEMPLATE);
  if (pageUrl) url.searchParams.set('page', pageUrl);
  return url.toString();
}

export function giscusTheme(explicit, systemDark) {
  if (explicit === 'dark') return 'dark';
  if (explicit === 'light') return 'light';
  return systemDark ? 'dark' : 'light';
}
