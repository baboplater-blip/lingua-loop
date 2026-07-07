// KC(지식요소) 선후 그래프(DAG). SSOT: cefr-mastery-map. 언어 무관 골격 + 언어팩 KC.
import type { Skill, CEFR, LearnerState } from "./types.ts";

export interface KCNode {
  id: string;
  skill: Skill;
  level: CEFR;
  prereq: string[];
  canDo?: string;
}

export interface KCGraph {
  nodes: Record<string, KCNode>;
}

export function makeGraph(nodes: KCNode[]): KCGraph {
  const map: Record<string, KCNode> = {};
  for (const n of nodes) map[n.id] = n;
  return { nodes: map };
}

/** 순환·미정의 전제 검출. 위반 시 throw(규칙: DAG 무결). */
export function assertDAG(graph: KCGraph): void {
  const WHITE = 0;
  const GRAY = 1;
  const BLACK = 2;
  const color: Record<string, number> = {};
  for (const id of Object.keys(graph.nodes)) color[id] = WHITE;

  function visit(id: string, path: string[]): void {
    const node = graph.nodes[id];
    if (!node) throw new Error("미정의 전제 KC 참조: " + id + " (경로 " + path.join("→") + ")");
    if (color[id] === BLACK) return;
    if (color[id] === GRAY) throw new Error("KC 그래프 순환 감지: " + [...path, id].join("→"));
    color[id] = GRAY;
    for (const p of node.prereq) visit(p, [...path, id]);
    color[id] = BLACK;
  }

  for (const id of Object.keys(graph.nodes)) visit(id, []);
}

/** 위상 정렬(전제가 먼저 온다). */
export function topoOrder(graph: KCGraph): string[] {
  assertDAG(graph);
  const out: string[] = [];
  const seen: Record<string, boolean> = {};
  function visit(id: string): void {
    if (seen[id]) return;
    seen[id] = true;
    for (const p of graph.nodes[id].prereq) visit(p);
    out.push(id);
  }
  for (const id of Object.keys(graph.nodes)) visit(id);
  return out;
}

/** 전제 KC 가 모두 mastery ≥ 임계면 잠금 해제. */
export function isUnlocked(kcId: string, state: LearnerState, graph: KCGraph, threshold = 0.6): boolean {
  const node = graph.nodes[kcId];
  if (!node) return false;
  return node.prereq.every((p) => (state.kcState[p]?.mastery ?? 0) >= threshold);
}

export interface NextKCOptions {
  now?: number; // ms
  masteryThreshold?: number; // 숙달로 간주(제외)
  unlockThreshold?: number;
  limit?: number;
}

/**
 * 다음에 학습/복습할 KC 목록.
 * 우선순위: (1) 복습 만기(due 지남) → (2) 잠금해제·미숙달 약점(mastery 낮은 순).
 */
export function nextKCs(state: LearnerState, graph: KCGraph, opts: NextKCOptions = {}): string[] {
  const now = opts.now ?? Date.now();
  const masteryThreshold = opts.masteryThreshold ?? 0.9;
  const unlockThreshold = opts.unlockThreshold ?? 0.6;
  const limit = opts.limit ?? 10;

  const due: string[] = [];
  const fresh: { id: string; mastery: number }[] = [];

  for (const id of topoOrder(graph)) {
    const mem = state.kcState[id];
    if (mem && mem.dueTs !== null && mem.dueTs <= now && mem.mastery < 1) {
      due.push(id);
      continue;
    }
    if ((mem?.mastery ?? 0) >= masteryThreshold) continue;
    if (!isUnlocked(id, state, graph, unlockThreshold)) continue;
    fresh.push({ id, mastery: mem?.mastery ?? 0 });
  }

  fresh.sort((a, b) => a.mastery - b.mastery); // 약한 것 먼저
  return [...due, ...fresh.map((f) => f.id)].slice(0, limit);
}
