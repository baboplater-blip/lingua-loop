# CHANGELOG

이 프로젝트는 [Keep a Changelog](https://keepachangelog.com/) 형식과 [Semantic Versioning](https://semver.org/)을 따릅니다.
스키마 변경은 마이그레이션 + 하위호환을 동반합니다(규칙 16). 상세 개발 로그는 [`status.md`](status.md).

## [Unreleased]

공개 릴리스(0.1.0) 준비 완료 — **배포 승인 대기.** 라이선스 확정: **코어/모델 MIT + 콘텐츠 CC-BY-4.0**([`LICENSES.md`](LICENSES.md)). 태그·push·공개는 오너의 '배포해' 명시 승인 시(규칙 18).

### Added

- **이벤트 영속(JSONL 파일 스토어)** — `openFileStore(dir)`: 학습자당 한 파일, 한 줄=한 이벤트, 파일도 append-only. 서버 재시작 시 디렉터리를 리플레이해 학습·튜터·생성물 상태 복원. 기본 영속 ON(`LL_DATA_DIR`, 기본 `data/events`). 삭제는 파일까지 제거(규칙 6). 재시작 후 eventId 충돌 방지(`syncCounterFrom`).
- **2번째 언어쌍(스페인어)** — `packs/es`(데이터만)로 다국어 범용 실증: 같은 코어·서버·엔진이 en·es를 동일 처리(**코어 코드 0줄 변경**, 규칙 11). 서버 다중 언어팩 로딩(`getPack`), 웹 UI 배우는-언어 전환기.
- **콘텐츠 자동생성(진화 루프 3축 완성)** — pluggable `ContentGenerator` + 오프라인 `EnglishTemplateGenerator`. 격차 KC를 자동 생성으로 메우고 **코어 품질 게이트 통과분만** 편입(규칙 4).
- **AI 튜터** — pluggable `TutorModel` + `withSafety`(인젝션 방어) + 오프라인 `LocalHeuristicTutor`(교정·i+1). `POST /tutor`, 학습/튜터 웹 탭. 외부 API 0(규칙 12·13).
- **학습 웹앱(제로 의존 브라우저 앱)** — 플래시카드·클로즈·MCQ·최소대립쌍. 투명성 패널·데이터 소유권 버튼·다크패턴 없음.
- **진화 워커(`packages/engine`)** — 분석·IRT 캘리브레이션·FSRS 재적합·A/B 실험·`/evolve`. 가드레일=학습성과(참여도 반려).
- **엔진 코어(`packages/core`) + 데이터 백엔드(`packages/server`)** — FSRS·KC 그래프·학습자 모델(BKT)·IRT/ELO·CAT·품질 게이트·append-only 이벤트. verified만 서빙(규칙 4).
- **OSS 스캐폴딩** — README(한/영)·CONTRIBUTING·CODE_OF_CONDUCT·SECURITY·데이터/모델 카드·self-host 가이드·릴리스 체크리스트(`scripts/release.mjs`).

### Decided

- **라이선스 확정** — 코어 코드·모델 = **MIT**, 콘텐츠(언어팩) = **CC-BY-4.0**, 개방 데이터셋 = CC-BY-4.0 + 동의 조건. 자산별 분리 명세([`LICENSES.md`](LICENSES.md)).

### Pending (다음)

- 발음(ASR/TTS) 어댑터, 등급 리더(입력 i+1), SQLite 백엔드, 커뮤니티 기여 실동작.

---

_버전 태그는 오너의 배포 승인('배포해') 후 부여됩니다(규칙 18)._
