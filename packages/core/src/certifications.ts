// 마스터리 인증(동기 층) — 언어 무관(규칙 11). SSOT: cefr-mastery-map·learner-model-spec.
// KC 숙달을 **증거 기반**으로 인증하고(운 아닌 반복된 성과), 레벨 진척을 보여준다.
// ⚠️ 다크패턴 없음(규칙 2·9): 성취를 인정하고 경로를 열 뿐 — 손실공포·스트릭·강제 없음. 성과가 진실(규칙 1).
import type { LearnerState, Skill, CEFR } from "./types.ts";
import type { KCGraph } from "./kc-graph.ts";
import { isUnlocked } from "./kc-graph.ts";

const CEFR_ORDER: readonly CEFR[] = ["A1", "A2", "B1", "B2", "C1", "C2", "Native+"];

export interface KCCert {
  kc: string;
  skill: Skill;
  level: CEFR;
  canDo: string;
  mastery: number;
  reps: number;
  certified: boolean; // 인증(증거 기반 숙달)
  unlocked: boolean; // 학습 가능(전제 충족)
}

export interface CertOptions {
  certThreshold?: number; // 인증 숙달 임계
  minReps?: number; // 인증에 필요한 최소 반복(운 배제)
  unlockThreshold?: number;
  nextUpLimit?: number;
}

export interface CertificationReport {
  certs: KCCert[];
  certified: KCCert[]; // 인증 완료(can-do 달성)
  nextUp: KCCert[]; // 잠금해제·미인증, 숙달 근접 순(격려)
  levelProgress: Record<string, { certified: number; total: number; pct: number }>;
  certifiedLevels: string[]; // 전 KC 인증된 레벨
}

/** KC 하나의 인증 여부 — 숙달이 임계 이상이고 충분히 반복(증거)했는가. */
export function isCertified(mastery: number, reps: number, opts: CertOptions = {}): boolean {
  return mastery >= (opts.certThreshold ?? 0.85) && reps >= (opts.minReps ?? 3);
}

/**
 * 학습자 상태 + KC 그래프 → 인증 리포트. 결정적(상태에서 파생, 규칙 5).
 * 인증(달성)·다음 후보(격려)·레벨 진척·완주 레벨을 낸다. 손실공포 없이 성취만 인정.
 */
export function deriveCertifications(state: LearnerState, graph: KCGraph, opts: CertOptions = {}): CertificationReport {
  const certs: KCCert[] = [];
  for (const id of Object.keys(graph.nodes)) {
    const node = graph.nodes[id];
    const mem = state.kcState[id];
    const mastery = mem?.mastery ?? 0;
    const reps = mem?.reps ?? 0;
    certs.push({
      kc: id,
      skill: node.skill,
      level: node.level,
      canDo: node.canDo ?? id,
      mastery,
      reps,
      certified: isCertified(mastery, reps, opts),
      unlocked: isUnlocked(id, state, graph, opts.unlockThreshold ?? 0.6),
    });
  }

  const certified = certs.filter((c) => c.certified);
  const nextUp = certs
    .filter((c) => !c.certified && c.unlocked)
    .sort((a, b) => b.mastery - a.mastery) // 인증에 가까운 것부터(격려)
    .slice(0, opts.nextUpLimit ?? 5);

  const levelProgress: Record<string, { certified: number; total: number; pct: number }> = {};
  for (const c of certs) {
    const lp = levelProgress[c.level] ?? { certified: 0, total: 0, pct: 0 };
    lp.total += 1;
    if (c.certified) lp.certified += 1;
    levelProgress[c.level] = lp;
  }
  for (const lv of Object.keys(levelProgress)) {
    const lp = levelProgress[lv];
    lp.pct = lp.total > 0 ? Math.round((lp.certified / lp.total) * 100) : 0;
  }

  const certifiedLevels = CEFR_ORDER.filter((lv) => levelProgress[lv] && levelProgress[lv].total > 0 && levelProgress[lv].certified === levelProgress[lv].total);

  return { certs, certified, nextUp, levelProgress, certifiedLevels };
}

export interface MasteryCertificate {
  learnerRef: string;
  lang: string;
  issuedFromEvents: number; // 재현 좌표(fromEventCount) — 이 시점 상태의 결정적 스냅샷
  certifiedKCs: { kc: string; canDo: string; level: string; mastery: number }[];
  levelProgress: Record<string, { certified: number; total: number; pct: number }>;
  certifiedLevels: string[];
  summary: string;
}

/**
 * 마스터리 인증서 — 학습자 소유의 성취 스냅샷(규칙 6: 데이터 소유는 성취까지 포함).
 * 결정적(상태에서 파생), 기계가독. 타임스탬프는 넣지 않는다(포터블·재현 가능).
 */
export function buildCertificate(state: LearnerState, graph: KCGraph, learnerRef: string, lang: string, opts: CertOptions = {}): MasteryCertificate {
  const rep = deriveCertifications(state, graph, opts);
  const certifiedKCs = rep.certified.map((c) => ({ kc: c.kc, canDo: c.canDo, level: c.level, mastery: Math.round(c.mastery * 100) / 100 }));
  const summary = certifiedKCs.length
    ? `${certifiedKCs.length}개 can-do 달성${rep.certifiedLevels.length ? " · 완주 레벨 " + rep.certifiedLevels.join(", ") : ""}`
    : "아직 인증한 항목이 없어요";
  return { learnerRef, lang, issuedFromEvents: state.fromEventCount, certifiedKCs, levelProgress: rep.levelProgress, certifiedLevels: rep.certifiedLevels, summary };
}
