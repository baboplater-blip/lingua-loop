# LinguaLoop v1.0.0 — 릴리스 노트

> ✅ **2026-07-19 배포됨.** 오너 '배포해' 승인으로 태그 `v1.0.0`·GitHub 릴리스 공개 완료(규칙 18): <https://github.com/baboplater-blip/lingua-loop/releases/tag/v1.0.0>

---

## 한국어

**LinguaLoop v1.0.0** — 데이터로 끝없이 진화하는 오픈소스 언어 마스터리 엔진. 0.1.0 공개 이후 **적대적 디버깅 스윕**과 **효능 파이프라인**으로 안정화한 첫 메이저 릴리스입니다.

### 하이라이트

- 🛡️ **보안 하드닝** — 콘텐츠 품질 게이트 우회(공개 `/events`의 예약 로그·시스템 타입 위조)와 저장형 XSS를 차단. 커뮤니티 중복투표(Sybil) 완화, efficacy 로그 삭제 보호, 요청 본문 상한, 인젝션 방어 정규화. `SECURITY.md`에 인증·다중 사용자 위협 모델 명문화.
- 📈 **Gain Score 효능 파이프라인** — 사전(배치)→사후(재평가) 능력 상승과 관측 효과크기(Cohen's d)를 산출해 "도구가 실제로 가르치는가"를 데이터로 본다. 인과 주의 병기(관측값이며 인과는 A/B·통제군 필요, 규칙 17).
- 📚 **읽기 상위 문법 태깅·주제 다양화** — 생성 지문이 본문 근거 있는 상위 문법 KC까지 정직하게 크레딧하고, 주제 변형으로 반복 노출을 줄인다.
- 🧰 **내결함·데이터 무결** — 비배열 kc 거부, 잘린 JSONL 부팅 크래시 자가복구, append-only 깊은 동결, 학습 모델 수학 보정.
- 🌍 **7개 목표어(en·es·zh·ar·sw·ja·hi, A1~B2)** · 무인 진화 폐루프 · 북스타 효능 대시보드 · 커뮤니티 기여 · 자가호스팅(제로 의존).

### 업그레이드 주의 (0.1.0 → 1.0.0)

- 코어 API 일부 변경(semver 메이저): `estimateAbility`의 `se` 반환이 `number | null`, `EfficacySnapshot`에 `gainEffectSize`·`gainN` 필드 추가.
- 데이터·이벤트는 하위호환(append-only, 마이그레이션 불필요).

전체 변경: [`CHANGELOG.md`](../CHANGELOG.md) · 알려진 한계: [`docs/KNOWN_LIMITATIONS.md`](KNOWN_LIMITATIONS.md).

### 라이선스

코어 코드·모델 = **MIT** · 콘텐츠(언어팩) = **CC-BY-4.0** ([`LICENSES.md`](../LICENSES.md)).

---

## English

**LinguaLoop v1.0.0** — a self-evolving, open-source language-mastery engine. The first major release, hardened since 0.1.0 with an **adversarial debugging sweep** and an **efficacy pipeline**.

### Highlights

- 🛡️ **Security hardening** — closed a content-gate bypass (forged writes to reserved logs / system event types via the public `/events`) and stored XSS in the web client; mitigated community double-voting (Sybil), protected the efficacy log from deletion, capped request bodies, and normalized injection defense. `SECURITY.md` now documents the auth / multi-user threat model.
- 📈 **Gain Score efficacy pipeline** — measures pre (placement) → post (reassessment) ability gain and an observed effect size (Cohen's d), so operators can see whether the tool actually teaches — with an explicit causal caveat (observational; causation needs a preregistered A/B or control).
- 📚 **Upper-grammar tagging & topic variety** for generated readings — credits only grammar the text actually contains (rule 4), with opt-in alternate topics.
- 🧰 **Fault tolerance & data integrity** — rejects non-array `kc`, self-heals a truncated-JSONL boot crash, deep-freezes append-only events, and fixes several learning-model math defects.
- 🌍 **7 target languages (en·es·zh·ar·sw·ja·hi, A1–B2)** · unattended evolution loop · north-star efficacy dashboard · community contributions · self-hostable (zero dependencies).

### Upgrade notes (0.1.0 → 1.0.0)

- Minor core API changes (major per semver): `estimateAbility` returns `se: number | null`; `EfficacySnapshot` gains `gainEffectSize` / `gainN`.
- Data and events are backward-compatible (append-only; no migration required).

Full changes: [`CHANGELOG.md`](../CHANGELOG.md) · known limitations: [`docs/KNOWN_LIMITATIONS.md`](KNOWN_LIMITATIONS.md).

### License

Core code & models = **MIT** · content (language packs) = **CC-BY-4.0** ([`LICENSES.md`](../LICENSES.md)).
