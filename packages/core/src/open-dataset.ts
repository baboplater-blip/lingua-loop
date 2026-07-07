// 개방 데이터셋 파이프라인 — 동의 필터·익명화·재식별 레드팀(k-익명성). 언어 무관(규칙 11).
// SSOT: privacy-consent-open-data. **충돌 시 프라이버시가 이긴다.** "익명화했다" 주장만으론 불충분 — 재식별 테스트로 증명(규칙 7).
import type { LearningEvent, Consent, EventType } from "./types.ts";

const CONSENT_RANK: Record<Consent, number> = { learn: 0, "learn+improve": 1, "learn+improve+open": 2 };

/** 이벤트 동의가 개방 최소 계층을 충족하는가. */
export function consentAllows(consent: Consent, min: Consent): boolean {
  return (CONSENT_RANK[consent] ?? 0) >= (CONSENT_RANK[min] ?? 0);
}

/** 동의 필터 — 개방 동의(learn+improve+open) 이벤트만(규칙 7·①). */
export function filterConsented(events: readonly LearningEvent[], min: Consent = "learn+improve+open"): LearningEvent[] {
  return events.filter((e) => consentAllows(e.consent, min));
}

// 학습 신호 이벤트만(자유텍스트 중심 tutor.turn·기여/발행 메타 제외 — 수집 최소화, 규칙 8)
const DEFAULT_TYPES: EventType[] = ["item.response", "review.done", "speak.attempt", "assessment.item", "content.exposure"];
// payload 자유텍스트 스크럽 대상(규칙 7·②)
const DEFAULT_REDACT = ["text", "message", "note", "reason"];

function pushTo<K, V>(m: Map<K, V[]>, k: K, v: V): void {
  const arr = m.get(k);
  if (arr) arr.push(v);
  else m.set(k, [v]);
}

/** 이벤트 익명화: 가명 재발급(원 가명과 링크 끊음)·자유텍스트 스크럽·시각 일 단위 coarsen. */
export function anonymizeEvents(events: readonly LearningEvent[], refMap: Map<string, string>, opts: { redact?: string[]; coarsenTsToDay?: boolean } = {}): LearningEvent[] {
  const redact = new Set(opts.redact ?? DEFAULT_REDACT);
  const coarsen = opts.coarsenTsToDay ?? true;
  return events.map((e) => {
    const payload: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(e.payload ?? {})) if (!redact.has(k)) payload[k] = v;
    return { ...e, learnerRef: refMap.get(e.learnerRef) ?? "anon", ts: coarsen ? e.ts.slice(0, 10) : e.ts, payload } as LearningEvent;
  });
}

// 학습자 준식별자(QI) 프로파일 — 재식별 링크 벡터를 coarse 하게. 정확 응답셋이 아니라 대략 프로파일로 그룹.
function learnerProfile(events: LearningEvent[]): string {
  const kcs = new Set<string>();
  let count = 0;
  let firstTs = "9999-99";
  for (const e of events) {
    count += 1;
    if (e.kc) for (const k of e.kc) kcs.add(k);
    if (e.ts < firstTs) firstTs = e.ts;
  }
  const kcBucket = kcs.size <= 2 ? "kc:1-2" : kcs.size <= 5 ? "kc:3-5" : "kc:6+";
  const countBucket = count <= 9 ? "n:1-9" : count <= 49 ? "n:10-49" : "n:50+";
  return `${kcBucket}|${countBucket}|${firstTs.slice(0, 7)}`; // YYYY-MM
}

export interface ReidReport {
  groups: number;
  minGroupSize: number;
  kTarget: number;
  passed: boolean; // 모든 준식별자 그룹이 k 이상(재식별 불가)
  singletonLearners: string[]; // k 미만 그룹의 학습자(억제 대상)
}

/** 재식별 레드팀: 준식별자 그룹의 최소 크기가 k 이상인지(k-익명성). k 미만 = 재식별 가능 → 억제 대상. */
export function reidentificationRisk(byLearner: Map<string, LearningEvent[]>, kTarget = 2): ReidReport {
  const groups = new Map<string, string[]>();
  for (const [ref, evs] of byLearner) pushTo(groups, learnerProfile(evs), ref);
  let minGroupSize = Infinity;
  const singletons: string[] = [];
  for (const refs of groups.values()) {
    minGroupSize = Math.min(minGroupSize, refs.length);
    if (refs.length < kTarget) singletons.push(...refs);
  }
  return { groups: groups.size, minGroupSize: groups.size ? minGroupSize : 0, kTarget, passed: groups.size === 0 ? true : minGroupSize >= kTarget, singletonLearners: singletons };
}

export interface OpenDatasetReport {
  sourceEvents: number;
  consentedEvents: number;
  consentedLearners: number;
  suppressedLearners: number; // 재식별 위험(singleton)으로 제외
  releasedLearners: number;
  releasedEvents: number;
  kTarget: number;
  minGroupSize: number; // 억제 후
  redteamPassed: boolean; // 억제 후 k-익명성 충족
  license: string;
  typeBreakdown: Record<string, number>; // 릴리스 이벤트의 종류별 개수(카드용)
}

