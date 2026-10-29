const STORAGE_KEY = 'theme';
const root = document.documentElement;
const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');

function readStored() {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === 'light' || value === 'dark' ? value : null;
  } catch {
    return null;
  }
}

function store(theme) {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // 저장소를 쓸 수 없어도 현재 세션에서는 동작한다.
  }
}

function applyTheme(theme) {
  root.setAttribute('data-theme', theme);
}

export function initTheme() {
  const button = document.getElementById('theme-toggle');

  button.addEventListener('click', () => {
    const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    store(next);
  });

  // 사용자가 직접 고르지 않았다면 시스템 설정 변경을 따라간다.
  darkQuery.addEventListener('change', (event) => {
    if (!readStored()) applyTheme(event.matches ? 'dark' : 'light');
  });
}
