# DocOps — Document Template Pack

## 목적
DocOps에서 새 문서 생성/갱신 시 사용하는 템플릿 모음. SSOT·REF·doc_id 규칙을 반영한다.

## 기본 frontmatter (YAML)
```yaml
---
doc_id: <고유 식별자>
refs: [patch.md, LAYOUT.md, AGENTS.md]
updated: YYYY-MM-DD
---
```

## Refs 섹션 (문서 하단)
```markdown
## Refs
- [patch.md](patch.md)
- [LAYOUT.md](LAYOUT.md)
- [AGENTS.md](AGENTS.md)
```

## 참고
- 상세 규칙: docops-rules.md
- REF 스타일: ref-style.md
- 이동 정책: move-policy.md
