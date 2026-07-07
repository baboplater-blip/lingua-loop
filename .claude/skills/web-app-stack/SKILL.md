---
name: web-app-stack
description: LinguaLoop 웹앱 + 데이터 백엔드의 스택·모노레포 구조·API 관례(SSOT). 프레임워크·DB·워커·어댑터 경계. learning-architect 가 확정하며, 프론트/백엔드 작업 시 따른다.
---

# 웹앱 + 데이터 백엔드 스택 (SSOT)

> 세부 후보는 [docs/ARCHITECTURE.md](../../../docs/ARCHITECTURE.md), 확정은 `learning-architect`. 이 스킬은 관례·경계를 고정한다.

## 모노레포 레이아웃(제안)

```
packages/
├── web/        # 학습 웹앱(프레임워크: Next.js App Router 유력 — SSR/서버, 정적 export 아님)
├── api/        # API·인증·이벤트 수집·서빙(web 과 통합 또는 분리)
├── core/       # 언어 무관 코어(KC·스케줄러·평가·학습자모델) — 프레임워크/언어 무관
├── engine/     # 진화 워커(오프라인: IRT·FSRS 최적화·생성·실험) — ML 유리 시 별 서비스
├── packs/      # 언어팩(데이터/플러그인, [language-pack-format])
└── adapters/   # LLM·ASR·TTS·DB 어댑터(규칙 12 — 교체·자가호스팅)
```

## 데이터 스토어

- **운영**: Postgres(이벤트 로그·파생 상태·콘텐츠·실험). **로컬/자가호스팅**: SQLite 폴백(규칙 13).
- **이벤트 로그 = append-only**(규칙 5). 파생 상태는 캐시(재계산 가능).

## API 관례

- 학습자 상태 기반 서빙(콘텐츠·복습큐·튜터·평가). 이벤트 수집은 멱등·검증(클라 신호 무검증 신뢰 금지).
- 계정 데이터 소유권 API(`export`/`delete`, 규칙 6).
- 에러 UX·레이트리밋(security-auditor).

## 어댑터 경계(규칙 12·13)

- LLM(튜터·생성)·ASR/TTS(발음)·DB 는 인터페이스 뒤. **기본은 자가호스팅 가능 경로**, 상용 API 는 옵션.
- 키 미설정 시 폴백(모의/오픈모델/제한기능)으로 부팅.

## 코어 언어 무관(규칙 11)

- `core`·`engine` 은 특정 목표어를 모른다. 언어 지식은 `packs` 로 주입.

## 빌드·검증

- 재현 가능 빌드, `/gate` CI 편입(release-devops). Docker Compose self-host.

## 연결

아키텍처=docs/ARCHITECTURE.md · 담당=learning-architect·backend-api-engineer·web-frontend-engineer·release-devops.
