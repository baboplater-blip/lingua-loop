// 등급 읽기 서빙 + 언어팩 읽기 데이터 검증(규칙 4·11).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { newStore, serveReading, answerReading, stateOf } from "../src/handlers.ts";
import { validateReading, selectGradedReading, scoreComprehension, redactReadingAnswers } from "../../core/src/index.ts";
import type { ReadingPassage } from "../../core/src/index.ts";

function packReading(lang: string) {
  return JSON.parse(readFileSync(new URL(`../../packs/${lang}/reading.json`, import.meta.url), "utf8")).passages;
}

test("새 학습자에게 A1 지문부터 서빙(이해가능한 입력)", () => {
  const store = newStore();
  const served = serveReading(store, "r1", "en", packReading("en"), { limit: 3 });
  assert.ok(served.length >= 1, "지문 서빙");
  assert.equal(served[0].level, "A1", "초심자는 A1부터");
  assert.ok(served[0].glossary && Object.keys(served[0].glossary).length > 0, "클릭 사전 포함");
});

test("모든 배포 지문이 검증 통과(규칙 4 — 미검증 노출 금지), 5개 언어(규칙 11)", () => {
  // 라틴(en·es·sw)·CJK(zh)·RTL/아랍(ar)·가나+한자(ja)·데바나가리(hi) 전부 같은 검증기를 통과 — 코어는 문자/방향 무관
  for (const lang of ["en", "es", "zh", "ar", "sw", "ja", "hi"]) {
    const passages = packReading(lang);
    assert.ok(passages.length >= 2, `${lang} 지문 2개 이상`);
    assert.ok(passages.some((p: { level: string }) => p.level === "A2"), `${lang} A2 지문 포함(i+1 상향)`);
    for (const p of passages) {
      assert.ok(validateReading(p), `${lang} 지문 검증: ${p.id}`);
      assert.ok(p.source.license === "CC-BY-4.0", `${lang} 콘텐츠 라이선스 CC-BY-4.0`);
      assert.ok(p.id.startsWith(lang + "."), `${lang} 지문 id 접두사`);
      assert.ok(Object.keys(p.glossary).length > 0, `${lang} 클릭 사전 포함`);
    }
  }
});

test("모든 지문이 문법 KC를 태깅 — 읽기 채점이 어휘뿐 아니라 문법 숙달에도 기여(규칙 1·11)", () => {
  // 지문의 kc 전체가 answerReading 에서 크레딧되므로, 지문마다 최소 1개의 문법 KC(비어휘)가 있어야
  // 읽기 한 번이 어휘+문법을 함께 측정한다. 7개 언어 대칭.
  for (const lang of ["en", "es", "zh", "ar", "sw", "ja", "hi"]) {
    for (const p of packReading(lang) as ReadingPassage[]) {
      const grammar = p.kc.filter((k) => !k.includes("vocab"));
      assert.ok(grammar.length >= 1, `${lang} ${p.id}: 문법 KC 1개 이상 (현재 [${p.kc.join(", ")}])`);
    }
  }
});

test("answerReading: 신설 A2 문법 KC가 2회 정답으로 숙달 도달 — 비라틴 언어 전수(규칙 1)", () => {
  // 읽기 이해 정답 2회 → A2 지문의 신설 문법 KC(현재/기본문장)가 BKT 숙달 임계(0.6)에 도달. 5개 비라틴 언어 종단 검증.
  const a2Grammar: Record<string, string> = {
    zh: "kc.zh.basic_sentence", ar: "kc.ar.present_tense", sw: "kc.sw.present_tense", ja: "kc.ja.masu_form", hi: "kc.hi.present_habitual",
  };
  for (const lang of ["zh", "ar", "sw", "ja", "hi"]) {
    const store = newStore();
    const passages = packReading(lang) as ReadingPassage[];
    const p = passages.find((x) => x.level === "A2" && x.questions?.length && x.questions[0].answer);
    assert.ok(p, `${lang}: A2 문항 보유 지문`);
    const grammarKc = a2Grammar[lang];
    assert.ok(p!.kc.includes(grammarKc), `${lang} A2 지문이 신설 문법 KC(${grammarKc}) 태깅`);
    const right = p!.questions![0].answer as string;
    answerReading(store, lang, passages, { learnerRef: "g", passageId: p!.id, questionIndex: 0, choice: right });
    answerReading(store, lang, passages, { learnerRef: "g", passageId: p!.id, questionIndex: 0, choice: right });
    const state = stateOf(store, "g", lang);
    assert.ok(state.kcState[grammarKc], `${lang} ${grammarKc} 기억 생성`);
    assert.ok(state.kcState[grammarKc].mastery >= 0.6, `${lang} ${grammarKc} 숙달 도달(mastery=${state.kcState[grammarKc].mastery})`);
  }
});

