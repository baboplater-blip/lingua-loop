# CLAUDE.md — LinguaLoop 하네스 운영 브리프

> 이 파일은 **LinguaLoop 프로젝트에서 일하는 방식** 의 단일 진입점이다.
> 무엇/왜=[goal.md](goal.md) · 어떻게=[plan.md](plan.md) · 현황=[status.md](status.md) · 불변식=[rules.md](rules.md) · 검증=[test.md](test.md).
> **작업 시작 전 항상 이 5문서를 읽는다.** 목표만 주어지면 이 문서 체계 기준으로 자율 진행한다(문서 기반 운영).

---

## 0. 한 문단 정체성

**LinguaLoop** 은 *데이터로 끝없이 진화하는, 인간을 0에서 원어민 마스터리까지 끌어올리는 오픈소스 언어 마스터리 엔진* 이다. 단순 문제풀이 앱이 아니라 — 이해가능한 입력·간격반복·산출·AI 튜터·발음·커뮤니티까지 **효과적인 모든 방법을 총동원해 실제로 언어를 마스터시키는 것** 이 유일한 목적이다. 모든 학습 상호작용은 데이터가 되고, 그 데이터가 콘텐츠·스케줄·경로·교수법을 **자동 개선** 하는 폐루프로 스스로 진화한다. **다국어 범용**(언어팩=데이터), **웹앱 + 데이터 백엔드**, **자가호스팅 가능한 오픈소스**.

세 축: **① 마스터리(성과가 진실)** · **② 진화(데이터 폐루프)** · **③ 개방·범용**. 모든 설계는 여기서 출발한다([goal.md](goal.md) §2).

---

## 1. 문서 기반 운영 (Doc-Driven)

이 프로젝트는 [game-portal]·[worksheet-factory] 와 동일한 **5문서 + 게이트** 체계로 운영된다.

- **목표를 받으면**: 5문서를 읽고 → [plan.md](plan.md) 의 현재 Phase 다음 액션을 수행 → [rules.md](rules.md) 불변식 준수 → [test.md](test.md) 게이트 그린 → [status.md](status.md)·메모리 갱신.
- **승인/실행 직전**: 무엇을 진행하는지 **한 줄 이상 한국어로 명시** 한 뒤 진행.
- **자율 진행**: 사용자는 세부 승인보다 연속 실행을 선호한다. 질문은 방향이 갈리는 지점에서만, 나머지는 실행.

---

## 2. 마스터리 스택 (어떻게 "진짜로" 가르치는가)

"모든 방법 총동원"을 구조화한 것. 각 층은 검증된 제2언어습득(SLA) 원리에 기반한다([`sla-pedagogue`] 가 과학적 근거를 지킨다).

| 층 | 방법 | 근거 | 담당 |
|---|---|---|---|
| **입력** | 이해가능한 입력 i+1(등급 읽기/듣기), 클릭 사전 | Krashen Input Hypothesis, 다독 | curriculum-designer, content-engine-engineer |
| **기억** | 적응형 간격반복(FSRS), 인출연습, 인터리빙 | Spacing/Testing effect | srs-scheduler-engineer |
| **산출** | 쓰기·말하기 + 즉시 교정, 산출 유도 | Output Hypothesis | ai-tutor-engineer, content-generation-ai |
| **상호작용** | AI 튜터 몰입 대화·역할극·협상 | Interaction Hypothesis | ai-tutor-engineer |
| **발음** | 섀도잉·최소대립쌍·IPA·ASR 점수 | 지각훈련·산출 | speech-pronunciation-engineer |
| **평가·경로** | CAT 배치·능력추정·마스터리 인증 | 형성평가, IRT | psychometrics-assessment-engineer |
| **동기** | 마스터리 맵·목표·복습 준수(다크패턴 없이) | 자기결정성이론 | motivation-gamification |

이 스택을 개인화 경로로 엮는 것이 [`cefr-mastery-map`] (A1→C2→원어민 능력요소 그래프)와 [`learner-model-spec`] (개인 숙달 상태 추적)이다.

## 3. 진화 루프 (어떻게 "끝없이" 좋아지는가)

이 프로젝트의 차별점. 상세 스펙 = [`evolution-loop-protocol`].

```
학습 상호작용 ──▶ [텔레메트리: append-only 이벤트 로그]
                        │
                        ▼
             [학습자 모델 · 콘텐츠 모델 파생]
                        │
      ┌─────────────────┼─────────────────┐
      ▼                 ▼                 ▼
 IRT 캘리브레이션   FSRS 파라미터    콘텐츠 격차 탐지
 (난이도·변별도)     최적화          → LLM 자동 생성/보정
      └─────────────────┼─────────────────┘
                        ▼
              [A/B 실험 · 가드레일=학습성과]
                        │
                  검증 통과?  ──▶ 배포 ──▶ 측정 ──▶ (다시 위로)
```

핵심 규칙: 이 루프의 **최적화 목표는 언제나 학습성과**(TTM·Gain·리텐션)이지 참여도가 아니다([rules.md](rules.md) 규칙 1). 실행은 `/evolve` 커맨드([`evolution-loop-protocol`]).

---

## 4. 팀 구성 — 22 에이전트

**설계·중재**
- `learning-architect` — 시스템·데이터모델·서비스경계·진화루프 구조 결정, 파이프라인 앞단 중재자.
- `sla-pedagogue` — 제2언어습득 과학의 수호자. 모든 교수법이 근거 기반인지 심사.
- `curriculum-designer` — CEFR A1→C2→원어민 능력요소 그래프·경로 설계(4스킬+음운·어휘·문법·화용).

**콘텐츠 엔진**
- `content-engine-engineer` — 언어 무관 콘텐츠 아이템 모델·수집·저장 파이프라인.
- `content-generation-ai` — LLM 기반 콘텐츠 생성·보정, 품질 게이트.
- `ai-tutor-engineer` — 몰입 대화 튜터·오류 교정, pluggable LLM.
- `speech-pronunciation-engineer` — ASR 발음점수·섀도잉·최소대립쌍·TTS·IPA.

**학습 과학·알고리즘**
- `srs-scheduler-engineer` — FSRS 간격반복·복습 큐·학습자별 최적화.
- `psychometrics-assessment-engineer` — IRT/ELO 캘리브레이션·CAT 배치·능력추정·마스터리 인증.
- `evolution-engine-engineer` — 자기개선 플라이휠(격차탐지·튜닝·실험 오케스트레이션).

**데이터·백엔드·프론트**
- `telemetry-data-engineer` — append-only 이벤트 로그·학습자 상태 파생·데이터 파이프라인.
- `backend-api-engineer` — API·인증·세션·콘텐츠 전달·동기화·서비스 경계.
- `web-frontend-engineer` — 학습 웹앱 UI(읽기·듣기·말하기·쓰기·튜터·복습·대시보드).

