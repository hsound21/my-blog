# CLAUDE.md

이 파일은 이 프로젝트에서 작업할 때 Claude Code가 따라야 할 지침입니다.

## 프로젝트 개요

마크다운(`.md`) 파일을 읽어 블로그 웹사이트로 변환하는 프로젝트입니다.

- **프레임워크 금지**: React, Vue, Svelte 등 프레임워크와 빌드 도구(webpack, vite 등) 없이 순수 **HTML / CSS / JavaScript(ES modules)** 만 사용합니다.
- 마크다운 파싱은 직접 구현하거나, 꼭 필요하면 단일 파일 라이브러리(예: `marked`)를 `vendor/`에 복사해 사용합니다. 추가 의존성은 사용자 확인 후에만 넣습니다.
- 디자인 목표: **깔끔하고 읽기 좋은** 글 중심 레이아웃, **다크 모드** 지원, **모바일 반응형**.

## 디렉터리 구조 (권장)

```
my-blog/
├── CLAUDE.md
├── index.html          # 단일 페이지 (헤더, #app, 테마 FOUC 방지 인라인 스크립트)
├── posts/              # 마크다운 원본 글 (YYYY-MM-DD-slug.md)
│   └── index.json      # 글 파일명 배열 (새 글 추가 시 수동으로 갱신)
├── css/
│   ├── base.css        # 리셋, CSS 변수(테마 토큰), 타이포그래피
│   ├── layout.css      # 헤더, 본문 컨테이너, 글 목록/상세, 반응형 규칙
│   └── markdown.css    # 본문(.prose) 스타일: 제목, 코드, 인용, 표 등
├── js/
│   ├── main.js         # 진입점: 글 로딩, 목록/상세/404 렌더링
│   ├── markdown.js     # front matter 파싱 + 마크다운 → HTML 변환 (직접 구현)
│   ├── router.js       # 해시 라우터: #/ (목록), #/post/<slug> (상세)
│   └── theme.js        # 다크 모드 토글
└── vendor/             # 외부 라이브러리를 쓸 경우에만 (현재 없음)
```

- 글 목록은 `posts/index.json`에 적힌 파일을 브라우저에서 `fetch`해 front matter로 정렬·표시합니다. **새 글을 추가하면 `index.json`에도 파일명을 추가해야 합니다.**
- 라우팅은 해시 기반이라 별도 서버 설정 없이 정적 호스팅(GitHub Pages 등)에 배포할 수 있습니다.

구조는 필요에 따라 바꿀 수 있지만, 변경 시 이 섹션도 함께 갱신합니다.

## 개발 / 실행

빌드 단계가 없습니다. `fetch()`로 마크다운을 읽기 때문에 `file://`로는 동작하지 않으므로 로컬 서버가 필요합니다.

```bash
python -m http.server 8000
```

그 후 `http://localhost:8000` 접속. 변경 후에는 브라우저 새로고침으로 확인합니다.

## 마크다운 글 형식

각 글은 상단에 YAML 형태의 front matter를 가집니다.

```markdown
---
title: 글 제목
date: 2026-10-29
tags: [javascript, css]
summary: 목록에 표시할 한 줄 요약
---

본문...
```

- 파일명은 `YYYY-MM-DD-slug.md`, slug는 영문 소문자와 하이픈만 사용합니다.
- 지원해야 할 문법: 제목, 문단, 강조, 링크, 이미지, 목록(중첩 포함), 인용, 인라인/블록 코드, 표, 구분선.
- 변환 시 HTML은 반드시 **이스케이프/새니타이즈**합니다 (`innerHTML` 주입 시 XSS 방지).

## 코딩 컨벤션

- **JavaScript**: ES modules(`type="module"`), `const`/`let`, 세미콜론 사용, 함수는 작고 한 가지 일만 하게 작성. 전역 변수 금지.
- **CSS**: 색상·간격·폰트는 모두 **CSS 변수**로 정의하고 하드코딩하지 않습니다. 클래스명은 소문자-하이픈(kebab-case).
- **HTML**: 시맨틱 태그(`header`, `main`, `article`, `nav`, `time`)를 사용하고, 이미지에는 `alt`를 넣습니다.
- 들여쓰기는 2칸, 파일은 UTF-8, 주석과 문서는 한국어로 작성해도 됩니다.
- 불필요한 추상화와 의존성을 추가하지 않습니다. 단순함이 우선입니다.

## 디자인 가이드

**읽기 좋은 타이포그래피**
- 본문 폭 최대 약 `70ch`(≈ 680–720px), 가운데 정렬.
- 본문 글자 크기 `1.0625–1.125rem`, 줄간격 `1.7–1.8`.
- 한글 가독성을 위해 시스템 폰트 스택 우선: `"Pretendard", -apple-system, "Apple SD Gothic Neo", "Malgun Gothic", system-ui, sans-serif`. 코드는 `ui-monospace, "SF Mono", Consolas, monospace`.
- 한글 줄바꿈은 `word-break: keep-all; overflow-wrap: break-word;`.
- 여백을 넉넉히 두고, 장식은 최소화합니다.

**다크 모드**
- `:root`에 라이트 테마 변수를, `[data-theme="dark"]`에 다크 테마 변수를 정의합니다.
- 첫 방문 시 `prefers-color-scheme`를 따르고, 사용자가 토글하면 `localStorage`에 저장합니다 (접근 실패 시 try/catch로 무시).
- 깜빡임(FOUC) 방지를 위해 테마 적용 스크립트는 `<head>`에서 CSS보다 먼저 인라인으로 실행합니다.
- 순수 검정/흰색 대신 부드러운 색(예: 배경 `#121212`~`#1a1a1a`, 텍스트 `#e6e6e6`)을 사용하고, 본문 대비는 WCAG AA(4.5:1) 이상을 유지합니다.
- 이미지·코드 블록도 다크 모드에서 눈부시지 않게 조정합니다.

**모바일 반응형**
- `<meta name="viewport" content="width=device-width, initial-scale=1">` 필수.
- 모바일 우선(mobile-first)으로 작성하고, 필요한 곳에만 `min-width` 미디어쿼리를 추가합니다 (예: 640px, 960px).
- 좌우 여백 최소 16px, 가로 스크롤 금지. 표와 코드 블록은 자체 `overflow-x: auto`.
- 터치 대상(버튼, 링크)은 최소 44×44px.
- 이미지는 `max-width: 100%; height: auto;`.

**접근성**
- 키보드 포커스 표시를 유지하고, 테마 토글 버튼에는 `aria-label`을 제공합니다.
- `prefers-reduced-motion`을 존중합니다.

## 작업 시 주의사항

- 기능을 추가하거나 수정한 뒤에는 로컬 서버에서 **라이트/다크 모드, 데스크톱/모바일 폭(약 375px)** 을 모두 확인합니다.
- 새 글 샘플을 추가하거나 마크다운 문법 지원을 바꿀 때는 `posts/`에 테스트용 글로 렌더링 결과를 검증합니다.
- 프레임워크, 번들러, npm 의존성을 임의로 도입하지 않습니다. 필요하다고 판단되면 먼저 사용자에게 물어봅니다.
