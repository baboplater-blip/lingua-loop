---
name: irt-calibration
description: 문항반응이론(IRT) 기반 문항 난이도·변별도·학습자 능력 캘리브레이션 프로토콜(SSOT). ELO 온라인 폴백 포함. 난이도·능력은 항상 데이터로 추정한다(임의값 금지, 규칙 3).
---

# IRT 캘리브레이션 (심리측정 SSOT)

"이 문항은 얼마나 어렵고, 이 학습자는 얼마나 잘하는가"를 **반응 데이터로** 엄밀히 추정한다(규칙 3).

## 모델

- **2PL IRT**: `P(정답 | θ) = 1 / (1 + e^(−a(θ − b)))`
  - `b` = 난이도, `a` = 변별도, `θ` = 학습자 능력.
- 데이터 충분 시 2PL 적합(EM/MML). KC/스킬별 차원.
- **콜드스타트 폴백 = ELO**: 문항·학습자에 레이팅 부여, 매 반응마다 온라인 업데이트. 표본 쌓이면 2PL 로 승격.

## 캘리브레이션 흐름

1. 반응 로그(`item.response`) 수집(문항×학습자 행렬).
2. 능력 θ 추정(MAP/EAP) ↔ 문항 파라미터(b,a) 추정 교대(joint/marginal).
3. 수렴 판정 + 표준오차(SE) 기록. **SE 큰 파라미터는 "미확정"으로 표기**(과신 금지).
4. 문항 `quality: verified → calibrated` 승격, `difficulty`/`discrimination` 갱신([`content-item-schema`]).
5. 이상 문항 탐지 — 변별도 음수/0(불량 문항), 정답률 극단 → 리뷰 큐(→`community`/`content-generation-ai`).

## 능력·경로 활용

- θ 로 CAT 배치([`placement-adaptive-testing`])·문항 매칭(바람직한 어려움: `b ≈ θ`).
- θ 는 학습자 모델의 `ability`([`learner-model-spec`]).

## 불변 규칙

1. **데이터로만**(규칙 3) — 시드 난이도는 임시, 캘리브레이션되면 교체. 임의 하드코딩 금지.
2. **불확실성 표기** — 표본 부족을 확신으로 포장하지 않는다.
3. **수렴 검증**(test.md §6) — 합성 데이터(참 파라미터 알려진)로 회수 테스트: 추정이 참값으로 수렴하는가.
4. **온라인 안정성** — ELO 업데이트가 폭주하지 않게 학습률·앵커 관리.

## 연결

문항=[`content-item-schema`] · 반응=[`telemetry-event-schema`] · 능력=[`learner-model-spec`] · 배치=[`placement-adaptive-testing`] · 진화=[`evolution-loop-protocol`].