**신뢰·개방·품질**
- `learner-data-privacy` — 데이터 거버넌스·동의·익명화·개방데이터 윤리·내보내기/삭제.
- `security-auditor` — 데이터 백엔드·인증·콘텐츠/튜터 인젝션 보안 최종 심사.
- `community-contribution-engineer` — 콘텐츠·언어팩 기여·동료검증·랭킹·모더레이션.
- `i18n-a11y-engineer` — UI 로컬라이제이션·언어팩 프레임워크·CJK/RTL·WCAG 접근성.
- `motivation-gamification` — 성과 기반 동기·습관 설계(다크패턴 금지 규칙 하에).
- `growth-efficacy-analyst` — 학습성과 지표·효능 측정(정말 가르치는가)·북스타 관측.
- `qa-verification-engineer` — 검증 게이트(E2E+데이터+효능+교수법 불변식)·무회귀.
- `release-devops` — 빌드·CI·환경·모노레포·자가호스팅 배포.
- `oss-steward` — 라이선스·문서·CONTRIBUTING·CoC·데이터/모델 카드·거버넌스.

## 5. 스킬 — 18 (재사용 프로토콜·스펙)

데이터·알고리즘·프로토콜 SSOT. 작업 시 항상 해당 스킬을 따른다.

`content-item-schema` · `fsrs-spaced-repetition` · `irt-calibration` · `cefr-mastery-map` · `evolution-loop-protocol` · `telemetry-event-schema` · `learner-model-spec` · `ai-tutor-protocol` · `content-generation-quality-gate` · `language-pack-format` · `pronunciation-scoring` · `placement-adaptive-testing` · `ab-experiment-framework` · `privacy-consent-open-data` · `community-contribution-workflow` · `verification-gate` · `web-app-stack` · `oss-release-standards`

## 6. 커맨드 — 7

| 커맨드 | 하는 일 |
|---|---|
| `/add-language` | 새 목표어/모국어 언어팩 추가(코드 0, 데이터 주입) |
| `/new-content` | 언어+레벨+스킬 콘텐츠 배치 생성/수집 → 품질 게이트 |
| `/evolve` | 진화 루프 1사이클(분석→제안→실험→검증→배포→측정) |
| `/calibrate` | 수집 데이터로 IRT 문항 캘리브레이션·FSRS 재적합 |
| `/tutor-check` | AI 튜터 대화·교정·인젝션 방어 점검 |
| `/gate` | 릴리스 검증 게이트 실행(단일 판정자) |
| `/release` | 오픈소스 릴리스 컷(라이선스·카드·가이드) |

---

## 7. 절대 규칙 요약 (전문 = [rules.md](rules.md))

1. **성과가 진실, 참여는 아니다** — 최적화 목표는 학습성과. 체류시간·스트릭을 최적화하지 않는다.
2. **다크패턴 금지** — 손실공포·강제알림·죄책감 유발로 참여 강제 금지.
3. **이벤트 로그 append-only, 상태는 파생** — 이력 파괴 금지.
4. **학습자 데이터는 학습자 소유** — 내보내기·삭제 보장, PII 개방 금지.
5. **코어는 언어 무관, 모델은 pluggable, 자가호스팅 가능** — 락인 금지.
6. **미검증 콘텐츠 노출 금지** — 정확성·정답유효성 게이트 통과분만.
7. **효능 우선 검증** — 학습 기능은 "동작"이 아니라 "성과에 이롭다"를 확인.
8. **게이트 그린 = 완료**, **배포는 명시 승인 시**, **문서·메모리 동기화**, **사용자용 문서 한국어**.

---

## 8. 변경 이력

