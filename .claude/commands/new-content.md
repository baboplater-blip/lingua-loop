---
description: 언어+레벨+스킬 콘텐츠 배치를 생성/수집하고 품질 게이트를 통과시켜 학습 경로에 편입
argument-hint: <lang> <level> <skill|kc> [type] [count]  (예: es A2 grammar cloze 20)
---

# /new-content

콘텐츠 아이템 배치를 만든다. **미검증 콘텐츠는 절대 학습 경로에 안 들어간다**(규칙 4).

## 입력 예

- `/new-content es A2 kc.es.pret_indef cloze 20`
- `/new-content zh A1 vocab flashcard 50`
- `/new-content ar B1 reading reading_graded 5`

## 절차

1. **격차 확인** — 이 KC×레벨×스킬이 실제 부족한지(`evolution-engine-engineer` 신호 또는 명시). 무작정 양산 금지.
2. **`content-generation-ai` 생성** — [`content-generation-quality-gate`](../skills/content-generation-quality-gate/SKILL.md) 대로 등급 통제 생성([`content-item-schema`](../skills/content-item-schema/SKILL.md) 준수). 모델은 어댑터 뒤(규칙 12).
3. **품질 게이트** — 언어정확성·정답유효·오답타당·등급적합·문화안전·중복·라이선스. **통과분만 `verified` 승격**, 실패분 재생성/폐기.
4. **KC 태깅·시드 난이도** — [`cefr-mastery-map`](../skills/cefr-mastery-map/SKILL.md) KC 매핑. 난이도는 시드일 뿐, 노출 후 캘리브레이션([`irt-calibration`](../skills/irt-calibration/SKILL.md), 규칙 3).
5. **편입** — `content-engine-engineer` 가 스토어에 저장·서빙 대상 등록.

## 출력 형식

```
✓ /new-content es A2 pret_indef cloze 20
  - 생성 24 / 게이트 통과 20(verified) / 폐기 4(정답모호 2·중복 2)
  - KC=kc.es.pret_indef, 시드난이도 A2, difficulty=미캘리브레이션
다음: 노출→반응 수집→ /calibrate 로 실난이도 확정
```

## 주의

- 저작권 원문 복제 금지, 생성물 출처=AI 표기(규칙 14).
- 고위험·저확신 항목은 커뮤니티 동료검증 큐로([`community-contribution-workflow`](../skills/community-contribution-workflow/SKILL.md)).
