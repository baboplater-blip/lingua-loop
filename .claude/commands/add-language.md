---
description: 새 목표어/모국어 언어팩을 코드 변경 없이 데이터로 추가 - 팩 스캐폴드 + 훅 + KC 시드 + i18n
argument-hint: <lang> [--as target|ui|both] "<언어명>"  (lang: ISO 639, 예: es, zh, ar)
---

# /add-language

다국어 범용 엔진에 새 언어를 **데이터로만** 추가한다(코어 무변경, 규칙 11).

## 입력 예

- `/add-language es --as both "스페인어"`
- `/add-language zh --as target "중국어(표준)"`  (CJK 토큰화 훅 필요)
- `/add-language ar --as both "아랍어"`         (RTL·어근 형태 훅 필요)

## 절차

1. **`i18n-a11y-engineer` + `content-engine-engineer` 호출** — [`language-pack-format`](../skills/language-pack-format/SKILL.md) 대로 `packs/{lang}/` 스캐폴드(pack.json·orthography·phonology·tokenizer·morphology·kc-seed·i18n).
2. **언어별 훅 구현** — tokenize/normalize/compareAnswer/phonemes/direction/script. CJK·RTL·교착어는 1급 대응.
3. **KC 시드** — `curriculum-designer` 가 골격 KC 그래프에 언어별 KC 매핑([`cefr-mastery-map`](../skills/cefr-mastery-map/SKILL.md)).
4. **콘텐츠 시드** — 초기 아이템(`content-seed/`)은 [`content-item-schema`](../skills/content-item-schema/SKILL.md) 준수, 라이선스 명시. 부족분은 `/new-content` 로 생성.
5. **발음 데이터** — 음소 인벤토리·최소대립쌍 후보([`pronunciation-scoring`](../skills/pronunciation-scoring/SKILL.md)).
6. **검증** — 언어팩 로드·토큰화·RTL/CJK 렌더 테스트가 `/gate` 다국어 카테고리에서 그린.

## 출력 형식

```
✓ /add-language ar 언어팩 1차
  - packs/ar/ 스캐폴드 + RTL·어근 훅
  - KC 시드 매핑(A1~B1) / 음소 인벤토리
  - content-seed 12항목(license: CC-BY) → 나머지 /new-content
다음: qa 다국어 게이트(RTL 렌더) → /new-content ar A1 vocab
```

## 주의

- **코어 소스 수정이 필요하면 그건 코어 결함** — 훅으로 흡수(규칙 11).
- 팩·시드 콘텐츠 라이선스 필수(규칙 14). 저자원 언어는 폴백 훅으로 최소 부팅.
