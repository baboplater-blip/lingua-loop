# 자가호스팅 가이드 (Self-Hosting)

> 규칙 13: **외부 상용 서비스 없이 원커맨드로 부팅.** LinguaLoop는 Node.js 하나만 있으면 당신의 기기·서버에서 완전히 돕니다. 외부 API 키·클라우드 계정·빌드 파이프라인이 필요 없습니다.

## 1. 요구사항

- **Node.js 24 이상** (그게 전부입니다). `.ts` 파일을 타입 스트리핑으로 직접 실행하므로 트랜스파일·번들·`node_modules`가 없습니다.

```bash
node --version   # v24.x 이상 확인
```

## 2. 원커맨드 실행

```bash
npm run serve
# → LinguaLoop server (lang=en) → http://localhost:8787  ·  data=<repo>/data/events
```

브라우저로 `http://localhost:8787`을 열면 학습 웹앱이 뜹니다(학습 탭 + AI 튜터 탭 + 배우는-언어 전환기). 서버는 학습 이벤트를 수집하고, 상태를 파생하며, verified 콘텐츠만 서빙합니다.

## 3. 설정 (환경변수)

| 변수 | 기본값 | 설명 |
|---|---|---|
| `PORT` | `8787` | HTTP 포트 |
| `LANG_PACK` | `en` | 기본 목표어 언어팩(예: `es`) |
| `LL_DATA_DIR` | `<repo>/data/events` | **이벤트 영속 디렉터리**(JSONL 백엔드, 기본). 재시작해도 학습이 유지됩니다 |
| `LL_DB` | (없음) | 지정 시 **SQLite 백엔드**(단일 파일, 대규모·동시성). 예: `data/lingualoop.sqlite` |

```bash
# JSONL(기본, 소규모·단순)
PORT=9000 LANG_PACK=es LL_DATA_DIR=/var/lib/lingualoop npm run serve
# SQLite(대규모·동시성, 여전히 자가호스팅·제로 의존)
LL_DB=/var/lib/lingualoop/ll.sqlite npm run serve
```

## 4. 데이터·백업

두 영속 백엔드 모두 **제로 의존·자가호스팅**이며 인터페이스가 동일합니다(규칙 12). 재시작 시 이벤트를 리플레이해 상태를 복원합니다.

- **JSONL**(기본): 학습자당 한 파일 `LL_DATA_DIR/<가명>.jsonl`(한 줄 = 한 이벤트, append-only). 백업 = 디렉터리 복사. 소규모·단순·사람이 읽기 쉬움.
- **SQLite**(`LL_DB`): 단일 ACID 파일 + WAL(동시 읽기) + 학습자 인덱스. Node 24 내장 `node:sqlite`(외부 드라이버 0). 백업 = `.sqlite` 파일 복사(운영 중이면 `VACUUM INTO`). 다수 동시 사용자·대규모에 권장.
- 두 경우 모두 `data/`는 기본 `.gitignore`되어 학습자 데이터가 커밋되지 않습니다(규칙 6·7). 디스크 접근을 제한·암호화하세요([`SECURITY.md`](../SECURITY.md)).

## 5. API (데이터 백엔드)

| 메서드·경로 | 하는 일 |
|---|---|
| `POST /events` | 학습 이벤트 수집(append-only) |
| `GET /next?learner=&lang=` | 다음 학습/복습 문항(verified만) |
| `GET /state?learner=&lang=` | 파생된 학습자 상태(숙달도·능력) |
| `GET /review?learner=&lang=` | 복습 대상 KC 큐 |
| `GET /certificates?learner=&lang=` | 마스터리 인증(can-do)·레벨 진척·다음 후보 |
| `GET /badges?learner=&lang=` | 배지(학습 인증·기여 수용·학습효과·검토 신뢰) — 증거 기반 티어. 검토 배지는 정확도 자격 필요 |
| `GET /profile?learner=&lang=` | 프로필 카드 — 인증·배지·누적 학습량(응답·정확도·튜터·기여). 결정적·포터블, 스트릭 없음 |
| `POST /tutor` | AI 튜터 한 턴(대화 + 교정) |
| `POST /placement/step?lang=` | 적응형 배치고사 1스텝(서버 채점·능력추정·다음 문항). 정답 미유출 |
| `POST /content` | 생성/큐레이션 문항 발행(게이트 통과분만 서빙 편입, 규칙 4) |
| `POST /content/reading` | 생성/큐레이션 읽기 지문 발행(검증 통과분만) |
| `GET /reading?learner=&lang=` | 등급 읽기 지문(이해가능한 입력 i+1, 클릭 사전) |
| `GET /pack?lang=` | 언어팩 메타 — 표기 방향(`direction: ltr\|rtl`)·이름·문자. 웹이 방향·로케일에 사용(방향은 데이터가 결정) |
| `GET /i18n?ui=` | UI 로케일(화면 언어) 문자열. 배우는 언어와 독립. 미지원은 ko 폴백. 웹 `data-i18n`/`t()`가 사용 |
| `GET /phonology?lang=` | 발음 데이터(최소대립쌍·섀도잉 IPA) |
| `POST /pronounce` | 발음 채점(전사=객관 채점 / 자가평가) — **원음성 미수신**, 특징만 로깅 |
| `POST /contribute` | 콘텐츠 기여 제출(자동 품질 게이트 + 모더레이션, 규칙 4·14) |
| `POST /contribute/review` | 기여 동료 검증(승인/반려/플래그) |
| `GET /contributions?status=&lang=&rank=` | 기여 목록·검토 큐. `rank=effect`면 학습효과 재랭킹 리더보드 |
| `GET /account/export?learner=` | 내 데이터 내보내기(소유권) |
| `GET /account/certificate?learner=&lang=` | 내 마스터리 인증서(can-do·레벨) 내보내기(소유권) |
| `DELETE /account?learner=` | 내 데이터 영구 삭제(소유권) |

