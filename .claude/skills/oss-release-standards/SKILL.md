---
name: oss-release-standards
description: 오픈소스 릴리스 표준(SSOT) — 라이선스 분리·semver·재현빌드·데이터/모델 카드·CONTRIBUTING·CoC·self-host 가이드. /release 컷과 개방 공개 시 따른다.
---

# 오픈소스 릴리스 표준 (SSOT)

LinguaLoop 을 건강한 개방 프로젝트로 공개·유지하는 규격. `/release` 가 집행(oss-steward).

## 라이선스 분리(규칙 14 — 사용자 확정 필요)

| 자산 | 라이선스(후보) | 메모 |
|---|---|---|
| 코어 코드 | 개방형 OSS(예: MIT/Apache-2.0/AGPL) | 자가호스팅 보장(규칙 13) |
| 콘텐츠 | CC(예: CC-BY-SA) | 기여·재사용 |
| 데이터셋 | 동의+데이터 라이선스 | 익명화 후([`privacy-consent-open-data`]) |
| 모델 | 모델 라이선스 | 편향·용도 명시 |

> **임의 확정 금지**(규칙 19) — 후보·트레이드오프를 제시하고 사용자가 정한다.

## 투명성 카드

- **데이터 카드** — 무엇을 수집·어떻게 익명화·한계·재식별 위험·라이선스.
- **모델 카드** — 학습 데이터·용도·한계·편향·평가·pluggable 대안.

## 문서 세트

README(한/영), ARCHITECTURE, **self-host 가이드**(원커맨드), API 문서, CONTRIBUTING([`community-contribution-workflow`]), CODE_OF_CONDUCT, SECURITY, 언어팩 작성 가이드. 사용자용은 한국어, 공개 문서는 영어 병행(규칙 21).

## 버저닝·릴리스

- **semver**. 스키마 변경은 마이그레이션+하위호환(규칙 16).
- **릴리스 체크리스트**: 게이트 그린(규칙 15) → 버전·CHANGELOG → 카드 최신 → 라이선스 점검 → 시크릿 스캔(규칙 19) → self-host 스모크.
- **배포 승인**(규칙 18) — origin push·공개는 사용자 명시 승인 시.

## 거버넌스

- 기여 의사결정·유지보수·분쟁. 저자원 언어 우대. 재현성(빌드·데이터·실험).

## 불변 규칙

1. **카드 없이 데이터/모델 공개 금지**.
2. **자가호스팅 가능 유지**(규칙 13).
3. **라이선스 사용자 합의**(규칙 19).

## 연결

담당=oss-steward · 프라이버시=[`privacy-consent-open-data`] · 배포=release-devops · 기여=[`community-contribution-workflow`] · `/release` 커맨드.
