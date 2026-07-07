---
description: 수집된 반응 데이터로 IRT 문항 캘리브레이션 + FSRS 파라미터 재적합
argument-hint: [--lang <lang>] [--scope items|scheduler|both]
---

# /calibrate

"난이도·능력은 데이터로만"(규칙 3)을 집행한다. 축적된 반응으로 문항·스케줄러를 재보정.

## 절차 (`psychometrics-assessment-engineer` + `srs-scheduler-engineer`)

1. **데이터 수집** — `item.response`·`review.done` 이벤트([`telemetry-event-schema`](../skills/telemetry-event-schema/SKILL.md)) 집계(문항×학습자).
2. **IRT 캘리브레이션** — 2PL 적합(표본 부족 시 ELO 폴백)([`irt-calibration`](../skills/irt-calibration/SKILL.md)). 문항 `difficulty`·`discrimination` 갱신, SE 기록.
3. **문항 `verified → calibrated` 승격** — 시드 난이도 교체([`content-item-schema`](../skills/content-item-schema/SKILL.md)).
4. **이상 문항 탐지** — 변별도≤0·정답률 극단 → 리뷰 큐(→`content-generation-ai`/커뮤니티).
5. **FSRS 재적합** — 복습 로그로 w 파라미터 최적화([`fsrs-spaced-repetition`](../skills/fsrs-spaced-repetition/SKILL.md)), 전역+학습자별. 표본 부족은 전역 폴백.
6. **검증** — 합성 데이터 회수 테스트로 수렴 확인(test.md §6), `/gate` 심리측정 카테고리.

## 출력 형식

```
✓ /calibrate --scope both --lang es
  IRT: 문항 812 캘리브레이션(SE<0.3) / 이상문항 9 리뷰큐
  FSRS: w 재적합, 예측 리텐션오차 0.11→0.07
  승격: verified→calibrated 803
다음: 이상문항 9 → content-generation-ai 재설계 / /evolve 편입
```

## 주의

- 표본 부족을 확신으로 포장 금지(SE·불확실성 표기).
- 캘리브레이션은 진화 루프(`/evolve`)의 상시 구성요소로 정기 실행.