test("같은 코어·서버가 언어팩만 바꿔 es 읽기도 서빙(규칙 11)", () => {
  const store = newStore();
  const en = serveReading(store, "r2", "en", packReading("en"));
  const es = serveReading(store, "r2", "es", packReading("es"));
  assert.ok(en[0].text !== es[0].text, "언어별 다른 지문");
  assert.ok(es.every((p) => p.id.startsWith("es.")), "es 지문");
});

test("모든 언어가 B1 지문 보유(초급→중급 경로 개통, 규칙 11)", () => {
  // A1·A2 에 머물지 않고 B1 이 있어야 중급 학습자에게 i+1 상향 지문을 줄 수 있다.
  for (const lang of ["en", "es", "zh", "ar", "sw", "ja", "hi"]) {
    const passages = packReading(lang);
    const b1 = passages.filter((p: { level: string }) => p.level === "B1");
    assert.ok(b1.length >= 1, `${lang} B1 지문 포함`);
    for (const p of b1) {
      assert.ok(validateReading(p), `${lang} B1 지문 검증: ${p.id}`);
      assert.ok(p.text.length >= 120, `${lang} B1 지문은 초급보다 길고 복잡`);
    }
  }
});

test("B1 학습자에게 B1 지문을 현 수준으로 서빙(i+1 스펙트럼 상향)", () => {
  // 능력 1.5 → cefrFromAbility=B1. B1 지문이 현 수준(최우선)으로 잡혀야.
  const state = { learnerRef: "rb1", lang: "hi", kcState: {}, ability: { reading: 1.5 }, fromEventCount: 0 };
  const served = selectGradedReading(state, packReading("hi"), { limit: 3 });
  assert.ok(served.length >= 1, "B1 학습자 지문 서빙");
  assert.equal(served[0].level, "B1", "B1 학습자는 B1이 현 수준");
});

test("모든 언어가 B2 지문 보유(난이도 스펙트럼 상단·상급 경로)", () => {
  for (const lang of ["en", "es", "zh", "ar", "sw", "ja", "hi"]) {
    const passages = packReading(lang);
    const b2 = passages.filter((p: { level: string }) => p.level === "B2");
    assert.ok(b2.length >= 1, `${lang} B2 지문 포함`);
    for (const p of b2) {
      assert.ok(validateReading(p), `${lang} B2 지문 검증: ${p.id}`);
      // CJK는 문자 밀도가 높아 임계는 150(zh 한자 지문도 실질 B2 분량). 초급보다 확실히 길고 복잡.
      assert.ok(p.text.length >= 150, `${lang} B2 지문은 충분한 분량(${p.text.length}자)`);
    }
  }
});

test("B2 학습자에게 B2 지문을 현 수준으로 서빙", () => {
  // 능력 2.5 → cefrFromAbility=B2. B2 지문이 현 수준(최우선)으로.
  const state = { learnerRef: "rb2", lang: "en", kcState: {}, ability: { reading: 2.5 }, fromEventCount: 0 };
  const served = selectGradedReading(state, packReading("en"), { limit: 3 });
  assert.ok(served.length >= 1, "B2 학습자 지문 서빙");
  assert.equal(served[0].level, "B2", "B2 학습자는 B2가 현 수준");
});

// ── 이해 문항 자동 채점·해설: 읽기를 마스터리 스택의 측정 대상으로(규칙 1·4) ──

