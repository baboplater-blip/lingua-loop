---
name: cefr-mastery-map
description: CEFR A1→C2→원어민 능력요소(KC) 진행 그래프의 설계 규격(SSOT). 4스킬×하위체계를 관측 가능한 KC 로 분해하고 선후관계·can-do 로 잇는다. 커리큘럼·경로 설계 시 따른다.
---

# CEFR 마스터리 맵 (커리큘럼 SSOT)

"0에서 원어민까지"를 **측정 가능한 능력요소(KC) 그래프** 로. CEFR 은 좌표계이고, **목표는 그 위의 원어민 마스터리**.

## 차원

- **4 스킬**: reading · listening · speaking · writing.
- **하위체계**: phonology(음운) · lexis(어휘) · grammar(문법) · pragmatics(화용/사회언어) · orthography(정서법).
- **레벨**: A1 · A2 · B1 · B2 · C1 · C2 · **Native+**(관용·사회언어·미묘한 화용).

## KC 정의 규칙

각 KC 는:
- **원자적·관측가능** — 하나의 능력, 문항으로 평가 가능. 예: `kc.es.pret_indef`(과거단순 활용), `kc.xx.phon.tone3`(3성 지각).
- **can-do 서술** — "학습자는 ~할 수 있다"(CEFR can-do 정렬).
- **선후(prerequisite)** — 무엇을 알아야 가능한가. **DAG**(순환 금지).
- **레벨 태그** — CEFR 좌표(초기), 실제 난이도는 캘리브레이션([`irt-calibration`]).

## 그래프 골격 vs 언어팩

- **골격**(언어 무관) — 스킬·하위체계·레벨 구조, 일반 선후 원리.
- **언어별 KC** — 언어팩(`kc-seed.json`)이 채운다([`language-pack-format`], 규칙 11). 예: 스페인어 접속법, 중국어 성조, 아랍어 어근.

## 경로 생성(learner-model 소비)

`curriculum-designer` 규칙: 전제충족 KC 중 → 복습만기 우선 → 목표관련 약점 보강 → 바람직한 어려움(θ 매칭). 상태는 [`learner-model-spec`].

## Native+ (원어민 마스터리)

C2 를 종점으로 두지 않는다. 관용표현·사회언어 변이·화용 미묘함·유창성(속도·자동화)·문화적 함축까지 KC 로 확장. **"단순 문제풀이가 아니라 원어민처럼"** 을 그래프로 구현.

## 불변 규칙

1. **관측가능성** — 평가 불가한 KC 는 KC 가 아니다.
2. **DAG 무결** — 선후 순환 금지, 하위호환(신규 KC 는 가산).
3. **언어 무관 골격**(규칙 11).

## 연결

문항 태깅=[`content-item-schema`] · 판정=[`placement-adaptive-testing`]·[`irt-calibration`] · 복습=[`fsrs-spaced-repetition`] · 상태=[`learner-model-spec`].
