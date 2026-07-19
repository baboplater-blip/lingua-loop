# 🌍 새 목표어 추가하기 (Add a Language)

> **코어 코드 0줄** — 새 목표어는 `packages/packs/<lang>/`에 **데이터만** 넣으면 된다(규칙 11). 첫 기여로 가장 추천.
> 이 문서는 [이슈 #1](https://github.com/baboplater-blip/lingua-loop/issues/1)의 실행 가이드다. 규격 SSOT는 [`language-pack-format`](../.claude/skills/language-pack-format/SKILL.md).

## 0. 30초 요약

1. `packages/packs/<lang>/`(예: `packages/packs/fr/`) 폴더를 만든다.
2. 최소 3개 파일을 넣는다 — `pack.json` · `kc-seed.json` · `content-seed.json`.
3. `npm run gate` 그린 + `npm run serve` 후 `GET /next?lang=<lang>`에서 문항이 나오면 끝.

> `<lang>`은 소문자 언어 코드(ISO 639-1 권장: `fr`·`de`·`pt`·`vi`…).

## 1. 최소 파일 (3개면 시작 가능)

기존 팩을 그대로 베끼는 게 가장 빠르다: 라틴 문자는 [`packages/packs/en`](../packages/packs/en/), 비라틴은 [`packages/packs/ja`](../packages/packs/ja/)(가나+한자)·[`packages/packs/hi`](../packages/packs/hi/)(데바나가리)·[`packages/packs/ar`](../packages/packs/ar/)(RTL) 참고.

### ① `pack.json` — 팩 메타

```json
{
  "lang": "fr",
  "name": "Français",
  "script": "latin",
  "direction": "ltr",
  "cefrSupported": ["A1"],
  "role": ["target"],
  "maintainers": ["your-github-handle"],
  "license": "CC-BY-SA-4.0",
  "schemaVersion": 1
}
```

- `script`: `latin`·`cjk`·`arabic`·`devanagari` 등. `direction`: 아랍어·히브리어 등은 `"rtl"`, 그 외 `"ltr"`.

### ② `kc-seed.json` — 지식요소(KC) 그래프

최소 어휘 KC 하나 + 기본 문법 KC 몇 개. `prereq`로 선후관계를, `canDo`로 목표를 적는다.

```json
[
  { "id": "kc.fr.vocab.core", "skill": "reading", "level": "A1", "prereq": [], "canDo": "핵심 기초 어휘를 인식한다" },
  { "id": "kc.fr.present_etre", "skill": "writing", "level": "A1", "prereq": [], "canDo": "être 동사 현재형을 사용한다" }
]
```

- `id`는 반드시 `kc.<lang>.…` 접두사. `level`은 CEFR(`A1`~`C2`). `skill`은 `reading|listening|speaking|writing`.

### ③ `content-seed.json` — 학습 문항

각 KC마다 **최소 2문항**(flashcard/cloze/mcq 등). 목표어 문자를 보존하고, **정답이 유효**해야 한다(규칙 4·14).

```json
[
  {
    "id": "fr.vocab.chat", "lang": "fr", "type": "flashcard",
    "kc": ["kc.fr.vocab.core"], "level": "A1",
    "prompt": "고양이 (동물)", "answer": { "value": "chat" },
    "difficulty": null, "discrimination": null, "quality": "draft",
    "source": { "kind": "contributed", "license": "CC-BY-SA-4.0" },
    "meta": { "schemaVersion": 1 }
  },
  {
    "id": "fr.etre.suis", "lang": "fr", "type": "cloze",
    "kc": ["kc.fr.present_etre"], "level": "A1",
    "prompt": "Je ___ étudiant.", "answer": { "value": "suis", "accept": ["suis"] },
    "difficulty": null, "discrimination": null, "quality": "draft",
    "source": { "kind": "contributed", "license": "CC-BY-SA-4.0" },
    "meta": { "schemaVersion": 1 }
  }
]
```

- `quality`는 `"draft"`로 두면 게이트가 통과분만 `verified`로 승격해 서빙한다(미검증 노출 금지, 규칙 4).
- `kc`는 **문자열 배열**(단일도 `["…"]`). `mcq`는 `distractors`(오답보기)도 필요.

## 2. 검증 (완료 기준)

```bash
npm run gate                 # 문서·다크패턴·전체 테스트 — universality 가 새 팩의 KC 정합·라이선스·서빙을 자동 검증
npm run serve                # http://localhost:8787
# 다른 터미널에서:
curl "http://localhost:8787/next?lang=fr&learner=me"   # 문항이 서빙되면 성공
```

- 게이트가 그린이고 `/next`에서 문항이 나오면 최소 기여 완료. 코어/서버/어댑터 코드는 **한 줄도 건드리지 않는다**(규칙 11).

## 3. 더 넣고 싶다면 (선택)

같은 폴더에 데이터만 추가하면 기능이 자동으로 켜진다:

| 파일 | 켜지는 기능 |
|---|---|
| `reading.json` | 등급 읽기(클릭 사전·이해 문항) — [`ja/reading.json`](../packages/packs/ja/reading.json) 참고 |
| `phonology.json` | 발음(최소대립쌍·섀도잉·IPA) |
| `placement.json` | CAT 배치고사(문항 난이도 `b`) |
| `i18n.json` | 화면 언어(UI 로케일) — 목표어와 별개 |

전용 튜터(문법 교정)는 `packages/adapters/`에 코드가 필요하므로 **별도 이슈**로 논의하자(먼저 팩 데이터만으로 충분히 유용하다). 미지원 언어는 오교정 없는 패스스루 튜터로 안전하게 폴백한다(규칙 12).

## 4. 규칙 체크 (PR 전)

- [ ] 코어/서버/어댑터 코드 변경 0 — 데이터만(규칙 11)
- [ ] 콘텐츠 라이선스 명시(CC-BY 계열 권장)·정답 유효(규칙 4·14)
- [ ] 목표어 문자·정서법 보존(음차/로마자 금지)
- [ ] `npm run gate` 그린 + `/next?lang=<lang>` 서빙 확인

막히면 [이슈 #1](https://github.com/baboplater-blip/lingua-loop/issues/1)에 댓글로 물어보세요. **저자원 언어·비영어 화자 기여를 특히 환영합니다.**