// 결정적 유닛용 합성 지문(객관식 + 주관식 복수 문항, 정답=glossary 키를 포함해 해설 힌트 검증)
const SYN: ReadingPassage = {
  id: "syn.read.q", level: "A1", kc: ["kc.x.vocab.core", "kc.x.grammar"],
  title: "T", text: "I eat an apple every morning. The apple is sweet.",
  glossary: { apple: "사과", sweet: "달콤한" },
  questions: [
    { q: "What does the writer eat?", answer: "apple", options: ["apple", "bread", "rice"] }, // 객관식
    { q: "How is the apple? (type)", answer: "sweet", accept: ["sweet", "it is sweet"] }, // 주관식(보기 없음)
  ],
  source: { kind: "generated", license: "CC-BY-4.0" },
};

test("scoreComprehension: 서버 채점(정답/오답)·해설(정답 어휘)·범위 밖 null", () => {
  const ok = scoreComprehension(SYN, 0, "apple")!;
  assert.equal(ok.correct, true, "정답 채점");
  assert.equal(ok.correctAnswer, "apple");
  assert.deepEqual(ok.glossaryHints, [{ word: "apple", gloss: "사과" }], "해설=정답에 든 사전 어휘");
  const no = scoreComprehension(SYN, 0, "bread")!;
  assert.equal(no.correct, false, "오답 채점");
  assert.equal(no.correctAnswer, "apple", "오답이어도 정답·해설 제공");
  assert.equal(scoreComprehension(SYN, 9, "apple"), null, "범위 밖 문항 null");
});

test("주관식(자유응답) 채점 — 정규화 대조·허용 정답, 오답 구분", () => {
  const ok = scoreComprehension(SYN, 1, "sweet")!;
  assert.equal(ok.correct, true, "정답");
  assert.equal(scoreComprehension(SYN, 1, "  SWEET. ")!.correct, true, "대소문자·구두점·공백 정규화");
  assert.equal(scoreComprehension(SYN, 1, "it is sweet")!.correct, true, "허용 정답(accept)");
  assert.equal(scoreComprehension(SYN, 1, "sour")!.correct, false, "오답");
  assert.equal(scoreComprehension(SYN, 1, "")!.correct, false, "빈 입력은 오답");
  assert.equal(scoreComprehension(SYN, 1, "x")!.correctAnswer, "sweet", "오답도 정답 공개(해설)");
});

test("validateReading: 객관식(정답∈보기)·주관식(보기 없음) 모두 유효, 잘못된 문항 반려", () => {
  assert.ok(validateReading(SYN), "객관식+주관식 혼합 유효");
  const badMcq = { ...SYN, questions: [{ q: "?", answer: "z", options: ["a", "b"] }] };
  assert.ok(!validateReading(badMcq as any), "mcq 정답이 보기 밖 → 반려");
  const emptyAns = { ...SYN, questions: [{ q: "?", answer: "" }] };
  assert.ok(!validateReading(emptyAns as any), "정답 빈 문자열 → 반려");
  const free = { ...SYN, questions: [{ q: "?", answer: "cat" }] };
  assert.ok(validateReading(free as any), "주관식(보기 없음·정답만) → 유효");
});

test("redactReadingAnswers: 정답·accept 제거, 유형(보기 유무)만 전달", () => {
  const r = redactReadingAnswers(SYN);
  assert.equal(r.questions![0].answer, undefined, "정답 제거");
  assert.deepEqual(r.questions![0].options, ["apple", "bread", "rice"], "객관식 보기 유지");
  assert.equal(r.questions![1].answer, undefined, "주관식 정답 제거");
  assert.equal(r.questions![1].options, undefined, "주관식은 보기 없음(유형 전달)");
  assert.equal((r.questions![1] as any).accept, undefined, "accept 제거");
  assert.equal(SYN.questions![0].answer, "apple", "원본은 그대로");
});

test("serveReading: 서빙 시 모든 문항 정답 미유출(객관식·주관식 혼합)", () => {
  const store = newStore();
  const served = serveReading(store, "rr1", "en", packReading("en"), { limit: 5 });
  let sawMulti = false, sawFree = false;
  for (const p of served) {
    if ((p.questions ?? []).length >= 2) sawMulti = true;
    for (const q of p.questions ?? []) {
      assert.equal(q.answer, undefined, `${p.id} 서빙 문항 정답 미포함`);
      if (q.options === undefined) sawFree = true; // 주관식
      else assert.ok(q.options.length >= 2, `${p.id} 객관식 보기 유지`);
    }
  }
  assert.ok(sawMulti, "복수 문항 지문 서빙(en A1)");
  assert.ok(sawFree, "주관식 문항 서빙(en A1 자유응답)");
});

