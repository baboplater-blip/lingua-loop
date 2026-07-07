import { test } from "node:test";
import assert from "node:assert/strict";
import { retrievability, intervalForRetention, initCard, nextState, dueInDays } from "../src/fsrs.ts";

test("retrievability는 경과일에 대해 단조 감소, R(0)=1", () => {
  assert.equal(retrievability(2, 0), 1);
  assert.ok(retrievability(2, 1) > retrievability(2, 5));
  assert.ok(retrievability(2, 5) > retrievability(2, 20));
});

test("안정성이 클수록 복습 간격이 길다", () => {
  assert.ok(dueInDays({ stability: 10, difficulty: 5 }) > dueInDays({ stability: 1, difficulty: 5 }));
  // target 0.9 정합
  assert.ok(Math.abs(intervalForRetention(1, 0.9) - 1) < 1e-9);
});

test("정답(good)은 안정성↑, 오답(again)은 안정성↓ (양방향 단언)", () => {
  const state = { stability: 5, difficulty: 5 };
  const good = nextState(state, "good", 5);
  const again = nextState(state, "again", 5);
  assert.ok(good.stability > state.stability, "good은 안정성 증가");
  assert.ok(again.stability < state.stability, "again은 안정성 감소");
  assert.ok(again.difficulty > good.difficulty, "again은 난이도 상승");
});

test("nextState는 결정적(같은 입력 → 같은 출력)", () => {
  const s = { stability: 3, difficulty: 4 };
  assert.deepEqual(nextState(s, "good", 2), nextState(s, "good", 2));
});

test("초기 카드는 grade에 따라 안정성 차등(easy>good>hard>again)", () => {
  assert.ok(initCard("easy").stability > initCard("good").stability);
  assert.ok(initCard("good").stability > initCard("hard").stability);
  assert.ok(initCard("hard").stability > initCard("again").stability);
});
