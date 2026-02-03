# Layout Audit Checklist (TR Dashboard)

## 0) SSOT 확인
- [ ] patch.md 존재/최신 여부 확인
- [ ] LAYOUT.md v1.4.0의 레이아웃 트리와 현재 코드 일치 여부
- [ ] SYSTEM_ARCHITECTURE.md 원칙(계산/렌더 분리, SSOT 단일 진입점) 위반 여부

## 1) 정보구조(목적) 적합성
- [ ] StoryHeader: 3초 내 핵심 요약(WHERE/WHEN/WHAT/EVIDENCE 라벨 문구는 재도입 금지)
- [ ] Map(Where): 선택된 TR/Trip과 동기화(하이라이트/포커스)
- [ ] Timeline/Gantt(When/What): 다음 일정/블로커/충돌이 "즉시" 보임
- [ ] Evidence: History/Evidence/Compare가 Detail에서 접근 가능 + 미비 카운트 노출

## 2) 컴포넌트 조화(Consistency)
- [ ] spacing/typography/카드 밀도(과밀 여부)
- [ ] CTA(Apply/Preview/Export 등) 위치 일관
- [ ] 중복 UI(동일 정보가 2곳 이상) 제거 또는 "요약 vs 상세"로 역할 분리

## 3) 반응형(Responsive)
- Desktop(>=1024): [ ] 3-Column 유지 + sticky 요소 과도하지 않음
- Tablet(768~1023): [ ] 2-Column/1-Column 전환 시 정보 손실 없음
- Mobile(<768): [ ] 탭/드로어/바텀시트 UX + 터치 타겟(최소 44px) 준수

## 4) 내비게이션/상태 유지
- [ ] SectionNav 이동 시 activeSection 정확
- [ ] 탭 전환/드로어 열기에도 selectedActivityId/selectedVoyage 유지
- [ ] "View 버튼/스크롤 점프"가 끊기지 않음

## 5) 회귀 위험
- [ ] Gantt 렌더 성능(불필요 리렌더) 악화 없음
- [ ] Map 렌더/마커 상호작용 깨짐 없음
- [ ] History/Evidence 저장 흐름(append-only) UI 접근성 유지
