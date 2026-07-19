// 등급 읽기 i+1 선택 + 지문 검증(규칙 4·11). 언어 무관.
import { test } from "node:test";
import assert from "node:assert/strict";
import { cefrFromAbility, validateReading, selectGradedReading } from "../src/reading.ts";

const learner = (ability = {}) => ({ learnerRef: "t", lang: "en", kcState: {}, ability, fromEventCount: 0 });
const passage = (id, level, over = {}) => ({
  id, level, kc: ["kc.x"], title: id, text: "This is a valid graded passage for reading practice.",
  glossary: { valid: "유효한" }, source: { kind: "generated", license: "CC-BY-4.0" }, ...over,
});

test("능력→CEFR: 데이터 없으면 A1, 능력 오르면 상향(C1까지)", () => {
  assert.equal(cefrFromAbility(undefined), "A1");
  assert.equal(cefrFromAbility(0.5), "A2");
  assert.equal(cefrFromAbility(1.5), "B1");
  assert.equal(cefrFromAbility(2.5), "B2");
  assert.equal(cefrFromAbility(3.5), "C1", "B2 상한 넘으면 C1(원어민 경로)");
});

test("지문 검증(규칙 4·6): 라이선스·정답유효·본문 없으면 탈락", () => {
  assert.ok(validateReading(passage("ok", "A1")));
  assert.ok(!validateReading(passage("noLic", "A1", { source: { kind: "generated", license: "" } })), "라이선스 누락 탈락");
  assert.ok(!validateReading(passage("badQ", "A1", { questions: [{ q: "?", answer: "z", options: ["a", "b"] }] })), "정답이 보기에 없으면 탈락");
  assert.ok(!validateReading(passage("empty", "A1", { text: "짧음" })), "본문 부실 탈락");
  assert.ok(!validateReading(passage("noKc", "A1", { kc: [] })), "KC 없으면 탈락");
  assert.ok(!validateReading(passage("badLevel", "Z9" as never)), "유효하지 않은 CEFR 레벨 탈락(오타 지문 노출 차단)");
  assert.ok(!validateReading(passage("noLevel", undefined as never)), "레벨 누락 탈락");
});

test("i+1 선택: 현수준·한단계위 선호, 두단계위(너무 어려움) 배제, 결정적", () => {
  const passages = [passage("a1", "A1"), passage("a2", "A2"), passage("b2", "B2")];
  const beginner = selectGradedReading(learner({}), passages); // A1 학습자
  const ids = beginner.map((p) => p.id);
  assert.equal(ids[0], "a1", "현 수준(A1) 최우선 — 이해가능");
  assert.ok(ids.includes("a2"), "i+1(A2) 포함 — 자극");
  assert.ok(!ids.includes("b2"), "두 단계 위(B2)는 너무 어려워 배제");

  const again = selectGradedReading(learner({}), passages).map((p) => p.id);
  assert.deepEqual(ids, again, "같은 상태·지문셋이면 같은 순서(결정적)");

  // 능력이 오르면(A2) 선택도 이동
  const inter = selectGradedReading(learner({ reading: 0.5 }), passages).map((p) => p.id);
  assert.equal(inter[0], "a2", "A2 학습자는 A2가 현 수준");
});

test("검증 실패 지문은 서빙에서 제외(규칙 4)", () => {
  const passages = [passage("good", "A1"), passage("bad", "A1", { source: { kind: "generated", license: "" } })];
  const served = selectGradedReading(learner({}), passages).map((p) => p.id);
  assert.deepEqual(served, ["good"], "미검증 지문 노출 금지");
});