/**
 * 개방 데이터셋 생성 — 동의 필터 → 학습신호 선별 → 재식별 레드팀(singleton 억제) → 익명화.
 * redteamPassed=false면 배포 금지(프라이버시 우선). 결정적.
 */
export function buildOpenDataset(events: readonly LearningEvent[], opts: { minConsent?: Consent; kTarget?: number; license?: string; eventTypes?: EventType[]; excludeRefs?: string[] } = {}): { dataset: LearningEvent[]; report: OpenDatasetReport } {
  const minConsent = opts.minConsent ?? "learn+improve+open";
  const kTarget = opts.kTarget ?? 2;
  const types = new Set(opts.eventTypes ?? DEFAULT_TYPES);
  const excludeRefs = new Set(opts.excludeRefs ?? []);

  const consented = filterConsented(events, minConsent).filter((e) => types.has(e.type) && !excludeRefs.has(e.learnerRef));
  const byLearner = new Map<string, LearningEvent[]>();
  for (const e of consented) pushTo(byLearner, e.learnerRef, e);

  const risk = reidentificationRisk(byLearner, kTarget);
  const suppress = new Set(risk.singletonLearners);
  const survivors = [...byLearner.keys()].filter((r) => !suppress.has(r));

  const survivorMap = new Map(survivors.map((r) => [r, byLearner.get(r) as LearningEvent[]]));
  const risk2 = reidentificationRisk(survivorMap, kTarget);

  const refMap = new Map(survivors.map((r, i) => [r, "d" + (i + 1).toString(36).padStart(4, "0")]));
  const releasedRaw = consented.filter((e) => !suppress.has(e.learnerRef));
  const dataset = anonymizeEvents(releasedRaw, refMap, { coarsenTsToDay: true });

  const typeBreakdown: Record<string, number> = {};
  for (const e of dataset) typeBreakdown[e.type] = (typeBreakdown[e.type] ?? 0) + 1;

  return {
    dataset,
    report: {
      sourceEvents: events.length,
      consentedEvents: consented.length,
      consentedLearners: byLearner.size,
      suppressedLearners: suppress.size,
      releasedLearners: survivors.length,
      releasedEvents: dataset.length,
      kTarget,
      minGroupSize: risk2.minGroupSize,
      redteamPassed: risk2.passed,
      license: opts.license ?? "CC-BY-4.0",
      typeBreakdown,
    },
  };
}

/**
 * 개방 데이터셋 **데이터 카드**(Markdown) 자동 생성 — 카드 없이 데이터 공개 금지(oss-release-standards).
 * 무엇을·어떻게 익명화·k값·라이선스·한계를 데이터셋과 함께 배포한다. 결정적(타임스탬프 없음).
 */
export function datasetCard(report: OpenDatasetReport): string {
  const types = Object.entries(report.typeBreakdown).map(([t, n]) => `- \`${t}\`: ${n}`).join("\n") || "- (없음)";
  return `# 개방 데이터셋 카드 — LinguaLoop

> 이 카드는 함께 배포되는 개방 학습 데이터셋(\`open-dataset.jsonl\`)을 설명합니다. **카드 없이 데이터셋을 재배포하지 마세요.**

## 요약

- 릴리스 이벤트: **${report.releasedEvents}** (학습자 ${report.releasedLearners})
- 개방 동의·학습신호 이벤트: ${report.consentedEvents} (동의 학습자 ${report.consentedLearners})
- 재식별 위험으로 억제된 학습자: **${report.suppressedLearners}**
- k-익명성: 준식별자 그룹 최소 크기 **${report.minGroupSize}** / 목표 k=${report.kTarget} → ${report.redteamPassed ? "✅ 통과" : "❌ 실패"}
- 라이선스: **${report.license}** (+ 동의 조건)

## 무엇을 담나 (스키마)

각 레코드(JSONL 한 줄) = 익명화된 한 학습 이벤트. 종류별 개수:

${types}

주요 필드: \`learnerRef\`(익명 가명 dXXXX) · \`ts\`(일 단위) · \`type\` · \`kc\`(지식요소) · \`itemId\` · \`payload\`(정오·점수 등 특징) · \`consent\`.

## 익명화 (규칙 7)

- **가명 재발급** — 원 가명과의 링크 절단(dXXXX 재부여).
- **자유텍스트 스크럽** — \`text\`·\`message\`·\`note\`·\`reason\` 제거(특징만 유지).
- **시각 coarsen** — 일 단위(YYYY-MM-DD)로 낮춰 타이밍 링크 완화.

## 재식별 방지

- **k-익명성** — 준식별자 프로파일(KC 수·이벤트 수·시작 월)로 그룹, 최소 크기 < k인 학습자를 **억제**하고 재검증. 통과분만 릴리스.
- 소수 코호트·자유텍스트가 주요 위험이라 억제·버킷·스크럽으로 대응.

## 한계

- 대략 프로파일 기반 k-익명성이라 외부 보조정보와의 강한 링크를 완전히 배제하지는 못합니다. 재배포 시 추가 위험 평가를 권장합니다.
- 동의하지 않은 데이터는 포함되지 않습니다(옵트인만).

## 라이선스

${report.license} + 동의 조건. 상세: 리포지토리 \`docs/DATA_CARD.md\`.
`;
}