test("answerReading: 서버 채점 → item.response 이벤트 → BKT 숙달·FSRS 반영", () => {
  const store = newStore();
  const passages = packReading("en"); // 소스(정답 보유)
  const p = passages.find((x: ReadingPassage) => x.questions && x.questions.length && x.questions[0].answer);
  assert.ok(p, "문항 있는 지문 존재");
  const right = p.questions[0].answer as string;
  const r = answerReading(store, "en", passages, { learnerRef: "rc1", passageId: p.id, questionIndex: 0, choice: right });
  assert.equal(r.correct, true, "정답 채점");
  assert.equal(r.correctAnswer, right);
  assert.ok(r.eventId, "이벤트 기록");
  assert.deepEqual(r.kc, p.kc, "지문의 전체 KC 크레딧");
  // 숙달 반영 — 이벤트 리플레이 후 KC 기억이 생기고 상향
  const state = stateOf(store, "rc1", "en");
  for (const kc of p.kc) {
    assert.ok(state.kcState[kc], `${kc} 기억 생성`);
    assert.ok(state.kcState[kc].mastery > 0, `${kc} 숙달 상향(정답)`);
    assert.equal(state.kcState[kc].reps, 1, `${kc} 복습 1회 기록(FSRS)`);
  }
});

test("answerReading: 오답도 이벤트로 남고 정답·해설 제공 / 잘못된 입력은 error", () => {
  const store = newStore();
  const passages = packReading("en");
  const p = passages.find((x: ReadingPassage) => x.questions && x.questions.length && x.questions[0].answer);
  const wrong = (p.questions[0].options as string[]).find((o) => o !== p.questions[0].answer)!;
  const r = answerReading(store, "en", passages, { learnerRef: "rc2", passageId: p.id, choice: wrong });
  assert.equal(r.correct, false, "오답 채점");
  assert.equal(r.correctAnswer, p.questions[0].answer, "오답이어도 정답 공개(해설)");
  assert.ok(r.eventId, "오답도 학습 이벤트로 기록(정직한 측정)");
  // 에러 케이스
  assert.equal(answerReading(store, "en", passages, { learnerRef: "rc3", passageId: "nope", choice: "x" }).error, "passage_not_found");
  assert.equal(answerReading(store, "en", passages, { learnerRef: "rc3", passageId: p.id, questionIndex: 99, choice: "x" }).error, "invalid_question");
});

test("answerReading: 복수 문항(2번째)·주관식(자유응답) 서버 채점 — en A1 실시드", () => {
  const store = newStore();
  const passages = packReading("en");
  const p = passages.find((x: ReadingPassage) => x.id === "en.read.morning")!;
  assert.ok(p.questions!.length >= 3, "en A1은 복수 문항(객관식 2 + 주관식 1)");
  // 2번째 문항(객관식)
  const q1 = p.questions![1];
  const r1 = answerReading(store, "en", passages, { learnerRef: "rm1", passageId: p.id, questionIndex: 1, choice: q1.answer as string });
  assert.equal(r1.correct, true, "2번째 문항 정답 채점");
  // 3번째 문항(주관식) — 정답·허용 정답·오답
  assert.equal(answerReading(store, "en", passages, { learnerRef: "rm1", passageId: p.id, questionIndex: 2, choice: "bread" }).correct, true, "주관식 정답");
  assert.equal(answerReading(store, "en", passages, { learnerRef: "rm1", passageId: p.id, questionIndex: 2, choice: "The Bread." }).correct, true, "주관식 정규화+허용정답");
  const wrongFree = answerReading(store, "en", passages, { learnerRef: "rm1", passageId: p.id, questionIndex: 2, choice: "rice" });
  assert.equal(wrongFree.correct, false, "주관식 오답");
  assert.equal(wrongFree.correctAnswer, "bread", "주관식 오답도 정답 공개");
  assert.ok(wrongFree.eventId, "주관식도 학습 이벤트로 기록");
});
