# 보안 정책 (Security Policy)

> **EN summary:** Report vulnerabilities privately to **security@lingua-loop.example** (replace with a real address at public release). Do not open a public issue. We aim to acknowledge within 72h. LinguaLoop runs **self-hosted with zero required external services**, so the primary attack surface is your own data backend, the tutor/content ingestion path, and learner PII.

## 지원 버전 (Supported Versions)

공개 릴리스 전(0.x)에는 최신 `main`만 보안 지원합니다. 1.0 이후에는 최신 마이너 라인을 지원합니다(semver, 규칙 16).

## 취약점 제보 (Reporting)

**공개 이슈로 올리지 마세요.** 다음으로 비공개 제보해주세요:

- 이메일: **security@lingua-loop.example** *(공개 배포 시 실주소로 교체)*
- 포함: 재현 절차·영향 범위·가능하면 PoC. **학습자 PII 실데이터는 첨부하지 말고** 합성/마스킹 데이터를 쓰세요.

72시간 내 접수 확인, 심각도에 따라 수정·공개 일정을 함께 조율합니다(책임 있는 공개).

## 위협 모델 (Threat Model — 자가호스팅 기준)

이 프로젝트는 외부 상용 API에 대한 **필수 종속이 없습니다**(규칙 13). 그래서 보안의 초점은:

1. **데이터 백엔드** — 이벤트 로그(append-only JSONL)와 학습자 상태. 경로 조작·권한·백업 접근을 운영자가 통제.
2. **콘텐츠/튜터 인젝션** — 사용자·콘텐츠 입력이 튜터/생성기를 오염시키지 못하도록 `withSafety` 인젝션 방어 데코레이터가 모든 튜터 모델을 감쌉니다([`ai-tutor-protocol`](.claude/skills/ai-tutor-protocol/SKILL.md)). pluggable LLM을 붙일 때도 이 데코레이터를 우회하지 마세요.
3. **학습자 PII·소유권** — 내보내기/삭제 보장(규칙 6). 개방 데이터셋은 **동의 필터 + 익명화 + 재식별 레드팀 통과** 후에만 공개([`privacy-consent-open-data`](.claude/skills/privacy-consent-open-data/SKILL.md)).
4. **파일명·경로 안전** — 학습자 식별자를 파일 경로로 쓸 때 경로 조작(`../`)·와일드카드를 차단하는 단사 인코딩(`safeName`)을 사용합니다.

## 운영자 권고 (Operator Hardening)

- `data/` 디렉터리(학습자 이벤트)를 백업·암호화하고 접근을 제한하세요. 이 디렉터리는 기본 `.gitignore`되어 커밋되지 않습니다.
- 외부 LLM 어댑터를 붙이면 키를 환경변수로만 두고 `.env`는 커밋 금지(규칙 19). 시크릿 스캔은 `node scripts/release.mjs`가 점검합니다.
- 공개 인터넷에 노출한다면 리버스 프록시·TLS·요청 제한을 앞단에 두세요(코어는 최소 HTTP 서버입니다).
