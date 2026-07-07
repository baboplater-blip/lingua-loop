// 마스터리 인증(동기 층) — 증거 기반 인증·레벨 진척·경로 개방. 다크패턴 없음(규칙 1·2·9).
import { test } from "node:test";
import assert from "node:assert/strict";
import { deriveCertifications, isCertified, buildCertificate, makeGraph } from "../src/index.ts";
import type { KCNode, LearnerState } from "../src/index.ts";

const nodes: KCNode[] = [
  { id: "kc.a", skill: "reading", level: "A1", prereq: [], canDo: "A를 읽는다" },
  { id: "kc.b", skill: "writing", level: "A1", prereq: ["kc.a"], canDo: "B를 쓴다" },
  { id: "kc.c", skill: "writing", level: "A2", prereq: ["kc.b"], canDo: "C를 쓴다" },
];
const graph = makeGraph(nodes);

const mem = (mastery: number, reps: number) => ({ mastery, stability: 1, difficulty: 5, lastReviewTs: null, dueTs: null, reps });
const state = (kcState: Record<string, ReturnType<typeof mem>>): LearnerState => ({ learnerRef: "t", lang: "en", kcState, ability: {}, fromEventCount: 0 });

test("인증은 증거 기반 — 숙달 임계 + 최소 반복(운 배제)", () => {
  assert.ok(isCertified(0.9, 4), "높은 숙달 + 충분 반복 → 인증");
  assert.ok(!isCertified(0.9, 1), "반복 부족 → 미인증(운일 수 있음)");
  assert.ok(!isCertified(0.6, 10), "숙달 부족 → 미인증");
});

test("리포트: 인증·다음 후보·레벨 진척·완주 레벨", () => {
  // kc.a 인증(0.9,4), kc.b 진행중(0.5,3, 잠금해제됨·미인증), kc.c 잠김(kc.b<0.6)
  const rep = deriveCertifications(state({ "kc.a": mem(0.9, 4), "kc.b": mem(0.5, 3) }), graph);
  assert.deepEqual(rep.certified.map((c) => c.kc), ["kc.a"], "kc.a 인증");
  assert.ok(rep.certified[0].canDo === "A를 읽는다", "can-do 표시");
  assert.ok(rep.nextUp.some((c) => c.kc === "kc.b"), "잠금해제·미인증 kc.b 는 다음 후보");
  assert.ok(!rep.nextUp.some((c) => c.kc === "kc.c"), "잠긴 kc.c 는 후보 아님");
  assert.equal(rep.levelProgress["A1"].certified, 1, "A1 인증 1");
  assert.equal(rep.levelProgress["A1"].total, 2, "A1 총 2");
  assert.ok(!rep.certifiedLevels.includes("A1"), "A1 미완주");
});

test("레벨 완주 시 certifiedLevels 에 표시(🏅)", () => {
  const rep = deriveCertifications(state({ "kc.a": mem(0.9, 4), "kc.b": mem(0.88, 5) }), graph);
  assert.ok(rep.certifiedLevels.includes("A1"), "A1 전 KC 인증 → 완주");
  assert.ok(!rep.certifiedLevels.includes("A2"), "A2 미완주");
});

test("빈 상태는 인증 0 (손실공포·강제 없이 시작)", () => {
  const rep = deriveCertifications(state({}), graph);
  assert.equal(rep.certified.length, 0);
  assert.ok(rep.nextUp.some((c) => c.kc === "kc.a"), "루트는 처음부터 학습 가능");
});

test("인증서 내보내기: 소유 가능한 성취 스냅샷(규칙 6, 포터블·결정적)", () => {
  const cert = buildCertificate(state({ "kc.a": mem(0.9, 4), "kc.b": mem(0.88, 5) }), graph, "learner-1", "en");
  assert.equal(cert.learnerRef, "learner-1");
  assert.equal(cert.lang, "en");
  assert.equal(cert.certifiedKCs.length, 2, "인증 can-do 목록");
  assert.ok(cert.certifiedKCs.every((c) => c.canDo && c.level), "can-do·레벨 포함");
  assert.ok(cert.certifiedLevels.includes("A1"), "완주 레벨");
  assert.ok(cert.summary.includes("달성"), "요약");
  assert.ok(!JSON.stringify(cert).includes("Z") || !/\d{4}-\d\d-\d\dT/.test(JSON.stringify(cert)), "타임스탬프 없음(포터블·재현)");
});
