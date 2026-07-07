# 📍 status.md — LinguaLoop 현황

> **지금 어디에 있는가.** [goal.md](goal.md)(무엇/왜) · [plan.md](plan.md)(어떻게) · [rules.md](rules.md)(불변식) · [test.md](test.md)(검증).
> 일상 진행은 여기에 기록한다. 최신 항목을 위로.

## 한 줄 요약

**추이 스파크라인 — 효능 스냅샷 시퀀스 시각화.** ops 대시보드 추이 카드가 이제 첫↔최신 델타 숫자에 더해 **SVG 꺾은선 스파크라인**을 지표별로 표시(전체 정확도·복습 정확도·숙달까지 응답[하락=개선]·숙달 KC). `/efficacy/history`가 이미 주던 `snapshots[]` 전체 시퀀스를 ops.js 순수 `sparkline(vals, better)`(제로 의존, null=x축 위치 보존, 첫↔최신 방향 색: 초록=개선·빨강=악화·파랑=평탄)로 렌더. 게이트 **310 pass(57파일)** + 라이브 스모크 9/9(스냅샷 3개→kcsMastered 0→2, SVG path·개선색·엣지케이스). 다음: 문법KC 읽기 연결 등.

<details><summary>이전 요약 — 🚀 공개 배포 완료 (v0.1.0)</summary>

**🚀 공개 배포 완료 (v0.1.0).** LinguaLoop 첫 OSS 릴리스를 GitHub 공개 리포로 배포 — <https://github.com/baboplater-blip/lingua-loop> (PUBLIC, main, MIT). git init→초기 커밋(241파일, 비밀·학습자 데이터 유출 0 검증)→태그 `v0.1.0`→push→GitHub Release 발행→검색 토픽 10종. 배포 직전 게이트 그린 **309 pass / 57파일**·릴리스 준비도 그린 재확인. 이전 라운드까지 코드·콘텐츠(7개 언어 A1~B2)·무인 진화 폐루프·운영 런북·북스타 대시보드(CLI+웹+시계열 추이)·읽기 복수·주관식·산출 측정 전부 완결. 다음: 공개 후 점진 개선(추이 스파크라인·문법KC 읽기 연결).

<details><summary>이전 요약 — 생성기 주관식 산출 + 효능 시계열 추이(2건 일괄)</summary>

**생성기 주관식 산출 + 효능 시계열 추이(2건 일괄).** ①읽기 생성기(다국어·en·es)가 복수 문항 등급에서 **마지막 문항을 주관식(산출)**으로 변환(`withProductionQuestion` 공용 헬퍼) — 인식(객관식)+산출(주관식) 균형을 무인 콘텐츠에 편입, 생성물도 서버 채점. ②**효능 추이(Loop Velocity)** — `computeEfficacy` 스냅샷을 append-only로 누적: 코어 `EfficacySnapshot`·`trendSummary`(첫↔최신 델타, 정확도↑/TTM↓/숙달KC↑), 서버 `recordEfficacy`(EFFICACY_REF 로그, 집계서 제외)·`efficacyHistory`, `GET /efficacy/history`·`POST /efficacy/snapshot`, **진화 잡이 사이클마다 스냅샷 기록**, ops 대시보드·CLI에 추이 표시. **게이트 그린 309 테스트(57파일)** + 라이브 HTTP 8/8·진화 잡 2회 스냅샷 축적. 다음: 공개 배포(승인 대기)·추이 시각화 심화.

</details>

</details>

## 게이트 상태

