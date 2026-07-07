# LinguaLoop

> **데이터로 끝없이 진화하는 오픈소스 언어 마스터리 엔진.**
> An open-source, self-evolving language-mastery engine that takes a learner from zero to native-like fluency — and gets better at teaching the more it's used.

LinguaLoop is not another flashcard app. Its single purpose is to **actually bring a human to native-level mastery** of a language, using *every effective method* — comprehensible input, adaptive spaced repetition, output & correction, an AI immersion tutor, pronunciation shadowing, and community content. Every interaction becomes data, and that data continuously recalibrates the content, the review schedule, the learning path, and the pedagogy itself. It is **language-agnostic** (languages are data-only *language packs*), runs as a **web app + data backend**, and is **self-hostable open source**.

## 왜 다른가 (Why it's different)

- 🎯 **성과가 진실 (Outcomes, not engagement)** — 최적화 목표는 체류시간·스트릭이 아니라 **실측 학습성과**(Time-to-Mastery, Gain Score, 리텐션). 다크패턴은 규칙으로 금지된다.
- ♾️ **끝없는 진화 (Closed-loop evolution)** — 수집된 학습 데이터가 문항 난이도(IRT), 복습 간격(FSRS), 콘텐츠 생성, 커리큘럼을 자동 개선한다.
- 🌍 **다국어 범용 (Universal)** — 코어는 언어 무관. 새 언어는 코드가 아니라 데이터(언어팩)로 추가한다.
- 🔓 **개방·이동성 (Open & portable)** — 자가호스팅 가능, 학습자 데이터는 학습자 소유(내보내기·삭제), 모델은 교체 가능.

## 프로젝트 구조

이 저장소는 **Claude Code 하네스** 로 운영된다(문서 기반 자율 개발).

```
lingua-loop/
├── goal.md · plan.md · status.md · rules.md · test.md   # 5문서 운영 스파인
├── CLAUDE.md                                            # 하네스 운영 브리프(로스터·마스터리 스택·진화 루프)
├── README · CONTRIBUTING · CODE_OF_CONDUCT · SECURITY · CHANGELOG   # 개방 프로젝트 문서
├── packages/       # core·server·engine·adapters·packs·web (제로 의존 모노레포)
├── docs/           # ARCHITECTURE · DATA_CARD · MODEL_CARD · SELF_HOSTING · OPERATING(운영 루프 런북)
├── scripts/        # gate.mjs · release.mjs · evolve-all/publish · export-dataset · efficacy(북스타 지표)
└── .claude/
    ├── agents/     # 22 전문 에이전트
    ├── skills/     # 18 재사용 프로토콜·스펙(SSOT)
    └── commands/   # 7 워크플로우 커맨드
```

## 실행 (자가호스팅)

**Node.js 24 하나면 됩니다** — 외부 API·빌드·`node_modules` 없음(규칙 13).

```bash
npm run serve     # http://localhost:8787  학습 웹앱 + 데이터 백엔드 (재시작해도 학습 유지)
npm run gate      # 완료 판정(문서 + 다크패턴 안티 + 전체 테스트)
npm run release   # 릴리스 준비도(게이트·시크릿·self-host 스모크·카드·라이선스)
```

자세히: [`docs/SELF_HOSTING.md`](docs/SELF_HOSTING.md) · 운영 루프: [`docs/OPERATING.md`](docs/OPERATING.md) · 기여: [`CONTRIBUTING.md`](CONTRIBUTING.md) · 투명성: [`docs/DATA_CARD.md`](docs/DATA_CARD.md) · [`docs/MODEL_CARD.md`](docs/MODEL_CARD.md).

## 시작 (개발자)

1. **읽기**: [`CLAUDE.md`](CLAUDE.md) → [`goal.md`](goal.md) → [`plan.md`](plan.md).
2. **불변식**: [`rules.md`](rules.md) 는 절대 규칙. [`test.md`](test.md) 는 완료 기준.
3. **다음 액션**: [`status.md`](status.md) 의 현 Phase 다음 액션부터.

## 로드맵 (요약)

Phase 0 하네스 ✅ → 1 마스터리 스택 MVP ✅(영속 포함) → 2 진화 루프 ✅ → 3 몰입·튜터 🟡(발음 남음) → 4 다국어 확장 ✅ → 5 OSS 공개 ✅(문서·카드·라이선스 확정, 배포 승인 대기) → 6 운영·효능 연구. 상세: [`plan.md`](plan.md) · [`status.md`](status.md).

## 라이선스

자산 유형별 **분리 라이선스**(규칙 14):

- **코어 코드 · 모델(알고리즘 파라미터) — [MIT](LICENSE)**: 관용적으로 열어 자가호스팅·개작·상용 이용을 보장(규칙 13).
- **콘텐츠(언어팩 데이터) — [CC-BY-4.0](packages/packs/LICENSE.md)**: 출처 표시만으로 자유 재사용·번안.
- **개방 데이터셋(배포 시) — CC-BY-4.0 + 동의 조건**: 익명화·재식별 레드팀 통과분만([`docs/DATA_CARD.md`](docs/DATA_CARD.md)).

전체 명세: [`LICENSES.md`](LICENSES.md). 공개 배포(태그·push)는 오너의 명시 승인 시에만 진행(규칙 18).
