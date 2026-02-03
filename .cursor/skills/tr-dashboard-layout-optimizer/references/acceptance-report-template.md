# Layout Change Acceptance Report (Template)

## 변경 요약
- 목표:
- 변경 범위(파일/컴포넌트):
- 비범위(건드리지 않는 것):

## 스크린별 결과
| Screen | Breakpoint | Result | Notes |
|---|---:|---|---|
| Desktop | >=1024px | PASS/FAIL | |
| Tablet | 768~1023px | PASS/FAIL | |
| Mobile | <768px | PASS/FAIL | |

## 핵심 시나리오(재현 Steps)
1) TR 선택 → Timeline/Map/Detail 동기화 확인
2) 탭 전환(모바일) → 선택 컨텍스트 유지 확인
3) 섹션 네비게이션 점프 → activeSection/포커스 확인

## 품질 게이트
- lint:
- typecheck:
- test:
- build:

## 리스크/후속
- 리스크:
- 다음 작업:
