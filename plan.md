# 🗺️ plan.md — LinguaLoop 실행 계획

> [goal.md](goal.md) 의 목표를 **어떻게** 달성하는가. 단계(Phase)·마일스톤.
> 완료/진행 표시는 [status.md](status.md) 와 동기화(여기는 계획, status 는 현황).

## 작업 원칙 (모든 Phase 공통)

각 기능은 **설계 → 구현 → 검증(E2E/데이터/교수법 불변식) → 게이트 편입 → 게이트 그린 → 문서·메모리 갱신** 순서를 지킨다.
세부 불변 규칙은 [rules.md](rules.md), 검증 방법은 [test.md](test.md). 스택·데이터 모델은 [`web-app-stack`](.claude/skills/web-app-stack/SKILL.md)·[`content-item-schema`](.claude/skills/content-item-schema/SKILL.md)·[`telemetry-event-schema`](.claude/skills/telemetry-event-schema/SKILL.md) 를 SSOT 로 따른다.

---

## Phase 0 — 하네스·설계 스파인 ⏳ (현재)

이 하네스 자체. 5문서 체계 + 에이전트·스킬·커맨드 + 아키텍처/데이터모델 설계 문서.
- [x] goal·plan·rules·test·status 5문서.
- [x] 22 에이전트 · 18 스킬 · 7 커맨드 로스터.
- [ ] `learning-architect` 가 아키텍처·데이터모델·서비스 경계 확정(`docs/design/`).
- [ ] 스택 결정(웹앱 + 데이터 백엔드 + 진화/ML 워커) 문서화.

## Phase 1 — 마스터리 스택 코어 (MVP: 하나의 언어쌍으로 진짜 가르친다)

목표: **입력 → 간격반복 → 산출 → 평가** 최소 루프가 실제로 능력을 올린다(효능 입증 가능한 최소 제품).
- [ ] **콘텐츠 아이템 모델**([`content-item-schema`]) — 언어 무관 스키마, 지식요소(KC) 그래프, 문항 유형.
- [ ] **CEFR 마스터리 맵**([`cefr-mastery-map`]) — A1→C2→원어민 능력요소 진행(4스킬+음운·어휘·문법·화용).
- [ ] **간격반복 스케줄러**([`fsrs-spaced-repetition`]) — FSRS 구현, 복습 큐, 학습자별 파라미터.
- [ ] **이해가능한 입력** — 등급별 읽기/듣기(i+1), 클릭 사전, 이해도 체크.
- [ ] **산출·교정** — 쓰기/말하기 프롬프트 + 피드백.
- [ ] **배치·진척 평가**([`placement-adaptive-testing`]) — CAT 배치, 능력 추정.
- [ ] **웹앱 셸 + 데이터 백엔드** — 학습 UI + 이벤트 로그·학습자 모델 저장.
- [ ] **효능 게이트** — 배치→학습→재평가 Gain Score 측정 파이프라인.

## Phase 2 — 진화 루프 (도구가 스스로 좋아진다)

목표: 수집 데이터가 콘텐츠·스케줄러·경로를 **자동 개선** 한다.
- [ ] **텔레메트리**([`telemetry-event-schema`]) — append-only 이벤트 로그, 학습자 상태 파생([`learner-model-spec`]).
- [ ] **IRT 캘리브레이션**([`irt-calibration`]) — 문항 난이도·변별도·능력 온라인 추정(ELO 폴백).
- [ ] **FSRS 최적화** — 집계 데이터로 스케줄러 파라미터 재적합.
- [ ] **콘텐츠 자동 생성·보정**([`content-generation-quality-gate`]) — 데이터가 드러낸 격차를 LLM 이 메우고 품질 게이트 통과.
- [ ] **A/B 실험 프레임워크**([`ab-experiment-framework`]) — 교수법·알고리즘 실험, 가드레일=학습성과.
- [ ] **진화 오케스트레이터**([`evolution-loop-protocol`]) — 분석→제안→실험→검증→배포→측정 1커맨드(`/evolve`).

## Phase 3 — 몰입·튜터·발음 (원어민 마스터리 경로)

- [ ] **AI 튜터**([`ai-tutor-protocol`]) — 몰입 대화·오류 교정·역할극, pluggable LLM, 프롬프트 인젝션 방어.
- [ ] **발음·섀도잉**([`pronunciation-scoring`]) — ASR 발음 점수, 최소대립쌍, IPA, TTS.
- [ ] **동기·습관**(다크패턴 없이) — 마스터리 맵·목표·복습 준수, 성과 기반 피드백.

## Phase 4 — 다국어 범용 확장 (엔진의 정체성 실증)

- [ ] **언어팩 프레임워크**([`language-pack-format`]) — 코드 0, 데이터로 목표어/모국어 주입.
- [ ] **스크립트·형태 대응** — CJK·RTL·교착어 토큰화/음운 훅([`i18n-a11y-engineer`]).
- [ ] **2개 이상 언어쌍 실증** — 코어 언어 무관성 검증(같은 엔진, 다른 언어팩).

## Phase 5 — 커뮤니티·개방 (오픈소스 발효)

- [ ] **기여 워크플로우**([`community-contribution-workflow`]) — 콘텐츠·언어팩 제출·동료검증·랭킹·모더레이션.
- [ ] **데이터 거버넌스**([`privacy-consent-open-data`]) — 동의 계층·익명화·개방 데이터셋·내보내기/삭제.
- [ ] **OSS 릴리스**([`oss-release-standards`]) — 라이선스·자가호스팅 가이드·데이터/모델 카드·CONTRIBUTING·CoC.

## Phase 6 — 운영·그로스 (공개 후, 지속)

- [ ] 효능 연구 정례화(코호트 비교, 사전등록 실험).
- [ ] 진화 루프 상시 가동(캘리브레이션·최적화 스케줄).
- [ ] 신규 언어팩·교수법 스킬 확장, 저자원 언어 지원.

## 다음 액션 (우선순위)

1. **`learning-architect` 아키텍처 확정**(Phase 0 마무리) — 스택·데이터모델·서비스 경계.
2. **Phase 1 MVP 스켈레톤** — content-item-schema → cefr-mastery-map → FSRS → 웹앱 셸.
3. 자율 진행 가능: 스킬 스펙 심화, 검증 게이트 초기 배선.
