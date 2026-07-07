---
description: 진화 루프 1사이클 실행 - 데이터 분석→개선 제안→A/B 실험→검증→배포→측정
argument-hint: [--focus retention|calibration|content|path] [--dry-run]
---

# /evolve

"끝없이 진화"의 1회전. 수집 데이터로 엔진을 **스스로 더 잘 가르치게** 만든다([`evolution-loop-protocol`](../skills/evolution-loop-protocol/SKILL.md)).

## 절대 규율

**최적화 목표·가드레일 = 학습성과**(TTM·Gain·리텐션). 참여도(체류·스트릭)는 목표가 될 수 없다(규칙 1). 위반 시 사이클 중단.

## 절차 (`evolution-engine-engineer` 오케스트레이션)

1. **분석** — 집계 이벤트에서 신호: 저성과 KC·이탈·미캘리브레이션 문항·콘텐츠 격차·리텐션 오차.
2. **제안** — 개선 후보를 도메인에 위임: 캘리브레이션(→`/calibrate`)·FSRS 튜닝·콘텐츠 격차 생성(→`/new-content`)·경로 조정.
3. **실험** — A/B 로 검증([`ab-experiment-framework`](../skills/ab-experiment-framework/SKILL.md)). 가드레일=성과, 검정력·표본·사전등록.
4. **판정** — `growth-efficacy-analyst` 가 성과 관점 해석. **참여↑·성과↔/↓ = 다크패턴 경보**.
5. **커뮤니티 재평가** — 시드뿐 아니라 **커뮤니티 기여도 학습효과로 재평가**(신뢰가중 승격 + 실효 강등, [`community-contribution-workflow`](../skills/community-contribution-workflow/SKILL.md)). 인간 축을 데이터 축이 다스린다(인기보다 학습효과). `communityEvents` 주입 시 동작.
6. **배포·측정** — 게이트 그린 + 실험 통과 시 배포, 아니면 롤백. Loop Velocity 기록, `status.md` 갱신.

## 출력 형식

```
✓ /evolve --focus retention (사이클 #7)
  분석: FSRS 예측오차 KC 34종 / 콘텐츠격차 A2 listening
  실험: FSRS w 재적합 A/B (n=1,240, MDE d=0.2)
  결과: D7 리텐션 +4.1%p (유의, 가드레일 무해) → 배포
  참여도: 관측만(체류 -2%, 성과 무관 — 정상)
다음: 콘텐츠격차 A2 listening → /new-content
```

## 주의

- `--dry-run` 은 분석·제안까지만(배포 없음).
- 성과 증거 없이 배포 금지(규칙 17). 실험 없이 "좋아 보여서" 반영 금지.
