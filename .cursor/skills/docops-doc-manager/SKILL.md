---
name: docops-doc-manager
description: 문서정리/문서 만들기 시, 각 서류마다 최신 작업 내용 반영(필수), 인벤토리/REF/인덱스/이동계획(Plan→Approve→Apply)/검증까지 DocOps로 일괄 처리할 때 사용.
compatibility:
  network: optional
  filesystem: required
  git: optional
---

# DocOps — Documentation Manager

## 최우선: 최신 작업 내용 반영
- **각 서류마다** 최신 작업 내용을 반영하여 문서를 업데이트한다 (가장 중요한 단계).
- 소스: WORK_LOG_*.md, BUGFIX_APPLIED_*.md, IMPLEMENTATION_SUMMARY.md, docs/plan/*, docs/00_INBOX/chat/*.
- 규칙: [references/docops-latest-work.md](references/docops-latest-work.md)

## 언제 사용
- 사용자가 "문서정리" 또는 "문서 만들기"라고 입력했을 때
- 문서가 여러 곳에 흩어져 있고, 상호 REF(참조) / 위치 / 규격이 깨졌을 때
- 여러 기능/패치/버그픽스 진행 내용을 **각 문서에 반영**하고 일괄 정리해야 할 때

## SSOT 우선순위
1) patch.md (있으면 최우선)
2) LAYOUT.md, SYSTEM_ARCHITECTURE.md
3) AGENTS.md
4) docs/plan/, WORK_LOG_*.md, BUGFIX_*.md
5) 나머지 md 문서

## 하드 룰(안전)
- 파일 이동/rename/delete는 반드시 Plan→Approve→Apply 분리
- Apply 없이 실제 변경 금지 (AUTO_APPLY는 명시적 설정/문구가 있을 때만)
- 문서 변경은 docs 커밋 규율을 따른다(파이프라인 실패 시 커밋 중단)

## Mermaid 그래프
- **필요 시** Mermaid 스타일 그래프를 만들고 문서에 삽입한다.
- 용도: 문서 간 REF/참조 관계, DocOps 워크플로우, Phase·의존성, 데이터/상태 흐름 등.
- 규칙: [references/docops-mermaid.md](references/docops-mermaid.md)

## 실행(권장)
1) Inventory/Analysis (docops-scout)
2) **최신 작업 내용 반영** (WORK_LOG/BUGFIX/plan → 각 문서에 반영, docops-latest-work.md 준수)
3) Update/Ref/Index (docops-autopilot). **필요 시 Mermaid 그래프 생성·삽입.**
4) Verify (docops-verifier)
5) (옵션) git 커밋: docs: <summary>

## 스크립트
- 계획 생성: `python .cursor/skills/docops-doc-manager/scripts/docops.py plan`
- 적용(승인 후): `python .cursor/skills/docops-doc-manager/scripts/docops.py apply docs/_meta/plans/docops.plan.json`
- 검증: `python .cursor/skills/docops-doc-manager/scripts/docops.py verify`
