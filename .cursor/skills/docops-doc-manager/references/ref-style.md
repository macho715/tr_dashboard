# DocOps — REF Style

## REF 표기
- 상대 경로 링크 사용: `[LAYOUT.md](LAYOUT.md)` 또는 `[LAYOUT](../LAYOUT.md)`
- SSOT 우선: patch.md → LAYOUT.md → SYSTEM_ARCHITECTURE.md → AGENTS.md 순으로 링크
- "Refs:" 또는 "## Refs" 섹션에 정리

## 자동 삽입 제한
- 명시적으로 문서 내에 링크/파일명이 언급된 경우만 REF로 인정
- 과잉 자동 REF 삽입 금지 (docops-rules.md)
