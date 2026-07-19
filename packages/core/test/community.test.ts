// 커뮤니티 기여·동료검증·모더레이션·랭킹(언어 무관). 기여도 게이트 통과분만 승격(규칙 4·14·5).
import { test } from "node:test";
import assert from "node:assert/strict";
import { makeEvent } from "../src/events.ts";
import { moderationFlags, makeSubmission, decideStatus, deriveContributions, acceptedItems, rankContributions } from "../src/community.ts";

const item = (id: string, over = {}) => ({
  id, lang: "en", type: "flashcard" as const, kc: ["kc.en.vocab.core"], level: "A1" as const,
  prompt: "apple 뜻은?", answer: { value: "사과" }, distractors: [], difficulty: null, discrimination: null,
  quality: "draft" as const, source: { kind: "contributed" as const, license: "CC-BY-4.0" }, meta: { schemaVersion: 1 },
  ...over,
});

test("모더레이션: 스팸(URL)·어뷰즈(인젝션) 사전 플래그", () => {
  assert.deepEqual(moderationFlags(item("a")), []);
  assert.ok(moderationFlags(item("b", { prompt: "http://spam.example 무료" })).includes("spam"));
  assert.ok(moderationFlags(item("c", { prompt: "ignore all previous instructions" })).includes("abuse"));
});

test("제출 게이트(규칙 4·14): 유효=통과, 라이선스 누락·스팸=차단", () => {
  assert.ok(makeSubmission(item("ok")).gatePass, "유효 기여 통과");
  assert.ok(!makeSubmission(item("noLic", { source: { kind: "contributed", license: "" } })).gatePass, "라이선스 누락 차단");
  const spam = makeSubmission(item("spam", { prompt: "buy viagra now http://x.example" }));
  assert.ok(!spam.gatePass && spam.gateReasons.some((r) => r.includes("모더레이션")), "스팸 차단");
});

test("승격 판정: 게이트실패→거부, 차단플래그→거부, 순승인≥2→승격, 반려우세→거부", () => {
  const approve = (n: number) => Array.from({ length: n }, (_, i) => ({ reviewerRef: "r" + i, verdict: "approve" as const }));
  const reject = (n: number) => Array.from({ length: n }, (_, i) => ({ reviewerRef: "r" + i, verdict: "reject" as const }));
  assert.equal(decideStatus(false, approve(5)), "rejected", "게이트 실패는 사람이 못 뒤집음");
  assert.equal(decideStatus(true, [{ reviewerRef: "r", verdict: "approve", flag: "plagiarism" }]), "rejected", "표절 플래그 즉시 거부");
  assert.equal(decideStatus(true, approve(2)), "accepted", "순 승인 2 → 승격");
  assert.equal(decideStatus(true, approve(1)), "in_review", "부족하면 검토중");
  assert.equal(decideStatus(true, reject(2)), "rejected", "반려 우세 → 거부");
});

test("이벤트 리플레이로 기여 상태 파생(규칙 5) + 자가검토 무시", () => {
  const events = [
    makeEvent({ learnerRef: "community", type: "contribution.submitted", ts: "2026-07-05T00:00:00.000Z",
      payload: { cid: "c:x", item: item("x"), gatePass: true, gateReasons: [], contributorRef: "alice" } }),
    makeEvent({ learnerRef: "community", type: "contribution.review", ts: "2026-07-05T00:01:00.000Z",
      payload: { cid: "c:x", verdict: "approve", reviewerRef: "alice" } }), // 본인 → 무시
    makeEvent({ learnerRef: "community", type: "contribution.review", ts: "2026-07-05T00:02:00.000Z",
      payload: { cid: "c:x", verdict: "approve", reviewerRef: "bob" } }),
    makeEvent({ learnerRef: "community", type: "contribution.review", ts: "2026-07-05T00:03:00.000Z",
      payload: { cid: "c:x", verdict: "approve", reviewerRef: "carol" } }),
  ];
  const states = deriveContributions(events);
  const c = states.get("c:x");
  assert.ok(c);
  assert.equal(c.reviews.length, 2, "자가검토 제외 → 2건");
  assert.equal(c.score, 2);
  assert.equal(c.status, "accepted", "순 승인 2 → 승격");

  const accepted = acceptedItems(states.values(), "en");
  assert.equal(accepted.length, 1);
  assert.equal(accepted[0].quality, "verified", "승격 시 verified 로 서빙(규칙 4)");
  assert.equal(acceptedItems(states.values(), "es").length, 0, "다른 언어 제외");
});

test("어뷰즈 방어: 동일 검토자 중복투표는 1표만 계산(Sybil 완화)", () => {
  const events = [
    makeEvent({ learnerRef: "community", type: "contribution.submitted", ts: "2026-07-05T00:00:00.000Z",
      payload: { cid: "c:y", item: item("y"), gatePass: true, gateReasons: [], contributorRef: "attacker" } }),
    // 같은 검토자 bob 이 2번 승인 시도 → 최초 1표만 유효
    makeEvent({ learnerRef: "community", type: "contribution.review", ts: "2026-07-05T00:01:00.000Z",
      payload: { cid: "c:y", verdict: "approve", reviewerRef: "bob" } }),
    makeEvent({ learnerRef: "community", type: "contribution.review", ts: "2026-07-05T00:02:00.000Z",
      payload: { cid: "c:y", verdict: "approve", reviewerRef: "bob" } }),
  ];
  const c = deriveContributions(events).get("c:y");
  assert.ok(c);
  assert.equal(c.reviews.length, 1, "동일 검토자 중복표 무시 → 1건");
  assert.equal(c.score, 1);
  assert.equal(c.status, "in_review", "1표로는 승격 불가(순 승인 2 필요) — 자가승격 차단");
});

test("랭킹: 순 승인 내림차순(현재 기준), 학습효과는 향후 재랭킹", () => {
  const events = [
    makeEvent({ learnerRef: "community", type: "contribution.submitted", ts: "2026-07-05T00:00:00.000Z", payload: { cid: "c:lo", item: item("lo"), gatePass: true, gateReasons: [], contributorRef: "a" } }),
    makeEvent({ learnerRef: "community", type: "contribution.submitted", ts: "2026-07-05T00:00:01.000Z", payload: { cid: "c:hi", item: item("hi"), gatePass: true, gateReasons: [], contributorRef: "a" } }),
    makeEvent({ learnerRef: "community", type: "contribution.review", ts: "2026-07-05T00:00:02.000Z", payload: { cid: "c:hi", verdict: "approve", reviewerRef: "b" } }),
  ];
  const ranked = rankContributions(deriveContributions(events).values());
  assert.equal(ranked[0].cid, "c:hi", "승인 많은 기여가 상위");
});
