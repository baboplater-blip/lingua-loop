// 효능 스모크(규칙 1): A/B 가드레일이 학습성과만 보상하고 참여도 부풀리기는 반려하는가.
// = 다크패턴 안티테스트의 알고리즘 레벨 버전.
import { test } from "node:test";
import assert from "node:assert/strict";
import { abInterval } from "../src/experiment.ts";
import { dueInDays } from "../../core/src/index.ts";

const seeds = Array.from({ length: 30 }, (_, i) => 3 + i * 5);

test("진짜 개선(과소복습→적정 간격)은 채택된다", () => {
  const ab = abInterval(() => 40, () => 3, seeds); // 40일마다 → 3일마다: 리텐션 개선
  assert.equal(ab.accept, true);
  assert.ok(ab.retentionDelta > 0, `리텐션 Δ ${(ab.retentionDelta * 100).toFixed(1)}%p > 0`);
});

test("다크패턴(복습만 3배, 성과 정체)은 반려된다 (규칙 1)", () => {
  const ab = abInterval((c) => dueInDays(c), (c) => dueInDays(c) / 3, seeds); // 복습 3배 → 참여↑ 성과≈
  assert.equal(ab.accept, false, "참여만 늘면 채택 안 됨");
  assert.ok(ab.reviewDelta > 0, "복습(참여)은 늘었지만");
  assert.ok(ab.reason.includes("참여는 목표 아님"), "반려 사유가 규칙1을 명시");
});
