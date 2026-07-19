---
name: ab-experiment-framework
description: 교수법·알고리즘 개선을 검증하는 A/B 실험·효능 측정 프레임워크(SSOT). 가드레일 지표는 항상 학습성과(참여도 금지). 실험 설계·검정력·인과 판정 시 따른다.
---

# A/B 실험·효능 프레임워크 (SSOT)

진화 루프의 판정자. "이 변경이 정말 더 잘 가르치는가"를 **엄밀히** 답한다.

## 절대 규율: 가드레일 = 학습성과 (규칙 1)

- **1차 지표(성공 판정)**: 학습성과 — TTM, Gain Score(효과크기 d), 리텐션, KC 숙달 속도.
- **가드레일(해치면 안 됨)**: 다른 성과 지표·프라이버시·부하.
- **참여도(체류·세션·스트릭)는 1차·가드레일 지표가 될 수 없다.** 관측만 하고, **성과 정체 + 참여 상승** 은 다크패턴 경보(→`growth-efficacy-analyst`).

## 실험 설계

1. **가설** — SLA 이론에서 도출된 검증가능 예측(`sla-pedagogue`).
2. **랜덤화** — 학습자 단위 무작위 배정(간섭 주의). 층화(레벨·언어) 가능.
3. **검정력·표본** — 최소검출효과(MDE)·α·β 로 사전 표본 계산. 과소표본 실험 금지.
4. **사전등록** — 지표·정지규칙·분석 사전 고정(p-해킹 방지).
5. **기간** — 학습성과는 지연 발현(리텐션은 며칠 후). 조기중단 편향 주의.

## 효능 측정(관측 데이터)

- **사전-사후 + 통제** — 배치평가→학습→재평가([`placement-adaptive-testing`])로 Gain. 통제군 없으면 인과 단정 금지(성숙·선택 편향).
- **효과크기** — Cohen's d, 신뢰구간. 유의성만으로 판단 금지.
- **이질성** — 레벨·언어·학습자군별 효과 차이.

## 구현 (코어 SSOT)

이 스킬의 판정 규율은 `core/efficacy-experiment.ts`에 구현되어 있다(순수·결정적·제로 의존).

- `PreRegistration` + `validatePreRegistration` — 1차 결과를 `gainScore`(학습성과)로 강제(참여도 실험 거부). **데이터 수집 전에** append-only로 고정(서버 `registerExperiment`, 시스템 전용 이벤트 `experiment.registered`라 공개 ingest로 위조 불가).
- `assignVariant(experimentId, learnerRef, share)` — FNV-1a + murmur3 finalizer로 **결정적·무상태·균형(~50/50)** 배정. 실험 id를 해시에 섞어 실험마다 독립(재현 가능·규칙 5).
- `compareCohorts(prereg, control, treatment)` — 집단 간 Gain 비교: 평균차, pooled-SD **Cohen's d**, Welch 표준오차로 **95% CI**, `powered`(사전 확정 표본 충족), `retroactive`(등록이 데이터보다 늦으면 사전등록 무효 경고). **판정: powered이고 CI가 0을 배제할 때만** `treatment_better`/`control_better`, 그 외 `no_difference`/`underpowered`.
- 운영: OPERATING.md §6 · `npm run experiment <id>` · `POST /experiment`·`GET /experiment/assign`·`GET /experiment/result`.
- ⚠️ 실험군에 **실제 개입**(다른 생성기·스케줄·콘텐츠)을 배선하는 것은 실험 설계자 몫 — 이 모듈은 사전등록·배정·측정 기구다.

## 판정 → 진화

- 성과 개선·유의 → 배포([`evolution-loop-protocol`] 6단계).
- 무해·무개선 → 보류/추가실험. 성과 하락 → 롤백·폐기.

## 불변 규칙

1. **성과 가드레일**(규칙 1) — 참여 지표를 목표로 새기면 반려.
2. **인과 정직**(규칙 17) — 관측을 인과로 포장 금지, 한계 명시.
3. **재현** — 배정·시드·분석 코드 보존.

## 연결

진화=[`evolution-loop-protocol`] · 효능해석=growth-efficacy-analyst · 평가=[`placement-adaptive-testing`] · 데이터=[`telemetry-event-schema`].
