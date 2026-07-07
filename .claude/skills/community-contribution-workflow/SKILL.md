---
name: community-contribution-workflow
description: 콘텐츠·언어팩의 커뮤니티 기여·동료검증·랭킹·모더레이션·트러스트 프로토콜(SSOT). 오픈소스 진화의 인간 축. 기여 콘텐츠도 품질 게이트를 통과해야 노출된다(규칙 4).
---

# 커뮤니티 기여 워크플로우 (인간 진화 축 SSOT)

진화의 두 축: 데이터(자동) + **사람(기여)**. 누구나 콘텐츠·언어팩을 기여하고, 검증·랭킹되어 엔진에 반영된다.

## 기여 파이프라인

```
제출 → 자동 게이트 → 동료 검증 → 랭킹/승격 → 노출 → 사용 데이터로 재평가
```

1. **제출** — 문항·예문·번역·언어팩을 [`content-item-schema`]/[`language-pack-format`] 형식으로. **출처·라이선스 필수**(규칙 14).
2. **자동 게이트** — [`content-generation-quality-gate`] 와 동일 검사(언어정확성·정답유효·중복·안전·라이선스). 기여라고 예외 없음.
3. **동료 검증** — 다중 검토·투표. 검토자 신뢰가중. `draft → verified` 승격 기준 충족 시.
4. **랭킹** — 사용 데이터(정답률·변별도·학습효과)로 지속 랭킹. 저품질은 강등/폐기.
5. **모더레이션** — 부정확·저작권·부적절 신고·롤백(security-auditor·learner-data-privacy 협업).

## 트러스트·안티어뷰즈

- **기여자 신뢰도** — 승인 이력 기반. 신규는 검토 강화.
- **조작 방어** — 투표조작·스팸·조직적 밀어주기 탐지.
- **투명 이력** — 누가 무엇을 언제. 크레딧 보존.

## 거버넌스

- 라이선스 동의(기여 시), CoC 준수, 분쟁 처리(`oss-steward`).
- 언어팩 유지자(maintainer) 역할, 저자원 언어 우대.

## 불변 규칙

1. **검증 없이 노출 금지**(규칙 4) — 기여도 verified 이상만.
2. **라이선스 불명 거부**(규칙 14).
3. **사용 데이터로 진실 판정** — 인기보다 학습효과가 랭킹의 최종 기준([`ab-experiment-framework`] 정신).

## 연결

품질=[`content-generation-quality-gate`] · 콘텐츠=[`content-item-schema`] · 언어팩=[`language-pack-format`] · OSS=[`oss-release-standards`] · 담당=community-contribution-engineer.
