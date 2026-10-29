// 해시 기반 라우터: #/ (목록), #/post/<slug> (상세)
function parseHash() {
  const path = location.hash.replace(/^#/, '') || '/';
  const match = path.match(/^\/post\/([^/]+)\/?$/);
  if (match) return { name: 'post', slug: decodeURIComponent(match[1]) };
  if (path === '/') return { name: 'home' };
  return { name: 'notfound' };
}

export function onRoute(handler) {
  const run = () => handler(parseHash());
  window.addEventListener('hashchange', run);
  run();
}
