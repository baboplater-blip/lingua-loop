// SQLite 이벤트 스토어(node:sqlite 내장, 제로 의존). JSONL 과 동일 계약 — 재시작 유지·삭제·append-only.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { openSqliteStore } from "../src/sqlite-store.ts";
import { ingest, stateOf, exportLearner, deleteLearner, submitContribution, reviewContribution, communityBank } from "../src/handlers.ts";

const DB = join(tmpdir(), "lingua-loop-sqlite-test.sqlite");
function freshDb(): string {
  for (const suffix of ["", "-wal", "-shm"]) rmSync(DB + suffix, { force: true });
  return DB;
}
const review = (learner: string, kc: string, i: number, correct: boolean) => ({
  learnerRef: learner, type: "item.response" as const, kc: [kc], itemId: kc + ".item" + i,
  payload: { correct, grade: correct ? "good" : "again" }, consent: "learn" as const, ts: `2026-07-05T00:0${i}:00.000Z`,
});
const item = (id: string) => ({ id, lang: "en", type: "flashcard" as const, kc: ["kc.en.vocab.core"], level: "A1" as const, prompt: id + " 뜻은?", answer: { value: "x" }, distractors: [], difficulty: null, discrimination: null, quality: "draft" as const, source: { kind: "contributed" as const, license: "CC-BY-4.0" }, meta: { schemaVersion: 1 } });

test("SQLite: 재시작(재오픈)해도 학습 상태 유지", () => {
  const db = freshDb();
  const s1 = openSqliteStore(db);
  ingest(s1, review("learner-A", "kc.en.vocab.core", 1, true));
  ingest(s1, review("learner-A", "kc.en.vocab.core", 2, true));
  ingest(s1, review("learner-B", "kc.en.present_be", 1, false));
  assert.equal(stateOf(s1, "learner-A", "en").kcState["kc.en.vocab.core"].reps, 2);
  s1.close?.();

  const s2 = openSqliteStore(db);
  assert.equal(stateOf(s2, "learner-A", "en").kcState["kc.en.vocab.core"].reps, 2, "재시작 후 복원");
  assert.equal(exportLearner(s2, "learner-B").length, 1, "다른 학습자도 복원");
  s2.close?.();
});

test("SQLite: append-only 로 이벤트가 누적, 삭제는 학습자 데이터 제거(규칙 6)", () => {
  const db = freshDb();
  const s1 = openSqliteStore(db);
  ingest(s1, review("solo", "kc.en.vocab.core", 1, true));
  ingest(s1, review("solo", "kc.en.vocab.core", 2, true));
  assert.equal(exportLearner(s1, "solo").length, 2);
  deleteLearner(s1, "solo");
  assert.equal(exportLearner(s1, "solo").length, 0, "삭제 후 메모리 비움");
  s1.close?.();

  const s2 = openSqliteStore(db);
  assert.equal(exportLearner(s2, "solo").length, 0, "재시작 후에도 삭제 유지");
  s2.close?.();
});

test("SQLite: 재시작 후 새 eventId 가 복원분과 충돌하지 않음", () => {
  const db = freshDb();
  const s1 = openSqliteStore(db);
  const e1 = ingest(s1, review("idt", "kc.en.vocab.core", 1, true));
  s1.close?.();
  const s2 = openSqliteStore(db);
  const e2 = ingest(s2, review("idt", "kc.en.vocab.core", 2, true));
  assert.notEqual(e1.eventId, e2.eventId);
  s2.close?.();
});

test("SQLite: 커뮤니티 기여·승격도 재시작 유지(공용 로그)", () => {
  const db = freshDb();
  const s1 = openSqliteStore(db);
  const sub = submitContribution(s1, { contributorRef: "alice", item: item("en.sqlite.keep") });
  reviewContribution(s1, { reviewerRef: "bob", cid: sub.cid, verdict: "approve" });
  reviewContribution(s1, { reviewerRef: "carol", cid: sub.cid, verdict: "approve" });
  assert.equal(communityBank(s1, "en").length, 1);
  s1.close?.();

  const s2 = openSqliteStore(db);
  assert.equal(communityBank(s2, "en").length, 1, "재시작 후 승격 콘텐츠 복원");
  s2.close?.();
});

after(() => { for (const suffix of ["", "-wal", "-shm"]) rmSync(DB + suffix, { force: true }); });
