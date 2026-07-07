---
description: 오픈소스 릴리스 컷 - 게이트 그린 확인 + 버전/체인지로그 + 데이터/모델 카드 + 라이선스 + self-host 스모크
argument-hint: <version> [--datasets] [--dry-run]
---

# /release

LinguaLoop 을 개방적으로 공개·배포한다([`oss-release-standards`](../skills/oss-release-standards/SKILL.md)). 배포는 **사용자 명시 승인** 시에만(규칙 18).

## 절차 (`oss-steward` + `release-devops`)

1. **게이트 그린**(규칙 15) — `/gate` 통과 확인. 레드면 중단.
2. **버전·CHANGELOG** — semver, 스키마 변경은 마이그레이션+하위호환(규칙 16).
3. **투명성 카드** — 데이터 카드·모델 카드 최신화(무엇을 수집·학습·생성, 한계·편향).
4. **라이선스 점검**(규칙 14·19) — 코어/콘텐츠/데이터/모델 라이선스 분리 확정(**사용자 합의** 필요, 임의 확정 금지).
5. **프라이버시 게이트**(`--datasets`) — 개방 데이터셋은 동의필터+익명화+**재식별 레드팀 통과** 후만([`privacy-consent-open-data`](../skills/privacy-consent-open-data/SKILL.md)).
6. **시크릿 스캔**(규칙 19) — 키·토큰 노출 없음.
7. **self-host 스모크**(규칙 13) — 외부 상용 서비스 없이 원커맨드 부팅 확인.
8. **배포** — 사용자 "커밋 배포/배포해" 명시 승인 시 태그·push·공개.

## 출력 형식

```
✓ /release 0.3.0 --dry-run
  게이트 ✅ / CHANGELOG ✅ / 데이터·모델 카드 ✅
  라이선스: 코어=(미확정, 사용자 결정 대기) ⏳
  self-host 스모크 ✅ / 시크릿 스캔 ✅
  → dry-run: 공개 보류. 라이선스 확정 + '배포해' 승인 필요
```

## 주의

- 카드 없이 데이터/모델 공개 금지. 라이선스 사용자 합의 전 공개 금지.
- 자가호스팅을 깨는 종속이 들어오면 릴리스 반려.