- **추이 스파크라인 — 스냅샷 시퀀스 꺾은선(규칙 1)**: 🟢 ops 대시보드 추이 카드가 첫↔최신 델타에 더해 지표별 **SVG 꺾은선**(`sp-acc`·`sp-review`·`sp-ttm`·`sp-kcs`). `/efficacy/history`가 이미 주던 `snapshots[]` 전체 시퀀스를 ops.js 순수 `sparkline(vals, better)`(제로 의존 SVG path, null=x축 위치 보존, 첫↔최신 방향 색 초록=개선·빨강=악화·파랑=평탄, TTM=better false로 하락이 개선)로 렌더. `.tv` flex·범례 추가. `ops.test`(슬롯 4·함수·`.snapshots`·SVG path·innerHTML·TTM false). 라이브 스모크 9/9(스냅샷 3개→kcsMastered 0→2 상승·정확도/숙달 path 생성·개선색·빈/단일 시퀀스 안전). 게이트 310 pass
- **공개 리포 첫인상 손질 — README 배지·빠른시작·CI(규칙 13·14)**: 🟢 방문자 5분 온보딩. README 배지 6종(tests 309 passing·code MIT·content CC-BY·Node≥24·zero-dep·release) + 빠른시작에 `git clone`→`cd`→`npm run serve` 단계(`npm install` 불필요 명시·ops.html·evolve:all 안내) + 로드맵/라이선스 문구 배포완료로 갱신. `package.json` version 0.0.1→**0.1.0**(태그 정합)+`repository`/`homepage`/`bugs`. CI `.github/workflows/ci.yml`(gate 실행, Node 24) push 완료 — gh 토큰 `workflow` 스코프 디바이스 플로우 1회 승인 후 워크플로 push+실동작 gate 배지 교체. 실증: 온보딩 스모크 5/5(실 `serve` 부팅→`/`·`/app.js`·`/ops.html`·`/next` 200), 게이트 309 pass·릴리스 준비도 그린
- **🚀 공개 배포 v0.1.0(규칙 14·18)**: 🟢 명시 승인('배포해')으로 첫 OSS 릴리스 — GitHub 공개 리포 <https://github.com/baboplater-blip/lingua-loop>(PUBLIC·main·MIT). git init(`-b main`)→로컬 identity→`git add -A`(241파일)→**커밋 전 유출 검사 0**(data/·.env·.sqlite·.pem·.key·secrets/·learner-store/ 미포함, `.claude/settings.json`=권한 허용목록뿐)→초기 커밋 `65d3223`→annotated 태그 `v0.1.0`→`gh repo create --public --push`→태그 push→`gh release create v0.1.0`(한/영 릴리스 노트)→토픽 10종(language-learning·spaced-repetition·fsrs·irt·multilingual·self-hosted 등). 배포 직전 게이트 그린 **309 pass / 57파일**·릴리스 준비도 그린 재확인. ⚠️GitHub 라이선스 자동감지는 재스캔 지연(LICENSE=표준 MIT 21줄, 곧 인식). 로컬 main↔origin/main 동기
- **게이트**: 🟢 통과 — `npm run gate` (문서 5 + 다크패턴 안티 + 검증 스위트 **309 pass / 0 fail**, 57파일). 릴리스 준비도 그린(8종 카드·라이선스·시크릿·self-host 스모크)
- **생성기 주관식(산출) 문항(규칙 4·11)**: 🟢 `adapters/reading-gen.withProductionQuestion` 공용 헬퍼 — 문항 2개 이상이면 **마지막을 주관식(자유응답)**으로 변환(보기 제거·정답을 accept로), 1개면 객관식 유지. 다국어·en·es 생성기 `build/generate`가 사용 → 진화 폐루프 생성 지문이 인식(객관식)+산출(주관식) 균형. 생성물도 `scoreComprehension`으로 서버 채점. `multilingual-reading.test`(withProductionQuestion 단위·생성 주관식 정오 채점·validate 주관식 허용)·`reading-gen.test`(en 등급 산출 문항). 라이브 확인
- **효능 시계열 추이 — Loop Velocity(규칙 1·5)**: 🟢 진화 사이클마다 효능 스냅샷을 append-only로 누적해 개선 추세를 본다. 코어 `EfficacySnapshot`·`trendSummary`(첫↔최신 델타: 정확도·복습 정확도·숙달까지 응답[음수=개선]·숙달 KC). 서버 `recordEfficacy`(`EFFICACY_REF="efficacy"` 로그 ingest, `allLearnerEvents`가 집계서 제외)·`efficacyHistory`(언어별 스냅샷+추세). `GET /efficacy/history`·`POST /efficacy/snapshot`. **`evolve-publish.mjs`가 사이클마다 `recordEfficacy` 호출**(자연 캐던스). ops 대시보드 "추이" 카드(델타+개선 화살표)·CLI 추이 출력. `EventType`에 `efficacy.snapshot` 편입. `core/efficacy.test`(trendSummary 델타 부호·0/1개)·`server/efficacy.test`(기록·이력·언어분리·집계 제외)·`ops.test`. 라이브 HTTP 8/8·진화 잡 2회 스냅샷 축적
- **효능 대시보드 웹 뷰(규칙 1)**: 🟢 운영자용 정적 대시보드 `web/public/ops.html`+`ops.js`(서버 `STATIC` 화이트리스트 편입, `http://…/ops.html`) — `GET /efficacy?lang=` 소비, 언어 선택기(7종)·**TTM/Retention/Coverage/Content Health** 카드·정확도/캘리브레이션 바 시각화·격차 목록. 학습 앱(app.js)과 분리, 세션수/스트릭 미노출(다크패턴 금지). `ops.test`(자산·북스타 4카드·efficacy 필드 렌더·참여도 미노출·다크패턴). 라이브 HTTP 서빙 확인
- **읽기 이해 문항 복수·주관식(규칙 4·11)**: 🟢 `ReadingQuestion.options` 옵셔널화+`accept`(주관식). `scoreComprehension` 주관식=정규화(소문자·공백·유니코드 구두점 제거) 후 정답·허용정답 대조, 객관식=정확 일치. `validateReading` 객관식(정답∈보기)·주관식(정답만) 양쪽·빈 정답 반려. `redactReadingAnswers`가 정답·accept 제거하고 유형(보기 유무)만 전달. 웹 `renderReadingQuestions`가 **지문의 모든 문항** 렌더(객관식 버튼·주관식 텍스트 입력+Enter, 문항별 피드백·해설). en A1 시드에 주관식 문항 실증(bread·accept). `read.typeAnswer` 5로케일. `reading.test`(주관식 정규화/허용/오답·validate 양쪽·redact 유형·answerReading 복수/주관식). 라이브 HTTP 11/11
- **효능 대시보드 — 북스타 지표(규칙 1)**: 🟢 참여도가 아니라 학습 성과. 코어 `efficacy.computeEfficacy`(이벤트에서 결정적: **TTM**=정답 2회 숙달까지 응답 수·경과 시간[중앙/평균], **Retention**=전체·복습[간격반복] 정확도, **Coverage**=학습자·본 KC·숙달 KC·학습자당 숙달[0 포함 평균], 숙달 정의=정답 2회로 BKT 해금 0.6과 정렬) + 서버 `efficacyReport`(코어 지표 + **Content Health**=서빙 문항 캘리브레이션 비율·콘텐츠 격차, `allLearnerEvents`로 공용 로그[community/published] 제외) + `GET /efficacy?lang=`(운영자용·학습자 무관) + CLI `scripts/efficacy.mjs`·`npm run efficacy`(한글 요약, evolve 패턴). OPERATING §6에 지표표·"진화 전후 비교"·세션수/스트릭 미노출 명시(다크패턴 금지). `core/efficacy.test`(TTM·리텐션·커버리지·grade페이로드·빈입력)·`server/efficacy.test`(집계·격차·캘리브·공용로그 제외·빈스토어). 라이브 CLI 실스토어(응답31·96.8%·숙달8쌍)·HTTP 6/6. **무인 진화가 실제로 학습을 개선하는가를 데이터로 확인 가능**
- **읽기 이해 문항 서버 채점(규칙 1·4)**: 🟢 이해 문항을 클라이언트 자기채점(`o === q.answer`, 정답 유출+자기보고)에서 **서버 채점**으로 — 코어 `scoreComprehension`(정답 데이터 대조·해설=정답에 든 사전 어휘·범위 밖 null·미검증 문항 채점 금지)+`redactReadingAnswers`(서빙 시 정답 제거) + `ReadingQuestion.answer` 옵셔널화. 서버 `answerReading`(정답 여부를 `item.response` 이벤트로→`deriveState`가 BKT 숙달·FSRS 카드 갱신, **지문 전체 KC 크레딧**) + `POST /reading/answer` + `serveReading`가 정답 제거. 웹은 `/reading/answer`로 선택만 전송·서버 응답(correct/correctAnswer/glossaryHints)으로 표시·해설 렌더·중복 채점 방지. `read.explanation` 5개 로케일(ko·en·es·zh·ar). `reading.test`(scoreComprehension 정오/범위·redact·serveReading 미유출·answerReading 채점→숙달→FSRS·오답 이벤트·에러)·`ui.test`(서버 채점 계약·정답 미유출·해설). 라이브 HTTP 15/15. **읽기가 다른 스킬과 같은 폐루프(측정되는 학습)에 편입**
- **운영 루프 문서화(규칙 13·5·1)**: 🟢 `docs/OPERATING.md` 운영 런북(폐루프 개요·전제=서버와 같은 스토어·`evolve:publish`/`evolve:all`/`dataset:export` 출력 읽는 법·권장 캐던스 표·Linux crontab·Windows schtasks·모니터링·롤백·안전 요약) + `scripts/evolve-all.mjs`(`kc-seed.json` 보유 팩 자동 발견→언어별 `evolve-publish` 순차 spawn, `LL_DB`/`LL_DATA_DIR` 상속, 인자로 언어 지정 가능) + `evolve:all` npm 스크립트 + `SELF_HOSTING.md` §8 운영 잡 보강(번호 정리·OPERATING 링크·같은 스토어 경고) + README 문서 인덱스. 라이브: `evolve:all` 7개 언어 7/7 순차 진화(각 A1~B2 등급 읽기 4편=Phase 59/60 실배선 확인)·2회차 재발행 0(멱등). **운영자가 무인 폐루프를 돌리는 법이 문서로 완결**
- **en·es 읽기 생성기 등급 다양화(규칙 11·4)**: 🟢 `reading-gen.EnglishReadingGenerator`·`spanish-content.SpanishReadingGenerator`를 등급화 — `vocab.core`를 등급 KC로 `EN_GRADED`/`ES_GRADED`(A1 아침 일과·A2 새 카페·B1 요리 배우기·B2 "책은 여전히 중요한가"/"왜 책은 여전히 중요한가" 논설, 시드·per-KC 지문과 다른 새 주제) 4등급 + `levels(kc)`(vocab.core→4등급, 그 외→[]). ⚠️단일 등급 KC(present_be·present_ser 등)는 자기 등급에서만 생성(등급 불일치 시 null → `generateGradedReadings` 등급 루프가 잘못된 등급으로 오생성 안 함). 진화 배선(Phase 59 `levels?()`)이 그대로 en·es도 등급 경로로 태워 A1~B2 무인 공급·멱등. `reading-gen.test`(en 4등급·실 B2·시드 중복 없음·단일 KC 등급 불일치 null)·`spanish-adapters.test`(es 동일)·`reading.test`(7개 언어 스펙트럼·멱등 en·ja)·`evolve.test`(ja·en·es 진화 B2 공급·멱등). 라이브 30/30. **7개 언어 전부 읽기 자동생성 A1~B2 대칭**
- **B2 읽기 생성기 등급(규칙 4·11·13)**: 🟢 `adapters/multilingual-reading`에 B2 논설 템플릿 5개 언어(zh 科技与生活·ar التكنولوجيا والحياة·sw Teknolojia na Maisha·ja テクノロジーと生活·hi तकनीक और जीवन, 주제=과학기술/스마트폰 양면성, 양보+의견 논설체, 시드 B2 도시생활과 다른 새 주제) → 이제 `TEMPLATES[lang]`가 A1~B2 4등급, `multilingualReadingLevels`=4등급, 진짜 미제공 등급(C1)만 A2 폴백. `MultilingualReadingGenerator.levels(kc)` 신설(지원 KC 4등급). `engine/reading.generateGradedReadings` 기본 등급 A1~**B2**. **진화 루프 배선**: `ReadingGenerator.levels?()`로 등급 생성기 식별 → `evolve.ts` 3.5절이 `generateGradedReadings`로 KC별 A1~B2 공급(등급별 고유 id·본문으로 사이클 간 멱등). `multilingual-reading.test`(4등급·실 B2·시드 중복 없음·levels)·`reading.test`(스펙트럼·멱등)·`evolve.test`(진화 B2 공급·멱등). 라이브 39/39. **상급 학습자에게도 무인 콘텐츠가 이어짐**
- **en·es B1/B2 문법 3면 대칭(규칙 11·12)**: 🟢 `packs/{en,es}/kc-seed.json`에 B1/B2 문법 KC(en `present_perfect`·`conditional`·`relative`, es `preterite`·`subjunctive` — 기존 placement가 참조하던 것을 실 KC로 편입) + `content-seed.json` 각 flashcard+mcq 2문항 + **튜터 축**(local-tutor: have/has+과거형→과거분사[WRONG_PP]·if 문맥 was→were; spanish-tutor: ayer/anoche+현재형→단순과거·바람동사+que 뒤 직설법→접속법). 전부 문맥 가드(if/ayer/바람동사/정확 토큰)로 오탐 0. `tutor.test`·`spanish-adapters.test` B1/B2(발화+무발화)·`b1-content.test` en·es KC≥2. 라이브 17/17. **7개 언어 전부 B1·B2 문법 3면 완결**
- **B2 문법 3면 대칭(규칙 11·12·3·4)**: 🟢 B2 문법 KC 5종(`kc.zh.de_complement`得·`kc.ja.potential`られる·`kc.hi.ergative_ne`ने·`kc.ar.subjunctive_an`أن·`kc.sw.association_cha`cha, skill=writing·prereq=B1 KC) + `placement.json` B2 문항(b=2.2)·`content-seed.json` 각 flashcard+mcq 2문항 + **전용 튜터 3번째 축**(zh 동사+的+형용사→得, ja ら抜き→られる, hi 완료 타동사 주어→능격 ने, ar 조동사+동사→أن 삽입, sw ki류+ya→cha). 전부 문맥 가드로 오탐 0. 어댑터 테스트 5(발화+무발화)·`b1-content.test`(B2 KC≥2·B2 등급)·`placement.test`(B2 ≥2). 라이브 40/40 일부(HTTP 발화·B2 배치·오탐0). 배치·학습·교정 3면이 B2에서 대칭
- **읽기 생성기 등급 다양화(규칙 11·4)**: 🟢 `adapters/multilingual-reading`를 등급별 `TEMPLATES[lang][level]`(A1 음식·A2 시장·B1 취미)로 재구성 — `generate(spec.level)`가 등급 지문 반환(미제공 등급 A2 폴백), id에 등급 접미사로 등급별 공존. `multilingualReadingLevels()` + `engine/reading.generateGradedReadings`(한 격차서 A1·A2·B1 생성·검증·중복 제거). `multilingual-reading.test` 3등급 생성·폴백. 라이브 5언어×3등급 생성 (→ 이후 B2 논설 추가로 **4등급**·진화 루프 배선, 상단 "B2 읽기 생성기 등급" 항목)
- **발음 B1 연계(규칙 11)**: 🟢 신설 B1 문법 KC의 발음 형태를 `phonology.json`에 — ja 촉음 최소대립쌍(行って vs いて)+て형 shadow, zh 了 경성 prosody, ar 과거형 shadow, sw -li- 과거 shadow, hi 후치사 shadow. 스키마 준수(비zh 성조 없음·prosody 음절=강세). `pronounce.test` B1 KC 연계 단정
- **생성기 KC 확장(진화 자동생성, 규칙 4·11·1)**: 🟢 `adapters/multilingual-content.MultilingualVocabGenerator`를 토픽별 테이블(GEN[lang][kc])로 재구성 — zh·ar·sw·ja·hi 각 vocab.core·numbers·greetings·B1 문법 KC 지원. numbers·greetings는 새 flashcard(6~10·아침/밤/사과 인사), B1 문법은 새 mcq(B1 레벨, 시드와 다른 문항). `supports()`가 `kc in table`로 4종 판정. 진화 루프(`generateForGaps`)가 지원 KC 격차를 자동 생성. ⚠️멱등은 generateForGaps가 아니라 격차 탐지(`analyze.contentGaps`) 층이 제공(같은 id는 checkItem dedup 스킵=업데이트). `multilingual-content.test` 확장(4종 지원·numbers/greetings/문법 게이트 통과·mcq·B1). 라이브 29/29(5언어×3토픽 생성·게이트 통과·강등→생성→격차 해소 멱등)
- **읽기 B2 확장 + B1 배치 심화(규칙 4·11·3)**: 🟢 7개 언어 `packs/*/reading.json`에 B2 지문 1편씩(en·es·zh·ar·sw·ja·hi, 공통 소재=도시 생활, 주장→양보(however/그러나)→개인 의견 구조, 상급 어휘·관계절/접속법, 시드·B1 주제와 다름) + `packs/{zh,ar,sw,ja,hi}/placement.json`에 B1 문항(b=1.2)로 B1 대역 2개(1.2·1.4). `reading.test`(7언어 B2 존재·≥150자·B2 학습자 서빙)·`placement.test`(B1 문항 ≥2). 라이브 31/31(B2 학습자 B2 서빙·B1 경계 학습자 θ≈1.64→B1). ⚠️CJK 문자 밀도 탓 B2 길이 임계 200→150(zh 한자 181자도 실질 B2 분량)
- **전용 튜터 2번째 문법 축(B1, 규칙 11·12)**: 🟢 5개 튜터가 신설 B1 문법 오류를 실시간 교정 — ja `correctJa` て형 오형→음편형(いくて→いって, 정확 토큰), hi `correctHi` 처소 후치사 में 삽입(장소+계사), zh `correctZh` 완료 了 삽입(과거 시간부사+동사, 부정·조동사 제외), ar `correctAr` 과거형 리캐스트(أمس 문맥), sw `correctSw` -li- 과거(jana 문맥). **전부 문맥 가드로 오탐 0**(어제/과거부사/정확 토큰 없으면 무발화). 어댑터 테스트 5(발화+무발화). 라이브 20/20(HTTP 발화·오탐 0·인젝션 방어). 콘텐츠·평가·튜터 3면이 B1 문법에서 대칭
- **B1 문법 KC 학습 콘텐츠(규칙 4·11)**: 🟢 신설 B1 KC(了·과거·-li-·て형·후치사)가 배치고사에만 있던 공백을 닫음 — `packs/{zh,ar,sw,ja,hi}/content-seed.json`에 각 KC flashcard+mcq 2문항(B1, CC-BY-4.0, 목표어 문자 보존). getPack이 draft→verified 승격·선행(vocab.core) 숙달 시 해금→`/next` 서빙. `b1-content.test`(각 KC≥2·B1·flashcard+mcq 균형·문자 보존). 라이브 15/15(선행 전 잠김→2회 정답 후 해금·서빙)
- **B1 문법 KC 학습 콘텐츠(규칙 4·11)**: 🟢 신설 B1 KC(了·과거·-li-·て형·후치사)가 배치고사에만 있던 공백을 닫음 — `packs/{zh,ar,sw,ja,hi}/content-seed.json`에 각 KC flashcard+mcq 2문항(B1, CC-BY-4.0, 목표어 문자 보존). getPack이 draft→verified 승격·선행(vocab.core) 숙달 시 해금→`/next` 서빙. `b1-content.test`(각 KC≥2·B1·flashcard+mcq 균형·문자 보존). 라이브 15/15(선행 전 잠김→2회 정답 후 해금·서빙)
- **읽기 B1 상향 + 배치고사 중급 확장(규칙 4·11·3)**: 🟢 7개 언어 `packs/*/reading.json`에 B1 지문 1편씩(en·es·zh·ar·sw·ja·hi, 주말여행 서사·조건/과거/의견, 텍스트≥120자·클릭 사전·이해 문항, 시드 주제와 다름) + `packs/{zh,ar,sw,ja,hi}/kc-seed.json`에 B1 문법 KC(`aspect_le`了·`past_tense`·`tense_li`-li-·`te_form`て형·`postpositions`후치사, skill=writing) + `placement.json`에 B1·B2 문항 각 2개(b 1.4/2.0)로 CAT 천장 A2→B2. `reading.test`·`placement.test` B1/B2 커버리지 고정, B1 학습자가 B1을 현 수준으로 서빙받음(i+1 상향). 라이브 38/38(전부 정답→5개 언어 B2 배치·7개 언어 서빙 전수 검증)
- **읽기 지문 생성기 다국어화(규칙 11·4)**: 🟢 `adapters/multilingual-reading.MultilingualReadingGenerator`(데이터 주도, 언어별 등급 지문 템플릿 zh·ar·sw·ja·hi, 시드와 다른 주제=시장) + `createReadingGeneratorFor` 전 언어 라우팅 + `supportsMultilingualReading`. **진화 폐루프가 읽기 지문도 7개 언어 자동생성**(문항 생성기와 대칭). 읽기 격차에서 validateReading 통과·언어 태그·id/본문 중복 제거·멱등. 라이브 15/15
- **콘텐츠 생성기 다국어화(규칙 11·4)**: 🟢 `adapters/multilingual-content.MultilingualVocabGenerator`(데이터 주도, 언어별 어휘 테이블로 새 flashcard draft) + `createContentGeneratorFor` zh·ar·sw·ja·hi 라우팅 + `supportsMultilingualGen`. **진화 폐루프가 7개 언어 자동생성**(en·es만이던 갭 해소). 시드와 겹치지 않는 새 어휘·게이트 통과분만·결정적. 실제 격차(vocab.core<2)에서 생성·멱등 실증(라이브 15/15). ⚠️파라미터 프로퍼티 금지(무설치 실행) — 필드 명시 선언
- **hi 힌디어(규칙 11·12)**: 🟢 `packs/hi`(데바나가리 abugida·성 일치·권설/치음·유기/무기음, 데이터만) + `adapters/hindi-tutor.HindiHeuristicTutor`+`correctHi`(성 일치[여성 명사 앞 형용사 여성형화]·로마자→데바나가리) + `createTutorFor` hi + `langName` hi + `hi.test`·`hindi-adapters.test`(8) + 학습 선택기·`VOICE_LANG.hi`(hi-IN)·`SCENARIO_GREETING` hi 7시나리오 + `normWord` 데바나가리 범위. **학습 언어 7종·전용 튜터 7종.** 문자 패러다임 5번째(데바나가리)
- **ja 전용 튜터(규칙 11·12)**: 🟢 `adapters/japanese-tutor.JapaneseHeuristicTutor`+`correctJa`(목적어 조사 を 누락 삽입·は→を 오용·로마자→가나/한자 리캐스트, 결정적·오프라인) + `createTutorFor` ja 라우팅 + explainLang·역할극(7시나리오). `japanese-adapters.test`(8) + `ja.test` 튜터 전용 교체. **en·es·zh·ar·sw·ja 6개 언어 전용 튜터 완결**
- **일본어(ja) 파일럿(규칙 11)**: 🟢 `packs/ja`(데이터만, 가나·가타카나·한자 혼합·조사 は/を/に·촉음っ/장모음 대립·피치 액센트) + `universality.test`·`reading.test` ja 편입 + `ja.test` + `langName` ja + 학습 선택기·`VOICE_LANG.ja`(ja-JP)·`SCENARIO_GREETING` ja 7시나리오 + `normWord` 가나 범위. **코어/서버 0줄** — 같은 엔진이 6번째 언어(비라틴 혼합문자) 서빙. 읽기 지문 3편(가나 띄어쓰기로 클릭 사전 작동)
- **sw 전용 튜터(규칙 11·12)**: 🟢 `adapters/swahili-tutor.SwahiliHeuristicTutor`+`correctSw`(명사부류 복수·주어 접두사 일치, 결정적·오프라인) + `createTutorFor` sw 라우팅 + explainLang·역할극. **en·es·zh·ar·sw 5개 언어 전용 튜터 완결**. sw 콘텐츠 4→9항목
- **저자원 파일럿(스와힐리어, 규칙 11)**: 🟢 `packs/sw`(데이터만, 반투어·명사 부류·페널티메이트 강세) + `universality.test` sw 편입 + `langName` sw + 패스스루 튜터 + 학습 선택기·VOICE_LANG·시나리오 그리팅. **코어/서버/어댑터 코드 0줄** — 같은 엔진이 5번째 언어 서빙
- **역할극 시나리오(몰입 층)**: 🟢 **7종**(자유·자기소개·식당·상점·길찾기·**병원·공항**) — **5개 언어** 튜터 FOLLOWUPS + `SCENARIO_GREETING`(상황별 목표어 오프닝 🏥✈️) + 선택기. 시나리오 라벨 4로케일. 데이터만 추가로 확장(코드 구조 불변)
- **학습자 프로필 카드(동기 층, 규칙 2·6·9)**: 🟢 `core/profile.buildProfile`(인증+배지+누적 통계, 결정적·포터블) + `handlers.profileFor` + `GET /profile` + 웹 6지표 그리드 + **JSON 내보내기**(공용 `exportJson`, 인증서와 공유). 응답 없으면 정확도 null. 스트릭 없음
- **UI 로케일 5종(규칙 9·11)**: 🟢 `packs/{ko,en,es,zh,ar}/i18n.json`(동일 132키) + 화면 언어 선택기 + `pack.test` 전 로케일 파리티·다크패턴 스캔 일반화. **ar=RTL 화면 언어**: `dir:"rtl"` 메타를 `/i18n`이 반환·앱이 문서 `dir` 전환(**화면 방향까지 데이터**, 첫 RTL UI). 목표어 콘텐츠는 여전히 요소별 `dir="auto"`. 미지원은 ko 폴백. 학습 언어와 독립
- **ar 전용 튜터(규칙 11·12)**: 🟢 `adapters/arabic-tutor.ArabicHeuristicTutor`+`correctAr`(성 일치·로마자→문자, 결정적·오프라인) + `createTutorFor` ar 라우팅 + explainLang·역할극 지원. 남성명사 오탐 방지·인젝션 방어 경유. **en·es·zh·ar 4개 언어 전용 튜터 완결**
- **역할극(task 시나리오, 몰입 층)**: 🟢 웹 상황 선택기(`#scenarios`, 자유·자기소개·식당) + `/tutor` `task` 전달 + `SCENARIO_GREETING`(상황별 목표어 오프닝) + 튜터 FOLLOWUPS 뱅크가 task로 분기(en·es·zh). 상황 전환 시 대화 재시작. 로케일 라벨
- **기여자 배지(동기 층, 규칙 1·2·9)**: 🟢 `core/badges.deriveBadges`(숙달·레벨·기여·학습효과·검토 5카테고리, 티어 [b,s,g], 검토는 신뢰 자격) + `handlers.badgesFor`(certificatesFor + communityView 재사용) + `GET /badges` + 웹 배지 칩(i18n 라벨·티어 이모지). 증거 기반·결정적·손실공포/마감/스트릭 없음
- **다중 모국어 UI(규칙 9·11)**: 🟢 로케일 팩 `packs/{ko,en}/i18n.json`(키 파리티·en 다크패턴 스캔) + `GET /i18n`(ko 폴백) + 웹 `data-i18n`/`t()`/`applyI18n` + 화면 언어 선택기(배우는 언어와 독립) + 튜터 `explainLang`(교정 메모·격려 ko/en, 목표어 몰입 어구 유지). 문자열=데이터, UI 코드에 하드코딩 카피 없음
- **zh 전용 튜터(규칙 11·12)**: 🟢 `adapters/chinese-tutor.ChineseHeuristicTutor`+`correctZh`(성조/병음·是+형용사·양사, 결정적·오프라인) + `createTutorFor` zh 라우팅 + **웹 `/tutor?lang=` 전달 수정**(선택 언어 튜터 실동작). 是高中 복합어 오탐 방지·인젝션 방어 경유
- **RTL·아랍어(규칙 11)**: 🟢 `packs/ar`(데이터만, `direction:rtl`) + `GET /pack`(방향 메타) + 웹 `dir="auto"`(요소별 bidi)·`applyPack`(lang 속성·튜터 안내) + `langName` 아랍어 + 패스스루 튜터. 코어/서버/UI 언어·방향 분기 0. `universality.test`에 ar 편입
- **데이터 카드 자동생성(규칙 7·14)**: 🟢 `core/datasetCard` + `dataset:export`가 데이터셋+카드 동시 기록. `report.typeBreakdown`로 스키마 반영. 카드 없이 재배포 금지
- **인증서 내보내기(규칙 6)**: 🟢 `core/buildCertificate` + `GET /account/certificate` + 웹 다운로드. 성취(can-do·레벨) 소유·포터블·결정적
- **성조어(zh, 규칙 11)**: 🟢 `core/phonetics.toneScore` + 어댑터 운율 통합(강세·성조) + `packs/zh`(성조 데이터만) + 패스스루 튜터. 같은 코어·서버가 en·es·zh(CJK·성조) 동일 처리
- **무인 진화 잡(규칙 4·1)**: 🟢 `publishFromEvolve` + `evolve:publish` 스크립트 — 생성→게이트→자동 발행, 멱등. 안전판(게이트+강등)으로 사람 없이 안전. `dataset:export`와 함께 cron 운영
- **개방 데이터셋(규칙 7·8)**: 🟢 `core/open-dataset`(동의필터·익명화·k-익명성 레드팀·singleton 억제) + `dataset:export` 운영자 도구 + `/release --datasets` 실검사. 재식별 실패 시 배포 반려
- **마스터리 인증(동기 층, 규칙 1·2·9)**: 🟢 `core/certifications.deriveCertifications`(증거 기반 인증·레벨 진척·완주 레벨·다음 후보) + `GET /certificates` + 웹 성취 섹션. 다크패턴 없이 달성 인정·경로 개방
- **발음 운율(강세)**: 🟢 `core/phonetics.stressScore` + `adapters/pronunciation` 통합(prosody) + `packs/*/phonology.json` prosody 섹션 + 웹 강세 시각화. 분절음 완벽해도 강세 오류면 감점·명료도 손실
- **생성 콘텐츠 발행·서빙(규칙 4·1·5)**: 🟢 `publishContent`/`publishReading`(게이트 통과분만 append-only) + `publishedBank`/`publishedReadings`(학습효과 강등) + `/content`·`/content/reading` + `/next`·`/reading` 합류. 발행 로그 삭제 보호·재시작 유지
- **CAT 배치고사(규칙 3)**: 🟢 `handlers.placementStep`(상태 없는 적응형·서버 채점·θ 클램프) + `POST /placement/step` + `packs/*/placement.json`(en·es) + 웹 레벨 탭. 능력→assessment.item→읽기 i+1 시작점. 정답 미유출(치팅 방지)
- **어댑터층 다국어(규칙 11·12)**: 🟢 `spanish-tutor`(ser·성 일치)·`spanish-content`(문항·읽기 생성기) + 레지스트리 `createTutorFor`/`createContentGeneratorFor`/`createReadingGeneratorFor` + 서버 언어별 튜터 캐시. 미지원은 en 폴백. 웹 튜터 인사 언어별
- **읽기 지문 자동생성(입력 층 진화, 규칙 4)**: 🟢 `adapters/reading-gen`(`ReadingGenerator` pluggable + `EnglishReadingGenerator` 오프라인) + `engine/reading`(`generateReadings` 검증·중복 제거) + `/evolve` `readingGenerator` 편입. 미검증 지문 노출 금지
- **진화 폐루프 통합(규칙 1·skill)**: 🟢 `/evolve` = 캘리브 + FSRS재적합 + 콘텐츠생성 + **커뮤니티 재평가**(`communityEvents` 주입 시). `reevaluateCommunity`가 신뢰가중 `evaluateCommunity` 기반. 데모 `npm run evolve:demo`가 4축 전부 표시
- **기여자 신뢰가중(안티어뷰즈, 규칙 1·skill)**: 🟢 `computeTrust`(검토-객관진실 일치 이력, 신규는 사전분포 수축) + `reviewerWeight`(0.5+정확도) + `decideStatusWeighted` + `evaluateCommunity`(원시→신뢰도→가중 재판정). 커뮤니티 뷰 전체가 신뢰가중 경유
- **SQLite 백엔드(규칙 12·13)**: 🟢 `openSqliteStore`(node:sqlite 내장, WAL·인덱스, append-only, close 훅) — `LL_DB` 지정 시. JSONL과 동일 계약(재시작 유지·삭제·id 충돌 방지·커뮤니티 로그). 서버 우아한 종료(SIGINT/TERM)
- **학습효과 재랭킹(규칙 1·skill)**: 🟢 `core/content-effect`(itemEffects=난이도적합+점이연변별, ELO 능력추정) + `engine/community-effect`(reevaluateCommunity) + `communityBank` 효과 강등 + `GET /contributions?rank=effect` + 웹 효과순 리더보드. 인기 아닌 실효가 노출·순위 지배
- **커뮤니티 기여(진화 인간 축)**: 🟢 `core/community`(makeSubmission·decideStatus·deriveContributions·acceptedItems·rankContributions·moderationFlags) + `POST /contribute`·`/contribute/review`·`GET /contributions` + 웹 기여 탭. **기여도 게이트 통과분만 노출**(규칙 4), 라이선스 필수(규칙 14), 어뷰즈 방어
- **등급 리더(입력 i+1)**: 🟢 `core/reading`(cefrFromAbility·validateReading·selectGradedReading, 결정적) + `GET /reading` + 웹 읽기 탭(클릭 사전·이해 확인·다독). **5개 언어 읽기 지문 완비**(en 3·es 3·zh 3·ar 3·sw 3, 각 A1·A1·A2, CC-BY-4.0) — CJK/RTL 포함. 클릭 사전 `normWord`가 라틴·CJK·아랍 문자 보존. 미검증 지문 노출 금지(규칙 4), 언어팩 데이터(규칙 11)
- **발음(Phase 3)**: 🟢 `core/phonetics`(IPA 자질거리·정렬 채점·조음 힌트) + `adapters/pronunciation`(pluggable, 오프라인 로컬) + `POST /pronounce`·`GET /phonology` + 웹 발음 탭(TTS·지각·섀도잉). **5개 언어 발음 데이터 확충**(각 대립쌍 3~5·섀도 4·운율 3~4: zh 성조/분절·ar 인두음/강세음·sw 유무성/모음). 성조어=tones·강세어=stress 분기. **명료도 우선**, 원음성 미수신, ASR/TTS pluggable(규칙 12·13)
- **이벤트 영속(규칙 5·6·13)**: 🟢 `openFileStore(dir)` — 재시작해도 학습·튜터·생성물 유지. 별도 프로세스 실증, 삭제는 파일까지 제거, 재시작 후 eventId 충돌 방지
- **OSS 릴리스 준비(Phase 5)**: 🟢 **준비도 전 항목 그린** — 문서·투명성 카드 8종 + **라이선스 확정(코어/모델 MIT·콘텐츠 CC-BY-4.0**, `LICENSE`·`LICENSES.md`·`packs/LICENSE.md`) + 시크릿 청정 + 실서버 self-host 스모크. `npm run release` = ✅ 릴리스 준비 완료. 남은 건 오너 '배포해' 승인(규칙 18)
- **효능 스모크**: 🟢 FSRS>고정간격 · IRT 회수 r>0.9 · CAT 수렴 · 품질게이트 차단 · **진화 자기개선(held-out 오차↓)** · **가드레일(성과≠참여)** · **자동생성물 게이트 통과·중복차단**
- **다국어 범용(규칙 11)**: 🟢 en·es 동일 코어 경로 검증(`universality.test`). 코어/서버/엔진 **언어별 분기 0**
- **진화 루프(3축)**: 🟢 `/evolve` = 캘리브레이션 + FSRS재적합(가드레일) + 콘텐츠 자동생성. 데모 `npm run evolve:demo`
- **학습 웹 UI**: 🟢 `npm run serve` → `http://localhost:8787` — 학습 탭(4유형) + 튜터 탭 + **배우는-언어 전환기(en/es)**. 투명성·다크패턴 없음·데이터 소유권
- **AI 튜터**: 🟢 `POST /tutor` — 교정+i+1, 인젝션 방어(withSafety 데코레이터), pluggable(로컬 기본, 외부 API 0으로 자가호스팅)
- **배포**: 🔴 미배포 (git 미초기화, OSS 공개는 Phase 5)
- **문서 체계**: 🟢 5문서 + 설계 확정본(docs/design/architecture.md)

