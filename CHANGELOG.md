# CHANGELOG

이 프로젝트는 [Keep a Changelog](https://keepachangelog.com/) 형식과 [Semantic Versioning](https://semver.org/)을 따릅니다.
스키마 변경은 마이그레이션 + 하위호환을 동반합니다(규칙 16). 상세 개발 로그는 [`status.md`](status.md).

## [1.0.0] - Unreleased (배포 승인 대기)

0.1.0 공개 이후 **적대적 디버깅 스윕 + 효능 파이프라인**으로 안정화한 첫 메이저. 태그·push·공개는 오너의 '배포해' 명시 승인 시(규칙 18). 코어 API 일부 변경(아래 Changed)이 있어 semver 상 메이저.

### Security

- **콘텐츠 품질 게이트 우회 차단(규칙 4)** — 공개 `POST /events`(ingest)가 예약 시스템 로그(`community`/`published`/`efficacy`)나 시스템 전용 이벤트 타입을 위조해 쓸 수 있던 경로를 차단. 미검증 콘텐츠가 전 학습자에게 서빙되거나 커뮤니티 gatePass가 위조되던 결함 해소. `recordEfficacy`는 전용 append 경로로 이동.
- **저장형 XSS 차단** — 웹 클라이언트가 커뮤니티 기여·읽기 콘텐츠·기여자 ref를 이스케이프 없이 `innerHTML`에 삽입하던 것을 `esc()` 전면 적용으로 차단.
- **어뷰즈·무결성** — 커뮤니티 동일 검토자 중복투표 차단(1인 1표·Sybil 완화), efficacy 로그 개인 삭제 보호, 요청 본문 512KB 상한(413). 인젝션 방어(`withSafety`)를 정규화(전각·제로폭·구두점) 후 매칭으로 강화하고 message+task+history 전체 검사, 역할극 오탐 제거.
- **위협 모델 문서화** — `SECURITY.md`에 인증/IDOR·다중 사용자 배포 요건 명문화(learnerRef는 능력 시크릿, 공개 다중 사용자는 프록시 인증 필수).

### Added

- **Gain Score 효능 파이프라인(북스타·goal.md §3)** — `computeGainScore`: 사전(배치)→사후(재평가) 능력 상승과 관측 효과크기(Cohen's d). `/efficacy`·ops 대시보드·CLI에 노출하되 인과 주의(규칙 17) 병기. 합성 코호트로 측정 가능성 검증(학습군 d≥0.4>통제군).
- **읽기 상위 문법 태깅·주제 다양화** — 생성 지문 B1/B2에 본문 근거 있는 상위 문법 KC만 크레딧(`upperGrammarKcs`, 규칙 4). 생성기 주제 변형 옵트인(`topics()`·`includeTopics`). 읽기 채점이 어휘+문법 숙달에 함께 기여(비라틴 5개 언어 A2 문법 KC 신설).
- **효능 시계열 추이 시각화** — ops 대시보드 스냅샷 시퀀스 SVG 스파크라인(제로 의존).
- **기여 인프라·온보딩** — 이슈/PR 템플릿·라벨·good first issue, `docs/ADD_LANGUAGE.md`(새 언어팩 단계별 가이드), README 배지·빠른시작, GitHub Actions CI(게이트).
- **문서** — `docs/KNOWN_LIMITATIONS.md`(오프라인 튜터 다절 한계 등 정직 기록), `docs/design/final-completion.md`(v1.0.0 로드맵).

### Changed

- **placement `estimateAbility`** — θ 클램프(±3.5)를 서버에서 코어로 이전, `se` 반환 타입이 `number | null`(정보 부족/검열 시 null). `CatResult.se`도 nullable.
- **`EfficacySnapshot`** — `gainEffectSize`·`gainN` 필드 추가(추이에 Gain Score 편입).
- **이벤트 불변화** — `makeEvent`/`EventLog.append`가 `kc` 배열·`payload`까지 깊게 동결(얕은 freeze 결함 수정, 규칙 5).

### Fixed

- **데이터 무결·내결함** — 비배열 `kc` 거부(영구 오염·DoS 방지)+한 이벤트 내 KC 중복제거, 파싱 불가 `ts` 가드, 잘린 JSONL 마지막 줄로 인한 부팅 크래시 자가복구(원자적 재기록).
- **학습 모델 수학** — BKT 최초 오답이 숙달을 올리던 퇴화 보정(첫정답 0.25·2정답 0.70 불변), FSRS 음수 경과일 클램프, `validateReading` CEFR 레벨 검증, calibration 이상 문항 승격 제외, content-effect difficultyFit 방향 대칭(too_easy 부당 우대 제거).
- **크래시 가드** — `stressScore`(누락 산출)·발음 스코어러(누락 targetIPA)·placement(비배열 responses·비문자열 choice)·튜터(비배열 history).
- **CJK 산출 정답** — 클릭 사전용 공백이 든 CJK 정답을 붙여쓴 자연 표기로 입력해도 정답 인정.

---

## [0.1.0] - 2026-07-08

첫 OSS 공개 릴리스 — <https://github.com/baboplater-blip/lingua-loop> (MIT + CC-BY-4.0). 7개 목표어(en·es·zh·ar·sw·ja·hi, A1~B2)·무인 진화 폐루프·북스타 효능 대시보드·읽기(복수/주관식/산출)·발음·전용 튜터 7종.

### Added

- **이벤트 영속(JSONL 파일 스토어)** — `openFileStore(dir)`: 학습자당 한 파일, 파일도 append-only, 재시작 리플레이 복원. **SQLite 백엔드**(`LL_DB`, node:sqlite 내장)도 선택.
- **마스터리 스택 7층** — 이해가능한 입력(등급 리더 i+1)·간격반복(FSRS)·산출/교정·AI 튜터(7개 언어 전용)·발음(음성학 채점)·평가(CAT 배치)·동기(인증·배지, 다크패턴 없이).
- **다국어 범용** — `packs/*`(데이터만)로 7개 언어·문자 패러다임 5종(라틴·CJK·RTL·가나+한자·데바나가리), UI 로케일 5종. 코어/서버 언어 분기 0(규칙 11).
- **진화 폐루프** — 분석·IRT 캘리브레이션·FSRS 재적합·A/B·콘텐츠/읽기 자동생성·커뮤니티 재평가·무인 발행 잡(`evolve:publish`/`evolve:all`). 가드레일=학습성과(규칙 1).
- **효능 대시보드** — TTM·Retention·Coverage·Content Health(운영자용, 참여도 미노출)·시계열 추이. 웹(`ops.html`)·CLI(`npm run efficacy`).
- **커뮤니티 기여** — 제출→게이트→동료검증(신뢰가중 안티어뷰즈)→학습효과 재랭킹→서빙.
- **OSS** — README(한/영)·CONTRIBUTING·CoC·SECURITY·데이터/모델 카드·self-host 가이드·운영 런북·릴리스 체크리스트.

### Decided

- **라이선스** — 코어 코드·모델 = **MIT**, 콘텐츠(언어팩) = **CC-BY-4.0**, 개방 데이터셋 = CC-BY-4.0 + 동의 조건([`LICENSES.md`](LICENSES.md)).

---

_상세 개발 로그는 [`status.md`](status.md). 버전 태그·공개는 오너의 배포 승인('배포해') 후 부여됩니다(규칙 18)._