- **2026-07-08 (66)** — 🚀 **공개 배포 v0.1.0**(명시 승인 '배포해', 규칙 14·18). 첫 OSS 릴리스를 GitHub 공개 리포로 — <https://github.com/baboplater-blip/lingua-loop>(PUBLIC·main·MIT). git init(`-b main`)→로컬 identity→`git add -A`(241파일)→**커밋 전 유출 검사 0**(data/·.env·.sqlite·.pem·.key·secrets/·learner-store/ 미포함, `.claude/settings.json`=권한 허용목록뿐)→커밋 `65d3223`→annotated 태그 `v0.1.0`→`gh repo create --public --push`→태그 push→`gh release create v0.1.0`(한/영 노트)→토픽 10종. 배포 직전 게이트 그린 **309 pass / 57파일**·릴리스 준비도 그린 재확인. ⚠️GitHub 라이선스 자동감지는 재스캔 지연(LICENSE=표준 MIT 21줄). **여러 라운드째 완결 상태(7개 언어 A1~B2·무인 진화 폐루프·운영 런북·북스타 대시보드·읽기 복수/주관식/산출)를 "동작하는 완결 OSS"로 공개.**
- **2026-07-08 (65)** — 생성기 주관식(산출) 문항 + 효능 시계열 추이(2건 일괄). ①`adapters/reading-gen.withProductionQuestion` — 문항 2개↑면 마지막을 주관식(자유응답, options 제거·정답을 accept로)으로, 다국어·en·es 생성기가 사용 → 생성 지문이 인식+산출 균형·서버 채점. ②효능 추이(Loop Velocity): 코어 `EfficacySnapshot`·`trendSummary`(첫↔최신 델타), 서버 `recordEfficacy`(`EFFICACY_REF` append-only·집계 제외)·`efficacyHistory`, `GET /efficacy/history`·`POST /efficacy/snapshot`, `EventType`에 `efficacy.snapshot`, **evolve-publish가 사이클마다 스냅샷 기록**, ops 대시보드 추이 카드·CLI 추이. `multilingual-reading.test`·`reading-gen.test`·`core/efficacy.test`·`server/efficacy.test`·`ops.test`. 실증: 라이브 HTTP 8/8·진화 잡 2회 축적. 게이트 **309 pass(57파일)**·릴리스 준비도 그린. **진화 효능을 시간축으로 추적, 생성 지문이 산출 연습까지.**
- **2026-07-07 (64)** — 효능 대시보드 웹 뷰 + 읽기 복수·주관식 문항(2건 일괄). ①운영자용 정적 `web/public/ops.html`+`ops.js`(`GET /efficacy` 소비, TTM/Retention/Coverage/Content Health 카드+바 시각화, `STATIC` 편입, 세션수/스트릭 미노출) + `ops.test`. ②`ReadingQuestion.options` 옵셔널+`accept`; `scoreComprehension` 주관식=정규화(소문자·구두점·공백) 대조/객관식=정확일치; `validateReading` 양쪽; `redactReadingAnswers` 유형만 전달; 웹 `renderReadingQuestions` **모든 문항** 렌더(객관식 버튼·주관식 입력); en A1 시드 주관식 실증; `read.typeAnswer` 5로케일. `reading.test`·`ui.test`. 실증: 라이브 HTTP 11/11. 게이트 **302 pass(57파일)**·릴리스 준비도 그린. **운영자가 북스타를 브라우저로 보고, 읽기가 복수·주관식까지 측정.**
- **2026-07-07 (63)** — 효능 측정 대시보드(북스타 지표를 운영자가 데이터로, 규칙 1 성과가 진실). 코어 `efficacy.computeEfficacy(events)` — 이벤트에서 결정적 산출: **TTM**(정답 2회=숙달[BKT 0.6 정렬]까지 응답·경과), **Retention**(전체+복습[간격반복] 정확도), **Coverage**(학습자·본/숙달 KC·학습자당[0포함]). 서버 `efficacyReport`(코어 + **Content Health** 캘리브레이션·격차, `allLearnerEvents`로 community/published 제외) + `GET /efficacy` + CLI `scripts/efficacy.mjs`·`npm run efficacy`(한글 요약). OPERATING §6 지표표·"진화 전후 비교"·세션수/스트릭 미노출(다크패턴 금지). `core/efficacy.test`·`server/efficacy.test`. 실증: 라이브 CLI(응답31·96.8%·숙달8쌍)·HTTP 6/6. 게이트 **296 pass(56파일)**·릴리스 준비도 그린. **북스타(성과)가 운영자에게 가시화 — 진화 효능 입증 토대.**
- **2026-07-07 (62)** — 읽기 이해 문항 자동 채점·해설(읽기를 마스터리 스택 측정 대상으로). 클라이언트 자기채점(`o === q.answer`, 정답 유출+자기보고)을 **서버 채점**으로 전환. 코어 `scoreComprehension`(정답 데이터 대조·해설=정답 어휘 사전·범위밖/미검증 null)+`redactReadingAnswers`(서빙 시 정답 제거)+`ReadingQuestion.answer` 옵셔널. 서버 `answerReading`(정답 여부→`item.response` 이벤트→`deriveState` BKT 숙달·FSRS 갱신·지문 전체 KC 크레딧)+`POST /reading/answer`+`serveReading` 정답 미유출. 웹은 선택만 전송·서버 응답으로 정오/정답/해설 표시·중복 채점 방지. `read.explanation` 5개 로케일. `reading.test`·`ui.test`. 실증: 라이브 HTTP 15/15. 게이트 **288 pass(54파일)**·릴리스 준비도 그린. **읽기가 다른 스킬과 같은 폐루프(측정되는 학습)에 편입 — 입력 층 완결.**
- **2026-07-07 (61)** — 운영 루프 문서화(무인 진화 폐루프 운영 런북 + 다국어 진화 실행기). `docs/OPERATING.md` 신설 — 폐루프 다이어그램·전제(서버와 같은 스토어)·`evolve:publish`/`evolve:all`/`dataset:export` 출력 읽는 법·안전판·권장 캐던스 표·Linux crontab·Windows schtasks·모니터링·롤백 요약. `scripts/evolve-all.mjs`(kc-seed 보유 팩 자동 발견→언어별 evolve-publish 순차 spawn·`LL_DB`/`LL_DATA_DIR` 상속·인자로 언어 지정) + `evolve:all` npm 스크립트. `SELF_HOSTING.md` §8 운영 잡 보강(번호 정리·evolve:all·같은 스토어 경고·OPERATING 링크) + README 인덱스. 실증: 라이브 `evolve:all` 7개 언어 7/7(각 A1~B2 등급 읽기 4편=Phase 59/60 실배선 확인)·2회차 재발행 0(멱등). 게이트 **282 그린**·릴리스 준비도 그린. **운영자가 무인 폐루프를 돌리는 법이 문서로 완결.**
- **2026-07-07 (60)** — en·es 읽기 생성기 등급 다양화(7개 언어 전부 읽기 자동생성 A1~B2 대칭). `reading-gen.EnglishReadingGenerator`·`spanish-content.SpanishReadingGenerator`를 등급화 — `vocab.core`를 등급 KC로 `EN_GRADED`/`ES_GRADED`(A1 아침 일과·A2 새 카페·B1 요리 배우기·B2 책/독서 논설, 시드·per-KC·다국어 B2와 다른 새 주제) 4등급 + `levels(kc)`(vocab.core→4·그 외→[]). ⚠️단일 등급 KC(present_be·present_ser 등)는 `spec.level`이 자기 등급과 다르면 null → `generateGradedReadings` 등급 루프가 잘못된 등급으로 오생성 안 함. Phase 59 `levels?()` 배선이 그대로 en·es도 등급 경로로 태워 A1~B2 무인 공급·멱등. `build()` 헬퍼 공통화, vocab.core를 `EN_TEMPLATES`/`ES_READ`에서 등급 맵으로 이동. `reading-gen.test`·`spanish-adapters.test`·`reading.test`(레지스트리 7언어)·`evolve.test`(ja·en·es). 기존 무등급 호출·중복 id·미지원 null 무회귀. 실증: 라이브 30/30. 게이트 **282 pass(54파일)**. **7개 언어 전부 읽기 자동생성 A1~B2 대칭 — 문법·배치·읽기가 언어 편차 없이 완결.**
- **2026-07-07 (59)** — B2 읽기 생성기 등급 추가(진화 자동생성 읽기가 A1~B2 스펙트럼 전체 무인 공급). `adapters/multilingual-reading`의 `TEMPLATES[lang]`에 B2 논설 템플릿 5개 언어(zh 科技与生活·ar التكنولوجيا والحياة·sw Teknolojia na Maisha·ja テクノロジーと生活·hi तकनीक और जीवन, 주제=과학기술/스마트폰 양면성, 양보+의견 논설체, 시드 B2 도시생활과 다른 새 주제) → A1~B2 4등급·진짜 미제공 등급(C1)만 A2 폴백. `MultilingualReadingGenerator.levels(kc)` 신설 + `engine/reading.generateGradedReadings` 기본 A1~**B2**. **진화 배선**: `ReadingGenerator.levels?()`(선택 메서드)로 등급 생성기 식별 → `evolve.ts` 3.5절이 `generateGradedReadings`로 KC별 A1~B2 공급(등급별 고유 id로 사이클 간 멱등), 단일 생성기(en/es)는 기존 KC 격차 경로 유지(무회귀). ⚠️등급 격차는 covered 필터 대신 id/본문 중복 제거로 멱등. `multilingual-reading.test`·`reading.test`·`evolve.test`. 실증: 라이브 39/39. 게이트 **277 pass(54파일)**. **상급 학습자에게도 무인 콘텐츠가 이어짐.**
- **2026-07-07 (58)** — en·es B1/B2 문법 3면 대칭 심화(7개 언어 전부 B1·B2 완결). `packs/{en,es}/kc-seed.json`에 B1/B2 문법 KC(en present_perfect·conditional·relative, es preterite·subjunctive — placement가 참조하던 dangling KC를 실 KC로) + `content-seed.json` 각 flashcard+mcq 2문항 + **튜터 축**(local-tutor have+과거형→과거분사·if 문맥 was→were, spanish-tutor ayer+현재→과거·바람 que+직설법→접속법, 전부 문맥 가드 오탐0). `tutor.test`·`spanish-adapters.test`·`b1-content.test`. 실증: 라이브 17/17. 게이트 **272 pass(54파일)**. **7개 언어 전부 B1·B2 문법 3면(측정·학습·교정) 대칭.**
- **2026-07-07 (55-57)** — 발음 B1 연계 + B2 문법 3면 대칭 + 읽기 등급 다양화(3항목 일괄). ①`phonology.json`에 신설 B1 KC 발음 형태(ja 촉음 최소대립쌍·て형 shadow, zh 了 경성 prosody, ar 과거 shadow, sw -li-, hi 후치사) — 스키마 준수(성조/강세 분기). ②B2 문법 KC 5종(zh 得·ja 가능형 られる·hi 능격 ने·ar أن·sw 연관 cha) + B2 배치(b=2.2)·학습 콘텐츠(flashcard+mcq)·**튜터 3번째 축**(전부 문맥 가드 오탐0) → B2도 배치·학습·교정 3면 대칭. ③`multilingual-reading`를 등급별 `TEMPLATES[lang][level]`(A1·A2·B1)로 재구성 + `generateGradedReadings`(한 격차서 3등급). 실증: 라이브 40/40. 게이트 **267 pass(54파일)**. **난이도·문법·발음·진화 4축이 B1~B2 상급까지.**
- **2026-07-07 (54)** — 생성기 KC 확장(진화 자동생성 vocab.core→numbers·greetings·B1 문법). `adapters/multilingual-content.MultilingualVocabGenerator`를 토픽별 GEN[lang][kcId] 구조로 재구성 — zh·ar·sw·ja·hi 각 vocab.core·numbers·greetings·B1 문법 4종 KC 지원. numbers·greetings=새 flashcard, B1 문법=새 mcq(B1). `supports()`가 `kc in table`, generate()가 문법이면 mcq·B1. ⚠️멱등은 generateForGaps 아닌 `analyze.contentGaps`(격차 탐지) 층 제공(같은 id checkItem dedup 스킵). `multilingual-content.test` 확장(4종 지원·게이트 통과·mcq·B1). 실증: 라이브 29/29(5언어×3토픽 생성·강등→생성→격차 해소 멱등). 게이트 **259 pass(54파일)**. **진화 폐루프가 어휘 넘어 숫자·인사·문법까지 무인 생성.**
- **2026-07-07 (53)** — 읽기 B2 확장 + B1 배치고사 심화(난이도 A1→B2 완성). 7개 언어 `packs/*/reading.json`에 B2 지문 1편씩(공통 소재=도시 생활, 주장→양보→개인 의견 논설, 상급 어휘·관계절/접속법, ≥150자[CJK 밀도 반영]) + `packs/{zh,ar,sw,ja,hi}/placement.json`에 B1 문항(b=1.2)로 A2~B1 사이 보강(B1 대역 2개). `reading.test`(B2 존재·B2 학습자 서빙)·`placement.test`(B1 ≥2). 실증: 라이브 31/31(B2 학습자 B2 서빙·B1 경계 θ≈1.64→B1). ⚠️초기 스모크 5건은 학습자 모델 오설정(B1 완벽=B2급)이라 코드 결함 아님. 게이트 **258 pass(54파일)**. **난이도 A1·A2·B1·B2 4단 완비.**
- **2026-07-07 (52)** — 전용 튜터 2번째 문법 축(신설 B1 문법 실시간 교정). 5개 튜터에 B1 문법 오류 교정 추가 — ja て형 오형→음편형(WRONG_TE 정확 토큰), hi 처소 후치사 में 삽입(장소+계사), zh 완료 了 삽입(과거 시간부사+동사, ⚠️부정·조동사 negative lookbehind 제외), ar 과거형 리캐스트(أمس 문맥), sw -li- 과거(jana 문맥, 주어 접두사 보존). **전부 문맥 가드로 오탐 0**(가드 없으면 무발화, 기존 코퍼스 회귀 0). 어댑터 테스트 5(발화+무발화). 실증: 라이브 20/20(HTTP 발화·오탐 0·인젝션 방어). 게이트 **256 pass(54파일)**. **B1 티어가 배치·학습·튜터 3면 전부 대칭(콘텐츠·평가·교정).**
- **2026-07-07 (51)** — 신설 B1 문법 KC 학습 콘텐츠 시드(평가 가능→학습 가능). Phase 50이 신설한 5개 B1 KC(zh 了·ar 과거·sw -li-·ja て형·hi 후치사)가 배치고사에만 있고 학습 콘텐츠 0이던 공백을 닫음 — `packs/{zh,ar,sw,ja,hi}/content-seed.json`에 각 KC flashcard+mcq 2문항(B1·CC-BY-4.0·목표어 문자, checkItem 통과). getPack draft→verified 승격·선행 vocab.core 숙달 시 해금→`/next` 서빙. minItems=2 충족(진화 격차 아님). `b1-content.test`(각 KC≥2·flashcard+mcq 균형·문자 보존). 실증: 라이브 15/15(선행 전 잠김→2회 정답 후 해금·서빙). 게이트 **251 pass(54파일)**. **B1 티어가 배치·학습 양쪽 완결.**
- **2026-07-07 (50)** — 읽기 B1 상향 + 배치고사 중급 천장 확장(초급→중급 경로). 7개 언어 `packs/*/reading.json`에 B1 지문 1편씩(공통 소재=주말 바닷가 여행, 과거·조건·의견, ≥120자·클릭 사전·이해 문항, 시드와 안 겹침) + `packs/{zh,ar,sw,ja,hi}/kc-seed.json`에 진짜 B1 문법 KC(了 `aspect_le`·`past_tense`·`tense_li`·`te_form`·`postpositions`, skill=writing) + `placement.json`에 B1(b1.4)·B2(b2.0) 문항 각 2개로 CAT 천장 A2→B2. `reading.test`·`placement.test` B1/B2 커버리지·B1 학습자 서빙 고정. 실증: 라이브 38/38(HTTP 전부 정답→5개 언어 B2 배치·7개 언어 서빙 전수 검증). 게이트 **249 pass(53파일)**. **콘텐츠 난이도가 A1·A2에서 B1·B2로 확장 — 초급 졸업 경로 개통.**
- **2026-07-06 (49)** — 읽기 지문 생성기 다국어화. `adapters/multilingual-reading.MultilingualReadingGenerator`(데이터 주도, 언어별 등급 지문 템플릿 zh·ar·sw·ja·hi, 주제=시장) + `createReadingGeneratorFor` 전 언어 라우팅 → **진화 폐루프가 읽기 지문도 7개 언어 자동생성**(문항 생성기와 대칭). validateReading 통과분만(규칙 4), id/본문 중복 제거로 멱등. 실증: 라이브 15/15. 게이트 **245 pass(53파일)**. **진화 폐루프가 문항+읽기 양쪽 모두 7개 언어 무인 생성.**
- **2026-07-06 (48)** — 콘텐츠 생성기 다국어화. `adapters/multilingual-content.MultilingualVocabGenerator`(데이터 주도, 언어별 어휘 테이블 zh·ar·sw·ja·hi 각 6항목, 시드와 안 겹침) + `createContentGeneratorFor` zh·ar·sw·ja·hi 라우팅 → **진화 폐루프가 7개 언어 자동생성**(en·es만이던 갭 해소). 생성물 draft→게이트 통과분만(규칙 4). ⚠️파라미터 프로퍼티(`constructor(private x)`)는 무설치 실행에서 금지 → 필드 명시 선언. 실증: 직접 15/15 + 진화 사이클 15/15(실제 격차서 생성·멱등). 게이트 **242 pass(52파일)**.
- **2026-07-06 (47)** — 7번째 학습 언어 = 힌디(hi) + 전용 튜터. `packs/hi`(데바나가리 abugida·마트라·성 일치 m/f·권설음ट/치음त·유기음ख/무기음क 대립) 데이터만 + `adapters/hindi-tutor.HindiHeuristicTutor`+`correctHi`(성 일치[여성 명사 앞 형용사 여성형화 अच्छा→अच्छी]·로마자→데바나가리 namaste→नमस्ते). `createTutorFor` hi·`langName` hi. `universality.test`·`reading.test` hi + `hi.test`·`hindi-adapters.test`(8) + 선택기·VOICE_LANG.hi·SCENARIO_GREETING hi + `normWord` 데바나가리. **학습 언어 7종·전용 튜터 7종, 문자 패러다임 5종**. 실증: 라이브 스모크 11/11. 게이트 **239 pass(51파일)**.
- **2026-07-06 (46)** — ja 전용 튜터(조사 を·문자). `adapters/japanese-tutor.JapaneseHeuristicTutor`+`correctJa`(오프라인·결정적: ①목적어 조사 を 누락 삽입[みず のみます→みず を のみます]·は→を 오용 ②로마자→가나/한자 리캐스트) + `createTutorFor` ja. **en·es·zh·ar·sw·ja 6개 언어 전용 튜터 완결**. 파일럿→전용 승격. `japanese-adapters.test`(8) + ja.test 튜터 전용 교체. 실증: 라이브 스모크 8/8(다른 언어 오적용 없음). 게이트 **225 pass(49파일)**.
- **2026-07-06 (45)** — 6번째 학습 언어 = 일본어(ja) 파일럿(코어 0줄). `packs/ja`(가나·가타카나·한자 혼합·조사 は/を/に·촉음っ/장모음 모라 대립·피치 액센트 stress 표현) — pack·kc(vocab·kana·numbers·greetings·particles)·content 9·phonology·placement·reading 3편(가나 띄어쓰기). `universality.test`·`reading.test` ja 편입 + `ja.test`(패스스루 튜터) + 학습 선택기·VOICE_LANG.ja·SCENARIO_GREETING ja + `normWord` 가나 범위. 튜터=PassthroughTutor 폴백(전용은 후속). 실증: 라이브 스모크 11/11(전 경로 동작, en 튜터 오적용 없음). 게이트 **217 pass(48파일)**.
- **2026-07-06 (44)** — 문항 시드 밀도↑(zh·ar 4→9). zh(greetings 你好·再见·vocab 谢谢·num 五·tones 买/卖)·ar(script س·بيت·greetings مرحبا·مع السلامة·vocab نعم). **비어 있던 KC에 문항 투입**(zh greetings·ar script/greetings). 콘텐츠 게이트 통과(반려 0). en·es·zh·ar·sw 모든 KC 문항 보유. 실증: 라이브 스모크 12/12. 게이트 **210 유지**.
- **2026-07-06 (43)** — 발음 데이터 5개 언어 확충. zh·ar·sw 발음(대립쌍 2→5·섀도 2→4·운율 →4): zh(성조 买/卖 3성/4성·분절 b/p·s/sh), ar(인두/성문 خ·ح·ع·ء·유무성 z/s), sw(f/v·t/d·모음 i/o). 기존 phonemes만 사용(zh pʰ·ts 보강). `pronounce.test`를 5개 언어·밀도 3+로 일반화(운율 성조/강세 분기). 실증: 라이브 스모크 13/13. 게이트 **210 유지**.
- **2026-07-06 (42)** — 아랍어 화면 언어(RTL). `packs/ar/i18n.json`(ko와 동일 132키·`dir:"rtl"`) 신설 → 화면 언어 5종(ko·en·es·zh·ar). `getI18n`이 `{strings,dir}` 반환·`/i18n`이 dir 포함 → 앱 `UI_DIR`·`document.documentElement.dir`로 셸 방향을 로케일 데이터가 결정(첫 RTL UI, 목표어 콘텐츠는 여전히 `dir="auto"`). `pack.test` ar 자동 편입(다크패턴 스캔 7건)+`ui.test` 선택기·dir 단언. 실증: 라이브 스모크 8/8. 게이트 **210 유지**.
- **2026-07-06 (41)** — 등급 읽기 지문 5개 언어 완비. `packs/{zh,ar,sw}/reading.json` 각 3편(A1·A1·A2, 나의 하루·가족·주말) 신설 + `packs/es` A2 1편 추가 → en·es·zh·ar·sw 전 언어 읽기 탭 작동. 클릭 사전 `normWord`가 CJK 한자·아랍 문자 보존(zh는 학습자용 단어 띄어쓰기). `reading.test` 검증을 5개 언어로 일반화(라틴·CJK·RTL 동일 검증기). 전부 CC-BY-4.0·i+1·이해 확인 문항. 실증: 라이브 스모크 26/26. 게이트 **210 유지**.
- **2026-07-06 (40)** — 역할극 시나리오 확장(병원·공항). **5개 언어**(en·es·zh·ar·sw) 튜터 FOLLOWUPS에 `hospital`(증상·통증·알레르기)·`airport`(여권·수하물·좌석) 뱅크 추가 + 웹 `SCENARIOS`·`SCENARIO_GREETING`(상황별 목표어 오프닝 🏥✈️, 5언어) + `scenario.{hospital,airport}` 4로케일. 데이터만 추가로 시나리오 5→**7종**(파이프라인 구조 불변). 실증: 라이브 스모크 10/10(5언어 병원·공항, 상황 분리, sw 교정 유지). 게이트 **210 pass**.
- **2026-07-06 (39)** — sw 전용 튜터(명사부류·주어일치) + 콘텐츠 확충. `adapters/swahili-tutor.SwahiliHeuristicTutor`+`correctSw`(오프라인·결정적: ①명사부류 복수 m-→wa-[복수 수식어 앞] ②주어 접두사 일치 wa-[복수 주어 뒤 동사]) + `createTutorFor` sw. **en·es·zh·ar·sw 5개 언어 전용 튜터 완결**. sw 콘텐츠 4→9항목. 실증: 라이브 스모크 6/6. 게이트 **209 pass**.
- **2026-07-06 (38)** — 저자원 언어 파일럿(스와힐리어 sw). `packs/sw`(데이터만, 반투어·명사 부류 m-/wa-·b/p·l/r 대립·페널티메이트 강세·성조 없음) + `universality.test` sw 편입 + `sw.test` + `langName` sw + 학습 선택기·VOICE_LANG·시나리오 그리팅. **코어/서버/어댑터 0줄** — 같은 엔진이 5번째 언어 서빙. 실증: 라이브(i+1 게이팅·해금·발음·패스스루 튜터). 게이트 **202 pass**.
- **2026-07-06 (37)** — 프로필 내보내기(소유·포터블, 규칙 6). 웹 프로필 카드에 JSON 다운로드, 공용 `exportJson` 헬퍼(인증서 내보내기도 재사용). `profile.export` 4로케일. 게이트 **196 유지**.
- **2026-07-06 (36)** — 역할극 시나리오 확장(상점·길찾기). 4개 언어 튜터 FOLLOWUPS에 `shopping`·`directions` + 웹 `SCENARIOS`·`SCENARIO_GREETING`(4개 언어 오프닝) + `scenario.{shopping,directions}` 4로케일. 데이터만 추가로 시나리오 5종. 실증: 라이브 스모크 6/6. 게이트 **196 유지**.
- **2026-07-06 (35)** — 학습자 프로필 카드(성과 요약, 스트릭 없이). `core/profile.buildProfile`(인증+배지+누적 통계[응답·정확도·연습 KC·튜터·기여], 결정적·포터블·타임스탬프 없음) + `handlers.profileFor`(학습자 로그 파생) + `GET /profile` + 웹 6지표 그리드(로케일). 응답 없으면 정확도 null. 다크패턴 없음(규칙 2·9). 실증: 라이브 스모크 7/7. 게이트 **196 pass**.
- **2026-07-06 (34)** — 추가 UI 로케일(es·zh) — 화면 언어 4종. `packs/{es,zh}/i18n.json`(ko와 동일 키 집합) + 화면 언어 선택기 확장 + `pack.test` 로케일 파리티·다크패턴 스캔을 전 로케일로 일반화(ko 폴백). 학습 언어(en·es·zh·ar)와 화면 언어(ko·en·es·zh) 대칭. 실증: 라이브 스모크 6/6. 게이트 **191 pass**.
- **2026-07-06 (33)** — ar 전용 튜터(성 일치·문자) — 4개 언어 전용 튜터 완결. `adapters/arabic-tutor.ArabicHeuristicTutor`+`correctAr`(오프라인·결정적: ①성 일치 여성명사+남성형 형용사→여성형+ة[남성명사 오탐방지] ②로마자→아랍 문자) + `createTutorFor` ar 라우팅. explainLang·역할극 재사용. en·es·zh·ar 전용 튜터 완성. 실증: 라이브 스모크 6/6. 게이트 **191 pass**.
- **2026-07-06 (32)** — 역할극(task 시나리오) — 잠든 상황별 대화 활성화. 튜터 `FOLLOWUPS` task 뱅크(default/intro/restaurant)가 있었으나 웹이 `task` 미전달로 사장 → 상황 선택기(`#scenarios`) + `/tutor` `task` 전달 + `SCENARIO_GREETING`(상황별 목표어 오프닝). 후속 질문이 상황 반영(en·es·zh). 실증: 라이브 스모크 4/4. 게이트 **184 pass**.
- **2026-07-06 (31)** — 기여자 배지(성취를 커뮤니티까지, 다크패턴 없이). `core/badges.deriveBadges`(증거 기반·결정적, 5카테고리 브론즈/실버/골드: 숙달·레벨·기여·**잘 가르침[학습효과 healthy]**·검토[신뢰≥0.6 자격]) + `handlers.badgesFor`(certificatesFor+communityView 재사용) + `GET /badges` + 웹 배지 칩(i18n·티어 이모지). 검토 배지는 양 아닌 실효(규칙 1). 실증: 라이브 스모크 6/6. 게이트 **182 pass**.
- **2026-07-06 (30)** — 다중 모국어 UI(i18n) — 문자열은 데이터, 화면 언어는 학습자 선택. 로케일 팩 `packs/{ko,en}/i18n.json`(키 파리티·en 다크패턴 스캔) + `GET /i18n`(ko 폴백) + 웹 `data-i18n`/`t()`/`applyI18n` + 화면 언어 선택기(배우는 언어와 독립) + 튜터 `explainLang`(교정 메모·격려 ko/en, 목표어 몰입 어구 유지). 실증: 라이브 스모크 6/6. 게이트 **176 pass**.
- **2026-07-06 (29)** — 중국어 전용 튜터(성조·是·양사) + 웹 튜터 언어 라우팅 수정. `adapters/chinese-tutor.ChineseHeuristicTutor`+`correctZh`(오프라인·결정적: ①병음/성조 로마자→한자+성조 리캐스트 ②是+형용사→很[복합어 오탐방지] ③양사 一个书→一本书) + `createTutorFor` zh 라우팅(withSafety). **웹 갭 수정**: `/tutor`가 lang 미전달로 늘 en 튜터였던 문제 → `/tutor?lang=` 전달(선택 언어 튜터 실동작). 실증: 라이브 스모크 5/5. 게이트 **173 pass**.
- **2026-07-06 (28)** — RTL·아랍어(ar, 표기 방향까지 데이터가 결정). `packs/ar`(데이터만, `direction:rtl`·아랍 문자 콘텐츠·q/ك 최소대립쌍·강세 운율) + `getPack` pack.json 메타 로드 + **`GET /pack`**(방향 메타) + 웹 콘텐츠 `dir="auto"`(유니코드 bidi)·`applyPack`(lang 속성·튜터 안내) + `langName` 아랍어 + 패스스루 튜터. **코어/서버/UI 언어·방향 분기 0**, `universality.test`에 ar 편입. 실증: 라이브 스모크 7/7(방향·아랍문자 서빙·CAT·발음·튜터). 게이트 **167 pass**.
- **2026-07-05 (27)** — 개방 데이터셋 카드 자동생성(투명성 완결). `core/datasetCard`(요약·스키마·익명화·k·라이선스 Markdown, 결정적) + `report.typeBreakdown` + `dataset:export`가 데이터셋+카드 동시 기록. 카드 없이 재배포 금지(oss-release-standards) 코드 강제. 게이트 **159 pass**.
- **2026-07-05 (26)** — 마스터리 인증서 내보내기(성취까지 소유, 규칙 6). `core/buildCertificate`(인증 can-do·레벨의 결정적·포터블 스냅샷, 타임스탬프 없음, 재현좌표 issuedFromEvents) + `GET /account/certificate` + 웹 "🏅 인증서 내보내기"(JSON 다운로드). 실증: can-do 2개 인증서. 게이트 **158 pass**.
- **2026-07-05 (25)** — 성조어(중국어 zh, 다국어 범용 CJK·성조 재실증). `core/phonetics.toneScore`(음절별 성조 범주) + 어댑터 운율 통합(강세·성조, 성조 오류 시 명료도 큰 손실) + `packs/zh`(성조 데이터만, 코어 0줄) + `PassthroughTutor`(미지원 언어 오교정 방지) + 웹 zh 선택. 실증: 같은 서버가 en·es·zh 처리. 게이트 **157 pass**.
- **2026-07-05 (24)** — 무인 진화 잡(evolve→publish 자동). `handlers.publishFromEvolve`(사이클 산출을 게이트 재검사하며 자동 발행) + `scripts/evolve-publish.mjs`(`npm run evolve:publish`, cron). **멱등**(격차 탐지에 발행분 포함). 안전판=게이트+학습효과 강등. 실증: 1회차 13문항 발행, 2회차 0. 게이트 **150 pass**.
- **2026-07-05 (23)** — 데이터셋 개방 파이프라인(프라이버시 우선). `core/open-dataset.ts`(`filterConsented`·`anonymizeEvents`[가명 재발급·텍스트 스크럽·ts coarsen]·`reidentificationRisk`[k-익명성]·`buildOpenDataset`[동의→선별→singleton 억제→익명화, 실패 시 배포금지]) + `scripts/export-dataset.mjs`(`npm run dataset:export`) + `/release --datasets` 실검사. 실증: 동의 필터·singleton 억제·k-익명성 통과. 게이트 **148 pass**.
- **2026-07-05 (22)** — 마스터리 인증(동기 층, 마스터리 스택 7층 완성). `core/certifications.deriveCertifications`(증거 기반 인증[숙달≥0.85&반복≥3]·레벨 진척·완주 레벨·다음 후보) + `GET /certificates` + 웹 성취 섹션(can-do·진척 바·격려). **다크패턴 없이**(규칙 1·2·9) 달성 인정·경로 개방. 실증: 정답 4회→KC 인증. 게이트 **143 pass**.
- **2026-07-05 (21)** — 발음 심화(운율/강세). `core/phonetics.stressScore`(주강세 위치 0.7 + 음절 일치 0.3) + `adapters/pronunciation` 운율 통합(분절음 70%+운율 30%, 주강세 오류 시 명료도 손실) + `packs/*/phonology.json` prosody 섹션(en·es 다음절) + 웹 강세 시각화. 실증: 틀린 강세 → 점수·명료도 감점 + 힌트. 게이트 **138 pass**.
- **2026-07-05 (20)** — 생성 콘텐츠 서빙 편입(플라이휠 완결). `publishContent`/`publishReading`(게이트/검증 통과분만 append-only 발행, `PUBLISHED_REF`) + `publishedBank`/`publishedReadings`(학습효과 강등 반영) + `POST /content`·`/content/reading` + `/next`·`/reading` 합류 + 삭제 보호. **학습→데이터→생성→발행→노출→측정→강등** 폐루프 완결. 실증: 생성 문항 발행→새 학습자 노출·중복 dedup. 게이트 **135 pass**.
- **2026-07-05 (19)** — CAT 배치고사 UI(평가 층 완결). `handlers.placementStep`(상태 없는 적응형·서버 채점·정답 미유출·θ ±3.5 클램프) + `POST /placement/step` + `packs/{en,es}/placement.json` + 웹 레벨 탭(적응형→레벨→`assessment.item`으로 능력 반영→읽기 i+1). 실증: 강함 B2·약함 A1, 다국어. 게이트 **130 pass**.
- **2026-07-05 (18)** — 스페인어 어댑터(다국어 범용을 어댑터층까지). `adapters/spanish-tutor.ts`(`SpanishHeuristicTutor`·`correctEs`: ser 활용·el/la 성 일치) + `adapters/spanish-content.ts`(`SpanishTemplateGenerator`·`SpanishReadingGenerator`, 게이트 통과분만) + 언어별 레지스트리(`createTutorFor`/`createContentGeneratorFor`/`createReadingGeneratorFor`, es↔en 폴백) + 서버 `tutorFor(lang)` 라우팅 + 웹 언어별 인사. 실증: 같은 서버가 lang으로 언어별 튜터 라우팅. 게이트 **125 pass**.
- **2026-07-05 (17)** — 읽기 지문 자동생성(입력 층 진화). `adapters/reading-gen.ts`(`ReadingGenerator` pluggable + `EnglishReadingGenerator` 오프라인 템플릿) + `engine/reading.ts`(`generateReadings`: 격차→생성→`validateReading`→통과분만, 중복 제거) + `/evolve` `readingGenerator`·`readings` 편입(리포트 `readingGeneration`). 이제 1사이클이 문항+읽기 지문을 함께 생성. 데모 "My Neighbor" 등 2편 실증. 게이트 **119 pass**.
- **2026-07-05 (16)** — 진화 폐루프 통합(`/evolve`에 커뮤니티 재평가 편입). `EvolveInput.communityEvents` + 리포트 `community`(reviewed·healthy·demoted·topItem). `reevaluateCommunity`를 신뢰가중 `evaluateCommunity` 기반으로 일치. 1사이클이 캘리브+FSRS+콘텐츠생성+**커뮤니티 재평가**를 모두 실행. 데모가 4축 전부 표시(커뮤니티 강등 실증). `/evolve` 커맨드 5단계 추가. 게이트 **113 pass**.
- **2026-07-05 (15)** — 기여자 신뢰가중(안티어뷰즈). `core/community.ts`: `objectiveOutcome`·`computeTrust`(검토-객관진실 일치 이력, 신규 수축)·`reviewerWeight`(0.5+정확도)·`decideStatusWeighted`·`evaluateCommunity`(원시→신뢰도→가중 재판정). 신뢰를 게이트·학습효과에 앵커해 순환 차단, 하위호환(신규=중립 1.0). 서버 `communityView`가 효과+신뢰 통합, 커뮤니티 뷰 전체 경유. 실증: 저신뢰 2표=밀어주기 차단, 신규 2표=하위호환 승격. 게이트 **112 pass**.
- **2026-07-05 (14)** — SQLite 백엔드(규모화, 제로 의존 유지). `packages/server/src/sqlite-store.ts`: `openSqliteStore`(Node 24 내장 `node:sqlite`, WAL·인덱스, events append-only INSERT·삭제만 DELETE). `Store`에 `close?` 훅. `LL_DB` 지정 시 SQLite, 아니면 JSONL(기본). 인터페이스 뒤 교체라 **코어·핸들러 불변**(규칙 12). 우아한 종료(SIGINT/TERM). 별도 프로세스 재시작 복원 실증. 게이트 **109 pass**.
- **2026-07-05 (13)** — 학습효과 재랭킹(두 진화 축 연결). `core/content-effect.ts`(`itemEffects`=난이도적합+점이연변별, ELO 능력추정) + `community.ts`(`rankByEffect`·`isDemoted`·`servableCommunityItems`) + `engine/community-effect.ts`(`reevaluateCommunity`). 서버 `communityBank` 효과 강등(`/next` 제외) + `GET /contributions?rank=effect` + 웹 효과순 리더보드. **인기 아닌 학습효과가 노출·순위 지배**(규칙 1). 실증: 동료 승인 동일인데 변별 +1.00 vs −1.00 → good만 서빙. 게이트 **105 pass**.
- **2026-07-05 (12)** — 커뮤니티 기여(진화의 인간 축, 개방범용 축 완성). `core/community.ts`(언어무관: `moderationFlags`·`makeSubmission`[게이트+모더레이션]·`decideStatus`·`deriveContributions`[리플레이 파생·자가검토 무시]·`acceptedItems`·`rankContributions`) + 이벤트 `contribution.submitted`/`review` + 서버 `POST /contribute`·`/contribute/review`·`GET /contributions` + `/next`에 승격분 합류(규칙 4) + 공용 로그 삭제 보호 + 웹 기여 탭. 제출→게이트→동료검증→승격→서빙 전 루프 실증. 게이트 **100 pass**.
- **2026-07-05 (11)** — 등급 리더(이해가능한 입력 i+1, 입력 층). `core/reading.ts`(언어무관: `cefrFromAbility`·`validateReading`·`selectGradedReading` 결정적 i+1) + `packs/{en,es}/reading.json`(등급 지문·클릭 사전·이해 문항·CC-BY-4.0) + 서버 `GET /reading`(검증 통과분만, 규칙 4) + 웹 읽기 탭(단어 클릭→뜻·TTS·`content.exposure` 로깅, 이해 확인→숙달도). **버그 수정**: 웹 응답 로깅 kc 문자열→배열(deriveState 오염 방지). 게이트 **89 pass**.
- **2026-07-05 (10)** — 발음(Phase 3, 마스터리 스택 7층 완성). `core/phonetics.ts`(언어무관: IPA 자질표·`featureDistance`·정렬 채점 `scorePronunciation`+명료도·`articulationHint`) + `adapters/pronunciation.ts`(pluggable `PronunciationScorer`+오프라인 `LocalPhoneticScorer`, **원음성 미수신**) + `packs/{en,es}/phonology.json` 강화(최소대립쌍 IPA·섀도잉) + 서버 `POST /pronounce`(특징만 `speak.attempt` 로깅)·`GET /phonology` + 웹 발음 탭(TTS 원음·듣고구별·따라말하기·선택 ASR). **명료도 우선**(규칙 1), ASR/TTS pluggable(규칙 12·13). 실증 think→sink 99%·명료도 100%. 게이트 **81 pass**.
- **2026-07-05 (9)** — OSS 공개 준비 완료(Phase 5). 개방 프로젝트 문서(CONTRIBUTING·CODE_OF_CONDUCT·SECURITY·CHANGELOG) + 투명성 카드(`docs/DATA_CARD.md`·`docs/MODEL_CARD.md`) + `docs/SELF_HOSTING.md` + `scripts/release.mjs`(`npm run release`: 게이트·시크릿 스캔·**실서버 self-host 스모크**·카드·라이선스 점검, push 안 함=규칙 18). **라이선스 확정(오너 결정): 코어/모델=MIT, 콘텐츠=CC-BY-4.0**(`LICENSE`·`LICENSES.md`·`packs/LICENSE.md`, package.json license=MIT). 준비도 **전 항목 그린 → 릴리스 준비 완료**, 배포는 '배포해' 승인 시. 게이트 71 pass 유지.
- **2026-07-05 (8)** — 이벤트 영속(MVP 완성). `packages/server/src/persist.ts`: `openFileStore(dir)` — JSONL 파일 스토어(학습자당 한 파일·한 줄=한 이벤트·파일도 append-only), 재시작 시 디렉터리 리플레이 복원. `Store`에 `sink`/`remove` 훅 배선(`ingest`·`tutorTurn`은 파일 append, `deleteLearner`는 파일 제거=규칙 6). `syncCounterFrom`으로 재시작 후 eventId 충돌 방지. 서버 기본 영속 ON(`LL_DATA_DIR`=기본 `data/events`). 별도 프로세스 재시작 실증. 게이트 **71 pass**.
- **2026-07-05 (7)** — 2번째 언어쌍(다국어 범용 실증, 규칙 11). `packs/es`(스페인어, 데이터만) + 서버 다중 언어팩 로딩(`getPack` 캐시) + 웹 UI 배우는-언어 전환기(en/es). `universality.test`로 en·es 동일 코어 경로 검증. **코어 코드 0줄 변경**. 게이트 **66 pass**.
- **2026-07-05 (6)** — 콘텐츠 자동생성(진화 루프 3축 완성). `adapters/content-gen`: `ContentGenerator` pluggable + `EnglishTemplateGenerator`(오프라인 관사·3인칭-s·be·어휘). `engine/content`: `runNewContent`(생성→코어 품질게이트→verified) + `generateForGaps`. `/evolve`가 격차를 자동 생성으로 메움(게이트 통과분만, 규칙 4). 데모: 3KC→12문항. 게이트 **63 pass**.
- **2026-07-05 (5)** — AI 튜터. `packages/adapters`: `TutorModel` pluggable 인터페이스 + `withSafety`(인젝션 방어 데코레이터) + `LocalHeuristicTutor`(오프라인 교정: 관사·be일치·3인칭-s·I대문자, i+1 후속질문). 서버 `POST /tutor`(=`handlers.tutorTurn`, 대화+교정, tutor.turn append-only 로깅). 웹 UI 학습/튜터 탭. 로컬 기본으로 외부 API 0 자가호스팅(규칙 12·13). 게이트 **54 pass**.
- **2026-07-05 (4)** — 학습 웹 UI. `packages/web`(제로 의존 브라우저 앱, index.html·app.js·style.css), 기존 server가 정적 서빙. 학습 모드(플래시카드·클로즈·MCQ·최소대립쌍) → append-only 이벤트 → 상태 갱신. 투명성 패널·데이터 소유권 버튼·다크패턴 없음(게이트가 UI 스캔). 학습자→데이터→진화 **전 경로 관통**. 게이트 **46 pass**. 실행 `npm run serve`.
- **2026-07-05 (3)** — Phase 2 진화 워커. `packages/engine`(7모듈: sequences·fsrs-optimize·analyze·calibrate·experiment·evolve·synthetic). **자기개선 실증**(복습 로그로 FSRS 재적합 → held-out 예측오차 0.41→0.32). **가드레일=학습성과**(리텐션 개선 또는 효율↑=TTM 단축만 배포, 복습만 늘리는 다크패턴 반려). `/evolve` 오케스트레이터 + 데모. 게이트 **42 pass**. FSRS 파라미터화(하위호환).
- **2026-07-05 (2)** — Phase 1 착수. 아키텍처 확정(TS 무설치 실행·모노레포·en/ko). `packages/core`(9모듈: FSRS·KC그래프·학습자모델·IRT/ELO 캘리브레이션·CAT·품질게이트·이벤트·sim) + `packages/server`(데이터 백엔드, verified만 서빙·append-only·소유권) + en/ko 시드 언어팩 + `scripts/gate.mjs`. **게이트 그린 35 pass/0 fail(효능 스모크 포함)**.
- **2026-07-05 (1)** — 하네스 초기 구축. 5문서 + 22 에이전트 + 18 스킬 + 7 커맨드. 정체성/마스터리 스택/진화 루프 확정. (Phase 0)