## Phase 현황

| Phase | 내용 | 상태 |
|---|---|---|
| 0 | 하네스·설계 스파인 | ✅ 완료 |
| 1 | 마스터리 스택 코어(MVP) | ✅ MVP+입력층 — 엔진·백엔드·시드팩·웹 UI·튜터·영속·**등급 리더(이해가능한 입력 i+1, 5개 언어 지문 완비)** 그린. 남음(확장): 말하기 산출 심화 |
| 2 | 진화 루프 | ✅ 3축 완성 — 분석·캘리브레이션·FSRS재적합·A/B·**콘텐츠 자동생성(7개 언어: en·es 템플릿 + zh·ar·sw·ja·hi 데이터 주도)**·`/evolve`. 남음(운영): LLM 생성기·실사용 데이터 |
| 3 | 몰입·튜터·발음 | ✅ 실증 — **AI 튜터(en·es·zh·ar·sw·ja·hi 7개 언어 전용 교정·대화·인젝션방어·역할극 7시나리오[자유·자기소개·식당·상점·길찾기·병원·공항]) + 발음(음성학 채점·지각·섀도잉·TTS·명료도 우선)**. zh=성조/是/양사, ar=성 일치/문자, sw=명사부류/주어일치, ja=조사 を/문자, hi=성 일치/데바나가리. 마스터리 스택 7층 완성. 남음(심화): 콘텐츠 밀도·읽기 지문 확충 |
| 4 | 다국어 범용 확장 | ✅ 실증 — **es·zh·ar·sw·ja·hi 언어팩(데이터만)로 코어 언어무관 증명**(라틴 en·es·sw / CJK·성조 zh / RTL·아랍 ar / 가나+한자 ja / 데바나가리 abugida hi — 문자 패러다임 5종 동일 코어)·UI 언어 5종(ar=RTL)·표기 방향 데이터 결정·**전용 튜터 7종**. 저자원(sw)·혼합문자(ja)·abugida(hi) 실증. 남음(운영): 생성기 다국어 확장 |
| 5 | 커뮤니티·개방(OSS) | ✅ 실증 — 문서·카드·self-host·**라이선스(MIT+CC-BY-4.0)**·`release.mjs` 그린 + 커뮤니티 기여 실동작 + **다중 모국어 UI 5종(ko·en·es·zh·ar, ar=RTL·방향까지 데이터)** + **기여자 배지(학습 인증+기여+검토 신뢰, 실효 앵커)**. 남음(운영): 배포 승인 |
| 6 | 운영·그로스 | ⬜ 대기 |

## 스택 (확정 — docs/design/architecture.md)

**TypeScript 무설치 실행(Node 24 타입 스트리핑) + `node:test`** — 제로 의존성·자가호스팅(규칙 13). 모노레포: `packages/core`(엔진)·`server`(백엔드)·`engine`(진화워커)·`adapters`(튜터·발음·생성)·`packs`(언어팩)·`web`(브라우저앱). 데이터: append-only **JSONL(기본) 또는 SQLite(`LL_DB`, node:sqlite 내장)** → Postgres(향후). 첫 언어쌍: **en(목표어)/ko(UI)**. 학습 언어 7종: en·es·zh·ar·sw·ja·hi(데이터만, 문자 패러다임 5종). 화면 언어 5종: ko·en·es·zh·ar.

## 로그

### 2026-07-08 (65) — 생성기 주관식(산출) 문항 + 효능 시계열 추이 (2건 일괄)
- **① 생성기 주관식(산출) 문항**: `adapters/reading-gen.withProductionQuestion(qs)` 공용 헬퍼 — 문항 2개 이상이면 마지막을 주관식(자유응답)으로 변환(options 제거·정답을 accept로), 1개면 객관식 그대로. `MultilingualReadingGenerator`·`EnglishReadingGenerator`·`SpanishReadingGenerator`가 questions 빌드 시 사용 → 진화 폐루프가 공급하는 지문이 **인식(객관식)+산출(주관식)** 균형. 생성물도 소스에 answer·accept 보존 → `scoreComprehension` 서버 채점. `multilingual-reading.test`(단위+생성 주관식 정오)·`reading-gen.test`(en 등급). ⚠️`multilingual-reading.test`의 `q.options.includes` 단정을 주관식(보기 없음) 허용으로 갱신.
- **② 효능 시계열 추이(Loop Velocity)**: 코어 `EfficacySnapshot`(컴팩트 지표+ts)·`trendSummary(snaps)`(첫↔최신 델타, 정확도/복습 정확도/숙달까지 응답[음수=개선]/숙달 KC). 서버 `snapshotOf`·`recordEfficacy`(현재 지표를 `EFFICACY_REF="efficacy"` 로그에 append-only ingest, `allLearnerEvents`가 집계서 제외해 학습자 오염 0)·`efficacyHistory`(언어별 스냅샷+추세). `GET /efficacy/history`·`POST /efficacy/snapshot`. `EventType`에 `efficacy.snapshot` 추가. **`evolve-publish.mjs`가 사이클마다 `recordEfficacy` 호출** → 진화 캐던스로 추이 축적. ops 대시보드 "추이" 카드(델타+▲▼ 개선/악화)·`efficacy` CLI 추이 출력.
- **테스트**: `core/efficacy.test`(trendSummary 델타 부호[정확도+/TTM−/숙달+]·0·1개)·`server/efficacy.test`(recordEfficacy 누적·efficacyHistory 언어분리·스냅샷 집계 제외)·`ops.test`(추이 카드·history 엔드포인트).
- **실증**: 라이브 HTTP 8/8(스냅샷 2개→델타 숙달 KC +1·언어분리·집계 제외·생성 주관식 포함). ⚠️초기 스모크 1건은 "첫 스냅샷 응답 없음→정확도 델타 null"을 오검(코드 정상, Phase 53 교훈 재현)—첫 스냅샷도 데이터 있게 수정 후 8/8. 진화 잡 2회 실행→스냅샷 2개 축적·CLI 추이 표시 확인. 게이트 302→**309 pass(57파일)**·릴리스 준비도 그린. **진화가 학습을 개선하는지 시간축으로 추적, 생성 지문이 산출 연습까지.**

### 2026-07-07 (64) — 효능 대시보드 웹 뷰 + 읽기 복수·주관식 문항 (2건 일괄)
- **① 효능 대시보드 웹 뷰**: 운영자용 정적 페이지 `web/public/ops.html`+`ops.js` — `GET /efficacy?lang=`을 읽어 TTM·Retention·Coverage·Content Health를 카드+바(정확도·캘리브레이션 %)로 시각화, 언어 선택기(7종)·새로고침·격차 목록. 서버 `STATIC`에 `/ops.html`·`/ops.js` 편입(`http://localhost:8787/ops.html`). 학습 앱과 분리, **세션수/스트릭 미노출**(규칙 1). `ops.test`(자산·북스타 4카드·efficacy 필드·참여도 미노출·다크패턴).
- **② 읽기 복수·주관식 문항**: 데이터는 이미 복수 문항(en·es A1 각 2문항)이나 웹이 `questions[0]`만 렌더하던 한계 해소 + 주관식 신설. `ReadingQuestion.options` 옵셔널화+`accept`(주관식 허용정답). 코어 `scoreComprehension` 주관식=정규화(소문자·공백정리·유니코드 구두점 제거) 후 정답·accept 대조, 객관식=정확 일치. `validateReading` 객관식(정답∈보기)·주관식(정답만 필수)·빈정답 반려. `redactReadingAnswers`가 answer·accept 제거하고 유형(보기 유무)만 전달(주관식은 options 없음). 웹 `renderReadingQuestions`가 **모든 문항** 렌더(객관식 보기 버튼·주관식 텍스트 입력+Enter, 문항별 피드백·해설, 중복 채점 방지). en A1 시드에 주관식 문항 1개 실증(“What does the writer eat?” bread·accept). `read.typeAnswer` 5로케일(키 파리티).
- **테스트**: `server/reading.test`(주관식 정규화/허용/오답/빈입력·validate 객관식+주관식·redact 유형 보존·serveReading 복수+주관식 미유출·answerReading 2번째 문항+주관식)·`web/ui.test`(모든 문항 렌더·주관식 입력)·`web/ops.test`.
- **실증**(라이브 HTTP 11/11): ops.html/ops.js 서빙·en A1 복수 문항 서빙(≥3, 정답 미유출·주관식 보기 없음)·주관식 정답/정규화/오답 채점·2번째 객관식 이벤트·효능 집계 반영. 게이트 296→**302 pass(57파일, +1)**·릴리스 준비도 그린. **운영자가 북스타를 브라우저로 보고, 읽기 문항이 복수·주관식까지 측정된다.**

### 2026-07-07 (63) — 효능 측정 대시보드 (북스타 지표를 운영자가 데이터로)
- **동기**: 최상위 규칙=성과가 진실(rule 1)이고 북스타=TTM(goal.md §3)인데, 모든 스킬 학습 신호가 이벤트로 쌓임에도 그 성과를 보는 화면이 진화 로그(발행 수)뿐이었음. 공개 배포 전 "무인 진화가 실제로 가르치는가"의 신뢰 근거 필요.
- **코어**: `efficacy.computeEfficacy(events)` — 이벤트만으로 결정적 산출. **TTM**(정답 2회=숙달[BKT 해금 0.6 정렬]까지 응답 수·경과 시간 중앙/평균), **Retention**(전체 정확도 + 복습=이미 본 KC 재응답[간격반복] 정확도 분리), **Coverage**(학습자·본 KC·숙달 KC·학습자당 숙달 KC[0인 학습자 포함 평균]). item.response/review.done만 집계, assessment.item·exposure 무시.
- **서버**: `efficacyReport(store, lang, graph, bank)` = 코어 지표 + **Content Health**(서빙 문항 중 캘리브레이션 비율·콘텐츠<2 KC 격차). `allLearnerEvents`가 공용 로그(community·published) 제외해 참여자=학습자만. `GET /efficacy?lang=`(운영자용).
- **CLI**: `scripts/efficacy.mjs`+`npm run efficacy`(evolve 패턴, LANG_PACK/LL_DB 상속) — TTM·Retention·Coverage·Content Health 한글 요약. 이벤트 0이면 `—`(정상).
- **문서**: OPERATING §6 모니터링 최상단에 효능 대시보드(지표표·"진화 사이클 전후 비교로 개선 확인"·**세션수/스트릭 미노출** 규칙 1 명시) + README scripts 인덱스.
- **테스트**: `core/efficacy.test`(TTM 응답/경과·리텐션 전체/복습·커버리지 0포함평균·grade페이로드·graded외 무시·빈입력 null)·`server/efficacy.test`(집계·격차·캘리브 비율·공용로그 제외·빈스토어 null).
- **실증**: 라이브 CLI 실스토어(응답 31·전체 96.8%·복습 100%·숙달 8쌍·격차 1KC)·HTTP `GET /efficacy` 6/6. 게이트 288→**296 pass(56파일, +2)**·릴리스 준비도 그린. **북스타(성과)가 운영자에게 가시화 — 진화 효능을 데이터로 입증할 토대.**

### 2026-07-07 (62) — 읽기 이해 문항 자동 채점·해설 (읽기가 마스터리 스택의 측정 대상으로)
- **진단**: 등급 읽기 지문은 A1~B2 무인 공급까지 됐으나, 이해 문항 정답 여부가 클라이언트 자기채점(`o === q.answer`)이라 ①정답이 클라에 유출(규칙 4) ②자기보고라 신뢰 불가(규칙 1 성과가 진실) ③읽기 학습이 BKT/FSRS에 정직하게 반영 안 됨.
- **코어 채점기**: `reading.ts`에 `scoreComprehension(passage, qIndex, choice)`(정답을 **서버가 데이터로 대조**·해설=정답 문자열에 든 사전 어휘 결정적 추출·범위 밖/미검증 문항 null) + `redactReadingAnswers`(서빙 지문에서 정답 제거) + `ReadingQuestion.answer` 옵셔널화(소스엔 필수=validateReading 강제, 서빙엔 제거) + `ComprehensionResult` 타입.
- **서버**: `answerReading(store, lang, sourcePassages, input)` — 채점 후 `item.response` 이벤트 발행(kc=지문 전체 KC·`payload.correct`)→`deriveState`가 BKT 숙달(`updateMastery`)·FSRS 카드(`nextState`) 갱신. 정답·해설은 채점 후에만 반환. `serveReading`가 `redactReadingAnswers`로 정답 미유출. `POST /reading/answer` 라우트(소스 지문으로 서버 채점).
- **웹**: `renderReadingQuestions`가 `/reading/answer`로 **선택만** 전송, 서버 응답(correct/correctAnswer/glossaryHints)으로 정오·정답·해설 표시, 답한 뒤 보기 비활성(중복 채점 방지). `read.explanation`(해설) 5개 로케일 추가(키 파리티 유지).
- **테스트**: `server/reading.test`(scoreComprehension 정오/해설/범위·redact·serveReading 전 문항 정답 미포함·answerReading 정답→이벤트→숙달 상향·reps=1·오답도 이벤트·passage_not_found/invalid_question)·`web/ui.test`(`/reading/answer` 사용·`r.correct`/`r.correctAnswer` 표시·`=== q.answer` 부재·해설).
- **실증**(라이브 HTTP 15/15): GET /reading 정답 미유출·정답 채점 correct=true·전 KC 크레딧·GET /state 숙달 상향·reps 1·오답 채점+정답 공개·에러 2종. 게이트 282→**288 pass(54파일)**·릴리스 준비도 그린. **읽기가 다른 스킬과 같은 폐루프(측정되는 학습)에 들어옴 — 마스터리 스택 입력 층 완결.**

