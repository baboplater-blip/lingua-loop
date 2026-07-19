// 실험 개입 실배선 — 배정 팔에 따라 serveItems 연습 순서가 실제로 달라지는가(등록→배정→차등 서빙).
import { test } from "node:test";
import assert from "node:assert/strict";
import { newStore, registerExperiment, practiceOrderFor, serveItems, loadGraph } from "../src/handlers.ts";
import { assignVariant } from "../../core/src/index.ts";
import type { ContentItem } from "../../core/src/index.ts";

const graph = loadGraph([
  { id: "k1", skill: "reading", level: "A1", prereq: [] },
  { id: "k2", skill: "reading", level: "A1", prereq: [] },
  { id: "k3", skill: "reading", level: "A1", prereq: [] },
]);
const it = (id: string, kc: string): ContentItem => ({
  id, lang: "en", type: "flashcard", kc: [kc], level: "A1", prompt: id, answer: { value: "x" },
  difficulty: null, discrimination: null, quality: "verified", source: { kind: "generated", license: "CC-BY" },
});
// 블록 순서로 뱅크 구성 → 기본/블록은 이 순서, 인터리빙은 교차 순서.
const bank = [it("a", "k1"), it("b", "k1"), it("c", "k2"), it("d", "k2"), it("e", "k3"), it("f", "k3")];
const kcOf = (xs: ContentItem[]) => xs.map((x) => x.kc[0]).join("");

// 배정이 갈리는 두 학습자 ref 를 찾는다(결정적).
function pickRefs(experimentId: string) {
  let t = "", c = "";
  for (let i = 0; i < 100 && (!t || !c); i++) {
    const ref = "L" + i;
    if (assignVariant(experimentId, ref, 0.5) === "treatment") t = t || ref;
    else c = c || ref;
  }
  return { t, c };
}

test("개입 미등록: serveItems 는 기본(뱅크) 순서 — 무회귀(규칙 16)", () => {
  const store = newStore();
  assert.equal(practiceOrderFor(store, "anyone"), null, "실험 없으면 정책 null");
  const served = serveItems(store, "anyone", "en", graph, bank);
  assert.equal(kcOf(served), "k1k1k2k2k3k3", "기본 순서 = 뱅크 순서(불변)");
});

test("practice_order 실험: 실험군=인터리빙·통제군=블록으로 차등 서빙", () => {
  const store = newStore();
  registerExperiment(store, { experimentId: "expIL", hypothesis: "교차연습이 θ 상승을 키운다", treatmentShare: 0.5, minSamplePerArm: 10, intervention: { kind: "practice_order" } }, "2026-01-01T00:00:00.000Z");
  const { t, c } = pickRefs("expIL");
  assert.ok(t && c, "실험군·통제군 ref 확보");

  assert.equal(practiceOrderFor(store, t), "interleaved", "실험군 = 인터리빙");
  assert.equal(practiceOrderFor(store, c), "blocked", "통제군 = 블록");

  const treated = serveItems(store, t, "en", graph, bank);
  const control = serveItems(store, c, "en", graph, bank);
  // 실험군: 인접 아이템이 다른 KC(교차)
  assert.notEqual(treated[0].kc[0], treated[1].kc[0], "실험군 첫 두 아이템 다른 KC(인터리빙)");
  assert.equal(kcOf(treated), "k1k2k3k1k2k3", "실험군 라운드로빈 순서");
  // 통제군: 같은 KC 를 모아서(블록)
  assert.equal(treated[0].kc[0], control[0].kc[0], "둘 다 k1 로 시작(집합 동일)");
  assert.equal(kcOf(control), "k1k1k2k2k3k3", "통제군 블록 순서");
  // 집합 보존 — 순서만 다르고 서빙 아이템 구성은 동일(분량 불변, 규칙 1)
  assert.deepEqual(new Set(treated.map((x) => x.id)), new Set(control.map((x) => x.id)), "두 팔 아이템 집합 동일");
});

test("개입 없는 실험(관측 비교만): 서빙 순서는 기본 유지", () => {
  const store = newStore();
  registerExperiment(store, { experimentId: "obsOnly", hypothesis: "관측만", treatmentShare: 0.5, minSamplePerArm: 10 }, "2026-01-01T00:00:00.000Z");
  assert.equal(practiceOrderFor(store, "L1"), null, "practice_order 개입 아니면 정책 null");
  assert.equal(kcOf(serveItems(store, "L1", "en", graph, bank)), "k1k1k2k2k3k3", "기본 순서 유지");
});
