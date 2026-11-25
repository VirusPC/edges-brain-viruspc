/**
 * One-click subscribe control. The copied sentence is the whole prompt.
 * Schedule and push format stay on the guide page.
 */

export const SUBSCRIBE_PAGE_URL = 'https://viruspc.github.io/edges-brain-viruspc/ai-news/subscribe/';
export const LATEST_JSON_URL = 'https://viruspc.github.io/edges-brain-viruspc/ai-news/latest.json';
export const SUBSCRIBE_PROMPT = `请打开这个说明页，按里面的规则建立一条定时任务，查询最新的 AI 资讯：${SUBSCRIBE_PAGE_URL}`;

export const SUBSCRIBE_LABELS = {
  default: '复制订阅提示词',
  copied: '已复制',
  failed: '复制失败',
};

const REVERT_MS = 2000;
const timers = new WeakMap();

/**
 * @param {ParentNode} row
 * @param {'default' | 'copied' | 'failed'} state
 */
export function applySubscribeState(row, state) {
  const button = row.querySelector('.sub-copy');
  const label = row.querySelector('.sub-label');
  if (!button || !label) return;
  const name = state === 'copied' || state === 'failed' ? state : 'default';
  row.classList.toggle('is-failed', name === 'failed');
  button.classList.toggle('is-copied', name === 'copied');
  button.classList.toggle('is-failed', name === 'failed');
  label.textContent = SUBSCRIBE_LABELS[name];
  if (name === 'failed') selectFallbackText(row);
}

/**
 * @param {ParentNode} row
 */
export function selectFallbackText(row) {
  const node = row.querySelector('.sub-fallback-text');
  const doc = node?.ownerDocument;
  const view = doc?.defaultView;
  if (!node || typeof doc?.createRange !== 'function' || typeof view?.getSelection !== 'function') return;
  const selection = view.getSelection();
  if (!selection) return;
  const range = doc.createRange();
  range.selectNodeContents(node);
  selection.removeAllRanges();
  selection.addRange(range);
}

/**
 * @param {ParentNode} row
 * @param {{ fail?: boolean, writeText?: (text: string) => Promise<void>, schedule?: Function, clear?: Function, revertMs?: number, view?: Window }} [options]
 */
export async function copySubscribePrompt(row, options = {}) {
  const revertMs = options.revertMs ?? REVERT_MS;
  const schedule = options.schedule ?? ((fn, ms) => setTimeout(fn, ms));
  const clear = options.clear ?? ((id) => clearTimeout(id));
  const writeText = options.writeText ?? (async (text) => {
    const view = options.view ?? row.ownerDocument?.defaultView;
    const clipboard = view?.navigator?.clipboard;
    if (!clipboard?.writeText) throw new Error('clipboard unavailable');
    await clipboard.writeText(text);
  });
  const pending = timers.get(row);
  if (pending != null) {
    clear(pending);
    timers.delete(row);
  }
  try {
    if (options.fail) throw new Error('clipboard denied');
    await writeText(SUBSCRIBE_PROMPT);
    applySubscribeState(row, 'copied');
    timers.set(row, schedule(() => {
      timers.delete(row);
      applySubscribeState(row, 'default');
    }, revertMs));
    return 'copied';
  } catch {
    applySubscribeState(row, 'failed');
    return 'failed';
  }
}

/**
 * @param {ParentNode} doc
 * @param {{ params?: URLSearchParams, search?: string, fail?: boolean, writeText?: (text: string) => Promise<void>, schedule?: Function, clear?: Function, revertMs?: number }} [options]
 */
export function mountSubscribeCopy(doc, options = {}) {
  const params = options.params
    ?? new URLSearchParams(options.search ?? doc.defaultView?.location?.search ?? '');
  const forced = params.get('state');
  const fail = params.get('fail') === '1' || options.fail === true;
  for (const row of doc.querySelectorAll('[data-subscribe-copy]')) {
    if (row.dataset.subscribeReady === '1') continue;
    row.dataset.subscribeReady = '1';
    const text = row.querySelector('.sub-fallback-text');
    if (text && text.textContent !== SUBSCRIBE_PROMPT) text.textContent = SUBSCRIBE_PROMPT;
    if (forced === 'copied' || forced === 'failed') applySubscribeState(row, forced);
    const button = row.querySelector('.sub-copy');
    if (!button) continue;
    button.addEventListener('click', () => {
      copySubscribePrompt(row, {
        fail,
        writeText: options.writeText,
        schedule: options.schedule,
        clear: options.clear,
        revertMs: options.revertMs,
        view: doc.defaultView,
      });
    });
  }
}
