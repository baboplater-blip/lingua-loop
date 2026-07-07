---
name: evolution-loop-protocol
description: LinguaLoop 자기개선 폐루프의 프로토콜(SSOT) — 데이터→분석→제안→실험→검증→배포→측정. "끝없이 진화"의 핵심. /evolve 1사이클의 규격. 최적화 목표는 언제나 학습성과.
---

# 진화 루프 프로토콜 (자기개선 SSOT)

이 프로젝트의 차별점. 도구가 **데이터로 스스로 더 잘 가르치게** 만든다. 1사이클 = `/evolve`.

## 루프 6단계

```
1 수집   append-only 이벤트([telemetry-event-schema])
2 파생   학습자·콘텐츠 상태([learner-model-spec])
3 분석   신호 추출(아래)
4 제안   개선 후보 생성(도메인 엔지니어에 위임)
5 실험   A/B 검증([ab-experiment-framework]) — 가드레일=학습성과
6 배포·측정  성과 개선/무해면 배포, 아니면 롤백 → 다음 사이클
```

## 3 단계: 분석 신호

| 신호 | 소스 | 개선 축 |
|---|---|---|
| 저성과 KC(정체·이탈) | 학습자 모델·이벤트 | 콘텐츠·경로·교수법 |
| 미캘리브레이션·불량 문항 | 반응 통계 | IRT 캘리브레이션([`irt-calibration`]) |
| 리텐션 예측 오차 | 복습 로그 | FSRS 파라미터([`fsrs-spaced-repetition`]) |
| 콘텐츠 격차(KC×레벨 부족) | 노출/커버리지 | 자동 생성([`content-generation-quality-gate`]) |
| 오류 패턴(튜터·문항) | 교정 로그 | 오답보기·설명·경로 |

## 4 단계: 개선 축(위임)

- 문항 재캘리브레이션 → `psychometrics-assessment-engineer`
- FSRS w 재적합 → `srs-scheduler-engineer`
- 격차 콘텐츠 생성 → `content-generation-ai`(품질 게이트 필수)
- 경로 규칙 조정 → `curriculum-designer`

## 5 단계: 실험 (핵심 규율)

- **가드레일 지표 = 학습성과**(TTM·Gain·리텐션). 참여도(체류·스트릭)는 **절대 목표·가드레일 아님**(규칙 1).
- 사전등록·검정력·표본. 유의·효과크기로 판정([`ab-experiment-framework`]).
- 성과 상승·참여 정체는 OK. **참여 상승·성과 정체·하락은 실패**(다크패턴 신호 — `growth-efficacy-analyst` 경보).

## 6 단계: 배포·측정

- 배포는 게이트 그린 + 실험 통과 후(규칙 15·17). 아니면 롤백.
- `Loop Velocity`(주기·개선폭) 기록, `status.md` 갱신.

## 불변 규칙

1. **성과 최적화**(규칙 1) — 루프의 유일한 목표.
2. **증거 없이 배포 금지**(규칙 17).
3. **재현성** — 사이클 입력(이벤트 시퀀스)·결정을 기록해 재현 가능.

## 연결

`/evolve`·`/calibrate` 커맨드 · 실험=[`ab-experiment-framework`] · 데이터=[`telemetry-event-schema`] · 효능해석=growth-efficacy-analyst.
