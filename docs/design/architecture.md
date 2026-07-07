# 설계 확정 — 아키텍처·스택·데이터모델 (learning-architect)

> Phase 0 마무리 확정본. [ARCHITECTURE.md](../ARCHITECTURE.md)(개요)의 열린 결정을 여기서 못박는다.
> SSOT: [`web-app-stack`](../../.claude/skills/web-app-stack/SKILL.md) · [`content-item-schema`](../../.claude/skills/content-item-schema/SKILL.md) · [`telemetry-event-schema`](../../.claude/skills/telemetry-event-schema/SKILL.md) · [`learner-model-spec`](../../.claude/skills/learner-model-spec/SKILL.md).

## 1. 확정된 결정

| 결정 | 확정 | 근거 |
|---|---|---|
| **언어·런타임** | **TypeScript, 무설치 실행**(Node 24 타입 스트리핑) | 규칙 13 자가호스팅 — 빌드/의존성 없이 `node x.ts` 로 구동. 학습 코어를 즉시 검증 가능. |
| **테스트** | **`node:test` 내장 러너** | 제로 의존성. 게이트가 외부 툴 없이 돈다. |
| **코어** | `packages/core` — 프레임워크·언어 무관 순수 TS | 규칙 11(언어 무관)·12(pluggable). FSRS·KC그래프·학습자모델·캘리브레이션·평가·품질게이트. |
| **데이터 스토어** | **append-only JSONL 이벤트 로그**(MVP 자가호스팅) → SQLite → Postgres(스케일) | 규칙 5(append-only). 제로 의존성으로 시작, 어댑터로 승격. |
| **웹앱** | Next.js App Router (다음 슬라이스) | 사용자 친숙, SSR/서버(정적 export 아님, [[feedback_nextjs_static_export_link]] 주의). |
| **진화 워커** | `packages/engine` — TS | 단일언어 단순성(ARCHITECTURE 후보 중). ML 심화 시 Python 어댑터 여지. |
| **어댑터** | `packages/adapters` — LLM·ASR·TTS·Store 인터페이스 | 규칙 12. 기본 = 로컬/모의 폴백, 상용 API 옵션. |
| **첫 실증 언어쌍** | **목표어=영어(en), UI=한국어(ko)** | 사용자 즉시 유용 + 자원 풍부 → 효능 입증 빠름. 범용성은 코어가 보장(Phase 4 에서 2번째 쌍으로 실증). |

## 2. 모노레포 레이아웃 (확정)

```
lingua-loop/
├── package.json            # workspaces, scripts(gate/test)
├── scripts/gate.mjs        # 검증 게이트 오케스트레이터(verification-gate)
├── packages/
│   ├── core/               # 언어·프레임워크 무관 엔진(순수 TS)
│   │   ├── src/  types·fsrs·kc-graph·learner-model·calibration·placement·content-gate·events·sim
│   │   └── test/ *.test.ts (효능 스모크 포함)
│   ├── server/             # 최소 데이터 백엔드(이벤트 수집·서빙 핸들러; node:http 래퍼)
│   ├── engine/             # 진화 워커(/evolve·/calibrate 로직) — 후속
│   ├── web/                # Next.js 학습 UI — 후속 슬라이스
│   ├── packs/              # 언어팩(데이터): en/, ko/i18n
│   └── adapters/           # LLM/ASR/TTS/Store 인터페이스 — 후속
```

## 3. 데이터 모델 (코어 타입 = SSOT 구현)

- **ContentItem** — [`content-item-schema`] 구현(`packages/core/src/types.ts`). `quality: draft|verified|calibrated|retired`, `source.license` 필수.
- **Event**(append-only) — [`telemetry-event-schema`] 구현. `item.response`·`review.done`·`assessment.item` 등. `learnerRef` 가명, `consent` 태그.
- **LearnerState**(파생) — [`learner-model-spec`] 구현. 이벤트 리플레이로 재현. `kcState`(mastery·stability·due)·`ability`.

## 4. 규칙 준수 점검

- 규칙 5 append-only: 이벤트 로그는 추가만(`events.ts` 가 mutation 차단). 상태는 `deriveState(events)` 로 파생.
- 규칙 11 언어 무관: 코어는 `packs/{lang}` 데이터만 소비. 영어 지식 하드코딩 없음.
- 규칙 12/13 pluggable·자가호스팅: LLM/ASR/TTS 어댑터, 기본 무설치 실행.
- 규칙 17 효능 우선: 게이트에 **효능 스모크**(FSRS 리텐션 개선·캘리브레이션 회수·불량문항 차단) 포함(test.md §6).

## 5. 다음 슬라이스

1. (이번) 코어 엔진 + 게이트 그린 + 시드 언어팩 + 최소 서버 핸들러.
2. Next.js `packages/web` 학습 UI(리더·복습·튜터 셸) + 서버 배선.
3. `packages/engine` 로 `/evolve`·`/calibrate` 실제 배선.