### 2026-07-07 (61) — 운영 루프 문서화 (무인 진화 폐루프 운영 런북 + 다국어 진화 실행기)
- **동기**: 코드 층은 A1~B2 전면 대칭까지 완성됐으나, "데이터로 끝없이 진화"를 운영자가 어떤 주기로 어떻게 돌리는지 문서가 스텁(SELF_HOSTING §8-b 2줄)뿐이었음.
- **운영 런북**: `docs/OPERATING.md` 신설 — ①폐루프 ASCII 다이어그램(측정→분석→생성→게이트→발행→강등) ②전제(서버 구동·**서버와 같은 스토어 변수**·데이터 축적 대기) ③`evolve:publish`/`evolve:all` 출력 각 줄 의미(분석 이벤트·격차·생성·자동 발행·강등)+안전판 ④`dataset:export` k-익명성·레드팀 실패 시 미기록·카드 동봉 ⑤권장 캐던스 표 ⑥Linux crontab·Windows schtasks 예시 ⑦모니터링 ⑧롤백·안전 요약 표.
- **다국어 진화 실행기**: `scripts/evolve-all.mjs` — `packages/packs/*/kc-seed.json` 보유 팩을 학습 언어로 자동 발견(ko 같은 UI 전용 제외), 언어별로 `evolve-publish.mjs`를 순차 spawn하며 `LL_DB`/`LL_DATA_DIR` 상속(서버와 같은 이벤트). 인자로 특정 언어 지정 가능. `package.json`에 `evolve:all` 스크립트.
- **연결**: `SELF_HOSTING.md` §8 운영 잡 보강(8-b→8·8→9 번호 정리, `evolve:all` 추가, 같은 스토어 경고, OPERATING 링크) + `README.md` 문서 인덱스·scripts 설명에 운영 런북/잡 추가.
- **실증**(라이브): `evolve:all` 7개 언어 순차 진화 **7/7 성공** — 각 언어가 A1~B2 등급 읽기 4편 생성(Phase 59/60 진화 배선이 실제로 도는 확인), en 문항 10·지문 7 등 자동 발행. 2회차(en·zh) **재발행 0**(⏳ 격차 없음=멱등). 게이트 **282 그린**·`release.mjs` 준비도 그린 유지(신규 테스트 불필요 — 얇은 운영 래퍼는 라이브로 검증).

### 2026-07-07 (60) — en·es 읽기 생성기 등급 다양화 (7개 언어 전부 읽기 자동생성 A1~B2 대칭)
- **비대칭 진단**: Phase 59로 다국어 생성기(zh·ar·sw·ja·hi)는 읽기 A1~B2 등급 스펙트럼을 갖췄으나, 수요 가장 큰 en·es 읽기 생성기는 여전히 KC별 단일 등급(present_be A1·vocab.core A1…). 진화 루프가 en·es엔 A1만 공급.
- **등급화**: `reading-gen.ts`에 `EN_GRADED`(A1 My Morning·A2 The New Café·B1 Learning to Cook·B2 Why Books Still Matter), `spanish-content.ts`에 `ES_GRADED`(Mi mañana·El café nuevo·Aprender a cocinar·Por qué los libros aún importan). `vocab.core`를 등급 KC로 삼아 A1~B2 4등급, 시드·per-KC 지문과 다른 새 주제(B2=책/독서 논설, 다국어 B2 기술·시드 B2 도시생활과도 다름). 양보 however/sin embargo + 의견 in my opinion/en mi opinión.
- **등급 라우팅**: `EnglishReadingGenerator`/`SpanishReadingGenerator`에 `levels(kc)`(vocab.core→4등급, 그 외→[]) + `generate()` 분기 — 등급 KC는 요청 등급 템플릿(미제공 C1 등은 null), 단일 등급 KC는 `spec.level`이 자기 등급과 다르면 null. `build()` 헬퍼 공통화. ⚠️vocab.core를 `EN_TEMPLATES`/`ES_READ`에서 제거하고 등급 맵으로 이동.
- **진화 배선 재사용**: Phase 59의 `ReadingGenerator.levels?()` 식별로 evolve가 en·es도 등급 생성기로 판정 → `generateGradedReadings`로 A1~B2 공급. 단일 등급 KC(present_be 등)는 등급 루프에서 A1만 통과·나머지 null 스킵 → 오생성 0.
- **테스트**: `reading-gen.test`(en levels·4등급·B2 시드 중복 없음·단일 KC 등급 불일치 null)·`spanish-adapters.test`(es 동일)·기존 무등급 호출/중복 id/미지원 null 테스트 무회귀. `reading.test` 스펙트럼 루프를 레지스트리 경유 7개 언어로 확장. `evolve.test` 등급 배선 ja→ja·en·es.
- **실증**(라이브 스모크 30/30): en·es 각 4등급 생성·검증·시드 중복 없음·B2 상급 길이·C1 null·진화 A1~B2 공급·멱등. 게이트 277→**282 pass(54파일)**. **7개 언어 전부 읽기 자동생성이 A1~B2 등급 대칭 — 문법·배치·읽기가 언어 편차 없이 완결.**

### 2026-07-07 (59) — B2 읽기 생성기 등급 추가 (진화 자동생성 읽기가 A1~B2 스펙트럼 전체를 무인 공급)
- **격차 진단**: 문법·배치·읽기 시드는 B2까지 올라왔으나(Phase 53·56·58), 정작 진화 자동생성 읽기(`generateGradedReadings`)는 A1·A2·B1까지만. 상급 학습자용 무인 콘텐츠가 끊김.
- **B2 논설 템플릿**: `adapters/multilingual-reading`의 `TEMPLATES[lang]`에 B2 5개 언어 추가 — zh 科技与生活·ar التكنولوجيا والحياة·sw Teknolojia na Maisha·ja テクノロジーと生活·hi तकनीक और जीवन. 주제=과학기술/스마트폰 양면성, 논설체(양보 然而/しかし/लेकिन/Hata hivyo/फिर भी + 의견 在我看来/私の考えでは/في رأيي/Kwa maoni yangu/मेरी राय में). 시드 B2(도시생활)와 다른 새 주제. → A1~B2 4등급, 진짜 미제공 등급(C1)만 A2 폴백.
- **오케스트레이션**: `MultilingualReadingGenerator.levels(kc)` 신설(지원 KC 4등급). `engine/reading.generateGradedReadings` 기본 등급 A1~**B2**로 확장.
- **진화 루프 배선**: `ReadingGenerator.levels?()`(선택 메서드)로 등급 생성기 식별 → `evolve.ts` 3.5절이 등급 생성기면 `generateGradedReadings`로 KC별 A1~B2 스펙트럼 공급(등급별 고유 id·본문으로 사이클 간 멱등), 단일 생성기(en/es)는 기존 KC 격차 경로 유지. ⚠️등급 격차는 covered 필터 대신 id/본문 중복 제거로 멱등(seed A1이 vocab.core를 커버해도 스펙트럼 공급이 막히지 않음).
- **테스트**: `multilingual-reading.test`(4등급·실 B2·시드 중복 없음·B2>A1×2·levels)·`reading.test`(generateGradedReadings 스펙트럼·멱등)·`evolve.test`(진화 B2 공급·멱등). 기존 en evolve 테스트(`.levels` 없음)는 단일 경로 유지로 무회귀.
- **실증**(라이브 스모크 39/39): 5언어 A1~B2 생성·검증·시드 중복 없음·B2 상급 길이·진화 루프 B2 공급·멱등. 게이트 272→**277 pass(54파일)**. **상급 학습자에게도 무인 콘텐츠가 이어짐.**

### 2026-07-07 (58) — en·es B1/B2 문법 3면 대칭 심화 (7개 언어 전부 B1·B2 완결)
- **비대칭 진단**: 5개 비라틴 언어(zh·ar·sw·ja·hi)는 B1·B2 문법이 3면(배치·학습·교정) 완결됐으나, 수요 큰 en·es는 placement 문항만 있고 그 KC가 시드에 없으며(dangling) 문법 학습 콘텐츠·튜터 교정 축이 얕음.
- **KC 편입**: `packs/{en,es}/kc-seed.json`에 B1/B2 문법 KC 신설 — en `present_perfect`(B1)·`conditional`(B1)·`relative`(B2), es `preterite`(B1)·`subjunctive`(B2). 기존 placement(plc.en.since·cond·rel, plc.es.pret·subj)가 참조하던 것을 실 KC로. 읽기 지문도 이미 이 KC 참조(Phase 50·53).
- **학습 콘텐츠**: `content-seed.json`에 각 KC flashcard+mcq 2문항(en 6·es 4, checkItem 통과). en 11/11·es 9/9 verified.
- **튜터 축**: local-tutor `correct()` — 현재완료(have/has+과거형→과거분사 WRONG_PP)·조건법(if 문맥 I/he/she/it was→were, ifIdx 이후만). spanish-tutor `correctEs()` — 단순과거(ayer/anoche+현재형→과거)·접속법(바람동사 quiero/espero+que 뒤 직설법→접속법, queIdx 이후만). ⚠️전부 문맥 가드로 오탐 0.
- **테스트**: `tutor.test`(en pp·cond 발화+무발화)·`spanish-adapters.test`(es pret·subj)·`b1-content.test`(en·es KC≥2).
- **실증**(라이브 스모크 17/17): en·es B1/B2 튜터 HTTP 발화·배치 B2 도달·학습 콘텐츠 존재. 게이트 267→**272 pass(54파일)**. **7개 언어 전부 B1·B2 문법이 측정→학습→교정 3면 대칭.**

### 2026-07-07 (55-57) — 발음 B1 연계 + B2 문법 3면 대칭 + 읽기 등급 다양화 (3항목 일괄)
- **①발음 B1 연계**: 신설 B1 문법 KC의 발음 형태를 `phonology.json`에 — ja 촉음 최소대립쌍(行って itte vs いて ite)+て형 shadow(食べて)+撥音便 prosody(飲んで), zh 了 경성 prosody(吃了)+shadow(来了), ar 과거형 shadow/prosody(كتب·ذهب), sw -li- 과거(alikula·nilikwenda), hi 후치사(घर में·दिल्ली से). ⚠️스키마 준수: ar·hi·ja 성조 없음, prosody 음절=강세 길이·비zh 강세≥1. `pronounce.test` B1 KC 연계 단정.
- **②B2 문법 KC + 튜터 3번째 축(B2도 3면 대칭)**: B2 문법 KC 5종(zh `de_complement` 得 정도보어·ja `potential` られる·hi `ergative_ne` 능격 ने·ar `subjunctive_an` أن 접속법·sw `association_cha` 연관 cha, skill=writing·prereq=B1 KC) + `placement.json` B2 문항(b=2.2) + `content-seed.json` 각 flashcard+mcq 2문항(checkItem 통과) + **튜터 규칙**: zh 동사+的+형용사→得(跑的快→跑得快), ja ら抜き 정확 토큰→られる(たべれる→たべられる), hi 완료 타동사 있으면 주어 대명사→능격형(मैं→मैंने, 불규칙 वह 제외), ar 조동사+1인칭현재→أن 삽입(명시 집합), sw ki류 명사+ya→cha. ⚠️전부 문맥 가드로 오탐 0. 어댑터 테스트 5·`b1-content.test` B2·`placement.test` B2≥2.
- **③읽기 생성기 등급 다양화**: `multilingual-reading`를 `TEMPLATES[lang][level]`(A1 음식·A2 시장·B1 취미)로 재구성 — `generate(spec.level)`가 등급 지문 반환(미제공 등급 A2 폴백), id 등급 접미사로 등급별 공존. `multilingualReadingLevels()`+`engine/reading.generateGradedReadings`(한 격차서 A1·A2·B1 생성·검증·중복 제거). `multilingual-reading.test` 3등급·폴백.
- **실증**(라이브 스모크 40/40): B2 문법 5언어 HTTP 발화·B2 배치 도달·읽기 3등급 생성·발음 B1 연계 확인. 게이트 259→**267 pass(54파일)**. **난이도·문법·발음·진화 4축이 나란히 B1~B2 상급까지.**

### 2026-07-07 (54) — 생성기 KC 확장 (진화 자동생성 범위 vocab.core→numbers·greetings·B1 문법)
- **동기**: 진화 폐루프의 콘텐츠 생성기가 `kc.<lang>.vocab.core` 하나만 지원 → 다른 KC에 격차가 생겨도(예: 학습효과 강등) 채우지 못하고 skip. 범위를 넓혀 무인 자기증식을 실질 강화.
- **재구성**: `adapters/multilingual-content.MultilingualVocabGenerator`를 단일 VOCAB 테이블에서 **토픽별 GEN[lang][kcId]** 구조로. zh·ar·sw·ja·hi 각 4종 KC 데이터 — vocab.core(기존)·numbers(6~10, flashcard)·greetings(아침/밤/사과/천만에, flashcard)·B1 문법(了·과거·-li-·て형·후치사, **mcq**, 시드·Phase51과 다른 새 문항). `supports(kc)`가 `kc in table`로 판정, `generate()`가 문법 KC면 mcq·B1·오답보기, 나머지는 flashcard·A1.
- **⚠️ 멱등의 소재**: generateForGaps 자체는 멱등 아님(checkItem이 같은 id는 dedup 스킵=업데이트 허용). 실제 멱등은 **격차 탐지(`analyze.contentGaps`)** 층 — KC가 verified ≥minItems면 격차 목록에서 빠져 재생성 안 함(Phase48 교훈 재확인).
- **테스트**: `multilingual-content.test` — 레지스트리 4종 KC 지원 단정(옛 "numbers 미지원" → "numbers 지원"으로 갱신) + numbers·greetings·문법 생성물 게이트 통과·mcq·B1 레벨.
- **실증**(라이브 스모크 29/29): 5개 언어 × 3개 토픽(numbers·greetings·문법) 생성·전부 게이트 통과·flashcard 새 어휘·문법 mcq B1 + 강등된 numbers 격차를 생성·편입 후 격차 해소(analyze 층 멱등). 게이트 258→**259 pass(54파일)**. **진화 폐루프가 어휘를 넘어 숫자·인사·문법까지 무인 생성.**

### 2026-07-07 (53) — 읽기 B2 확장 + B1 배치고사 뱅크 심화 (난이도 스펙트럼 A1→B2 완성)
- **B2 읽기 지문 7개 언어**: `packs/*/reading.json`에 B2 지문 1편씩(en·es·zh·ar·sw·ja·hi, 공통 소재=도시 생활). B1의 서사(주말여행)와 달리 **주장→양보→개인 의견** 논설 구조 — 상급 어휘·연결어(however/그러나)·관계절(en)·접속법(es). 각 언어로 자연 번역, 클릭 사전·이해 문항 2개(하나는 추론형), 시드·B1 주제와 안 겹침. ⚠️CJK 밀도 탓 B2 길이 임계 200→150(zh 한자 181자=실질 B2 분량).
- **B1 배치고사 심화**: zh·ar·sw·ja·hi `placement.json`에 B1 문항(b=1.2) 추가 — A2(b≈1.0)~B1(b=1.4) 사이가 비어 있던 것을 메워 B1 대역 2개로. 중급 능력 추정(θ) 변별력↑. en·es는 이미 B1 2개 보유(불변).
- **테스트 고정**: `reading.test`(7언어 B2 존재·≥150자·B2 학습자에게 B2 현 수준 서빙)·`placement.test`(5언어 B1 문항 ≥2).
- **실증**(라이브 스모크 31/31): B2 학습자(ability.reading=2.5)에게 B2 지문 현 수준 서빙·7언어 서빙 전수 검증 + B1 경계 학습자(b≤1.2 정답) θ≈1.64→**B1 정확 배치**. ⚠️초기 스모크 5건은 학습자 모델 오설정(b≤1.4 전부 정답=B2급 학습자라 θ=2.57 B2가 정답 추정)이었고, B1 경계(b≤1.2)로 바로잡아 전건 통과 — 코드 결함 아님. 게이트 256→**258 pass(54파일)**. **난이도 A1·A2·B1·B2 4단 완비 — 초·중급 경로 완결.**

