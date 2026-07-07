// 진화 루프 ↔ 커뮤니티: 사용 데이터로 승격 기여를 재평가(강등/재랭킹). 규칙 1·3.
import { test } from "node:test";
import assert from "node:assert/strict";
import { makeEvent } from "../../core/src/index.ts";
import { reevaluateCommunity, usageResponses } from "../src/community-effect.ts";

const strong = ["s1", "s2", "s3", "s4", "s5"];
const weak = ["w1", "w2", "w3", "w4", "w5"];
const item = (id: string) => ({ id, lang: "en", type: "flashcard", kc: ["kc.en.vocab.core"], level: "A1", prompt: id, answer: { value: "x" }, distractors: [], difficulty: null, discrimination: null, quality: "draft", source: { kind: "contributed", license: "CC-BY-4.0" }, meta: { schemaVersion: 1 } });

let t = 0;
const ts = () => `2026-07-05T00:${String(t++).padStart(2, "0")}:00.000Z`;

// 두 기여(g=건강, k=망가짐)를 제출·2인 승인으로 승격
function communityEvents() {
  const evs = [];
  for (const id of ["g", "k"]) {
    evs.push(makeEvent({ learnerRef: "community", type: "contribution.submitted", ts: ts(), payload: { cid: "c:" + id, item: item(id), gatePass: true, gateReasons: [], contributorRef: "author" } }));
    for (const r of ["rev1", "rev2"]) evs.push(makeEvent({ learnerRef: "community", type: "contribution.review", ts: ts(), payload: { cid: "c:" + id, verdict: "approve", reviewerRef: r } }));
  }
  return evs;
}

// 사용 데이터: 앵커로 능력차 형성 + g(정변별)·k(역변별)
function usageEvents() {
  const evs = [];
  const push = (learner: string, item: string, correct: boolean) => evs.push(makeEvent({ learnerRef: learner, type: "item.response", itemId: item, ts: ts(), payload: { correct } }));
  for (const a of ["a1", "a2", "a3"]) { for (const s of strong) push(s, a, true); for (const w of weak) push(w, a, false); }
  for (const s of strong) push(s, "g", true); for (const w of weak) push(w, "g", false);
  for (const s of strong) push(s, "k", false); for (const w of weak) push(w, "k", true);
  return evs;
}

test("응답 추출: item.response → Response[]", () => {
  const rs = usageResponses(usageEvents());
  assert.ok(rs.length > 0);
  assert.ok(rs.every((r) => typeof r.correct === "boolean" && r.item && r.learner));
});

test("재평가: 망가진 기여는 강등, 건강한 기여는 상위 랭킹(인기 아닌 실효)", () => {
  const report = reevaluateCommunity(communityEvents(), usageEvents(), { minN: 10 });
  assert.ok(report.demoted.includes("k"), "역변별 문항 k 강등");
  assert.ok(report.healthy.includes("g"), "건강한 문항 g");
  assert.ok(!report.demoted.includes("g"), "g 는 강등 아님");
  assert.equal(report.ranked[0].item.id, "g", "실효 높은 g 가 상위");
  assert.equal(report.reviewed, 2, "두 승격 기여 모두 충분한 데이터로 판정");
});
