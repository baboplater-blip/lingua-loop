// 개방 데이터셋 — 동의 필터·자유텍스트 스크럽·재식별 레드팀(k-익명성). 프라이버시 우선(규칙 7).
import { test } from "node:test";
import assert from "node:assert/strict";
import { makeEvent } from "../src/events.ts";
import { filterConsented, anonymizeEvents, reidentificationRisk, buildOpenDataset, consentAllows, datasetCard } from "../src/open-dataset.ts";

const ev = (learner: string, over = {}) => makeEvent({ learnerRef: learner, type: "item.response", kc: ["kc.x"], itemId: "it", payload: { correct: true }, consent: "learn+improve+open", ts: "2026-07-05T00:00:00.000Z", ...over });

test("동의 계층: 개방은 learn+improve+open 만", () => {
  assert.ok(consentAllows("learn+improve+open", "learn+improve+open"));
  assert.ok(!consentAllows("learn", "learn+improve+open"));
  assert.ok(!consentAllows("learn+improve", "learn+improve+open"));
  const events = [ev("a"), ev("b", { consent: "learn" }), ev("c", { consent: "learn+improve" })];
  assert.equal(filterConsented(events).length, 1, "개방 동의만 통과");
});

test("익명화: 가명 재발급 + 자유텍스트 스크럽 + 시각 coarsen", () => {
  const events = [makeEvent({ learnerRef: "alice", type: "tutor.turn", payload: { text: "내 이름은 앨리스야", errorTags: ["be"] }, consent: "learn+improve+open", ts: "2026-07-05T13:45:12.000Z" })];
  const anon = anonymizeEvents(events, new Map([["alice", "d0001"]]));
  assert.equal(anon[0].learnerRef, "d0001", "가명 재발급");
  assert.ok(!("text" in anon[0].payload), "자유텍스트 제거");
  assert.deepEqual(anon[0].payload.errorTags, ["be"], "특징은 유지");
  assert.equal(anon[0].ts, "2026-07-05", "시각 일 단위");
});

test("재식별 레드팀: 준식별자 그룹이 k 미만이면 실패, singleton 지목", () => {
  // 프로파일 동일(kc 1개·이벤트 1개·같은 달) 학습자 2명 + 다른 프로파일 1명(이벤트 50+)
  const byLearner = new Map([
    ["a", [ev("a")]],
    ["b", [ev("b")]],
    ["loner", Array.from({ length: 60 }, () => ev("loner"))],
  ]);
  const r = reidentificationRisk(byLearner, 2);
  assert.equal(r.passed, false, "singleton 존재 → 실패");
  assert.ok(r.singletonLearners.includes("loner"), "고유 프로파일 지목");
  assert.ok(!r.singletonLearners.includes("a"), "k 충족 그룹은 안전");
});

test("파이프라인: singleton 억제 후 k-익명성 통과, 통과분만 릴리스", () => {
  const events = [ev("a"), ev("b"), ...Array.from({ length: 60 }, () => ev("loner"))];
  const { dataset, report } = buildOpenDataset(events, { kTarget: 2 });
  assert.equal(report.suppressedLearners, 1, "loner 억제");
  assert.ok(report.redteamPassed, "억제 후 통과");
  assert.ok(dataset.every((e) => e.learnerRef !== "loner" && !e.learnerRef.startsWith("l")), "릴리스에 loner 없음");
  assert.ok(dataset.every((e) => /^d[0-9a-z]+$/.test(e.learnerRef)), "익명 가명");
});

test("동의 없으면 빈 데이터셋(옵트인 0)", () => {
  const events = [ev("a", { consent: "learn" }), ev("b", { consent: "learn+improve" })];
  const { report } = buildOpenDataset(events);
  assert.equal(report.releasedEvents, 0, "개방 동의 0 → 빈 데이터셋");
});

test("데이터 카드 자동생성: 무엇을·익명화·k·라이선스 포함(카드 없이 공개 금지)", () => {
  const events = [ev("a"), ev("b"), ...Array.from({ length: 60 }, () => ev("loner"))];
  const { report } = buildOpenDataset(events, { kTarget: 2 });
  const card = datasetCard(report);
  assert.ok(card.includes("개방 데이터셋 카드"), "카드 제목");
  assert.ok(card.includes("k-익명성") && card.includes(`k=${report.kTarget}`), "k-익명성 명시");
  assert.ok(card.includes("가명 재발급") && card.includes("자유텍스트 스크럽"), "익명화 절차");
  assert.ok(card.includes(report.license), "라이선스");
  assert.ok(card.includes("item.response"), "이벤트 종류 스키마");
  assert.ok(!/\d{4}-\d\d-\d\dT/.test(card), "타임스탬프 없음(결정적)");
});
