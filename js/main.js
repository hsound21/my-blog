import { initTheme } from './theme.js';
import { onRoute } from './router.js';
import { escapeHtml, parseFrontMatter, renderMarkdown } from './markdown.js';

const SITE_TITLE = 'My Blog';
const app = document.getElementById('app');

let postsPromise = null;

async function fetchPost(file) {
  const response = await fetch(`posts/${encodeURIComponent(file)}`);
  if (!response.ok) throw new Error(`${file}: ${response.status}`);
  const { meta, body } = parseFrontMatter(await response.text());
  const slug = file.replace(/\.md$/, '');
  return {
    slug,
    title: meta.title || slug,
    date: meta.date || '',
    tags: Array.isArray(meta.tags) ? meta.tags : [],
    summary: meta.summary || '',
    body,
  };
}

function loadPosts() {
  postsPromise ??= (async () => {
    const response = await fetch('posts/index.json');
    if (!response.ok) throw new Error(`index.json: ${response.status}`);
    const files = await response.json();
    const results = await Promise.allSettled(files.map(fetchPost));
    results.forEach((r) => r.status === 'rejected' && console.warn(r.reason));
    return results
      .filter((r) => r.status === 'fulfilled')
      .map((r) => r.value)
      .sort((a, b) => b.date.localeCompare(a.date));
  })();
  return postsPromise;
}

function formatDate(date) {
  const parsed = new Date(`${date}T00:00:00`);
  if (!date || Number.isNaN(parsed.getTime())) return '';
  return parsed.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
}

function dateHtml(date) {
  const label = formatDate(date);
  return label ? `<time datetime="${escapeHtml(date)}">${label}</time>` : '';
}

function tagsHtml(tags) {
  if (!tags.length) return '';
  const items = tags.map((tag) => `<li class="tag">${escapeHtml(tag)}</li>`).join('');
  return `<ul class="tags" aria-label="태그">${items}</ul>`;
}

function renderHome(posts) {
  document.title = SITE_TITLE;
  if (!posts.length) {
    app.innerHTML = '<p class="status">아직 작성된 글이 없습니다.</p>';
    return;
  }
  const items = posts
    .map((post) => `
      <li class="post-item">
        <a class="post-link" href="#/post/${encodeURIComponent(post.slug)}">
          <div class="post-meta">${dateHtml(post.date)}${tagsHtml(post.tags)}</div>
          <h2 class="post-title">${escapeHtml(post.title)}</h2>
          ${post.summary ? `<p class="post-summary">${escapeHtml(post.summary)}</p>` : ''}
        </a>
      </li>`)
    .join('');
  app.innerHTML = `<h1 class="page-heading">최근 글</h1><ul class="post-list">${items}</ul>`;
}

function renderPost(post) {
  document.title = `${post.title} · ${SITE_TITLE}`;
  app.innerHTML = `
    <a class="back-link" href="#/">← 글 목록</a>
    <article>
      <header class="post-header">
        <div class="post-meta">${dateHtml(post.date)}${tagsHtml(post.tags)}</div>
        <h1>${escapeHtml(post.title)}</h1>
      </header>
      <div class="prose">${renderMarkdown(post.body)}</div>
    </article>`;
}

function renderNotFound() {
  document.title = `찾을 수 없음 · ${SITE_TITLE}`;
  app.innerHTML = `
    <p class="status">요청하신 페이지를 찾을 수 없습니다.<br><a href="#/">글 목록으로 돌아가기</a></p>`;
}

async function handleRoute(route) {
  try {
    if (route.name === 'notfound') return renderNotFound();
    const posts = await loadPosts();
    if (route.name === 'home') return renderHome(posts);
    const post = posts.find((p) => p.slug === route.slug);
    return post ? renderPost(post) : renderNotFound();
  } catch (error) {
    console.error(error);
    document.title = SITE_TITLE;
    app.innerHTML = '<p class="status">글을 불러오지 못했습니다. 로컬 서버로 실행 중인지 확인해 주세요.</p>';
  } finally {
    window.scrollTo(0, 0);
  }
}

document.getElementById('year').textContent = new Date().getFullYear();
initTheme();
onRoute(handleRoute);
