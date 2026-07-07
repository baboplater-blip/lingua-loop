---
name: pronunciation-scoring
description: ASR 기반 발음 점수·섀도잉·최소대립쌍·IPA·TTS 통합 프로토콜(SSOT). 지각변별과 산출정확도를 훈련한다. ASR/TTS 는 pluggable. 발음 기능 구현 시 따른다.
---

# 발음 스코어링 (음운 SSOT)

원어민 마스터리엔 음운이 필수. **지각(듣고 구별)** 과 **산출(발음)** 둘 다 훈련한다.

## 두 훈련 축

1. **지각 — 최소대립쌍(minimal pairs)** — 목표어의 어려운 대립(/l/-/r/, 성조, 장단모음, 유무성)을 언어팩에서 받아 변별 훈련([`language-pack-format`] phonology). 오답 패턴 → 학습자 음소 숙달 로깅.
2. **산출 — 섀도잉** — TTS 원어민 발화 → 학습자 따라말하기 → ASR 로 음소·운율(강세·억양·리듬) 점수.

## ASR 발음 점수

```
score({ audio, targetPhonemes, targetProsody }) → { phonemeScores[], prosody, intelligibility }
```
- **음소 정렬** — 강제정렬(forced alignment)로 음소별 점수(GOP: goodness of pronunciation 류).
- **운율** — 강세·억양·속도. 성조어는 성조 정확도.
- **명료도 우선** — 원어민 억양 강요보다 **알아들을 수 있는가**를 우선(좌절 방지, 바람직한 어려움 유지).

## 타당성·캘리브레이션

- ASR 점수는 **실제 명료도와 상관** 되어야(임의 점수 금지, 규칙 3 정신). 인간 평가와 상관 검증.
- 점수→피드백: IPA·구체 조음 힌트(혀 위치 등), 최소대립쌍 재훈련 연계.

## pluggable ASR/TTS (규칙 12·13)

- 어댑터 뒤. 자가호스팅 가능한 오픈 ASR(예: 온디바이스)·TTS 경로 유지.
- 브라우저 마이크 접근·프라이버시(음성 데이터 동의·최소저장, [`privacy-consent-open-data`]).

## 불변 규칙

1. **명료도 우선** — 완벽 억양 강요 금지.
2. **음성 프라이버시**(규칙 6·8) — 원음성 최소 저장·동의, 특징만 로깅 지향.
3. **효능 검증** — 지각훈련이 산출을 개선하는지 측정.

## 연결

음소 데이터=[`language-pack-format`] · 대화 발음=[`ai-tutor-protocol`] · 숙달=[`learner-model-spec`] · KC=[`cefr-mastery-map`].
