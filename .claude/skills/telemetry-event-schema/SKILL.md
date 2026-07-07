---
name: telemetry-event-schema
description: 학습 이벤트 로그의 append-only 스키마와 이벤트 taxonomy(SSOT). 학습 상호작용을 기록하거나 학습자/콘텐츠 상태를 파생할 때 항상 이 스키마를 따른다. 이력 불변, 상태는 파생.
---

# 텔레메트리 이벤트 스키마 (append-only SSOT)

진화 루프의 연료. 모든 학습 상호작용은 **불변 이벤트** 로 기록되고(규칙 5), 학습자·콘텐츠 상태는 이 로그에서 **파생·재현** 된다.

## 이벤트 코어 필드

```jsonc
{
  "eventId": "evt_ulid",       // 전역 고유
  "ts": "2026-07-05T...Z",     // 서버 확정 시각
  "learnerRef": "lrn_hash",    // 학습자 참조(가명, PII 분리 — 규칙 7)
  "sessionId": "ses_...",
  "type": "item.response",     // taxonomy(아래)
  "kc": ["kc.es.pret_indef"],
  "itemId": "itm_...",
  "payload": { /* type별 */ },
  "consent": "learn|learn+improve|learn+improve+open", // 동의 범위(규칙 6)
  "schemaVersion": 1
}
```

## 이벤트 taxonomy

| type | payload 핵심 | 파생 대상 |
|---|---|---|
| `item.response` | correct, latencyMs, chosen, grade(0~3) | 학습자 능력·기억, 문항 통계 |
| `review.due` / `review.done` | interval, retrievability, grade | FSRS 상태([`fsrs-spaced-repetition`]) |
| `tutor.turn` | role, errorTags, correctionType | 오류 패턴, 산출 능력 |
| `speak.attempt` | phonemeScores, prosody | 발음 숙달([`pronunciation-scoring`]) |
| `assessment.item` | theta_est, se | 능력 추정([`placement-adaptive-testing`]) |
| `content.exposure` | shown, level | 노출/난이도 캘리브레이션 |
| `session.start/end` | durationMs | (관측용, **최적화 대상 아님** — 규칙 1) |

## 불변 규칙

1. **Append-only**(규칙 5) — 이벤트는 추가만. 수정·삭제 금지(삭제는 학습자 권리 행사 시 전체 파기 경로로만, 규칙 6).
2. **상태는 파생** — 학습자/콘텐츠 상태는 로그 리플레이로 재계산 가능해야 한다([`learner-model-spec`]). 상태 스냅샷은 캐시일 뿐, 로그가 진실.
3. **PII 분리**(규칙 7) — `learnerRef` 는 가명. 이메일 등 PII 는 별도 스토어, 이벤트 로그엔 없음.
4. **동의 태그**(규칙 6) — 각 이벤트에 동의 범위. 개방 데이터셋은 `open` 동의분만([`privacy-consent-open-data`]).
5. **수집 최소화**(규칙 8) — 학습개선에 필요한 필드만. 새 필드는 `learner-data-privacy` 심사.

## 연결

파생 상태=[`learner-model-spec`] · 진화 소비=[`evolution-loop-protocol`] · 프라이버시=[`privacy-consent-open-data`] · 개방=[`oss-release-standards`].
