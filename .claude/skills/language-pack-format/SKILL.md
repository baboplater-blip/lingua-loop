---
name: language-pack-format
description: 새 목표어/모국어를 코드 변경 없이 데이터로 주입하는 언어팩 포맷(SSOT). 정서법·음운·토큰화·형태·KC 시드·CJK/RTL 훅. "다국어 범용 엔진"을 실현하는 규격.
---

# 언어팩 포맷 (다국어 범용 SSOT)

코어는 언어를 모른다(규칙 11). 새 언어 지원 = **언어팩(데이터/플러그인) 추가**, 코어 코드 무변경. `/add-language` 가 이 포맷으로 팩을 스캐폴드한다.

## 팩 구조

```
packs/{lang}/
├── pack.json          # 메타(lang, script, direction, cefrSupported, maintainers, license)
├── orthography.json   # 문자·정서법·정규화(NFC), 대소문자·발음기호
├── phonology.json     # 음소 인벤토리, 최소대립쌍 후보, IPA 매핑
├── tokenizer.js|json  # 단어/형태소 경계(CJK=사전/모델, 교착어=형태소)
├── morphology.json    # 굴절·활용 패턴(어휘 KC 확장용)
├── kc-seed.json       # 언어별 KC 시드(curriculum 골격에 매핑)
├── content-seed/      # 초기 아이템 시드(content-item-schema 준수)
└── i18n/              # 이 언어를 UI 로 쓸 때의 인터페이스 번역
```

## 언어별 훅 (코어가 호출하는 인터페이스)

| 훅 | 목적 | 예 |
|---|---|---|
| `tokenize(text)` | 단어/형태소 분해 | CJK 사전기반, 아랍어 어근 |
| `normalize(text)` | 표기 정규화 | NFC, 하라카트 처리 |
| `compareAnswer(a,b)` | 정답 허용변형 | 성별/격 변형, 성조표기 |
| `phonemes(word)` | 발음 분해 | IPA, 성조 |
| `direction` | 조판 | ltr / rtl |
| `script` | 렌더링 | latin / hanzi / arabic … |

## 지원 매트릭스

언어팩은 **목표어**(배우는 언어)와 **UI 언어**(모국어) 두 역할. 예: `packs/es` + `packs/ko/i18n` = "한국어 UI 로 스페인어 학습". 임의 조합 가능.

## 불변 규칙

1. **코드 0 원칙**(규칙 11) — 새 언어가 코어 소스 수정을 요구하면 그건 코어 결함. 훅으로 흡수.
2. **저자원 폴백** — 데이터 적은 언어도 최소 훅(tokenize=공백, phonemes=근사)으로 부팅. `i18n-a11y-engineer` 폰트/렌더 폴백.
3. **라이선스 명시**(규칙 14) — 팩·시드 콘텐츠 라이선스 필수.
4. **CJK/RTL 1급 지원** — 단어경계 없는 스크립트·양방향 조판을 예외가 아닌 기본으로.

## 연결

콘텐츠=[`content-item-schema`] · KC=[`cefr-mastery-map`] · 발음=[`pronunciation-scoring`] · 커뮤니티 기여=[`community-contribution-workflow`] · 표층=i18n-a11y-engineer.
