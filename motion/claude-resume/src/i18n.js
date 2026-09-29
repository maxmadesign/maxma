// Preview-player UI strings. Mirrors the repo convention (AGENTS.md): default zh-CN, system
// preference read on first visit, a persisted manual toggle that always wins.
// This static page has no Next.js runtime, so the dictionary lives here instead of next-intl.

export const DICT = {
  'zh-CN': {
    title: '动态简历',
    play: '播放',
    pause: '暂停',
    playAria: '播放或暂停（空格键）',
    frameAria: '帧',
    fullMotion: '完整动效',
    canvasAria: '动态简历动画',
    switchTo: 'EN',
    switchAria: 'Switch to English',
  },
  'en-US': {
    title: 'Motion Résumé',
    play: 'Play',
    pause: 'Pause',
    playAria: 'Play or pause (space)',
    frameAria: 'Frame',
    fullMotion: 'Full motion',
    canvasAria: 'Motion résumé animation',
    switchTo: '中文',
    switchAria: '切换到中文',
  },
};

const KEY = 'motion-resume.locale';

function read() {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved && DICT[saved]) return saved;
  } catch {}
  const sys = (navigator.languages?.[0] || navigator.language || '').toLowerCase();
  return sys.startsWith('en') ? 'en-US' : 'zh-CN';
}

export let locale = read();
export const t = (key) => DICT[locale][key] ?? DICT['en-US'][key] ?? key;

export function setLocale(next) {
  locale = next;
  try { localStorage.setItem(KEY, next); } catch {}
}

/** Apply dictionary strings to elements marked with data-i18n / data-i18n-aria. */
export function applyStrings(root = document) {
  document.documentElement.lang = locale;
  document.title = t('title');
  root.querySelectorAll('[data-i18n]').forEach((el) => (el.textContent = t(el.dataset.i18n)));
  root.querySelectorAll('[data-i18n-aria]').forEach((el) => el.setAttribute('aria-label', t(el.dataset.i18nAria)));
}
