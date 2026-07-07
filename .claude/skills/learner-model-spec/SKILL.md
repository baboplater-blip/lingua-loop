---
name: learner-model-spec
description: 학습자별 숙달·기억·능력 상태 모델(SSOT). 이벤트 로그에서 파생되며 지식추적(BKT/DKT 개념)·망각곡선·능력추정을 통합한다. 개인화 경로·복습·평가의 근거.
---

# 학습자 모델 스펙 (파생 상태 SSOT)

"이 학습자가 지금 무엇을 아는가"의 단일 모델. **이벤트 로그에서 파생**(규칙 5)되므로 항상 재현 가능하다.

## 상태 구조

```jsonc
{
  "learnerRef": "lrn_hash",
  "lang": "es",
  "kcState": {
    "kc.es.pret_indef": {
      "mastery": 0.72,          // 지식추적 확률(BKT) 또는 DKT 산출
      "stability": 12.3,        // FSRS 안정성(일)
      "lastReview": "...",
      "dueAt": "...",
      "retrievability": 0.88    // 현재 회상확률
    }
  },
  "ability": { "reading": 1.2, "listening": 0.8, "speaking": -0.3 }, // IRT θ(스킬별)
  "goals": ["travel", "b2_exam"],
  "prefs": { "uiLang": "ko", "reviewLoad": "medium" },
  "derivedAt": "...", "fromEventSeq": 48213 // 재현 좌표
}
```

## 세 축의 통합

1. **지식추적(mastery)** — 각 KC 를 아는 확률. Bayesian Knowledge Tracing(BKT) 로 시작, 데이터 쌓이면 Deep KT(DKT) 로 승격 가능. 정오답 이벤트로 갱신.
2. **기억(stability/retrievability)** — FSRS 상태([`fsrs-spaced-repetition`]). 언제 복습해야 잊지 않는가.
3. **능력(ability θ)** — IRT 잠재능력([`irt-calibration`]). 스킬·하위체계별. 문항 반응으로 추정.

## 경로 결정 입력

`curriculum-designer` 의 경로 규칙은 이 모델을 읽어 다음을 고른다:
- **전제 충족** — 다음 KC 의 prerequisite 가 mastery ≥ 임계인가.
- **복습 만기** — dueAt 지난 KC 우선.
- **약점 보강** — mastery 낮고 목표 관련 KC.
- **바람직한 어려움** — 너무 쉽지도 어렵지도 않게(θ 대비 문항난이도 매칭).

## 불변 규칙

1. **파생·재현**(규칙 5) — 로그 리플레이로 동일 상태 재계산 가능. 직접 덮어쓰기 금지.
2. **투명성**(규칙 10) — mastery·dueAt·이유를 학습자에게 노출 가능한 형태로.
3. **내보내기 가능**(규칙 6) — 학습자 요청 시 전체 상태 + 원천 이벤트 내보내기.

## 연결

입력=[`telemetry-event-schema`] · 기억=[`fsrs-spaced-repetition`] · 능력=[`irt-calibration`] · 경로=[`cefr-mastery-map`] · 진화=[`evolution-loop-protocol`].