### 2026-07-07 (52) — 전용 튜터 2번째 문법 축: 신설 B1 문법 실시간 교정 (콘텐츠·평가·튜터 3면 대칭)
- **동기**: B1 문법 KC가 배치(Phase 50)·학습(Phase 51)에는 들어왔지만 튜터가 아직 교정 못 함 → 5개 전용 튜터에 2번째 문법 축 추가로 3면(콘텐츠·평가·튜터) 대칭 완성.
- **규칙(각 언어)**: ja `correctJa` — WRONG_TE 사전(いくて→いって·たべるて→たべて·のむて→のんで 등 음편·예외·一段), 정확 토큰 일치라 오탐 0. hi `correctHi` — 장소 명사(घर·स्कूल…)가 계사(हूँ·है…) 바로 앞이면 사이에 처소 후치사 में 삽입. zh `correctZh` — 과거 시간부사(昨天·前天…) 있고 동사(吃·买·去…)에 완료 표지 없으면 첫 동사 뒤 了 삽입, ⚠️부정(不·没)·조동사(想·要·会·能) 뒤 제외(negative lookbehind). ar `correctAr` — أمس(어제) 문맥에서 현재형 동사(يكتب…)를 과거형(كتب…)으로 리캐스트. sw `correctSw` — jana(어제) 문맥에서 현재 표지 -na-를 과거 -li-로(주어 접두사 보존, ninakula→nilikula).
- **오탐 방지**: 전부 문맥 가드(어제/과거부사/정확 토큰) — 가드 없으면 무발화. 기존 테스트 코퍼스에 오발화 0(게이트 회귀 없음).
- **테스트**: 각 어댑터 테스트에 발화+무발화 케이스 5개 추가(japanese·hindi·chinese·arabic·swahili-adapters).
- **실증**(라이브 스모크 20/20): `/tutor?lang=` HTTP로 5개 언어 B1 문법 태그 발화·교정문 포함·정문 무발화·인젝션 방어 유지. 게이트 251→**256 pass(54파일)**. **B1 티어가 배치·학습·튜터 3면 전부 대칭.**

### 2026-07-07 (51) — 신설 B1 문법 KC 학습 콘텐츠 시드 (평가 가능→학습 가능, B1 티어 완결)
- **공백 진단**: Phase 50에서 신설한 5개 B1 문법 KC(zh `aspect_le`·ar `past_tense`·sw `tense_li`·ja `te_form`·hi `postpositions`)가 **배치고사(placement)에만 존재**하고 학습 콘텐츠(content-seed)가 0 — B1로 배치된 학습자가 정작 `/next`에서 연습할 문항이 없는 공백.
- **콘텐츠 시드**: 5개 언어 `content-seed.json`에 각 B1 KC마다 **flashcard(인지)+mcq(대조 선택) 2문항**(총 10문항). zh(了 vs 过/着)·ar(كتب·1인칭 -tu)·sw(-li- vs -na-/-ta-)·ja(たべて·行く 예외 いって)·hi(में 처소·को 수령자). 전부 B1·CC-BY-4.0·목표어 문자 보존, checkItem 통과 형식(반려 0).
- **서빙 파이프라인 확인**: getPack이 draft→verified 승격(`promoteVerified`) → 선행 vocab.core 숙달 ≥0.6에서 B1 KC 해금(`isUnlocked`) → `serveItems`가 verified·해금 KC 문항 서빙. minItems=2 충족이라 진화 폐루프가 콘텐츠 격차로 보지 않음(자가생성 불필요).
- **테스트 고정**: `server/b1-content.test`(2) — 각 신설 KC ≥2 문항·전부 B1·flashcard+mcq 균형·정답에 목표어 문자.
- **실증**(라이브 스모크 15/15): 5개 언어 각각 선행 전 B1 KC 잠김(미노출)→vocab.core 3회 정답(BKT 2회면 0.7)→해금→`/next`에 2문항 서빙·게이트 통과 품질. 게이트 249→**251 pass(54파일)**.

### 2026-07-07 (50) — 읽기 B1 상향 + 배치고사 중급 천장 확장 (초급→중급 경로 개통)
- **B1 읽기 지문 7개 언어**: `packs/*/reading.json`에 B1 지문 1편씩(en·es·zh·ar·sw·ja·hi, 공통 소재=주말 바닷가 여행, 각 언어로 과거·조건·의견 서술). 텍스트 ≥120자로 A1·A2보다 길고 복잡, 클릭 사전·이해 확인 문항 2개, 시드 3편(하루·가족/고양이·주말/시장)과 주제·id 겹치지 않음. 라이선스 CC-BY-4.0.
- **B1 문법 KC 신설(zh·ar·sw·ja·hi)**: `kc-seed.json`에 진짜 중급 문법 KC — zh `aspect_le`(완료·변화 了)·ar `past_tense`(الماضي 인칭 활용)·sw `tense_li`(과거 -li-)·ja `te_form`(동사 て형)·hi `postpositions`(को·में·से). skill=writing(생산), level B1, prereq=vocab.core. 그동안 A1 KC뿐이던 5개 언어에 B1 티어 개통.
- **배치고사 B1·B2 확장**: `placement.json`에 5개 언어 각 B1(b=1.4)·B2(b=2.0) 문항 2개씩(신설 KC 참조). CAT 천장이 A2(b≈1.0)→B2(b=2.0)로 상승 → 중급 학습자의 능력을 실제로 측정. en·es는 기존 B1/B2 보유(불변).
- **테스트 고정**: `server/reading.test` — 7개 언어 B1 지문 보유·검증·길이 단정 + B1 학습자(ability.reading=1.5)에게 `selectGradedReading`이 B1을 현 수준으로 서빙(i+1 상향). `server/placement.test` — 5개 언어 B1·B2 문항 존재·최고 난이도 b≥1.8·강한 학습자 중급↑ 배치.
- **실증**(라이브 스모크 38/38): HTTP `/placement/step` 전부 정답→zh·ar·sw·ja·hi 모두 **B2 배치**·뱅크 B1·B2 관측 + `/reading` 7개 언어 서빙 200·전수 validateReading 통과 + 각 언어 B1 지문 검증·길이 충족. 게이트 245→**249 pass(53파일)**.

### 2026-07-06 (49) — 읽기 지문 생성기 다국어화 (진화 폐루프가 문항·읽기 모두 7개 언어)
- **`adapters/multilingual-reading.ts` `MultilingualReadingGenerator`(데이터 주도·결정적)**: 언어별 등급 지문 템플릿(zh·ar·sw·ja·hi, 주제=시장, 시드[나의 하루·가족·주말]와 다름)으로 `kc.<lang>.vocab.core` 읽기 격차에 지문 생성. 클릭 사전(한자·가나는 학습자용 띄어쓰기)·이해 확인 문항. `supports()`는 vocab.core만. validateReading 통과분만 노출(규칙 4).
- **레지스트리**: `createReadingGeneratorFor`가 es→스페인어, en→영어, **zh·ar·sw·ja·hi→다국어 읽기 생성기**, 그 외 en 폴백. 진화 루프(`generateReadings`→`runEvolveCycle` `input.readingGenerator`)가 호출. **문항 생성기(Phase 48)와 대칭 — 이제 진화 폐루프가 문항+읽기 양쪽 모두 7개 언어 무인 자동생성.**
- **실증**(라이브 스모크 15/15): 읽기 격차에서 5개 언어 지문 1편씩 생성·validateReading 통과·`gen.<lang>.read.core` 태그·id/본문 중복 제거로 2회차 멱등. 게이트 242→**245 pass(53파일)**.

### 2026-07-06 (48) — 콘텐츠 생성기 다국어화 (진화 폐루프가 7개 언어 자동생성)
- **`adapters/multilingual-content.ts` `MultilingualVocabGenerator`(데이터 주도·결정적)**: 언어별 어휘 테이블(ko 뜻→목표어, zh·ar·sw·ja·hi 각 6항목, 시드와 겹치지 않는 새 어휘)로 `kc.<lang>.vocab.core` 격차에 새 flashcard draft 생성. `supports()`는 vocab.core만. 생성물은 draft — 코어 게이트(checkItem) 통과분만 노출(규칙 4).
- **레지스트리**: `createContentGeneratorFor`가 es→스페인어, en→영어, **zh·ar·sw·ja·hi→다국어 어휘 생성기**, 그 외 en 폴백. 진화 루프(`generateForGaps`→`runEvolveCycle`)가 `input.generator`로 호출 → **en·es만이던 자동생성이 7개 언어로**.
- **함정**: ⚠️`constructor(private lang)` 파라미터 프로퍼티는 무설치 실행(erasable TS)에서 금지 → 배럴 전체 로드 실패(19 fail). 필드 명시 선언(`private lang: string; constructor(lang){this.lang=lang}`)으로 해소.
- **실증**(라이브 스모크: 직접 15/15 + 진화 사이클 15/15): 실제 격차(vocab.core<2)에서 5개 언어 자동생성 4항목·전부 언어 태그·게이트 통과·시드 중복 없음·2회차 멱등. minItems=2라 현재 채워진 시드는 격차 아님(정상). 게이트 239→**242 pass(52파일)**.

### 2026-07-06 (47) — 7번째 학습 언어 = 힌디(hi) + 전용 튜터 (데바나가리·성 일치)
- **`packs/hi`(데이터만, 데바나가리 abugida)**: pack(script:devanagari·ltr·성조 없음) + kc-seed(vocab.core·**script**[마트라]·numbers·greetings·**gender** m/f) + content 9(पानी·धन्यवाद·क 소리·घर·तीन·पाँच·नमस्ते·अलविदा·अच्छी लड़की 성) + phonology(**권설음ट/치음त·유기음ख/무기음क·द/ड** 대립, 성조 없음·약강세) + placement(plc.hi 4) + reading 3편(A1·A1·A2, 데바나가리 본래 띄어쓰기로 클릭 사전 자연 작동).
- **`adapters/hindi-tutor.ts` `HindiHeuristicTutor`+`correctHi`**: ①**성 일치** — 남성형 형용사(अच्छा·बड़ा·छोटा…) + 여성 명사(लड़की·बिल्ली·रोटी…) → 형용사 여성형(-ी: अच्छी), ⚠️남성 명사(लड़का) 뒤엔 무수정 ②로마자→데바나가리 리캐스트(namaste→नमस्ते). `createTutorFor` hi + `langName` hi(힌디어/Hindi).
- **배선(데이터·설정만)**: `universality.test`·`reading.test` hi + `hi.test`·`hindi-adapters.test`(8) + 학습 선택기 힌디어·`VOICE_LANG.hi`(hi-IN)·`SCENARIO_GREETING` hi 7시나리오 + `normWord` 데바나가리 범위(ऀ-ॿ). **코어/서버 코드 0줄**.
- **실증**(라이브 스모크 11/11): /pack devanagari, /next vocab·script i+1, /placement plc.hi, /reading 데바나가리 A1·클릭 사전, /phonology 권설/유기음 대립 3·성조 없음, /tutor अच्छा लड़की→अच्छी(성)·namaste→नमस्ते·남성명사 무수정·explainLang en·airport 역할극·ja 튜터 오적용 없음. 게이트 225→**239 pass(51파일)**. **문자 패러다임 5종(알파벳·CJK·RTL·가나·데바나가리)을 코어 0줄로.**

### 2026-07-06 (46) — ja 전용 튜터 (조사 を·문자) — 전용 튜터 6개 언어 완결
- **`adapters/japanese-tutor.ts` `JapaneseHeuristicTutor`+`correctJa`(오프라인·결정적)**: ①**목적어 조사 を** — 목적어 명사(OBJ: 水·みず·パン·本·ごはん…) + 타동사(TRANS: のむ·のみます·たべます·よみます…) 사이 を 누락 시 삽입(みず のみます→みず を のみます), 목적어 뒤 は 오용 시 を로(パン は たべます→パン を たべます) ②**로마자→가나/한자 리캐스트**(arigatou→ありがとう·watashi→私). ⚠️주제 は(타동사 아님)는 무수정(오탐 방지). 일본어 FOLLOWUPS 7시나리오.
- **레지스트리**: `createTutorFor` ja→`JapaneseHeuristicTutor`(withSafety). explainLang·역할극 재사용. **en·es·zh·ar·sw·ja 6개 언어 전용 튜터 완결**. 파일럿(패스스루)→전용 승격(sw 38→39 패턴).
- **테스트**: `japanese-adapters.test`(8: を 삽입·は→을·로마자·정문 무수정·튜터·역할극·explainLang·인젝션) + `ja.test` 튜터 테스트 패스스루→전용 교체.
- **실증**(라이브 스모크 8/8): みず のみます→を 삽입, パン は→を, arigatou→ありがとう, 정문 무수정, explainLang en, hospital 역할극, sw·en 튜터 오적용 없음. 게이트 217→**225 pass(49파일)**.

### 2026-07-06 (45) — 6번째 학습 언어 = 일본어(ja) 파일럿 (코어 0줄)
- **`packs/ja`(데이터만, 혼합 문자)**: pack(script:japanese·ltr·성조 없음) + kc-seed(vocab.core·**kana**·numbers·greetings·**particles** は/を/に) + content-seed 9항목(私·ありがとう·かな あ·ねこ·三·五·こんにちは·さようなら·を 조사) + phonology(**모라 대립** つ/す·촉음 kite/kitte·장모음 ojisan/ojiisan, 섀도·운율은 **피치 액센트**를 stress 배열로) + placement(plc.ja 4문항) + reading 3편(A1·A1·A2, 가나 **단어 띄어쓰기**로 클릭 사전 토큰화).
- **배선(데이터·설정만)**: `universality.test` LANGS에 ja(en·es·ar·sw·ja) + `reading.test` 5→6언어 + 전용 `ja.test`(팩·게이트·가나/한자 포함·모라 대립·배치·읽기·패스스루 튜터·인젝션) + 학습 선택기 일본어·`VOICE_LANG.ja`·`SCENARIO_GREETING` ja(7시나리오) + `normWord`에 가나 범위(ぁ-ヿ). `langName` ja는 기존 보유. **코어/서버/어댑터 코드 0줄**.
- **튜터**: 규칙 없는 목표어 → `createTutorFor` 폴백 `PassthroughTutor`(오교정 없이 일본어 격려, 인젝션 방어 경유). ja 전용 튜터(조사 교정)는 후속.
- **실증**(라이브 스모크 11/11): /pack japanese·ltr, /next 신규→vocab.core·kana(i+1 무전제), /placement plc.ja, /reading 가나 A1 우선·클릭 사전, /phonology 모라 대립 3·성조 없음, /tutor ja 패스스루(오교정 0)·en 튜터 영어 교정 유지. 게이트 210→**217 pass(48파일)**. **범용 엔진이 라틴·CJK/성조·RTL/아랍·가나+한자 6개 언어를 데이터만으로.**

### 2026-07-06 (44) — 문항 시드 밀도↑ (zh·ar 4→9, KC 공백 해소)
- **zh content-seed 4→9**: greetings 2(你好·再见)·vocab.core +1(谢谢)·numbers +1(五)·tones +1(买/卖 3성/4성 최소대립쌍). **비어 있던 greetings KC에 문항 투입**.
- **ar content-seed 4→9**: script 2(س 소리·بيت 조합)·greetings 2(مرحبا·مع السلامة)·vocab.core +1(نعم vs لا). **비어 있던 script·greetings KC에 문항 투입**.
- **정합**: 전부 기존 통과 항목 형식(id·kc·answer·distractors·CC-BY-4.0) 준수 → 콘텐츠 게이트 통과(반려 0). en·es·zh·ar·sw **모든 KC가 문항 보유**(발음·읽기·시나리오를 뒷받침하는 학습 항목 균형).
- **실증**(라이브 스모크 12/12): zh·ar·sw 각 9항목·checkItem 반려 0·KC 전부 커버, zh greetings·ar script/greetings 공백 해소 확인. 게이트 **210 유지**.

### 2026-07-06 (43) — 발음 데이터 5개 언어 확충 (대립쌍·섀도·운율 밀도↑)
- **zh·ar·sw 발음 확충**(각 대립쌍 2→5·섀도 2→4·운율 2~3→4): zh(성조 买/卖 3성/4성·mā/mǎ·má/mà + 분절 b/p 送气·s/sh, 섀도 水·中文, 운율 谢谢你), ar(인두/연구개음 خ/ح·성문 ع/ء·유무성 z/s, 섀도 نعم·بيت, 운율 صباح الخير·شكرا جزيلا), sw(유무성 f/v·t/d·모음 i/o mti/mto, 섀도 Habari·Maji, 운율 Asubuhi·Mwalimu 페널티메이트 강세).
- **정합**: 전부 기존 phonemes 음소만 사용(zh에 pʰ·ts, ar에 f 보강). **모든 zh 대립쌍 tone 명시**(한자 음절은 성조 보유, 분절 대립도 동일 성조), ar 성조 없음(강세), sw 성조 없음(규칙적 페널티메이트).
- **테스트**: `pronounce.test`를 en·es → **5개 언어**로 일반화 + 밀도 기준 2→**3**(대립쌍·섀도·운율). 운율 검증을 성조어(zh=tones)·강세어(stress) 분기.
- **실증**(라이브 스모크 13/13): 5개 언어 /phonology 밀도 3+, zh 성조 배열·买/卖, ar 성조 부재·ع/ء, sw f/v·페널티메이트, /pronounce sw Maji 완벽 100%·ar bayt b→p 채점(유성만 다름→관대, 명료도 우선). 게이트 **210 유지**(테스트 일반화).

### 2026-07-06 (42) — 아랍어 화면 언어(RTL) — 화면 언어 5종, 방향까지 데이터
- **`packs/ar/i18n.json` 신설**: ko와 **동일 132키** 아랍어 번역 + 최상위 **`dir:"rtl"`** 메타. 화면 언어 ko·en·es·zh·**ar**(선택기에 العربية). 규칙 9 — 손실공포·재촉 없는 성과 중심 카피만.
- **화면 방향까지 데이터로(규칙 11을 UI 방향까지)**: `getI18n`이 `{strings, dir}` 반환·`GET /i18n`이 `dir` 포함 → 앱 `loadI18n`이 `UI_DIR` 수신·`applyI18n`이 `document.documentElement.dir` 설정. **첫 RTL 화면 언어**. 목표어 콘텐츠는 여전히 요소별 `dir="auto"`(셸 방향과 독립).
- **테스트**: `pack.test` 전 로케일 스캔에 ar 자동 편입(파리티+다크패턴, 검사 7건) + `ui.test` 화면 언어 선택기 العربية·dir 데이터화 단언.
- **실증**(라이브 스모크 8/8): `/i18n?ui=ar`→아랍어 셸·dir=rtl·시나리오 라벨 아랍어, ko/en dir=ltr, ar·ko 키 파리티, 미지원(fr)→ko 폴백. 게이트 **210 유지**(다크패턴 스캔 6→7건).

