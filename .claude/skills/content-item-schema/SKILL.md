---
name: content-item-schema
description: LinguaLoop 콘텐츠 아이템의 언어 무관 데이터 모델(SSOT). 문항 유형·KC 태깅·난이도 메타·품질상태·출처/라이선스. 콘텐츠를 만들거나 저장·서빙·검증할 때 항상 이 스키마를 따른다.
---

# 콘텐츠 아이템 스키마 (언어 무관 SSOT)

모든 학습 콘텐츠는 이 모델로 표현된다. **코어는 언어를 모른다** — 언어별 정보는 `lang` 필드와 언어팩이 채운다(규칙 11).

## 아이템(Item) 코어 필드

```jsonc
{
  "id": "itm_ulid",
  "lang": "es",                 // 목표 언어(ISO 639)
  "type": "cloze",              // 아이템 유형(아래 표)
  "kc": ["kc.es.pret_indef", "kc.es.vocab.3000"], // 훈련/평가하는 KC(curriculum SSOT)
  "level": "A2",                // CEFR 좌표(초기 시드), 캘리브레이션이 진실
  "prompt": { /* 유형별 구조 */ },
  "answer": { /* 정답 정의(채점 가능) */ },
  "distractors": [ /* 오답보기 + 오류패턴 태그 */ ],
  "difficulty": null,           // IRT 캘리브레이션 산출(초기 null → 시드 → 캘리브레이션)
  "discrimination": null,
  "quality": "draft",           // draft | verified | calibrated | retired (규칙 4)
  "source": { "kind": "generated|contributed|corpus", "ref": "...", "license": "CC-BY|..." },
  "i18n": { "instructions": { "ko": "...", "en": "..." } }, // UI 언어별 지시문
  "meta": { "createdAt": "...", "schemaVersion": 1 }
}
```

## 아이템 유형(type) — 스킬별

| 유형 | 스킬 | 채점 |
|---|---|---|
| `flashcard` | 어휘/기억 | 자기평가(0~3) → FSRS |
| `cloze` | 어휘·문법 | 정답 일치/허용변형 |
| `mcq` | 문법·독해·듣기 | 선택지(오답보기) |
| `listen_comprehension` | 듣기 | 오디오 + 문항 |
| `reading_graded` | 읽기(i+1) | 이해도 체크 |
| `translate_prod` | 산출 | 튜터/휴리스틱 채점 |
| `speak_shadow` | 발음 | ASR 점수([`pronunciation-scoring`]) |
| `dialog_seed` | 튜터 | 대화 시작점([`ai-tutor-protocol`]) |
| `minimal_pair` | 발음지각 | 변별 정오답 |

## 불변 규칙

1. **KC 태깅 필수** — 모든 아이템은 최소 1개 KC 를 훈련/평가한다(`curriculum-designer` 그래프의 유효 KC).
2. **품질상태 게이트**(규칙 4) — `verified` 이상만 학습 경로 서빙. `draft` 는 생성/기여 직후 상태, 게이트 통과로 승격.
3. **난이도는 데이터**(규칙 3) — `difficulty`/`discrimination` 은 캘리브레이션([`irt-calibration`]) 산출. 시드는 임시.
4. **출처·라이선스 필수**(규칙 14) — `source.license` 없으면 저장 거부.
5. **하위호환**(규칙 16) — 스키마 변경은 `schemaVersion` 증가 + 마이그레이션. 기존 아이템 유효.

## 연결

훈련 KC=[`cefr-mastery-map`] · 난이도=[`irt-calibration`] · 생성/검증=[`content-generation-quality-gate`] · 언어별=[`language-pack-format`] · 반응 로깅=[`telemetry-event-schema`].
