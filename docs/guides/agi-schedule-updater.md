# AGI Schedule Updater (TR Dashboard)

## Quick
- Search: 그냥 입력 → (레포의 스크롤 훅 연결 시) activity 포커스
- Commands:
  - /shift pivot=YYYY-MM-DD delta=+N includeLocked=false previewOnly=true
  - /shift pivot=YYYY-MM-DD new=YYYY-MM-DD
  - /bulk (textarea 입력 후 Bulk Preview)
  - /conflicts
  - /export mode=patch|full
  - /undo /redo /reset

## Bulk input format
ACT-001 2026-02-15
ACT-002=2026-02-18

## Safety
- 기본은 Preview → Apply 분리
- Undo/Redo는 Apply 단위
- Patch export는 변경 activity만 추출
