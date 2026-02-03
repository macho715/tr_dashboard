# DocOps — Move Policy

## 원칙
- 파일 이동/rename/delete는 **Plan → Approve → Apply** 분리
- Apply 없이 실제 변경 금지 (auto_apply=false 기본)
- 이동 계획은 docs/_meta/plans/docops.plan.json에 기록

## 허용 이동 예시(규칙 확장 시)
- 루트의 WORK_LOG_*.md → docs/10_WORK/
- 루트의 BUGFIX_*.md → docs/10_WORK/ 또는 docs/20_SPECS/
- 규칙 추가 시 docops.py build_plan() 룰 확장

## 검증
- 이동 후 docops verify 실행으로 링크/REF 깨짐 확인
