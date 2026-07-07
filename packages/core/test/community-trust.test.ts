// 검토자 신뢰가중(안티어뷰즈). 입증된 악성 표는 축소, 신규는 중립(하위호환). 규칙 1·skill.
import { test } from "node:test";
import assert from "node:assert/strict";
import { makeEvent } from "../src/events.ts";
import { evaluateCommunity, computeTrust, deriveContributions } from "../src/community.ts";

let t = 0;
const ts = () => `2026-07-05T00:${String(t++).padStart(2, "0")}:00.000Z`;
const item = (id: string) => ({ id, lang: "en", type: "flashcard" as const, kc: ["kc.en.vocab.core"], level: "A1" as const, prompt: id, answer: { value: "x" }, distractors: [], difficulty: null, discrimination: null, quality: "draft" as const, source: { kind: "contributed" as const, license: "CC-BY-4.0" }, meta: { schemaVersion: 1 } });
const submit = (id: string, gatePass: boolean) => makeEvent({ learnerRef: "community", type: "contribution.submitted", ts: ts(), payload: { cid: "c:" + id, item: item(id), gatePass, gateReasons: [], contributorRef: "author" } });
const review = (id: string, reviewer: string, verdict = "approve") => makeEvent({ learnerRef: "community", type: "contribution.review", ts: ts(), payload: { cid: "c:" + id, verdict, reviewerRef: reviewer } });

// 이력: badA·badB 가 게이트 실패(객관적 불량) 문항을 반복 승인 → 신뢰 하락
function badHistory() {
  const evs = [];
  for (let i = 0; i < 6; i++) { evs.push(submit("bad" + i, false)); evs.push(review("bad" + i, "badA")); evs.push(review("bad" + i, "badB")); }
  return evs;
}

test("게이트 실패를 반복 승인한 검토자는 신뢰가 중립(0.5) 미만으로 떨어진다", () => {
  const trust = computeTrust(deriveContributions(badHistory()).values());
  assert.ok((trust.get("badA") ?? 1) < 0.5, "입증된 악성 검토자 신뢰 < 0.5");
});

test("입증된 악성 2표로는 새 기여를 승격시키지 못한다(조직적 밀어주기 방어)", () => {
  const events = [...badHistory(), submit("target", true), review("target", "badA"), review("target", "badB")];
  const { states } = evaluateCommunity(events);
  assert.notEqual(states.get("c:target")?.status, "accepted", "저신뢰 2표는 가중 미달 → 승격 차단");
});

test("신규 검토자 2표는 중립 가중이라 그대로 승격된다(하위호환)", () => {
  const events = [...badHistory(), submit("fresh", true), review("fresh", "new1"), review("fresh", "new2")];
  const { states } = evaluateCommunity(events);
  assert.equal(states.get("c:fresh")?.status, "accepted", "신규=중립 1.0 → 2표 승격");
});
