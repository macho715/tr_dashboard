# 대시보드 레이아웃 리뉴얼

## 목적
- 상단 요약 바, 좌측 내비게이션, 3단 메인 레이아웃으로 정보 구조를 재정렬합니다.
- Weather/Notice/KPI/Logs를 분리해 운영 상황을 빠르게 파악하도록 합니다.

## 구성
- **상단 고정 요약 바**: 핵심 KPI + Notice/Weather 업데이트 상태 + 위험도 배지.
- **좌측 내비게이션**: Timeline/Voyages/Weather/KPI/Notice/Logs 분리.
- **메인 3단**: Timeline(Gantt) → Voyage+Schedule → Weather+Heatmap.
- **운영 보조**: Data Consistency 배지와 Pipeline Status(A~N) 표시.

## 뷰 모드
- **standard**: 좌/우 사이드바 포함.
- **compact**: 우측 사이드바 숨김.
- **fullscreen**: 좌/우 사이드바 숨김, 본문 집중.