### 2026-07-06 (41) — 등급 읽기 지문 5개 언어 완비 (zh·ar·sw 신설 + es A2)
- **읽기 지문 신설**: `packs/{zh,ar,sw}/reading.json` — 각 **3편**(A1·A1·A2, 주제 나의 하루·나의 가족·주말). zh(한자, 학습자용 단어 띄어쓰기)·ar(RTL 아랍문자)·sw(반투어, 명사부류 watu wanne 포함). 전부 클릭 사전(glossary)·이해 확인 문항·CC-BY-4.0. `packs/es/reading.json`에 A2 1편 추가(2→3편).
- **클릭 사전 문자 범용화**: 웹 `normWord`가 라틴(악센트)만 남기던 것을 **CJK 한자(一-鿿)·아랍(؀-ۿ)까지 보존** → zh·ar 지문에서도 단어 클릭→뜻+TTS 작동(표기 문자 무관, 규칙 11). zh는 학습자용 단어 띄어쓰기로 whitespace 토큰화가 잡히게.
- **테스트**: `reading.test` 검증 루프를 en·es → **5개 언어 전부**로 일반화(지문 2+개·A2 포함·id 접두사·라이선스·클릭 사전 존재). 같은 검증기가 라틴·CJK·RTL 통과 — 코어 문자/방향 무관.
- **실증**(라이브 스모크 26/26): 5개 언어 /reading A1 우선 서빙·언어 접두사·클릭 사전·문항 정답 보기 내, θ1.5 상향 시 zh A2 선택. 게이트 **210 유지**(reading 검증 일반화, 테스트 수 동일).

### 2026-07-06 (40) — 역할극 시나리오 확장 (병원·공항) — 5개 언어 × 7시나리오
- **5개 언어 튜터 FOLLOWUPS 확장**: en·es·zh·ar·sw 전부에 `hospital`(무엇 때문에 왔나·어디가 아픈가·증상 기간·알레르기)·`airport`(여권·수하물 개수·최종 목적지·창가/통로 좌석) 뱅크 추가. 각 뱅크 4문항, 전부 목표어. 시나리오 5→**7종**.
- **웹**: `SCENARIOS`에 병원·공항 + `SCENARIO_GREETING`(상황별 목표어 오프닝 🏥 진료실·✈️ 체크인, 5개 언어). 시나리오 라벨 `scenario.{hospital,airport}` 4로케일(ko 병원에서/공항에서·en At the doctor/At the airport·es·zh).
- **데이터만 추가**로 확장 — 시나리오 파이프라인(선택기→task→FOLLOWUPS→그리팅) 구조 완전 불변. 새 언어·새 상황 모두 데이터 주입만으로.
- **실증**(라이브 스모크 10/10): 5개 언어 병원(en "What brings you in today?"·es "¿Qué le trae hoy?"·zh "你哪里不舒服？"·ar "ما الذي أتى بك اليوم؟"·sw "Una tatizo gani leo?")·공항(en·zh·sw 여권/수하물/좌석), 병원≠공항≠자유 분리, sw 병원 문맥에서도 명사부류 교정 유지. 게이트: 209 → **210 pass**(tutor 역할극 병원·공항 1 + ui 시나리오 확장).

### 2026-07-06 (39) — sw 전용 튜터 + 콘텐츠 확충 — 5개 언어 전용 튜터 완결
- **`adapters/swahili-tutor.ts` `SwahiliHeuristicTutor`+`correctSw`(오프라인·결정적)**: ①**명사 부류 복수** — 사람(m-/단수, mtu·mtoto·mwalimu…) + 복수 수식어(wawili·wengi·wote…) → wa-/복수(watu…) ②**주어 접두사 일치** — 복수 주어(wa- 부류) 뒤 동사 a-(단수)면 wa-로(watu anasoma→wanasoma). ⚠️asante 등 비동사 오탐 방지(`^a(na|li|ta)` 패턴). 스와힐리어 FOLLOWUPS(5시나리오).
- **레지스트리**: `createTutorFor` sw→`SwahiliHeuristicTutor`(withSafety). explainLang·역할극 재사용. **en·es·zh·ar·sw 5개 언어 전용 튜터 완결**.
- **콘텐츠 확충**: sw content-seed 4→**9항목**(인사 Kwaheri·Karibu, 숫자 nne, 명사부류 watoto, 발음 baba/papa 최소대립쌍). 신규 학습자 서빙 2→3(sounds KC 즉시 해금).
- **실증**(라이브 스모크 6/6): mtu wawili→watu, watu anasoma→wanasoma, explainLang en, 역할극 shopping, en 튜터 유지, 서빙 3개. 게이트: 202 → **209 pass**(swahili-adapters 7, sw 튜터 테스트 교체).

### 2026-07-06 (38) — 저자원 언어 파일럿 (스와힐리어 sw) — 범용 엔진 5번째 언어
- **`packs/sw`(데이터만, 반투어)**: pack(라틴·ltr·성조 없음) + kc-seed(vocab·sounds·numbers·greetings·**nounclass** m-/wa-) + content-seed(Jambo·Asante·tatu·**mtu/watu 명사 부류**) + phonology(b/p 유·무성·l/r 대립, **규칙적 페널티메이트 강세** stress 데이터) + placement. **코어/서버/어댑터 0줄**.
- **배선**: `universality.test` LANGS에 sw(en·es·ar·sw 동일 코어) + 전용 `sw.test`(팩·게이트·발음·배치·패스스루 튜터) + `langName` sw(스와힐리어/Swahili) + 학습 선택기·`VOICE_LANG.sw`(sw-KE)·`SCENARIO_GREETING` sw(5시나리오).
- **실증**(라이브): /pack sw 라틴·ltr, /next 신규 학습자→vocab.core만(i+1 게이팅)→숙달 후 numbers/nounclass 해금, /placement plc.sw, 패스스루 튜터 스와힐리어 격려. ⚠️발음 스코어러는 유성만 다른 b/p를 관대 처리(명료도 우선, 의도된 동작) — 지각 훈련(최소대립쌍)은 별도 경로. 게이트: 196 → **202 pass**(sw 5 + universality sw 1).

### 2026-07-06 (37) — 프로필 내보내기 (소유·포터블)
- **웹**: 프로필 카드에 "📄 프로필 내보내기" — `GET /profile` 응답을 JSON 다운로드(규칙 6). 공용 `exportJson(obj, filename)` 헬퍼로 통일, **인증서 내보내기도 이 헬퍼 재사용**(중복 제거). `profile.export` 4로케일. 게이트 196 유지.

### 2026-07-06 (36) — 역할극 시나리오 확장 (상점·길찾기)
- **4개 언어 튜터 FOLLOWUPS 확장**: en·es·zh·ar에 `shopping`(찾는 것·사이즈·결제)·`directions`(목적지·주소·이동수단) 뱅크 추가. 시나리오 5종.
- **웹**: `SCENARIOS`에 상점·길찾기 + `SCENARIO_GREETING`(상황별 목표어 오프닝 🛍️🗺️, 4개 언어). 시나리오 라벨 `scenario.{shopping,directions}` 4로케일.
- **데이터만 추가**로 확장 — 시나리오 파이프라인(선택기→task→FOLLOWUPS) 구조 불변.
- **실증**(라이브 스모크 6/6): en shopping→"What are you looking for?"·directions→"Where do you want to go?", es/zh/ar 상황별, default와 상이. 게이트 **196 유지**(chinese task 테스트 확장 + ui 시나리오).

### 2026-07-06 (35) — 학습자 프로필 카드 (성과 요약, 스트릭 없이)
- **`core/profile.ts`(언어 무관)**: `buildProfile`(인증 KC·완주 레벨·획득 배지 + 누적 통계[총 응답·정답·연습 KC·튜터 대화·기여] → 결정적 카드). 응답 없으면 정확도 null(과신 금지). **타임스탬프 없음**(포터블·재현). **다크패턴 없음**(규칙 2·9): 연속일·스트릭 없이 누적 성과만.
- **서버**: `handlers.profileFor`(deriveCertifications + deriveBadges + 학습자 로그에서 응답/정확도/KC/튜터턴 파생, 기여는 communityView) + `GET /profile?learner=&lang=`.
- **웹**: 성취 패널 상단 6지표 그리드(푼 문항·정확도·인증·배지·튜터 대화·기여), 로케일 라벨(`profile.*` ko·en·es·zh). `refreshState`·i18n 재렌더 배선.
- **실증**(라이브 스모크 7/7): 응답 5(정답4)→정확도 0.8·연습 KC 2·튜터 1, 빈 학습자→정확도 null, 결정적. 게이트: 191 → **196 pass**(profile 4 + ui 1).

### 2026-07-06 (34) — 추가 UI 로케일 (es·zh) — 화면 언어 4종
- **로케일 팩**: `packs/{es,zh}/i18n.json`(ko와 **동일 키 집합** 60여 문자열). 웹 화면 언어 선택기에 Español·中文 추가(ko·en·es·zh). 학습 언어와 독립.
- **무결성 일반화**: `pack.test` 로케일 테스트를 `packs/*/i18n.json` **전 로케일 스캔**으로 — 각 로케일 키가 ko와 동일(누락/여분 없음) + en/latin 다크패턴(손실공포·재촉) 없음. 4개 이상 검증.
- **실증**(라이브 스모크 6/6): /i18n ko/en/es/zh 셸 + 키 집합 동일 + fr→ko 폴백. 게이트 **191 pass**(테스트 수 동일, 파리티 커버리지 확대).

### 2026-07-06 (33) — ar 전용 튜터 (성 일치·문자) — 4개 언어 전용 튜터 완결
- **`adapters/arabic-tutor.ts` `ArabicHeuristicTutor`+`correctAr`(오프라인·결정적)**: ①**성 일치** — 여성명사(FEM_NOUNS: مدينة·سيارة·مدرسة·بنت…) + 남성형 형용사(ADJ_FEM: كبير→كبيرة…) → 형용사 여성형(+ة), ⚠️남성명사(بيت) 뒤엔 무수정(오탐 방지) ②로마자 → 아랍 문자 리캐스트(shukran→شكرا). 아랍어 i+1 후속 질문(FOLLOWUPS task별).
- **레지스트리**: `createTutorFor` ar→`ArabicHeuristicTutor`(withSafety 경유). explainLang(교정 메모 ko/en)·역할극 task 지원(zh 패턴 재사용). 아랍어 몰입 어구 أحسنت!/ممتاز!.
- **커버리지 완결**: en·es·zh·ar **4개 실증 언어 전부 전용 튜터**. 목표어 규칙은 언어별, 설명은 화면 언어.
- **실증**(라이브 스모크 6/6): مدينة كبير→성 일치, shukran→شكرا, explainLang en→영어 메모, restaurant→주문 질문, en 영어 튜터 유지, 인젝션 차단. 게이트: 184 → **191 pass**(arabic-adapters 7, ar 튜터 테스트 교체).

### 2026-07-06 (32) — 역할극 (task 시나리오) — 잠든 상황별 대화 활성화
- **발견**: en·es·zh 튜터에 `FOLLOWUPS`(default/intro/restaurant) task 뱅크가 이미 있으나, 웹이 `/tutor`에 `task`를 안 넘겨 **항상 default만** 쓰이던 사장 상태.
- **웹**: 튜터 탭에 **상황 선택기**(`#scenarios`, 자유·자기소개·식당) + `SCENARIOS`·`SCENARIO_GREETING`(상황별 목표어 오프닝, en/es/zh/ar). 상황 고르면 `resetTutorChat`으로 대화 재시작, `/tutor` body에 `task: tutorTask` 전달. 시나리오 라벨 로케일(`scenario.*`), i18n·탭 열기 재렌더.
- **파이프라인**: 웹 task → 서버 body.task → `handlers.tutorTurn` → `respond({task})` → 튜터 `FOLLOWUPS[task]`. 상황에 맞는 후속 질문(식당→주문·자기소개→이름).
- **실증**(라이브 스모크 4/4): en restaurant→"What would you like to order?"·intro→"What's your name?"·zh restaurant→주문 질문, default와 상이. 게이트: 182 → **184 pass**(zh task 1 + ui 시나리오 1).

### 2026-07-06 (31) — 기여자 배지 (성취를 커뮤니티까지, 다크패턴 없이)
- **`core/badges.ts`(언어 무관)**: `deriveBadges`(증거 기반·결정적) — 5카테고리 브론즈/실버/골드 티어: ①숙달(인증 KC 수 [1,5,15]) ②레벨 완주([1,2,3]) ③기여(저자 수용 [1,3,10]) ④**잘 가르침**(학습효과 healthy 수용 [1,2,5], 규칙 1) ⑤검토(검토 수 [3,10,25], **신뢰≥0.6 자격**이 있어야 티어 — 양 아닌 실효). `authoredStats`·`reviewsMadeBy` 순수 헬퍼. **다크패턴 없음**(규칙 2·9): 다음 티어 경로(`nextNeed`)만, 손실공포·마감·스트릭 없음.
- **서버**: `handlers.badgesFor`(deriveCertifications + communityView[states·trust·effects] 재사용) + `GET /badges?learner=&lang=`.
- **웹**: 성취 패널에 배지 칩(티어 이모지 🥉🥈🥇·카운트·다음 경로), 로케일 라벨(`badge.*` ko/en), 검토 미자격 안내. `refreshState`·i18n 재렌더에 배선.
- **실증**(라이브 스모크 6/6): 학습 인증→숙달 bronze, 기여 수용(2검토 승인)→기여 bronze, 신뢰 이력 없는 검토자→검토 티어 보류, 결정적. 게이트: 176 → **182 pass**(badges 5 + ui 1).

### 2026-07-06 (30) — 다중 모국어 UI (i18n) — 문자열은 데이터, 화면 언어는 학습자가 선택
- **로케일 팩(데이터)**: `packs/{ko,en}/i18n.json`(`strings` 60여 키, `role:["ui"]`). ko·en **키 집합 동일**(파리티 테스트). 학습 언어와 독립. 규칙 9 — en 로케일도 다크패턴(손실공포) 스캔.
- **서버**: `getI18n(uiLang)` 캐시 + **`GET /i18n?ui=`**(미지원은 ko 폴백).
- **웹**: 셸 문자열을 `data-i18n` 속성으로 데이터화 + `t(key)`·`loadI18n`·`applyI18n`(셸 주입 + 열린 뷰 재렌더) + **화면 언어 선택기**(`#uilang`, `ll.ui` 유지, 배우는 언어와 독립). 동적 문자열(학습 흐름·성취·배치·읽기·발음·기여) 전부 `t()` 경유. 튜터 입력 placeholder는 언어 중립.
- **튜터 설명 언어(`explainLang`)**: `TutorRequest.explainLang` + `explainL(lang,ko,en)` 헬퍼. en·es·zh·패스스루 튜터의 **교정 메모·격려를 화면 언어(ko/en)로** — 목표어 몰입 어구(很好!/¡Bien!/langName)는 유지, 교정 규칙 자체는 언어 무관 동일. 서버 `/tutor` body.explainLang → 웹은 `explainLang: UILANG` 전송.
- **실증**(라이브 스모크 6/6): `/i18n` ko/en/fr폴백, 튜터 `我是高` 설명이 ko="형용사…"·en="use 很…"(교정 결과 很高 동일). 게이트: 173 → **176 pass**(ui i18n 1 + zh explainLang 1 + 로케일 파리티 1).

### 2026-07-06 (29) — 중국어 전용 튜터 (성조·是·양사 교정) + 웹 튜터 언어 라우팅 수정
- **`adapters/chinese-tutor.ts` `ChineseHeuristicTutor`+`correctZh`(오프라인·결정적)**: ①**병음/성조** — 무성조 로마자 핵심어를 한자+성조로 리캐스트(성조=뜻, 모호어 ma 제외) ②**是+형용사** — 형용사 술어는 계사 是가 아니라 很(我是高→我很高), ⚠️경계 요구로 복합어(是高中生) 오탐 방지 ③**양사(量词)** — 一个书→一本书(书=本·猫=只·咖啡=杯·纸=张·车=辆…). 중국어 i+1 후속 질문.
- **레지스트리**: `createTutorFor` zh→`ChineseHeuristicTutor`(withSafety 경유, 인젝션 방어). en/es 유지.
- **웹 튜터 갭 수정**: 채팅이 `/tutor`에 `lang`을 안 넘겨 **늘 기본(en) 튜터로 응답**하던 문제 → `/tutor?lang=${LANG}` + body.lang 전달. 이제 선택 언어의 전용 튜터(zh·es)가 실제로 동작(그린 카피만 맞고 교정은 en이던 갭 해소).
- **실증**(라이브 스모크 5/5): `/tutor?lang=zh` 我是高→shi-adjective·wo shi laoshi→老师(성조)·一个书→measure-word, en은 영어 튜터 유지(중국어 규칙 오적용 없음), 인젝션 차단. 게이트: 167 → **173 pass**(chinese-adapters 6, zh 튜터 테스트 교체).

