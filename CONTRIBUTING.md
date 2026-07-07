# 기여 가이드 (Contributing to LinguaLoop)

> **EN:** Thanks for helping teach the world's languages. This project's north star is **learner outcomes, not engagement**. Contributions that inflate streaks/time-on-app at the cost of measured learning will be declined — see [`rules.md`](rules.md).
> **한국어:** LinguaLoop는 *데이터로 끝없이 진화해 인간을 원어민 수준까지 끌어올리는* 오픈소스 언어 마스터리 엔진입니다. 이 프로젝트의 유일한 기준은 **실측 학습성과**입니다(참여도·체류시간 아님).

---

## 0. 먼저 읽어주세요

- [`goal.md`](goal.md) — 무엇을·왜
- [`rules.md`](rules.md) — **절대 규칙(불변식).** 모든 기여는 이걸 어기면 반려됩니다.
- [`CLAUDE.md`](CLAUDE.md) — 아키텍처·마스터리 스택·진화 루프 개관
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) · [`docs/SELF_HOSTING.md`](docs/SELF_HOSTING.md)

## 1. 개발 환경 (제로 설치)

**요구사항: Node.js 24+ 하나뿐.** 외부 의존성·빌드 스텝·트랜스파일러 없음(규칙 13 자가호스팅).

```bash
node --version          # v24 이상 (타입 스트리핑으로 .ts 직접 실행)
npm run serve           # http://localhost:8787  학습 웹앱 + 데이터 백엔드
npm run gate            # 완료 판정 게이트(문서 + 다크패턴 안티 + 전체 테스트)
npm test                # 테스트만
npm run evolve:demo     # 진화 루프 1사이클 데모
```

> TypeScript는 **erasable(타입 지우기)** 만 씁니다 — `enum`·파라미터 프로퍼티(`constructor(private x)`)·`namespace` **금지**, 임포트는 `.ts` 확장자 명시. 코어 private 필드는 `#field` 사용.

## 2. 무엇을 기여할 수 있나

| 유형 | 방법 | 게이트 |
|---|---|---|
| **언어팩**(새 목표어) | `packages/packs/<lang>/`에 데이터만 추가([`language-pack-format`](.claude/skills/language-pack-format/SKILL.md)) — **코어 코드 0줄**(규칙 11) | 콘텐츠 품질 게이트 |
| **콘텐츠**(문항·지문) | `content-seed.json`에 추가 → `promoteVerified` 통과분만 노출(규칙 4·6) | 정확성·정답유효성·중복 |
| **코어/엔진** | `packages/core`·`engine`(언어 무관 알고리즘) | 효능 우선 검증(규칙 7) |
| **어댑터**(튜터·생성기) | `packages/adapters` — pluggable 인터페이스 구현, 로컬 기본 유지(규칙 12·13) | 인젝션 방어·오프라인 동작 |

기여 심사·랭킹·동료검증 흐름은 [`community-contribution-workflow`](.claude/skills/community-contribution-workflow/SKILL.md)를 따릅니다.

## 2.5 처음 기여하기 (First contribution)

1. **이슈부터** — [이슈 템플릿](.github/ISSUE_TEMPLATE)으로 버그(🐛)·언어팩(🌍)·콘텐츠/기능(💡)을 여세요. 질문·설계 논의는 이슈가 아니라 [Discussions](https://github.com/baboplater-blip/lingua-loop/discussions).
2. **쉬운 것부터** — [`good first issue`](https://github.com/baboplater-blip/lingua-loop/labels/good%20first%20issue) 라벨이 붙은 이슈가 진입점입니다. 그중 **언어팩 기여**(🌍)는 코어 코드 0줄로 시작할 수 있어 가장 추천합니다(규칙 11).
3. **흐름** — 이슈 → (필요시 Discussions 합의) → 작은 PR → **CI 게이트 자동 검증**(모든 push/PR에 `npm run gate`) → 리뷰 → 머지.

**라벨 taxonomy**: `bug` · `enhancement` · `language-pack` · `good first issue` · `content` · `core` · `docs` · `help wanted`. 영역 라벨(core/server/web/packs/adapters/evolution)로 관심 분야를 필터하세요.

## 3. 절대 지켜야 할 것 (요약)

1. **성과가 진실** — 학습성과(TTM·Gain·리텐션)를 개선하는가? 참여도 지표만 올리는 변경은 반려.
2. **다크패턴 금지** — 손실공포·강제 알림·죄책감 유발 카피/로직 금지(게이트가 UI 카피를 스캔).
3. **이벤트는 append-only** — 이력을 수정/삭제하지 않는다. 상태는 리플레이로 파생.
4. **학습자 데이터는 학습자 소유** — 내보내기·삭제 보장, PII 개방 금지.
5. **미검증 콘텐츠 노출 금지** — 품질 게이트 통과분만.
6. **자가호스팅 유지** — 외부 상용 서비스에 대한 필수 종속을 넣지 않는다.

## 4. PR 절차

1. 브랜치를 파고 변경합니다(작고 초점 있는 PR 선호).
2. `npm run gate`가 **그린**이어야 합니다(레드 PR은 병합 불가, 규칙 15).
3. 새 학습 기능은 **"동작"이 아니라 "성과에 이롭다"** 를 보이는 근거/테스트를 포함합니다(규칙 7 효능 우선).
4. 커밋에 `Signed-off-by`(DCO)를 넣어 기여 원저작권·라이선스 동의를 표시합니다.
5. 스키마를 바꾸면 마이그레이션 + 하위호환을 함께 제출합니다(규칙 16).

## 5. 행동 강령

모든 참여는 [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md)를 따릅니다. 저자원 언어·비영어 화자 기여를 우대합니다.

## 6. 보안·프라이버시

취약점은 이슈가 아니라 [`SECURITY.md`](SECURITY.md) 절차로 비공개 제보해주세요. 학습자 PII가 섞인 데이터는 절대 PR/이슈에 붙이지 마세요.
