// 연습 순서 정책(실험 개입 레버) — 인터리빙/블록이 집합을 보존하며 순서만 바꾸는가(규칙 1·5).
import { test } from "node:test";
import assert from "node:assert/strict";
import { orderByPractice } from "../src/index.ts";

const items = [
  { id: "a", kc: ["k1"] },
  { id: "b", kc: ["k1"] },
  { id: "c", kc: ["k2"] },
  { id: "d", kc: ["k2"] },
  { id: "e", kc: ["k3"] },
];
const ids = (xs: { id: string }[]) => xs.map((x) => x.id).join("");

test("blocked: 같은 KC 아이템을 모아 순차(첫 등장 순서 유지)", () => {
  const r = orderByPractice(items, "blocked");
  assert.equal(ids(r), "abcde", "k1[a,b]·k2[c,d]·k3[e]");
});

test("interleaved: KC 그룹을 라운드로빈으로 교차", () => {
  const r = orderByPractice(items, "interleaved");
  assert.equal(ids(r), "acebd", "i=0 a,c,e · i=1 b,d");
  // 인접 아이템은 대체로 다른 KC(교차연습의 핵심)
  assert.notEqual(r[0].kc[0], r[1].kc[0], "첫 두 아이템은 다른 KC");
});

test("집합 보존 — 순서만 바뀌고 아이템 수·구성 동일(분량 불변, 규칙 1)", () => {
  for (const ord of ["blocked", "interleaved"] as const) {
    const r = orderByPractice(items, ord);
    assert.equal(r.length, items.length, "개수 동일");
    assert.deepEqual(new Set(ids(r).split("")), new Set(["a", "b", "c", "d", "e"]), "구성 동일");
  }
});

test("단일 그룹·빈 입력·빈 kc 도 크래시 없음", () => {
  assert.equal(ids(orderByPractice([{ id: "x", kc: ["k1"] }, { id: "y", kc: ["k1"] }], "interleaved")), "xy", "한 그룹이면 순서 유지");
  assert.deepEqual(orderByPractice([], "blocked"), []);
  assert.deepEqual(orderByPractice([], "interleaved"), []);
  const noKc = orderByPractice([{ id: "p", kc: [] as string[] }, { id: "q", kc: ["k1"] }], "interleaved");
  assert.equal(noKc.length, 2, "빈 kc 도 한 그룹으로 처리");
});