## 6. 새 언어 추가 (코드 0줄)

`packages/packs/<lang>/`에 데이터 파일(`pack.json`·`kc-seed.json`·`content-seed.json`·`phonology.json`, 선택: `placement.json`·`reading.json`)만 추가하면 같은 코어·서버가 그 언어를 서빙합니다(규칙 11). 형식은 [`language-pack-format`](../.claude/skills/language-pack-format/SKILL.md)와 [`CONTRIBUTING.md`](../CONTRIBUTING.md) 참고. 로드 후 `?lang=<lang>`으로 사용.

**표기 방향(RTL 포함)도 데이터가 결정합니다.** `pack.json`의 `direction`을 `"rtl"`(아랍어·히브리어 등)/`"ltr"`(기본)로 지정하면 `GET /pack`이 이를 노출하고, 웹은 콘텐츠 요소의 `dir="auto"`(유니코드 bidi)로 자동 배치합니다 — 코어/서버/UI 코드는 방향을 하드코딩하지 않습니다. 실증 언어팩: `en`(목표)/`ko`(UI)·`es`·`zh`(CJK·성조)·`ar`(RTL·아랍 문자)·`sw`(스와힐리·반투어·저자원 파일럿).

**화면(UI) 언어도 데이터입니다(학습 언어와 독립).** `packs/<uiLang>/i18n.json`의 `strings`(키→문자열)를 추가하면 `GET /i18n?ui=<uiLang>`이 서빙하고 웹 화면 언어 선택기에 노출됩니다. 기존 로케일과 **키 집합을 동일하게** 유지하세요(누락 키는 게이트가 잡습니다). 튜터 교정 설명 언어(`explainLang`)도 화면 언어를 따릅니다. 현재 로케일: `ko`·`en`.

## 7. 건강 점검

```bash
npm run gate          # 문서 + 다크패턴 안티 + 전체 테스트가 그린인지
node scripts/release.mjs   # 릴리스 준비도(게이트·시크릿 스캔·self-host 스모크·카드·라이선스 상태)
```

## 8. 운영 잡 (선택, cron)

무인 진화·개방 데이터를 주기 실행할 수 있습니다(모두 자가호스팅·안전판 내장):

```bash
npm run evolve:all       # 배포된 모든 타깃 언어에 진화 1사이클(격차 분석 → 생성 → 게이트 → 자동 발행). 멱등.
npm run evolve:publish   # 한 언어만(LANG_PACK). evolve:all 은 이걸 언어별로 순차 실행.
npm run dataset:export   # 개방 데이터셋: 동의 필터 → 익명화 → 재식별 레드팀 → JSONL(실패 시 미기록)
```

- `evolve:*`는 품질 게이트(규칙 4)를 통과한 생성물만 발행하고, 이후 학습효과로 자동 강등(규칙 1)됩니다 — 사람 개입 없이 안전하게 콘텐츠가 늡니다.
- ⚠️ cron/스케줄러는 서버와 **같은 스토어**(`LL_DB`/`LL_DATA_DIR`)를 가리켜야 같은 이벤트를 봅니다.
- **주기·출력 읽는 법·cron·롤백**은 운영 런북 [`OPERATING.md`](OPERATING.md) 참고.

## 9. 외부 LLM을 붙이고 싶다면 (선택)

기본 튜터·생성기는 오프라인 로컬입니다. 더 강한 튜터를 원하면 `packages/adapters`의 `TutorModel`/`ContentGenerator` 인터페이스를 구현해 교체하세요. 이때도 **오프라인 기본을 유지**하고(규칙 13), `withSafety` 인젝션 방어를 우회하지 마세요. 키는 환경변수로만 두고 절대 커밋하지 마세요(규칙 19).
