// 사전등록 통제 실험 — 관측 Gain 을 집단 간 비교해 인과 증거로(규칙 17). 결정적 배정·판정 규율 검증.
import { test } from "node:test";
import assert from "node:assert/strict";
import { assignVariant, compareCohorts, validatePreRegistration } from "../src/index.ts";
import type { LearningEvent, PreRegistration } from "../src/index.ts";

const assess = (learner: string, theta: number, day: number): LearningEvent => ({
  eventId: "e", ts: `2026-03-${String(day).padStart(2, "0")}T00:00:00.000Z`, learnerRef: learner, type: "assessment.item",
  kc: [], payload: { skill: "reading", thetaEst: theta }, consent: "learn", schemaVersion: 1,
});

// 학습자별 (사전 day1, 사후 day5) 재평가 쌍을 만든다. gain = post − pre.
function cohort(prefix: string, pre: number[], post: number[]): LearningEvent[] {
  const out: LearningEvent[] = [];
  pre.forEach((p, i) => out.push(assess(prefix + i, p, 1), assess(prefix + i, post[i], 5)));
  return out;
}

const PRE = [-0.3, -0.1, 0.1, 0.3, -0.2, 0.0, 0.2, -0.1];
const reg = (over: Partial<PreRegistration> = {}): PreRegistration => ({
  experimentId: "exp1", hypothesis: "H", primaryOutcome: "gainScore", treatmentShare: 0.5,
  minSamplePerArm: 8, guardrail: "리텐션 비열등", registeredTs: "2026-01-01T00:00:00.000Z", ...over,
});

test("validatePreRegistration: 1차 결과는 학습성과만·배정/표본 온전성(규칙 1)", () => {
  assert.equal(validatePreRegistration(reg()).ok, true);
  assert.equal(validatePreRegistration({ ...reg(), primaryOutcome: "engagement" as never }).ok, false, "참여도 실험 거부");
  assert.equal(validatePreRegistration({ ...reg(), treatmentShare: 0 }).ok, false, "share 0 거부");
  assert.equal(validatePreRegistration({ ...reg(), treatmentShare: 1 }).ok, false, "share 1 거부");
  assert.equal(validatePreRegistration({ ...reg(), minSamplePerArm: 0 }).ok, false, "표본 0 거부");
  assert.equal(validatePreRegistration({ experimentId: "", primaryOutcome: "gainScore" } as never).ok, false, "id 필요");
});

test("assignVariant: 결정적·재현·실험별 독립·share 반영(규칙 5)", () => {
  assert.equal(assignVariant("exp1", "learnerA"), assignVariant("exp1", "learnerA"), "같은 입력 = 같은 팔");
  // 실험 id 가 바뀌면 배정이 독립(한 학습자가 늘 같은 팔이 되는 편향 방지) — 100개 실험서 두 팔 모두 등장
  const arms = new Set(Array.from({ length: 100 }, (_, i) => assignVariant("exp" + i, "learnerA")));
  assert.equal(arms.size, 2, "실험마다 배정이 독립(고정 아님)");
  // 대략 균형(500명, 45~55%)
  let t = 0;
  for (let i = 0; i < 500; i++) if (assignVariant("exp1", "L" + i) === "treatment") t++;
  assert.ok(t > 220 && t < 280, `균형 배정 ~50% (실제 ${t}/500)`);
  // share=0.9 면 대부분 실험군
  let t9 = 0;
  for (let i = 0; i < 500; i++) if (assignVariant("exp1", "L" + i, 0.9) === "treatment") t9++;
  assert.ok(t9 > 420, `share 0.9 → 대부분 실험군 (실제 ${t9}/500)`);
});

test("compareCohorts: 실험군이 유의미하게 우세하면 treatment_better + CI 가 0 배제(규칙 17)", () => {
  const control = cohort("C", PRE, PRE.map((p) => p + 0.02)); // gain ~0
  const treatment = cohort("T", PRE, PRE.map((p, i) => p + [0.9, 1.1, 1.0, 0.8, 1.2, 0.9, 1.0, 1.1][i])); // gain ~1.0
  const r = compareCohorts(reg(), control, treatment);
  assert.equal(r.control.n, 8);
  assert.equal(r.treatment.n, 8);
  assert.ok(r.diffInMeanGain! > 0.8, "평균차 큰 양수");
  assert.ok(r.effectSize! > 0.8, "집단 간 효과크기 큼");
  assert.ok(r.ci95![0] > 0, "95% CI 하한 > 0 → 0 배제");
  assert.equal(r.powered, true, "표본 충족");
  assert.equal(r.verdict, "treatment_better");
  assert.ok(r.caveat.includes("규칙 17"), "인과 주의 병기");
});

test("compareCohorts: 두 코호트가 사실상 같으면 no_difference(CI 가 0 포함) — 섣부른 인과 금지", () => {
  // 두 팔 모두 0 근방에서 실제 분산이 있는 gain — 평균차는 미미하고 CI 가 0 을 포함해야 한다.
  const cg = (prefix: string, gains: number[]) => cohort(prefix, PRE, PRE.map((p, i) => p + gains[i]));
  const control = cg("C", [0.10, -0.10, 0.00, 0.15, -0.05, 0.05, -0.10, 0.08]);
  const treatment = cg("T", [0.00, 0.10, -0.10, 0.05, 0.10, -0.05, 0.00, 0.05]);
  const r = compareCohorts(reg(), control, treatment);
  assert.equal(r.powered, true);
  assert.ok(Math.abs(r.diffInMeanGain!) < 0.05, "평균차 미미");
  assert.ok(r.ci95![0] < 0 && r.ci95![1] > 0, "CI 가 0 포함");
  assert.equal(r.verdict, "no_difference");
});

test("compareCohorts: 사전 확정 표본 미달이면 underpowered(방향 주장 금지)", () => {
  const control = cohort("C", PRE, PRE.map((p) => p + 0.02));
  const treatment = cohort("T", [0.0, 0.1], [1.0, 1.1]); // n=2 < minSamplePerArm 8
  const r = compareCohorts(reg(), control, treatment);
  assert.equal(r.treatment.n, 2);
  assert.equal(r.powered, false);
  assert.equal(r.verdict, "underpowered", "표본 미달 → 무결론");
});

test("compareCohorts: 등록이 데이터보다 늦으면 retroactive(사전등록 무효 경고)", () => {
  const control = cohort("C", PRE, PRE.map((p) => p + 0.02));
  const treatment = cohort("T", PRE, PRE.map((p) => p + 1.0));
  // 데이터 최소 ts(2026-03-01) 가 등록(2026-06-01)보다 앞섬
  const r = compareCohorts(reg({ registeredTs: "2026-06-01T00:00:00.000Z" }), control, treatment, { earliestDataTs: Date.parse("2026-03-01T00:00:00.000Z") });
  assert.equal(r.retroactive, true);
  assert.ok(r.caveat.includes("사전등록 무효"), "무효 경고 병기");
});

test("compareCohorts: 빈 코호트도 크래시 없이 underpowered", () => {
  const r = compareCohorts(reg(), [], []);
  assert.equal(r.control.n, 0);
  assert.equal(r.effectSize, null);
  assert.equal(r.ci95, null);
  assert.equal(r.verdict, "underpowered");
});
