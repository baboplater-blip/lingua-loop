// 커뮤니티 기여 전 루프: 제출 → 자동 게이트 → 동료 검증 → 승격 → 서빙 뱅크 합류. 영속·보호.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { newStore, submitContribution, reviewContribution, listContributions, communityBank, deleteLearner, exportLearner, COMMUNITY_REF } from "../src/handlers.ts";
import { openFileStore } from "../src/persist.ts";

const item = (id: string, over = {}) => ({
  id, lang: "en", type: "flashcard" as const, kc: ["kc.en.vocab.core"], level: "A1" as const,
  prompt: "banana 뜻은?", answer: { value: "바나나" }, distractors: [], difficulty: null, discrimination: null,
  quality: "draft" as const, source: { kind: "contributed" as const, license: "CC-BY-4.0" }, meta: { schemaVersion: 1 }, ...over,
});

test("전 루프: 제출 → 두 명 승인 → 승격 → 서빙 뱅크 합류(규칙 4)", () => {
  const store = newStore();
  const sub = submitContribution(store, { contributorRef: "alice", item: item("en.contrib.banana") });
  assert.ok(sub.gatePass, "게이트 통과");
  assert.equal(sub.status, "in_review");
  assert.equal(communityBank(store, "en").length, 0, "검토 전엔 서빙 안 함");

  reviewContribution(store, { reviewerRef: "bob", cid: sub.cid, verdict: "approve" });
  const afterOne = reviewContribution(store, { reviewerRef: "carol", cid: sub.cid, verdict: "approve" });
  assert.equal(afterOne?.status, "accepted", "순 승인 2 → 승격");
  const bank = communityBank(store, "en");
  assert.equal(bank.length, 1, "승격분이 서빙 뱅크에");
  assert.equal(bank[0].quality, "verified", "verified 로 노출(규칙 4)");
});

test("게이트 실패 기여는 아무리 승인받아도 서빙되지 않음(규칙 4)", () => {
  const store = newStore();
  const sub = submitContribution(store, { contributorRef: "a", item: item("bad", { source: { kind: "contributed", license: "" } }) });
  assert.ok(!sub.gatePass, "라이선스 누락 → 게이트 실패");
  reviewContribution(store, { reviewerRef: "b", cid: sub.cid, verdict: "approve" });
  reviewContribution(store, { reviewerRef: "c", cid: sub.cid, verdict: "approve" });
  assert.equal(communityBank(store, "en").length, 0, "게이트 실패는 사람 승인으로도 못 뒤집음");
});

test("검토 큐/리더보드 조회", () => {
  const store = newStore();
  submitContribution(store, { contributorRef: "a", item: item("q1") });
  const inReview = listContributions(store, { status: "in_review" });
  assert.equal(inReview.length, 1);
  assert.equal(inReview[0].item.id, "q1");
});

const DIR = join(tmpdir(), "lingua-loop-community-test");
test("영속: 기여·검증이 재시작 후에도 유지된다(규칙 5)", () => {
  rmSync(DIR, { recursive: true, force: true });
  const s1 = openFileStore(DIR);
  const sub = submitContribution(s1, { contributorRef: "alice", item: item("en.contrib.keep") });
  reviewContribution(s1, { reviewerRef: "bob", cid: sub.cid, verdict: "approve" });
  reviewContribution(s1, { reviewerRef: "carol", cid: sub.cid, verdict: "approve" });

  const s2 = openFileStore(DIR); // 재시작
  const bank = communityBank(s2, "en");
  assert.equal(bank.length, 1, "재시작 후에도 승격 콘텐츠 복원");
  assert.equal(bank[0].id, "en.contrib.keep");
});

test("공용 기여 로그는 개인 계정 삭제로 지워지지 않는다(보호)", () => {
  const store = newStore();
  submitContribution(store, { contributorRef: "alice", item: item("prot") });
  assert.equal(deleteLearner(store, COMMUNITY_REF), false, "community 삭제 거부");
  assert.ok(exportLearner(store, COMMUNITY_REF).length >= 1, "기여 로그 보존");
});

after(() => rmSync(DIR, { recursive: true, force: true }));
