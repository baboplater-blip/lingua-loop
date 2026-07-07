// 이벤트 영속(JSONL 파일 스토어) — 규칙 5(append-only)·6(소유권)·13(자가호스팅).
// "서버를 재시작해도 학습이 유지되는가"를 실제 파일 스토어를 열고 닫으며 증명한다.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { openFileStore, safeName } from "../src/persist.ts";
import { ingest, stateOf, exportLearner, deleteLearner } from "../src/handlers.ts";

const DIR = join(tmpdir(), "lingua-loop-persist-test");
function freshDir(): string {
  rmSync(DIR, { recursive: true, force: true });
  return DIR;
}

// 결정적 이벤트 — ts 를 명시해 재현 가능하게.
function review(learner: string, kc: string, i: number, correct: boolean) {
  return {
    learnerRef: learner,
    type: "item.response" as const,
    kc: [kc],
    itemId: kc + ".item" + i,
    payload: { correct, grade: correct ? "good" : "again" },
    consent: "learn" as const,
    ts: `2026-07-05T00:0${i}:00.000Z`,
  };
}

test("영속: 재시작(스토어 재오픈)해도 학습 상태가 유지된다", () => {
  const dir = freshDir();
  // ── 1회차 세션: 두 학습자가 학습 ──
  const s1 = openFileStore(dir);
  ingest(s1, review("learner-A", "kc.en.vocab.core", 1, true));
  ingest(s1, review("learner-A", "kc.en.vocab.core", 2, true));
  ingest(s1, review("learner-B", "kc.en.present_be", 1, false));
  const beforeA = stateOf(s1, "learner-A", "en").kcState["kc.en.vocab.core"];
  assert.equal(beforeA.reps, 2, "세션 중 reps=2");

  // ── 재시작: 완전히 새로운 스토어를 같은 디렉터리에서 연다 ──
  const s2 = openFileStore(dir);
  const afterA = stateOf(s2, "learner-A", "en").kcState["kc.en.vocab.core"];
  assert.equal(afterA.reps, 2, "재시작 후에도 reps=2 (디스크에서 복원)");
  assert.equal(exportLearner(s2, "learner-B").length, 1, "다른 학습자 로그도 복원");
});

test("영속: 파일은 학습자당 하나, append-only 로 커진다", () => {
  const dir = freshDir();
  const s = openFileStore(dir);
  ingest(s, review("solo", "kc.en.vocab.core", 1, true));
  const before = readFileSync(join(dir, safeName("solo")), "utf8");
  const linesBefore = before.trim().split("\n").length;
  ingest(s, review("solo", "kc.en.vocab.core", 2, true));
  const after = readFileSync(join(dir, safeName("solo")), "utf8");
  const linesAfter = after.trim().split("\n").length;
  assert.equal(linesBefore, 1, "1건 후 1줄");
  assert.equal(linesAfter, 2, "2건 후 2줄(추가만)");
  assert.ok(after.startsWith(before), "기존 줄은 그대로 — 재작성 아님(append-only)");
});

test("영속: 학습자 삭제는 파일까지 제거한다(규칙 6 소유권)", () => {
  const dir = freshDir();
  const s = openFileStore(dir);
  ingest(s, review("gone", "kc.en.vocab.core", 1, true));
  const path = join(dir, safeName("gone"));
  assert.ok(existsSync(path), "삭제 전 파일 존재");
  deleteLearner(s, "gone");
  assert.ok(!existsSync(path), "삭제 후 파일 제거");

  // 재시작해도 되살아나지 않는다
  const s2 = openFileStore(dir);
  assert.equal(exportLearner(s2, "gone").length, 0, "재시작 후에도 삭제 상태 유지");
});

test("영속: 재시작 후 새 이벤트 id 가 복원분과 충돌하지 않는다", () => {
  const dir = freshDir();
  const s1 = openFileStore(dir);
  const e1 = ingest(s1, review("idtest", "kc.en.vocab.core", 1, true));
  const s2 = openFileStore(dir); // 재시작 — id 카운터가 e1 뒤로 밀려야 함
  const e2 = ingest(s2, review("idtest", "kc.en.vocab.core", 2, true));
  assert.notEqual(e1.eventId, e2.eventId, "새 eventId 는 복원분과 달라야 한다");
});

test("영속: 안전 파일명은 경로 조작·특수문자를 차단한다", () => {
  assert.ok(!safeName("../etc/passwd").includes("/"), "경로 구분자 제거");
  assert.ok(!safeName("a b*c").includes("*"), "와일드카드 제거");
  assert.notEqual(safeName("a/b"), safeName("a_b"), "단사: 서로 다른 ref → 다른 파일");
  assert.ok(safeName("web-abc123").startsWith("web-abc123"), "안전한 ref 는 가독성 유지");
});

// 청소: 남은 아티팩트 제거(다른 게이트 스캔에 영향 없음)
after(() => rmSync(DIR, { recursive: true, force: true }));
