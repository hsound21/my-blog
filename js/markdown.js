// 의존성 없는 간단한 마크다운 변환기.
// 모든 텍스트는 먼저 이스케이프하므로 원문의 HTML은 그대로 출력되지 않는다.

export function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ---------- front matter ---------- */

export function parseFrontMatter(text) {
  const normalized = text.replace(/^﻿/, '').replace(/\r\n?/g, '\n');
  const match = normalized.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) return { meta: {}, body: normalized };

  const meta = {};
  for (const line of match[1].split('\n')) {
    const pair = line.match(/^([\w-]+)\s*:\s*(.*)$/);
    if (!pair) continue;
    const [, key, raw] = pair;
    const value = raw.trim();
    meta[key] = value.startsWith('[') && value.endsWith(']')
      ? value.slice(1, -1).split(',').map(unquote).filter(Boolean)
      : unquote(value);
  }
  return { meta, body: normalized.slice(match[0].length) };
}

function unquote(value) {
  return value.trim().replace(/^(['"])(.*)\1$/, '$2');
}

/* ---------- inline ---------- */

// 위험한 스킴(javascript: 등)은 '#'으로 대체한다. 입력은 이미 이스케이프된 상태.
function safeUrl(url) {
  const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(url);
  return !hasScheme || /^(https?:|mailto:)/i.test(url) ? url : '#';
}

function renderInline(source) {
  const stash = [];
  let text = source.replace(/(`+)([\s\S]*?[^`])\1(?!`)/g, (_, __, code) => {
    stash.push(`<code>${escapeHtml(code.trim())}</code>`);
    return `\u0000${stash.length - 1}\u0000`;
  });

  text = escapeHtml(text);

  text = text.replace(
    /!\[([^\]]*)\]\(([^)\s]+)(?:\s+&quot;(.*?)&quot;)?\)/g,
    (_, alt, url, title) =>
      `<img src="${safeUrl(url)}" alt="${alt}"${title ? ` title="${title}"` : ''} loading="lazy">`
  );

  text = text.replace(
    /\[([^\]]+)\]\(([^)\s]+)(?:\s+&quot;(.*?)&quot;)?\)/g,
    (_, label, url, title) => {
      const href = safeUrl(url);
      const external = /^https?:/i.test(href) ? ' target="_blank" rel="noopener noreferrer"' : '';
      return `<a href="${href}"${title ? ` title="${title}"` : ''}${external}>${label}</a>`;
    }
  );

  text = text
    .replace(/\*\*(?=\S)(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(?=\S)(.+?)__/g, '<strong>$1</strong>')
    .replace(/\*(?=\S)(.+?)\*/g, '<em>$1</em>')
    .replace(/(^|[^\w])_(?=\S)(.+?)_(?!\w)/g, '$1<em>$2</em>')
    .replace(/~~(?=\S)(.+?)~~/g, '<del>$1</del>')
    .replace(/ {2,}\n/g, '<br>\n');

  return text.replace(/\u0000(\d+)\u0000/g, (_, index) => stash[index]);
}

/* ---------- block ---------- */

const LIST_RE = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/;
const FENCE_RE = /^\s*(```|~~~)\s*([\w+-]*)/;
const HEADING_RE = /^\s{0,3}(#{1,6})\s+(.*?)\s*#*\s*$/;
const HR_RE = /^\s{0,3}([-*_])(\s*\1){2,}\s*$/;
const QUOTE_RE = /^\s{0,3}>/;
const TABLE_SEP_RE = /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/;

const indentOf = (line) => line.match(/^\s*/)[0].length;

function splitRow(line) {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split(/(?<!\\)\|/)
    .map((cell) => cell.trim().replace(/\\\|/g, '|'));
}

function isTableStart(lines, i) {
  return lines[i].includes('|') && i + 1 < lines.length
    && lines[i + 1].includes('-') && TABLE_SEP_RE.test(lines[i + 1]);
}

function startsBlock(lines, i) {
  const line = lines[i];
  return FENCE_RE.test(line) || HEADING_RE.test(line) || HR_RE.test(line)
    || QUOTE_RE.test(line) || LIST_RE.test(line) || isTableStart(lines, i);
}

function renderTable(lines, start) {
  const header = splitRow(lines[start]);
  const aligns = splitRow(lines[start + 1]).map((cell) => {
    const left = cell.startsWith(':');
    const right = cell.endsWith(':');
    return left && right ? 'center' : right ? 'right' : left ? 'left' : '';
  });
  const cell = (tag, content, index) =>
    `<${tag}${aligns[index] ? ` align="${aligns[index]}"` : ''}>${renderInline(content)}</${tag}>`;

  let i = start + 2;
  const rows = [];
  while (i < lines.length && lines[i].trim() && lines[i].includes('|')) {
    rows.push(splitRow(lines[i]));
    i++;
  }

  const head = `<thead><tr>${header.map((c, n) => cell('th', c, n)).join('')}</tr></thead>`;
  const body = `<tbody>${rows
    .map((row) => `<tr>${header.map((_, n) => cell('td', row[n] ?? '', n)).join('')}</tr>`)
    .join('')}</tbody>`;
  return { html: `<div class="table-wrap"><table>${head}${body}</table></div>`, next: i };
}

function renderList(lines, start) {
  const first = lines[start].match(LIST_RE);
  const base = first[1].length;
  const ordered = /\d/.test(first[2]);
  const items = [];
  let i = start;

  while (i < lines.length) {
    const match = lines[i].match(LIST_RE);
    if (!match || match[1].length !== base || /\d/.test(match[2]) !== ordered) break;

    const item = { text: match[3], children: [] };
    i++;
    while (i < lines.length) {
      if (!lines[i].trim()) {
        let j = i;
        while (j < lines.length && !lines[j].trim()) j++;
        if (j < lines.length && indentOf(lines[j]) > base) {
          item.children.push(...lines.slice(i, j));
          i = j;
          continue;
        }
        i = j;
        break;
      }
      if (indentOf(lines[i]) <= base) break;
      item.children.push(lines[i]);
      i++;
    }
    items.push(item);
  }

  const html = items
    .map(({ text, children }) => {
      const nested = children.filter((l) => l.trim());
      const cut = nested.length ? Math.min(...nested.map(indentOf)) : 0;
      const inner = nested.length ? renderBlocks(children.map((l) => l.slice(cut))) : '';
      return `<li>${renderInline(text)}${inner}</li>`;
    })
    .join('');

  const startNumber = parseInt(first[2], 10);
  const tag = ordered ? 'ol' : 'ul';
  const attr = ordered && startNumber !== 1 ? ` start="${startNumber}"` : '';
  return { html: `<${tag}${attr}>${html}</${tag}>`, next: i };
}

function renderBlocks(lines) {
  const out = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }

    let match;

    if ((match = line.match(FENCE_RE))) {
      const [, fence, lang] = match;
      const buffer = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith(fence)) buffer.push(lines[i++]);
      i++;
      const cls = lang ? ` class="language-${escapeHtml(lang)}"` : '';
      out.push(`<pre><code${cls}>${escapeHtml(buffer.join('\n'))}</code></pre>`);
      continue;
    }

    if ((match = line.match(HEADING_RE))) {
      const level = match[1].length;
      out.push(`<h${level}>${renderInline(match[2])}</h${level}>`);
      i++;
      continue;
    }

    if (HR_RE.test(line)) { out.push('<hr>'); i++; continue; }

    if (QUOTE_RE.test(line)) {
      const buffer = [];
      while (i < lines.length && QUOTE_RE.test(lines[i])) {
        buffer.push(lines[i].replace(/^\s{0,3}>\s?/, ''));
        i++;
      }
      out.push(`<blockquote>${renderBlocks(buffer)}</blockquote>`);
      continue;
    }

    if (isTableStart(lines, i)) {
      const table = renderTable(lines, i);
      out.push(table.html);
      i = table.next;
      continue;
    }

    if (LIST_RE.test(line)) {
      const list = renderList(lines, i);
      out.push(list.html);
      i = list.next;
      continue;
    }

    const buffer = [line];
    i++;
    while (i < lines.length && lines[i].trim() && !startsBlock(lines, i)) buffer.push(lines[i++]);
    out.push(`<p>${renderInline(buffer.join('\n'))}</p>`);
  }

  return out.join('\n');
}

export function renderMarkdown(source) {
  const lines = source.replace(/\r\n?/g, '\n').replace(/\t/g, '    ').split('\n');
  return renderBlocks(lines);
}
