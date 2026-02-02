# DocOps Rules (요약)

## 최우선: 최신 작업 내용 반영
- **각 서류마다** 최신 작업 내용을 반영하여 문서를 업데이트한다.
- 소스: WORK_LOG_*.md, BUGFIX_APPLIED_*.md, IMPLEMENTATION_SUMMARY.md, docs/plan/*, docs/00_INBOX/chat/*.
- 상세: [docops-latest-work.md](docops-latest-work.md)

## 문서 위치 규칙(기본)
- docs/00_INBOX/chat/: 대화 요약/회의 메모/임시 수집물
- docs/10_WORK/: WORK_LOG_*.md, 진행 기록
- docs/20_SPECS/: SSOT 계약/설계 문서(예: LAYOUT.md, SYSTEM_ARCHITECTURE.md, patch.md 링크)
- docs/_meta/: inventory/plans/reports (DocOps 산출물)

## REF 규칙
- 모든 핵심 문서는 하단에 "Refs:" 섹션을 둔다.
- Refs에는 SSOT 문서/상위 계약을 우선 링크한다.
- 자동 삽입은 "명시 링크 + 핵심 SSOT 파일명 언급"만 대상으로 한다(과잉 자동화 금지).

## 업데이트 규칙
- LAYOUT.md가 "Tablet/Mobile (추정)" 같은 모호 표현이 있으면, DocOps는 이를 이슈로 올리고 명시적 계약으로 업데이트를 제안한다.【LAYOUT.md 반응형 구간 참고】

## Mermaid 그래프
- 필요 시 **Mermaid 스타일 그래프**를 만들고 문서에 삽입한다.
- 용도: 문서 REF/참조 관계, DocOps 워크플로우, Phase·의존성, 데이터·상태 흐름.
- 상세: [docops-mermaid.md](docops-mermaid.md)

## 변경 분리(커밋/검증)
- 문서 변경은 docs: 커밋으로 분리하고, 파이프라인 실패 시 커밋 중단 원칙을 따른다.