### 2026-07-06 (28) — RTL·아랍어(ar) — 표기 방향까지 데이터가 결정 (다국어 범용 완결 축)
- **`packs/ar`(데이터만)**: pack.json(`direction:"rtl"`·`script:"arabic"`) + kc-seed(script·vocab·sounds·numbers·greetings) + content-seed(아랍 문자 flashcard·mcq·`قلب/كلب` 최소대립쌍) + phonology(자음 대립쌍 q/k·ص/س, 강세[성조 아님] 운율) + placement. **코어/서버/UI 코드 0줄 변경**.
- **방향은 하드코딩이 아니라 데이터에서**: `getPack`이 pack.json 메타 로드(방어적 정규화) + **`GET /pack?lang=`**(direction·name·script). 코어/서버는 방향을 하드코딩하지 않음(규칙 11).
- **웹 양방향(bidi)**: 콘텐츠 요소(#stage·#read-passage·#pron-stage·#place-stage·#messages·입력·동적 보기버튼·말풍선)에 **`dir="auto"`** → 유니코드 bidi가 아랍어=RTL·한글/영어=LTR 자동. `applyPack()`이 `/pack`으로 lang 속성(TTS/맞춤법·접근성)·튜터 안내 문구 언어화. 언어 전환기에 아랍어 추가, `VOICE_LANG.ar`·`TUTOR_GREETING.ar`.
- **튜터/발음**: `langName`에 아랍어 추가 → 패스스루 튜터가 "아랍어로 계속…" 격려(영어 규칙 오적용 없음). 같은 발음 채점기가 q→k 자음 오류를 명료도 손실로 반영(75%).
- **테스트**: `universality.test`에 **ar 편입**(en·es·ar 동일 코어) + `ar.test`(방향 rtl·아랍문자 보존·최소대립쌍·강세·CAT·튜터) + ui.test(dir=auto·/pack·아랍어 옵션).
- **실증**(라이브 HTTP 스모크 7/7): `/pack ar`→direction=rtl, `/next ar`→아랍 문자 서빙, `/placement/step ar`→plc.ar, `/pronounce q→k`→명료도 75%·정확 100%, `/tutor ar`→오교정 0·아랍어 격려. 게이트: 159 → **167 pass**(ar 6 + universality ar + ui bidi).

### 2026-07-05 (27) — 개방 데이터셋 카드 자동생성 (투명성 완결)
- **`core/open-dataset.datasetCard`**: OpenDatasetReport → Markdown 데이터 카드(요약·스키마·익명화 절차·k-익명성·한계·라이선스). 결정적(타임스탬프 없음). `OpenDatasetReport.typeBreakdown` 추가(릴리스 이벤트 종류별 개수 → 카드 스키마).
- **`scripts/export-dataset.mjs`**: 데이터셋(`*.jsonl`)과 함께 카드(`*-card.md`)를 **동시 기록** → "카드 없이 데이터 공개 금지"(oss-release-standards)를 코드로 강제.
- **실증**(라이브): export 시 두 파일 생성, 카드에 릴리스 수·억제 수·k-익명성 통과·이벤트 종류(item.response) 자동 반영. 게이트: 158 → **159 pass**(card 1).

### 2026-07-05 (26) — 마스터리 인증서 내보내기 (성취까지 소유)
- **`core/certifications.buildCertificate`**: 인증 can-do·레벨 진척·완주 레벨의 **결정적·포터블** 스냅샷(learnerRef·lang·issuedFromEvents 재현좌표). **타임스탬프 없음**(재현 가능·포터블). 규칙 6(데이터 소유는 성취 포함).
- **서버**: `handlers.exportCertificate` + `GET /account/certificate?learner=&lang=`.
- **웹**: 성취 섹션에 "🏅 인증서 내보내기" 버튼 → 인증서 JSON 다운로드(Blob). 학습자 소유.
- **실증**(라이브): 정답 반복→can-do 2개 인증서("핵심 기초 어휘를 인식한다" A1 99% 등)·레벨 진척 A1 2/5·재현좌표 fromEvents=8·타임스탬프 없음. 게이트: 157 → **158 pass**(cert-export 1 + web).

### 2026-07-05 (25) — 성조어(중국어 zh) — 다국어 범용 CJK·성조 재실증
- **`core/phonetics.toneScore`**: 음절별 성조 범주(1~4·경성) 정확 일치. 성조 오류=다른 단어라 명료도에 치명적(강세=위치와 별개 축).
- **어댑터**: `PronunciationRequest`에 `targetTones`/`producedTones`, 결과 `prosody.{stress,tone}`. 운율(강세·성조) 통합 — 성조 오류 시 명료도 ≤(0.55+0.45·성조점수)로 크게 손실.
- **`packs/zh`(데이터만)**: pack·kc-seed(tones·vocab·numbers·greetings)·content-seed(병음/한자 flashcard·mcq·성조 minimal_pair)·phonology(성조 대립쌍 mā/mǎ·성조 패턴 中国12·老师31·再见44)·placement. **코어 코드 0줄**.
- **패스스루 튜터**: `PassthroughTutor`(tutor.ts) — 언어별 규칙 없는 목표어는 오교정 없이 격려. `createTutorFor` en→영어·es→스페인어·그 외→패스스루.
- **웹**: 언어 전환기에 중국어 추가(zh-CN TTS·중국어 인사).
- **실증**(라이브): 같은 서버가 en·es·zh 처리. mǎ(3성)→mā(1성) 점수 70%·성조 0%·명료도 55%·힌트. 게이트: 150 → **157 pass**(tone 1 + pronunciation 1 + zh 5).

### 2026-07-05 (24) — 무인 진화 잡 (evolve → publish 자동)
- **`handlers.publishFromEvolve`**: 진화 사이클 산출(contentGeneration·readingGeneration items)을 게이트 재검사(중복 배제)하며 자동 발행. 통과분만 서빙 편입(규칙 4).
- **`scripts/evolve-publish.mjs`(`npm run evolve:publish`)**: 언어팩 로드 → 스토어 이벤트 수집 → `runEvolveCycle`(격차 분석·생성·커뮤니티 재평가) → `publishFromEvolve`. cron 운영. **멱등** — 격차 탐지·중복 배제에 발행분까지 포함해 채운 격차는 재생성 안 함.
- **안전판**: 코어 품질 게이트(규칙 4)가 불량 발행을 막고, 학습효과 강등(규칙 1)이 서빙을 정리 — 사람 개입 없이 안전.
- **실증**(라이브): 1회차 5격차→13문항+1지문 자동 발행, 2회차 격차 채워져 0 발행("새 격차 없음"). 게이트: 148 → **150 pass**(evolve-publish 2).

### 2026-07-05 (23) — 데이터셋 개방 파이프라인 (프라이버시 우선)
- **`core/open-dataset.ts`(언어 무관)**: `filterConsented`(learn+improve+open만) + `anonymizeEvents`(가명 재발급·자유텍스트[text·message·note·reason] 스크럽·시각 일단위) + `reidentificationRisk`(**k-익명성** — 준식별자 프로파일[KC수·이벤트수·시작월] 그룹 최소 크기<k면 실패·singleton 지목) + `buildOpenDataset`(동의필터→학습신호선별→singleton 억제→재검증→익명화, redteamPassed=false면 배포금지).
- **운영자 도구**: `scripts/export-dataset.mjs`(`npm run dataset:export`) — 데이터 로드→빌드→리포트, **레드팀 실패 시 파일 미기록**(프라이버시 우선). `/release --datasets`가 실제 레드팀 실행(기존 수동 경고 대체).
- **실증**(라이브): 원본 63 → 개방동의 62(learn 학습자 필터) → loner(고유 프로파일) 억제 → 릴리스 2학습자·2이벤트, k-익명성 통과, 출력 `d0001`·일단위 ts·텍스트 없음. 게이트: 143 → **148 pass**(open-dataset 5).

### 2026-07-05 (22) — 마스터리 인증 (동기 층, 다크패턴 없이)
- **`core/certifications.ts`**: `isCertified`(숙달≥0.85 & 반복≥3 — 증거 기반, 운 배제) + `deriveCertifications`(상태+그래프→인증·다음 후보·레벨 진척·완주 레벨, 결정적 파생). **손실공포·스트릭·강제 없음**(규칙 1·2·9) — 성취 인정·경로 개방만.
- **서버**: `handlers.certificatesFor` + `GET /certificates?learner=&lang=`.
- **웹**: 진척 패널에 **성취 섹션** — 레벨 진척 바(완주 시 🏅)·인증 can-do 목록("이제 할 수 있어요")·다음 후보("곧 인증", 격려). 다크패턴 게이트 통과.
- **실증**(라이브): 정답 4회→`kc.en.vocab.core` 인증(can-do "핵심 기초 어휘를 인식한다", 99%, reps 4), A1 1/5(20%), 다음 후보 "be동사 현재형". 게이트: 138 → **143 pass**(cert 4 + web 1).
- **마스터리 스택 7층 완성**: 입력·기억·산출·상호작용·발음·평가·**동기** 모두 사용자 접점까지.

### 2026-07-05 (21) — 발음 심화 (운율/강세)
- **`core/phonetics.ts`**: `stressScore(target, produced)` — 강세 패턴(음절별 강도) 일치. 주강세 위치(가중 0.7) + 음절별 강세 유무(0.3). 주강세 오류 시 크게 감점 + "N번째 음절에" 힌트.
- **`adapters/pronunciation.ts`**: `PronunciationRequest`에 `targetStress`/`producedStress`, 결과에 `prosody`. ASR 경로에서 강세 있으면 **종합 = 분절음 70% + 운율 30%**, 주강세 오류 시 명료도 ≤0.75로 손실.
- **음운 데이터**: `packs/{en,es}/phonology.json`에 shadow 강세(syllables·stress) + **prosody 섹션**(다음절 단어: en banana·computer·photograph·important / es español·música·teléfono).
- **웹**: 섀도잉에 운율 단어 로테이션 포함 + **강세 음절 강조 시각화**(큰 글자).
- **실증**(라이브): banana 올바른 강세 100%, 틀린 강세(BAnana) → 점수 73%·운율 10%·명료도 75%·"강세를 2번째 음절에". 게이트: 135 → **138 pass**.

### 2026-07-05 (20) — 생성 콘텐츠 서빙 편입 (플라이휠 완결)
- **`handlers`**: `publishContent`(코어 `checkItem` 통과분만 → `content.published` append-only, draft→verified) + `publishReading`(`validateReading` 통과분만 → `reading.published`, lang 태깅). 공용 로그 `PUBLISHED_REF="published"`.
- **서빙 합류**: `publishedBank(store, lang)`(발행 아이템 중 verified·**학습효과 미강등**만) + `publishedReadings(store, lang)`. `/next` 뱅크 = 시드 + 커뮤니티 + 발행, `/reading` = 시드 + 발행.
- **엔드포인트**: `POST /content`(문항)·`POST /content/reading`(지문) — 운영 도구/자동 잡이 진화 산출을 발행. `deleteLearner`가 published 삭제 거부(보호).
- **실증**(라이브): 고유 생성 문항 발행→새 학습자 /next 3→4 노출·중복은 dedup 반려, 생성 지문 발행→/reading 노출, 재시작 유지. **학습→데이터→생성→발행→노출→측정→강등 폐루프 완결**. 게이트: 130 → **135 pass**(publish 5).

### 2026-07-05 (19) — CAT 배치고사 UI (평가 층 완결)
- **`handlers.placementStep`**: 상태 없는 적응형 1스텝 — 클라이언트가 응답(itemId+선택)을 보내면 서버가 **채점**(정답은 서버만 보유, 치팅 방지)·`estimateAbility`로 θ 추정·`pickNextItem`으로 최대정보 다음 문항. 정지: SE<목표 또는 최대 문항. ⚠️all-correct/all-wrong MLE 발산 → θ **±3.5 클램프**(현실 IRT logit).
- **언어팩 배치 뱅크**: `packs/{en,es}/placement.json` — 난이도 스펙트럼(-1.8~+1.8) 문항. 서버 `getPack` 로드, `POST /placement/step`.
- **웹 레벨 탭**: 적응형 진행(문항 하나씩) → 추정 레벨(CEFR)·θ·SE → "이 레벨로 학습 시작"이 능력을 **`assessment.item`** 이벤트로 반영 → `deriveState`가 `ability.reading` 설정 → 읽기 i+1 시작점 이동.
- **실증**(라이브): 강함 B2(θ 3.50 클램프)·약함 A1(θ −3.50), 정답 미유출, strong ability.reading 반영 후 읽기 첫 지문 이동. es 뱅크 동일 동작(규칙 11). 게이트: 125 → **130 pass**(placement 4 + web 1).

### 2026-07-05 (18) — 스페인어 어댑터 (다국어 범용을 어댑터층까지)
- **`adapters/spanish-tutor.ts`**: `SpanishHeuristicTutor` + `correctEs`(오프라인·결정적 — ser 활용 일치 yo soy…, 정관사 성 일치 el/la). 스페인어 i+1 후속 질문.
- **`adapters/spanish-content.ts`**: `SpanishTemplateGenerator`(ser·gender·-ar·vocab 문항) + `SpanishReadingGenerator`(등급 지문, 시드와 다른 주제). 생성물은 코어 게이트/validateReading 통과분만(규칙 4).
- **언어별 레지스트리**(adapters/index): `createTutorFor(lang)`·`createContentGeneratorFor(lang)`·`createReadingGeneratorFor(lang)` — es는 스페인어, 그 외 en 폴백. `createDefault*`는 하위호환(en).
- **서버**: `tutorFor(lang)` 캐시로 언어별 튜터 라우팅(`POST /tutor?lang=es`). 웹 튜터 인사 언어별 + 언어 전환 시 재인사.
- **실증**(라이브): 같은 서버가 lang=es "Yo es profesor"→soy(스페인어 후속질문)·lang=en "he go home"→goes. adapters 6 테스트. 게이트: 119 → **125 pass**.

### 2026-07-05 (17) — 읽기 지문 자동생성 (입력 층 진화)
- **`adapters/reading-gen.ts`**: `ReadingGenerator` pluggable 인터페이스 + `EnglishReadingGenerator`(오프라인·결정적 — KC별 통제 어휘 템플릿으로 이해가능한 입력 지문 생성, 시드와 다른 주제) + `createDefaultReadingGenerator`. 생성물 라이선스 CC-BY-4.0.
- **`engine/reading.ts`**: `generateReadings`(읽기 격차 KC → 생성 → 코어 `validateReading` → 통과분만, id·본문 중복 제거, 미지원 스킵). 규칙 4.
- **`/evolve` 편입**: `EvolveInput.readingGenerator`·`readings` + 리포트 `readingGeneration`. 읽기 격차 = 문항 KC 중 지문 없는 것. 데모가 5축 생성/재평가 표시.
- **실증**: 데모 "My Neighbor"(A1, 사전 10단어) 등 2편 검증 통과. adapters 3 + engine reading 2 + evolve 1 테스트. 게이트: 113 → **119 pass**.

### 2026-07-05 (16) — 진화 폐루프 통합 (/evolve에 커뮤니티 재평가 편입)
- **`engine/evolve.ts`**: `EvolveInput.communityEvents` + `EvolutionCycleReport.community`(reviewed·healthy·demoted·topItem). 4단계로 커뮤니티 재평가 추가 — `communityEvents` 주입 시 `reevaluateCommunity`로 승격 기여를 학습효과 순 재랭킹·망가진 기여 강등.
- **`engine/community-effect.ts`**: `reevaluateCommunity`를 **신뢰가중** `evaluateCommunity` 기반으로 일치(원시 deriveContributions → 신뢰가중). 진화 사이클이 신뢰가중 승격 + 실효 강등을 함께 반영.
- **데모**(`npm run evolve:demo`): 커뮤니티 기여 2건(good·broken) + 사용 데이터 주입 → **4축 전부 표시**(캘리브·FSRS배포·생성 12·커뮤니티 강등 1). 최상위=com.good(학습효과순).
- **`/evolve` 커맨드**: 5단계(커뮤니티 재평가) 추가. 인간 축을 데이터 축이 다스린다(인기보다 학습효과).
- 게이트: 112 → **113 pass**(evolve community 1).

### 2026-07-05 (15) — 기여자 신뢰가중 (안티어뷰즈)
- **`core/community.ts`(언어 무관)**: `objectiveOutcome`(기여 진실 = 게이트+학습효과, 없으면 종결상태) + `computeTrust`(검토-진실 일치 이력, 신규는 사전분포 0.5로 수축=과신 금지) + `reviewerWeight`(0.5+정확도 → 신규 1.0·최고 1.5·최악 0.5) + `decideStatusWeighted`(가중 순 승인 ≥ 임계) + `applyTrustWeighting` + `evaluateCommunity`(원시 파생→신뢰도→가중 재판정).
- **순환 차단**: 신뢰를 **객관적 진실**(게이트 실패=bad·healthy=good·weak/too_hard=bad)에 앵커. 하위호환: 신규만이면 가중 1.0이라 원시 규칙과 동일(2표=승격).
- **서버**: `communityView`가 학습효과 + 신뢰가중을 한 번에 계산, `communityBank`·`listContributions`·`contributionLeaderboard`·`reviewContribution` 전부 경유. 웹 검토 큐에 신뢰가중 투명 안내(규칙 10).
- **실증**(라이브): 게이트 실패 6건을 승인해 저신뢰가 된 badA·badB의 2표 → 유효 기여 target_valid **in_review·서빙 제외**(밀어주기 방어), 신규 new1·new2 2표 → fresh_valid **accepted·서빙**(하위호환). 게이트: 109 → **112 pass**(trust 3).

### 2026-07-05 (14) — SQLite 백엔드 (규모화, 제로 의존 유지)
- **`packages/server/src/sqlite-store.ts`**: `openSqliteStore(dbPath)` — Node 24 **내장** `node:sqlite`(외부 드라이버 0). `events` 테이블 append-only(INSERT 전용) + WAL(동시 읽기) + `learner_ref` 인덱스. 재시작 시 `SELECT ... ORDER BY id`로 리플레이 복원, `syncCounterFrom`으로 id 충돌 방지.
- **인터페이스 뒤 교체(규칙 12)**: `Store`에 `close?` 훅 추가. `sink`=INSERT, `remove`=DELETE(학습자 삭제, 규칙 6). **핸들러·코어 코드 불변** — 파생 리플레이 모델 그대로.
- **서버**: `LL_DB` 지정 시 SQLite, 아니면 JSONL(기본, 하위호환). 우아한 종료(SIGINT/SIGTERM → store.close). 시작 로그에 백엔드 표시.
- **실증**(라이브): SQLite 서버 부팅→reps=3 기록(db 생성)→완전히 새 프로세스 재부팅→reps=3 복원. JSONL과 동일 계약(복원·삭제·id·커뮤니티 로그) 테스트. 게이트: 105 → **109 pass**(sqlite 4).
- ⚠️ node:sqlite는 실험 기능(stderr 경고), 플래그 없이 동작. 작업 세트는 메모리 EventLog(파생용)·내구성은 SQLite — 쿼리온디맨드 스트리밍은 향후.

### 2026-07-05 (13) — 학습효과 재랭킹 (두 진화 축 연결)
- **`core/content-effect.ts`(언어 무관)**: `itemEffects`(문항별 학습효과 = 바람직한 난이도 적합 + **점이연 변별도**[능력↔정오]) — ELO(`eloCalibrate`)로 학습자 능력 추정, 표본 부족은 판정 보류(규칙 3). health: healthy/too_easy/too_hard/weak/insufficient.
- **`community.ts`**: `rankByEffect`(효과 순, 데이터 없으면 동료검증 폴백=하이브리드) + `isDemoted`(충분한 데이터에서 weak/too_hard) + `servableCommunityItems`(강등분 서빙 제외).
- **`engine/community-effect.ts`**: `usageResponses`·`reevaluateCommunity`(승격 기여를 사용 데이터로 재평가 → 강등/재랭킹 리포트). **진화 루프 ↔ 커뮤니티 연결**.
- **서버**: `communityBank` 학습효과 강등 반영(`/next`에서 망가진 문항 제외), `aggregateResponses`(전 학습자 응답 집계), `GET /contributions?rank=effect`(효과 리더보드). 웹 기여 탭에 효과순 리더보드(health 배지·정답률).
- **실증**(라이브): 동료 승인 동일(둘 다 2표)인데 good(변별 +1.00, healthy, 0.94) vs broken(변별 −1.00, weak, 0.44) → 리더보드 good 상위 + **/next 서빙 good만·broken 강등 제외**. 게이트: 100 → **105 pass**(content-effect 2 + community-effect 2 + web 1).

### 2026-07-05 (12) — 커뮤니티 기여 (진화의 인간 축, 개방범용 축 완성)
- **`core/community.ts`(언어 무관)**: `moderationFlags`(스팸·인젝션 사전 스캔) + `makeSubmission`(제출=자동 게이트 checkItem+모더레이션, 규칙 4·14) + `decideStatus`(게이트실패→거부·차단플래그→거부·순승인≥2→승격·반려우세→거부) + `deriveContributions`(이벤트 리플레이 파생, 자가검토 무시=어뷰즈 방어) + `acceptedItems`(승격분 verified 서빙) + `rankContributions`(순승인 랭킹, 학습효과 재랭킹은 향후).
- **이벤트 타입**: `contribution.submitted`·`contribution.review`. 공용 로그(`COMMUNITY_REF="community"`)에 append-only, learnerRef 통일+ID는 payload(재시작 복원 안전).
- **서버**: `POST /contribute`(제출+게이트) · `POST /contribute/review`(동료검증) · `GET /contributions`(검토 큐·리더보드). `/next` 뱅크에 **승격 커뮤니티 콘텐츠 합류**(규칙 4 통과분만). `deleteLearner`가 community 삭제 거부(공용 로그 보호).
- **웹 기여 탭**: 제출 폼(게이트 결과 표시) + 검토 큐(승인/반려, 자기 기여 제외). 미검증 노출 금지·동료 검증 안내.
- **실증**(라이브): 유효 제출→검토중, 스팸→게이트 차단(모더레이션), 승인2→승격(verified 서빙), 재시작 복원, community 삭제 방어(deleted=false). 게이트: 89 → **100 pass**(community 6 + server-community 3 + web 1).

### 2026-07-05 (11) — 등급 리더 (이해가능한 입력 i+1, 마스터리 스택 입력 층)
- **`core/reading.ts`(언어 무관)**: `cefrFromAbility`(능력→CEFR) + `validateReading`(본문·라이선스·정답유효·KC 검증, 규칙 4·6) + `selectGradedReading`(i+1 선택: 현수준·한단계위 선호, 두 단계 위 배제, **결정적** 안정정렬).
- **언어팩 등급 지문**: `packs/{en,es}/reading.json` — en 3지문(A1·A1·A2)·es 2지문(A1), 클릭 사전 glossary·이해 확인 문항·전부 CC-BY-4.0.
- **서버**: `GET /reading?learner=&lang=`(=`handlers.serveReading`, 검증 통과분만). getPack이 reading도 로드.
- **웹 읽기 탭**: 단어 클릭→뜻+TTS+**어휘 노출 로깅**(`content.exposure`=진화 입력) + 이해 확인(item.response→숙달도) + "다 읽었어요". "단어 다 알 필요 없다"(이해가능한 입력) 안내, 다크패턴 없음.
- **버그 수정**: 웹 `logResponse`가 kc를 **문자열**로 보내 `deriveState`의 `for..of ev.kc`가 글자 단위로 순회·오염시키던 문제를 **배열**로 교정(발음 지각·읽기 이해확인 숙달도 정상화). 실증 reps=1 mastery=25%, KC 키 오염 없음.
- **실증**(라이브): 새 학습자 en 3지문(A1 우선)·es 2지문(A1), 단어 클릭 content.exposure 로깅, i+1 능력 상승 시 선택 이동. 게이트: 81 → **89 pass**(reading 5 + server-reading 3 + web 1).

### 2026-07-05 (10) — 발음 (Phase 3, 마스터리 스택 7층 완성)
- **`core/phonetics.ts`(언어 무관)**: IPA 음소→조음 자질(place·manner·voice / height·back·round) 표 + `featureDistance`(자질 가중, 혼동쌍은 가깝게) + Needleman–Wunsch 정렬 `scorePronunciation`(점수+**명료도**+음소별 오류) + `articulationHint`(조음 교정 지시). **명료도 우선**(규칙 1): 자질상 가까운 오류는 관대, 누락·큰 차이만 엄격.
- **`adapters/pronunciation.ts`(pluggable)**: `PronunciationScorer` + `LocalPhoneticScorer`(오프라인) — 전사 있으면 객관 채점, 없으면 섀도잉 자가평가 환산. `createDefaultPronunciationScorer`. **원음성 미수신**(전사/자가평가만, 규칙 6·8). 실제 ASR은 같은 인터페이스로 교체(규칙 12·13).
- **언어팩 음운 강화**: `packs/{en,es}/phonology.json`에 최소대립쌍 IPA·조음 힌트 + 섀도잉 타깃(단어·IPA·뜻). en 5대립/4섀도, es 3대립/4섀도.
- **서버**: `POST /pronounce`(=`handlers.scorePronunciation`, 특징만 `speak.attempt` append-only 로깅) + `GET /phonology`. getPack이 phonology도 로드.
- **웹 발음 탭**: 듣고구별(최소대립쌍, 브라우저 TTS 원음→택1→item.response 숙달도 갱신) + 따라말하기(섀도잉, TTS 원음→자가평가/선택적 SpeechRecognition→/pronounce). **목소리는 브라우저에서만, 서버 미전송** 명시. 다크패턴 없는 카피.
- **실증**(라이브): think→sink 99%·명료도 100%(θ→s 혼동 관대, 힌트 "혀를 더 앞쪽에서"), think→dʌg 49%·75%, 자가평가 self 80%, 로깅 payload에 audio 없음. 게이트: 71 → **81 pass**(phonetics 3 + pronunciation 3 + pronounce 3 + web 1).

### 2026-07-05 (9) — OSS 릴리스 준비 (Phase 5 스캐폴딩)
- **개방 프로젝트 문서**: `CONTRIBUTING.md`(제로설치 개발·기여 유형·절대규칙·PR/DCO)·`CODE_OF_CONDUCT.md`(Contributor Covenant, 한/영, 저자원 언어 우대)·`SECURITY.md`(자가호스팅 위협모델·비공개 제보·운영자 하드닝)·`CHANGELOG.md`(Keep a Changelog + Unreleased).
- **투명성 카드**(규칙 14·17): `docs/DATA_CARD.md`(수집 이벤트 스키마·가명성·소유권·개방셋 4단 게이트·재식별 위험)·`docs/MODEL_CARD.md`(FSRS·IRT·BKT·CAT·로컬튜터·생성기 = 용도·한계·편향·효능평가·pluggable).
- **self-host 가이드**: `docs/SELF_HOSTING.md`(원커맨드·환경변수·백업·API·언어추가). README 갱신(실행 섹션·구조·라이선스 상태·로드맵).
- **릴리스 준비도 실행기**: `scripts/release.mjs`(`npm run release`) = 게이트 그린 + 문서/카드 8종 + **시크릿 스캔**(고신뢰 패턴, 스캐너 자기제외) + **self-host 스모크**(실제 서버 app을 임시 data dir로 부팅→`/next` 검증→종료) + 라이선스 상태. **절대 push 안 함**(규칙 18). dry-run 결과: 차단 0, 라이선스만 ⏳.
- **라이선스 확정(오너 결정)**: 코어 코드·모델 = **MIT**(`LICENSE`), 콘텐츠(언어팩) = **CC-BY-4.0**(`packages/packs/LICENSE.md`), 개방 데이터셋 = CC-BY-4.0 + 동의 조건. 자산별 분리 명세 `LICENSES.md`. package.json `license: MIT`. README·데이터/모델 카드·CHANGELOG 확정 반영. `npm run release` **전 항목 그린 → 릴리스 준비 완료**(태그·push·공개는 '배포해' 승인 시, 규칙 18).

### 2026-07-05 (8) — 이벤트 영속 (JSONL 파일 스토어, MVP 완성)
- **`packages/server/src/persist.ts`**: `openFileStore(dir)` — 디렉터리 스캔으로 기존 `*.jsonl` 을 리플레이 복원, 이후 append(sink)·삭제(remove)를 파일에 반영. **학습자당 한 파일, 한 줄=한 이벤트, 파일도 append-only**(수정 없음, 삭제 시에만 파일 제거).
- **Store 배선**: `Store`에 `sink`/`remove` 훅 추가. `ingest`·`tutorTurn`은 append 시 파일에도 기록, `deleteLearner`는 파일까지 제거(규칙 6 소유권).
- **재시작 안전성**: `syncCounterFrom`으로 새 eventId 카운터를 복원분 최대 id 뒤로 밀어 **재시작 후 id 충돌 방지**(규칙 5 이력 무결성). learnerRef는 파일명이 아니라 이벤트에서 되읽어 안전 인코딩과 무관하게 정확 복원.
- **안전 파일명**: 경로 조작(`../`)·와일드카드 차단, 단사 인코딩(`_<hex>`).
- **서버 기본 영속 ON**: `LL_DATA_DIR`(기본 `data/events`, gitignore). `npm run serve`가 재시작해도 학습 유지.
- **실증**: 별도 프로세스 재시작 스모크 — 프로세스1 `reps=3 mastery=0.93` 기록 → 완전히 새 프로세스가 디스크에서 동일 복원. 게이트: 66 → **71 pass**(persist 5).

### 2026-07-05 (7) — 2번째 언어쌍 (다국어 범용 실증, 규칙 11)
- **`packs/es`(스페인어, 데이터만)**: 5 KC(ser·gender·-ar·어휘·rr음운) + 5 시드 콘텐츠(전부 게이트 통과·라이선스) + 음운.
- **서버 다중 언어팩**: `getPack(lang)` 캐시 로딩 — `/next?lang=es`·`/state?lang=es` 동작. **코어/서버/엔진 언어별 분기 0**.
- **웹 UI 언어 전환기**: 헤더에서 영어/스페인어 선택(localStorage 유지). 같은 UI, 다른 언어팩.
- **범용성 테스트**(`universality.test`): en·es 두 팩에 동일 코어 경로가 동일 동작(무결성+학습 파생) 검증.
- ⚠️ 코어 코드 **한 줄도 안 고침**. 게이트: 63 → **66 pass**.

### 2026-07-05 (6) — 콘텐츠 자동생성 (진화 루프 3축 완성)
- **`adapters/content-gen`**: `ContentGenerator` 인터페이스 + `EnglishTemplateGenerator`(오프라인·결정적 — 관사 a/an·3인칭 -s·be·어휘 렉시콘 조합). `createDefaultContentGenerator`. LLM 생성기 교체형(규칙 12·13).
- **`engine/content`**: `runNewContent`(생성→코어 품질게이트→verified 편입) + `generateForGaps`(격차 KC 자동 메움, 중복·미지원 스킵).
- **`/evolve` 3번째 축**: 생성기 주입 시 콘텐츠 격차를 자동 생성으로 메움. **게이트 통과분만 편입**(규칙 4). 데모: 격차 3KC → 12문항 생성·통과.
- 게이트: 54 → **63 pass**(content-gen 5 + content 3 + evolve 1).

### 2026-07-05 (5) — AI 튜터 (상호작용·산출 층)
- **`packages/adapters`**: `TutorModel` 인터페이스 + `withSafety`(인젝션 방어 데코레이터, 모든 모델 감쌈) + `LocalHeuristicTutor`(오프라인·결정적 교정 규칙: 관사 a/an·be일치·3인칭 -s·I 대문자) + `createDefaultTutor`(로컬 기본, 규칙 12·13).
- **교정 방식**: recast/explicit + 한국어 설명 + i+1 후속 질문(산출·상호작용 가설). 정문은 무수정(오교정 방지).
- **서버 `POST /tutor`**: `handlers.tutorTurn` — 대화+교정, **학습자·튜터 발화를 append-only `tutor.turn` 이벤트로 로깅**(진화 루프 입력), pluggable 모델 주입.
- **웹 UI**: 학습/튜터 **탭 전환** + 채팅(교정 칩 표시). 다크패턴 없는 카피.
- 게이트: 46 → **54 pass**(어댑터 5 + 서버 튜터 3).

### 2026-07-05 (4) — 학습 웹 UI (전 경로 관통)
- **`packages/web`(제로 의존 브라우저 앱)**: index.html·app.js·style.css. 기존 `packages/server`가 정적 서빙(`/`·`/app.js`·`/style.css`) + API.
- **학습 모드**: 플래시카드(자가채점)·클로즈(입력)·MCQ·최소대립쌍. 문항 풀이 → `POST /events`(append-only) → 상태·숙달도 갱신.
- **투명성(규칙 10)**: "왜 지금?"(KC·복습/신규·숙달도) + 숙달도 바. **다크패턴 없음(규칙 9)**: 스트릭·재촉·손실공포 카피 부재(게이트가 UI 3파일 스캔).
- **데이터 소유권(규칙 6)**: 내보내기·삭제 버튼.
- 게이트: 42 → **46 pass**. 실행 `npm run serve` → http://localhost:8787.

### 2026-07-05 (3) — Phase 2: 진화 워커 (자기개선 폐루프)
- **`packages/engine`(7모듈)**: sequences·fsrs-optimize·analyze·calibrate·experiment·evolve·synthetic.
- **자기개선 실증**: 복습 로그에서 FSRS 파라미터 재적합 → **held-out 예측오차 0.41→0.32**(과적합 아님).
- **가드레일=학습성과(규칙 1)**: A/B 채택은 ①리텐션 개선 또는 ②효율↑(동일 성과·복습 절감=TTM 단축)만. **복습만 늘리는 다크패턴은 알고리즘 레벨에서 반려**.
- **`/evolve` 오케스트레이터**: 분석(격차·저성과·미캘리브레이션)→제안→A/B 검증→배포/롤백→Loop Velocity. 데모 스크립트 포함.
- 게이트: 35 → **42 pass**. FSRS 파라미터화(하위호환, 기존 27 무회귀).

### 2026-07-05 (2) — Phase 1 엔진 코어 + 데이터 백엔드 (게이트 그린)
- 아키텍처 확정 · `packages/core`(9모듈) · `packages/server`(verified만 서빙·append-only·소유권) · en/ko 시드팩 · `scripts/gate.mjs`(35 pass).

### 2026-07-05 (1) — 하네스 초기 구축
- `lingua-loop/` · 5문서 + 22 에이전트 + 18 스킬 + 7 커맨드 · 정체성/마스터리 스택/진화 루프 확정.

## 다음 액션 (우선순위)

0. **[사용자 승인 대기] 공개 배포** — 라이선스 확정·준비도 그린. '배포해' 시 git init·태그·push·공개(규칙 18). *현재 리포는 git 미초기화.*
1. **추이 시각화 심화(스파크라인)** — ops 대시보드가 스냅샷 시퀀스를 꺾은선/스파크라인으로(현재 첫↔최신 델타만).
2. **문법 스킬 읽기 지문 연결** — 읽기 지문 KC에 문법 KC를 더 엮어 읽기 채점이 문법 숙달에도 기여(현재 주로 vocab.core).
3. **[승인 필요] 공개 배포** — '배포해' 시 git init·태그·push (OSS 릴리스 준비 그린).
