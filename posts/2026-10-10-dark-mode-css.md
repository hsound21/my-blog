---
title: CSS 변수로 다크 모드 만들기
date: 2026-10-10
tags: [css, 다크모드]
summary: CSS 변수 몇 개와 작은 스크립트로 깜빡임 없는 다크 모드를 구현하는 방법.
---

다크 모드의 핵심은 **색을 변수로 분리**하는 것입니다.

## 1. 색상 토큰 정의

```css
:root {
  --bg: #ffffff;
  --fg: #1f2328;
}

[data-theme="dark"] {
  --bg: #151618;
  --fg: #e6e7e9;
}

body {
  background: var(--bg);
  color: var(--fg);
}
```

## 2. 깜빡임 방지

CSS가 로드되기 전에 `<head>`의 인라인 스크립트로 `data-theme`을 먼저 설정합니다.

## 3. 사용자 선택 기억

`localStorage`에 저장하되, 접근이 막힌 환경을 대비해 `try/catch`로 감쌉니다.

> 순수한 검정(`#000`)보다 약간 밝은 어두운 회색이 눈이 편합니다.
