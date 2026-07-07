// 링구아루프 학습 UI — 제로 의존 브라우저 앱. 데이터 백엔드(/next·/events·/state)와 대화.
// 규칙 9(다크패턴 없음)·10(투명성): 왜 지금 배우는지 보여주고, 재촉·손실공포 없음.
// 배우는 언어(목표어)는 전환 가능 — 코어/백엔드는 언어 무관, 언어팩만 바뀐다(규칙 11).
let LANG = localStorage.getItem("ll.lang") || "en";
// UI(화면) 언어 — 배우는 언어와 독립(규칙 11 정신을 UI까지). 문자열은 로케일 팩(/i18n) 데이터.
let UILANG = localStorage.getItem("ll.ui") || "ko";
let I18N = {};
const t = (k, fb) => (I18N[k] != null ? I18N[k] : (fb != null ? fb : k)); // 번역 조회(없으면 폴백/키)
const $ = (id) => document.getElementById(id);

function learnerId() {
  let id = localStorage.getItem("ll.learner");
  if (!id) {
    id = "web-" + Math.random().toString(36).slice(2, 9);
    localStorage.setItem("ll.learner", id);
  }
  return id;
}
const LEARNER = learnerId();

async function api(path, opts) {
  const res = await fetch(path, opts);
  return res.json();
}
const norm = (s) => (s || "").trim().toLowerCase();
const shuffle = (a) => a.map((v) => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map((p) => p[1]);

let current = null;

async function post(correct, grade) {
  await api("/events", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      learnerRef: LEARNER,
      type: "item.response",
      kc: current.kc,
      itemId: current.id,
      payload: { correct, grade },
      consent: "learn",
    }),
  });
  await refreshState();
}

function why(item, state) {
  const kc = item.kc[0];
  const m = state?.kcState?.[kc];
  const mastery = m ? Math.round(m.mastery * 100) : 0;
  const seen = m && m.reps > 0;
  $("why").textContent = `${t("why.now")} ${kc} ${seen ? t("study.whyReview") : t("study.whyNew")} · ${t("study.mastery")} ${mastery}%`;
}

function afterAnswer() {
  $("controls").innerHTML = "";
  const next = document.createElement("button");
  next.className = "primary";
  next.textContent = t("study.next");
  next.onclick = loadNext;
  $("controls").appendChild(next);
}

function judgeAndPost(correct) {
  $("feedback").className = "feedback " + (correct ? "ok" : "no");
  $("feedback").textContent = correct ? t("study.correct") : `${t("study.incorrect")} ${current.answer.value}`;
  post(correct, correct ? "good" : "again");
  afterAnswer();
}

function renderChoice(item) {
  const options = shuffle([item.answer.value, ...(item.distractors || []).map((d) => d.value)]);
  $("stage").innerHTML = `<div class="prompt">${item.prompt}</div>`;
  $("controls").innerHTML = "";
  for (const opt of options) {
    const b = document.createElement("button");
    b.className = "opt";
    b.dir = "auto"; // 보기 텍스트 방향 자동(아랍어=RTL, 그 외=LTR)
    b.textContent = opt;
    b.onclick = () => judgeAndPost(opt === item.answer.value);
    $("controls").appendChild(b);
  }
}

function renderCloze(item) {
  $("stage").innerHTML = `<div class="prompt">${item.prompt.replace("___", '<span class="blank">____</span>')}</div>`;
  $("controls").innerHTML = "";
  const input = document.createElement("input");
  input.className = "answer";
  input.placeholder = t("study.blankPh");
  const submit = document.createElement("button");
  submit.className = "primary";
  submit.textContent = t("study.check");
  const check = () => {
    const accept = [item.answer.value, ...(item.answer.accept || [])].map(norm);
    judgeAndPost(accept.includes(norm(input.value)));
  };
  submit.onclick = check;
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") check(); });
  $("stage").appendChild(input);
  $("controls").appendChild(submit);
  input.focus();
}

const GRADES = [["grade.again", "again"], ["grade.hard", "hard"], ["grade.good", "good"], ["grade.easy", "easy"]];

function renderFlashcard(item) {
  $("stage").innerHTML = `<div class="cue">${t("cue.hint")}</div><div class="prompt">${item.prompt}</div>`;
  $("controls").innerHTML = "";
  const reveal = document.createElement("button");
  reveal.className = "primary";
  reveal.textContent = t("study.showAnswer");
  reveal.onclick = () => {
    $("stage").innerHTML = `<div class="cue">${item.prompt}</div><div class="prompt">${item.answer.value}</div>`;
    $("controls").innerHTML = "";
    for (const [key, g] of GRADES) {
      const b = document.createElement("button");
      b.className = "grade";
      b.textContent = t(key);
      b.onclick = () => { post(g !== "again", g); afterAnswer(); $("feedback").className = "feedback ok"; $("feedback").textContent = t("study.recorded"); };
      $("controls").appendChild(b);
    }
  };
  $("controls").appendChild(reveal);
}

function renderItem(item) {
  $("feedback").textContent = "";
  $("feedback").className = "feedback";
  if (item.type === "mcq" || item.type === "minimal_pair") renderChoice(item);
  else if (item.type === "cloze") renderCloze(item);
  else renderFlashcard(item);
}

function renderDone() {
  $("why").textContent = "";
  $("feedback").textContent = "";
  $("controls").innerHTML = "";
  $("stage").innerHTML = `<div class="done"><div class="big">🌱</div><p>${t("done.title")}</p><p class="muted">${t("done.sub")}</p></div>`;
}

async function refreshState() {
  const state = await api(`/state?learner=${LEARNER}&lang=${LANG}`);
  const el = $("mastery");
  const kcs = Object.entries(state.kcState || {});
  renderProfile();
  renderAchievements();
  renderBadges();
  if (kcs.length === 0) { el.innerHTML = `<p class="muted">${t("mastery.empty")}</p>`; return state; }
  el.innerHTML = "";
  for (const [kc, m] of kcs) {
    const pct = Math.round(m.mastery * 100);
    const div = document.createElement("div");
    div.className = "kc";
    div.innerHTML = `<div class="row"><span>${kc}</span><span>${pct}%</span></div><div class="bar"><span style="width:${pct}%"></span></div>`;
    el.appendChild(div);
  }
  return state;
}

// 마스터리 인증(성취) — 다크패턴 없이 달성을 인정하고 경로를 연다(규칙 1·2·9)
async function renderAchievements() {
  const c = await api(`/certificates?learner=${LEARNER}&lang=${LANG}`);
  const el = $("achievements");
  const levels = Object.entries(c.levelProgress || {}).sort();
  if ((c.certified || []).length === 0 && levels.length === 0) {
    el.innerHTML = `<p class="muted">${t("ach.empty")}</p>`;
    return;
  }
  let html = '<div class="mastery">';
  for (const [lv, p] of levels) {
    const done = (c.certifiedLevels || []).includes(lv);
    html += `<div class="kc"><div class="row"><span>${lv}${done ? " 🏅" : ""}</span><span>${p.certified}/${p.total}</span></div><div class="bar"><span style="width:${p.pct}%"></span></div></div>`;
  }
  html += "</div>";
  if ((c.certified || []).length) {
    html += `<p class="muted" style="margin-top:10px">${t("ach.canDoNow")}</p>`;
    for (const cert of c.certified) html += `<div class="cert">✓ ${cert.canDo}</div>`;
  }
  if (c.nextUp && c.nextUp.length) {
    const n = c.nextUp[0];
    html += `<p class="muted" style="margin-top:8px">${t("ach.soon")} ${n.canDo} (${Math.round(n.mastery * 100)}%)</p>`;
  }
  el.innerHTML = html;
  if ((c.certified || []).length) {
    const btn = document.createElement("button");
    btn.className = "link";
    btn.textContent = t("ach.exportCert");
    btn.onclick = exportCertificate;
    el.appendChild(btn);
  }
}

// 프로필 카드 — 인증·배지·누적 학습량을 한 곳에(성과 요약). 다크패턴 없음(규칙 2·9): 스트릭 없이 누적만.
async function renderProfile() {
  const el = $("profile");
  if (!el) return;
  const p = await api(`/profile?learner=${LEARNER}&lang=${LANG}`);
  const acc = p.accuracy != null ? Math.round(p.accuracy * 100) + "%" : "—";
  const stat = (label, val) => `<div class="pstat"><span class="pv">${val}</span><span class="pl">${label}</span></div>`;
  el.innerHTML = `<div class="profile-grid">` +
    stat(t("profile.answered"), p.totals.responses) +
    stat(t("profile.accuracy"), acc) +
    stat(t("profile.certified"), p.certified) +
    stat(t("profile.badges"), (p.earnedBadges || []).length) +
    stat(t("profile.turns"), p.totals.tutorTurns) +
    stat(t("profile.contributed"), p.totals.contributions) +
    `</div>`;
  const btn = document.createElement("button");
  btn.className = "link";
  btn.textContent = t("profile.export");
  btn.onclick = () => exportJson(p, `lingualoop-profile-${LANG}.json`); // 소유·포터블(규칙 6)
  el.appendChild(btn);
}

// 학습자 소유 데이터를 JSON으로 다운로드(규칙 6). 인증서·프로필 공용.
function exportJson(obj, filename) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// 배지(성취를 커뮤니티까지) — 증거 기반·다크패턴 없음(규칙 1·2·9). 학습 인증+기여+검토를 티어로 인정.
const TIER_EMOJI = { bronze: "🥉", silver: "🥈", gold: "🥇" };
async function renderBadges() {
  const el = $("badges");
  if (!el) return;
  const rep = await api(`/badges?learner=${LEARNER}&lang=${LANG}`);
  const badges = rep.badges || [];
  if (badges.every((b) => b.count === 0)) { el.innerHTML = `<p class="muted">${t("badge.none")}</p>`; return; }
  const wrap = document.createElement("div");
  wrap.className = "badges";
  for (const b of badges) {
    const label = t("badge." + b.category);
    const chip = document.createElement("span");
    chip.className = "badge" + (b.tier ? " t-" + b.tier : " locked");
    if (b.tier) {
      chip.textContent = `${TIER_EMOJI[b.tier]} ${label} ×${b.count}` + (b.nextNeed ? ` · ${t("badge.next")} ${b.nextNeed}` : "");
    } else if (b.category === "review" && b.count > 0 && (b.trust == null || b.trust < 0.6)) {
      chip.textContent = `${label} · ${t("badge.reviewLocked")}`;
    } else {
      chip.textContent = `${label} ${b.count}/${b.nextNeed}`;
    }
    wrap.appendChild(chip);
  }
  el.innerHTML = "";
  el.appendChild(wrap);
}

// 마스터리 인증서 내보내기 — 학습자 소유의 성취 스냅샷 다운로드(규칙 6)
async function exportCertificate() {
  const cert = await api(`/account/certificate?learner=${LEARNER}&lang=${LANG}`);
  exportJson(cert, `lingualoop-certificate-${LANG}.json`); // 공용 헬퍼(규칙 6)
}

async function loadNext() {
  const [{ items }, state] = await Promise.all([
    api(`/next?learner=${LEARNER}&lang=${LANG}`),
    refreshState(),
  ]);
  if (!items || items.length === 0) { renderDone(); return; }
  current = items[0];
  why(current, state);
  renderItem(current);
}

// ── 탭 전환 ──
document.querySelectorAll(".tab").forEach((tab) => {
  tab.onclick = () => {
    document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    const view = tab.dataset.view;
    $("view-study").classList.toggle("hidden", view !== "study");
    $("view-tutor").classList.toggle("hidden", view !== "tutor");
    $("view-pron").classList.toggle("hidden", view !== "pron");
    $("view-read").classList.toggle("hidden", view !== "read");
    $("view-contrib").classList.toggle("hidden", view !== "contrib");
    $("view-place").classList.toggle("hidden", view !== "place");
    if (view === "tutor") { renderScenarios(); if (!tutorGreeted) greetTutor(); }
    if (view === "pron") loadPhonology();
    if (view === "read") loadReading();
    if (view === "contrib") { renderQueue(); renderLeaderboard(); }
    if (view === "place") resetPlacement();
  };
});

// ── 적응형 배치고사(CAT): 최소 문항으로 레벨 추정 → i+1 시작점 ──
let placeResponses = [];
let placeTheta = 0;

function resetPlacement() {
  $("place-intro").classList.remove("hidden");
  $("place-quiz").classList.add("hidden");
  $("place-result").classList.add("hidden");
}

$("place-start").onclick = async () => {
  placeResponses = [];
  $("place-intro").classList.add("hidden");
  $("place-result").classList.add("hidden");
  $("place-quiz").classList.remove("hidden");
  await placeStep();
};

async function placeStep() {
  const r = await api(`/placement/step?lang=${LANG}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ responses: placeResponses }),
  });
  placeTheta = r.theta;
  if (r.done || !r.next) return placeResult(r);
  $("place-progress").textContent = `${t("place.qLabel")} ${placeResponses.length + 1} · ${t("place.adaptive")}`;
  $("place-stage").innerHTML = `<div class="prompt">${r.next.prompt}</div>`;
  $("place-controls").innerHTML = "";
  for (const opt of r.next.options) {
    const b = document.createElement("button");
    b.className = "opt";
    b.dir = "auto";
    b.textContent = opt;
    b.onclick = () => { placeResponses.push({ itemId: r.next.id, choice: opt }); placeStep(); };
    $("place-controls").appendChild(b);
  }
}

function placeResult(r) {
  $("place-quiz").classList.add("hidden");
  $("place-result").classList.remove("hidden");
  $("place-level").textContent = r.level;
  $("place-detail").textContent = `${placeResponses.length} ${t("place.itemsEstimated")} (θ ${r.theta.toFixed(2)}${r.se != null ? `, ${t("place.err")} ${r.se.toFixed(2)}` : ""})`;
}

$("place-apply").onclick = async () => {
  // 추정 능력을 학습자 상태에 반영(assessment.item) → 읽기 i+1 시작점
  await api("/events", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ learnerRef: LEARNER, type: "assessment.item", payload: { skill: "reading", thetaEst: placeTheta }, consent: "learn" }),
  });
  document.querySelector('.tab[data-view="study"]').click();
  loadNext();
};

// ── 커뮤니티 기여: 제출 → 자동 게이트 + 동료 검증 → 승격 → 노출(미검증 노출 금지, 규칙 4) ──
function cFeedback(cls, text) {
  $("c-feedback").className = "feedback " + cls;
  $("c-feedback").textContent = text;
}

$("c-submit").onclick = async () => {
  const prompt = $("c-prompt").value.trim();
  const answer = $("c-answer").value.trim();
  if (!prompt || !answer) { cFeedback("no", t("contrib.needBoth")); return; }
  const item = {
    id: `${LANG}.web.${LEARNER}.${Math.random().toString(36).slice(2, 8)}`,
    lang: LANG, type: "flashcard", kc: ["kc." + LANG + ".vocab.core"], level: "A1",
    prompt, answer: { value: answer }, distractors: [], difficulty: null, discrimination: null,
    quality: "draft", source: { kind: "contributed", license: "CC-BY-4.0" }, meta: { schemaVersion: 1 },
  };
  const res = await api("/contribute", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ contributorRef: LEARNER, item }),
  });
  if (res.gatePass) {
    cFeedback("ok", t("contrib.submitted"));
    $("c-prompt").value = ""; $("c-answer").value = "";
  } else {
    cFeedback("no", t("contrib.gateFail") + " " + (res.gateReasons || []).join(", "));
  }
  renderQueue();
};

const healthLabel = (h) => t("health." + h, h); // healthy/too_easy/too_hard/weak/insufficient → 로케일

// 효과순 리더보드 — 인기(승인 수)가 아니라 학습효과로 재랭킹(규칙 1)
async function renderLeaderboard() {
  const data = await api(`/contributions?status=accepted&rank=effect&lang=${LANG}`);
  const board = $("c-board");
  board.innerHTML = "";
  const accepted = data.contributions || [];
  if (accepted.length === 0) { board.innerHTML = `<p class="muted">${t("contrib.noShown")}</p>`; return; }
  for (const c of accepted) {
    const e = c.effect;
    const health = e && e.enoughData ? healthLabel(e.health) : t("contrib.building");
    const rate = e && e.enoughData ? ` · ${t("contrib.accuracy")} ${Math.round(e.correctRate * 100)}%` : "";
    const div = document.createElement("div");
    div.className = "cq";
    div.innerHTML = `<div class="prompt">${c.item.prompt}</div><div class="cue">${health}${rate} · ${t("contrib.approvedCount")} ${c.score}</div>`;
    board.appendChild(div);
  }
}

async function renderQueue() {
  const data = await api(`/contributions?status=in_review&lang=${LANG}`);
  const q = $("c-queue");
  q.innerHTML = "";
  const pending = (data.contributions || []).filter((c) => c.contributorRef !== LEARNER); // 내 기여는 내가 검토 못 함
  if (pending.length === 0) { q.innerHTML = `<p class="muted">${t("contrib.noReview")}</p>`; return; }
  for (const c of pending) {
    const card = document.createElement("div");
    card.className = "cq";
    card.innerHTML = `<div class="prompt">${c.item.prompt}</div><div class="cue">${t("contrib.answerLabel")}: ${c.item.answer.value} · ${t("contrib.approvedCount")} ${c.score} · ${t("contrib.by")} ${c.contributorRef}</div>`;
    const ctr = document.createElement("div");
    ctr.className = "controls";
    for (const [key, v] of [["contrib.approve", "approve"], ["contrib.reject", "reject"]]) {
      const b = document.createElement("button");
      b.className = v === "approve" ? "primary" : "opt";
      b.textContent = t(key);
      b.onclick = async () => {
        await api("/contribute/review", {
          method: "POST", headers: { "content-type": "application/json" },
          body: JSON.stringify({ reviewerRef: LEARNER, cid: c.cid, verdict: v }),
        });
        renderQueue();
      };
      ctr.appendChild(b);
    }
    card.appendChild(ctr);
    q.appendChild(card);
  }
}

// ── 등급 읽기: 이해가능한 입력(i+1) + 클릭 사전. 모르는 단어 클릭은 어휘 격차 신호(진화 입력) ──
let READINGS = null;
let readIdx = 0;

async function loadReading() {
  const data = await api(`/reading?learner=${LEARNER}&lang=${LANG}`);
  READINGS = data.passages || [];
  readIdx = 0;
  renderReading();
}

// 클릭 사전 키 정규화 — 라틴(악센트)·CJK 한자·가나·아랍·데바나가리 문자를 보존(구두점만 제거).
// 표기 방향/문자 무관 범용(규칙 11): 한자·가나 지문은 학습자용으로 단어를 띄어 써 토큰화가 잡히게 함(데바나가리·아랍은 본래 띄어쓰기).
const normWord = (w) => w.toLowerCase().replace(/[^a-záéíóúñü一-鿿ぁ-ヿ؀-ۿऀ-ॿ]/gi, "");

async function logExposure(passageId, word, action) {
  await api("/events", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ learnerRef: LEARNER, type: "content.exposure", itemId: passageId, payload: { action, word }, consent: "learn" }),
  });
}

function renderReading() {
  $("read-feedback").textContent = "";
  $("read-gloss").textContent = "";
  $("read-questions").innerHTML = "";
  $("read-controls").innerHTML = "";
  if (!READINGS || READINGS.length === 0) {
    $("read-title").textContent = "";
    $("read-passage").textContent = t("read.none");
    $("read-why").textContent = "";
    return;
  }
  const p = READINGS[readIdx % READINGS.length];
  $("read-why").textContent = `${t("why.now")} ${p.level} ${t("read.graded")}`;
  $("read-title").textContent = p.title;
  // 본문을 단어 단위로 렌더 — 사전에 있는 단어는 눌러서 뜻 보기
  const frag = document.createElement("div");
  for (const tok of p.text.split(/(\s+)/)) {
    if (/^\s+$/.test(tok)) { frag.appendChild(document.createTextNode(tok)); continue; }
    const key = normWord(tok);
    const span = document.createElement("span");
    span.textContent = tok;
    if (p.glossary[key]) {
      span.className = "word glossable";
      span.onclick = () => { showGloss(key, p.glossary[key]); speak(key); logExposure(p.id, key, "lookup"); };
    } else {
      span.className = "word";
    }
    frag.appendChild(span);
  }
  $("read-passage").innerHTML = "";
  $("read-passage").appendChild(frag);

  // 이해 확인(선택) — 정답은 item.response 로 숙달도에 반영
  if (p.questions && p.questions.length) renderReadingQuestions(p);

  const done = document.createElement("button");
  done.className = "primary";
  done.textContent = t("read.done");
  done.onclick = () => { logExposure(p.id, null, "read"); refreshState(); readIdx++; renderReading(); };
  $("read-controls").appendChild(done);
}

function showGloss(word, gloss) {
  $("read-gloss").innerHTML = `<b>${word}</b> — ${gloss} <span class="muted">🔊</span>`;
}

// 지문의 모든 이해 문항을 렌더 — 객관식(보기 버튼)·주관식(텍스트 입력) 둘 다. 서버 채점(규칙 1·4).
function renderReadingQuestions(p) {
  const box = $("read-questions");
  box.innerHTML = "";
  const n = p.questions.length;
  p.questions.forEach((q, qi) => {
    const wrap = document.createElement("div");
    wrap.className = "readq";
    wrap.innerHTML = `<div class="cue">${t("read.comprehension")}${n > 1 ? ` ${qi + 1}/${n}` : ""}</div><div class="prompt" dir="auto">${q.q}</div>`;
    const fb = document.createElement("div");
    fb.className = "feedback";
    // 서버로 선택/입력만 보내고, 응답으로 정오·정답·해설을 받는다. 정답은 클라이언트에 없다(규칙 4).
    const submit = async (choice, lockEls) => {
      const r = await api("/reading/answer", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ learnerRef: LEARNER, lang: LANG, passageId: p.id, questionIndex: qi, choice }),
      });
      fb.className = "feedback " + (r.correct ? "ok" : "no");
      let msg = r.correct ? t("study.correct") : `${t("study.incorrect")} ${r.correctAnswer ?? ""}`;
      if (r.glossaryHints && r.glossaryHints.length) {
        msg += `  ·  ${t("read.explanation")}: ` + r.glossaryHints.map((h) => `${h.word} — ${h.gloss}`).join(", ");
      }
      fb.textContent = msg;
      lockEls.forEach((el) => { el.disabled = true; }); // 중복 채점 방지
      refreshState();
    };
    if (q.options && q.options.length) {
      const opts = document.createElement("div");
      opts.className = "controls";
      for (const o of q.options) {
        const b = document.createElement("button");
        b.className = "opt";
        b.dir = "auto";
        b.textContent = o;
        b.onclick = () => submit(o, [...opts.children]);
        opts.appendChild(b);
      }
      wrap.appendChild(opts);
    } else {
      // 주관식(자유응답) — 텍스트 입력 후 제출. 서버가 정규화 대조로 채점.
      const row = document.createElement("div");
      row.className = "controls";
      const input = document.createElement("input");
      input.className = "answer";
      input.dir = "auto";
      input.type = "text";
      input.placeholder = t("read.typeAnswer");
      const b = document.createElement("button");
      b.className = "opt";
      b.textContent = "✓";
      const go = () => submit(input.value, [input, b]);
      b.onclick = go;
      input.addEventListener("keydown", (e) => { if (e.key === "Enter") go(); });
      row.appendChild(input);
      row.appendChild(b);
      wrap.appendChild(row);
    }
    wrap.appendChild(fb);
    box.appendChild(wrap);
  });
}

// ── AI 튜터 채팅 (역할극 시나리오) ──
const history = [];
let tutorGreeted = false;
let tutorTask = "default"; // 대화 상황(튜터 task 뱅크: default/intro/restaurant/…/hospital/airport). 후속 질문이 상황에 맞게 나옴.
const SCENARIOS = [
  { id: "default", key: "scenario.free" },
  { id: "intro", key: "scenario.intro" },
  { id: "restaurant", key: "scenario.restaurant" },
  { id: "shopping", key: "scenario.shopping" },
  { id: "directions", key: "scenario.directions" },
  { id: "hospital", key: "scenario.hospital" },
  { id: "airport", key: "scenario.airport" },
];

function bubble(role, text, corrections) {
  const el = document.createElement("div");
  el.className = "msg " + role;
  el.dir = "auto"; // 말풍선 텍스트 방향 자동(양방향 언어 대응)
  el.textContent = text;
  if (corrections && corrections.length) {
    const box = document.createElement("div");
    box.className = "corrections";
    for (const c of corrections) {
      const chip = document.createElement("span");
      chip.className = "chip";
      chip.textContent = `${c.original} → ${c.corrected}`;
      chip.title = c.note || c.errorTag;
      box.appendChild(chip);
    }
    el.appendChild(box);
  }
  $("messages").appendChild(el);
  $("messages").scrollTop = $("messages").scrollHeight;
}

// 상황별 시작 인사(목표어 몰입). default는 자유 대화, intro/restaurant는 역할극 오프닝.
const SCENARIO_GREETING = {
  default: {
    en: "Hi! Let's practice English. Tell me about your day 🙂",
    es: "¡Hola! Vamos a practicar español. Cuéntame sobre tu día 🙂",
    zh: "你好！我们来练习中文吧。今天过得怎么样？🙂",
    ar: "مرحبا! لنتدرب على العربية. أخبرني عن يومك 🙂",
    sw: "Jambo! Tujifunze Kiswahili. Uliyafanya nini leo? 🙂",
    ja: "こんにちは！日本語を練習しましょう。今日はどうでしたか？🙂",
    hi: "नमस्ते! चलिए हिंदी का अभ्यास करते हैं। आज आपने क्या किया? 🙂",
  },
  intro: {
    en: "Let's introduce ourselves! What's your name? 🙂",
    es: "¡Vamos a presentarnos! ¿Cómo te llamas? 🙂",
    zh: "我们来做自我介绍吧！你叫什么名字？🙂",
    ar: "لنتعارف! ما اسمك؟ 🙂",
    sw: "Tujitambulishe! Jina lako ni nani? 🙂",
    ja: "自己紹介しましょう！お名前は何ですか？🙂",
    hi: "आइए एक-दूसरे का परिचय दें! आपका नाम क्या है? 🙂",
  },
  restaurant: {
    en: "Welcome to the restaurant! What would you like to order? 🍽️",
    es: "¡Bienvenido al restaurante! ¿Qué desea pedir? 🍽️",
    zh: "欢迎光临！你想点什么？🍽️",
    ar: "أهلاً بك في المطعم! ماذا تحب أن تطلب؟ 🍽️",
    sw: "Karibu mgahawani! Ungependa kuagiza nini? 🍽️",
    ja: "いらっしゃいませ！ご注文は何にしますか？🍽️",
    hi: "रेस्तराँ में आपका स्वागत है! आप क्या ऑर्डर करना चाहेंगे? 🍽️",
  },
  shopping: {
    en: "Welcome to the shop! What are you looking for? 🛍️",
    es: "¡Bienvenido a la tienda! ¿Qué está buscando? 🛍️",
    zh: "欢迎光临商店！你在找什么？🛍️",
    ar: "أهلاً بك في المتجر! عن ماذا تبحث؟ 🛍️",
    sw: "Karibu dukani! Unatafuta nini? 🛍️",
    ja: "いらっしゃいませ！何をお探しですか？🛍️",
    hi: "दुकान में आपका स्वागत है! आप क्या ढूँढ रहे हैं? 🛍️",
  },
  directions: {
    en: "Excuse me, do you need directions? Where do you want to go? 🗺️",
    es: "Disculpa, ¿necesitas indicaciones? ¿Adónde quieres ir? 🗺️",
    zh: "你好，需要问路吗？你想去哪里？🗺️",
    ar: "مرحباً، هل تحتاج إلى إرشادات؟ إلى أين تريد أن تذهب؟ 🗺️",
    sw: "Samahani, unahitaji maelekezo? Unataka kwenda wapi? 🗺️",
    ja: "すみません、道に迷いましたか？どこへ行きたいですか？🗺️",
    hi: "माफ़ कीजिए, क्या आपको रास्ता चाहिए? आप कहाँ जाना चाहते हैं? 🗺️",
  },
  hospital: {
    en: "Hello, welcome to the clinic. What seems to be the problem? 🏥",
    es: "Hola, bienvenido a la clínica. ¿Qué le pasa? 🏥",
    zh: "你好，欢迎来到诊所。你哪里不舒服？🏥",
    ar: "مرحباً، أهلاً بك في العيادة. ما الذي تشكو منه؟ 🏥",
    sw: "Jambo, karibu kliniki. Una tatizo gani? 🏥",
    ja: "こんにちは、クリニックへようこそ。どうされましたか？🏥",
    hi: "नमस्ते, क्लिनिक में आपका स्वागत है। आपको क्या तकलीफ़ है? 🏥",
  },
  airport: {
    en: "Good day! Welcome to check-in. May I see your passport and ticket? ✈️",
    es: "¡Buenos días! Bienvenido al check-in. ¿Me muestra su pasaporte y billete? ✈️",
    zh: "您好！欢迎办理登机手续。请出示您的护照和机票。✈️",
    ar: "يوماً سعيداً! أهلاً بك في مكتب تسجيل الوصول. جواز سفرك وتذكرتك من فضلك. ✈️",
    sw: "Habari! Karibu kwenye usajili. Naomba pasipoti na tikiti yako. ✈️",
    ja: "こんにちは！チェックインへようこそ。パスポートと航空券を見せてください。✈️",
    hi: "नमस्ते! चेक-इन में आपका स्वागत है। कृपया अपना पासपोर्ट और टिकट दिखाइए। ✈️",
  },
};
function scenarioGreeting() {
  const bank = SCENARIO_GREETING[tutorTask] || SCENARIO_GREETING.default;
  return bank[LANG] || bank.en;
}
function greetTutor() {
  tutorGreeted = true;
  bubble("tutor", scenarioGreeting());
}

// 상황 선택 버튼 — 고르면 대화를 새로 시작(그 상황의 오프닝 + 후속 질문이 상황에 맞게)
function renderScenarios() {
  const el = $("scenarios");
  if (!el) return;
  el.innerHTML = "";
  for (const s of SCENARIOS) {
    const b = document.createElement("button");
    b.className = "scenario" + (s.id === tutorTask ? " active" : "");
    b.textContent = t(s.key);
    b.onclick = () => { if (s.id === tutorTask) return; tutorTask = s.id; resetTutorChat(); renderScenarios(); };
    el.appendChild(b);
  }
}
function resetTutorChat() {
  history.length = 0;
  $("messages").innerHTML = "";
  tutorGreeted = false;
  greetTutor();
}

async function sendTutor() {
  const input = $("tutor-input");
  const msg = input.value.trim();
  if (!msg) return;
  input.value = "";
  bubble("learner", msg);
  history.push({ role: "learner", text: msg });
  const resp = await api(`/tutor?lang=${LANG}`, { // 선택 언어의 전용 튜터로 라우팅(zh=성조·es=ser 등)
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ learnerRef: LEARNER, message: msg, lang: LANG, explainLang: UILANG, task: tutorTask, history }), // 설명=화면 언어, task=상황(역할극)
  });
  bubble("tutor", resp.text, resp.corrections);
  history.push({ role: "tutor", text: resp.text });
}
$("tutor-send").onclick = sendTutor;
$("tutor-input").addEventListener("keydown", (e) => { if (e.key === "Enter") sendTutor(); });

$("learner").textContent = `${t("learner.label")} ${LEARNER}`;
$("export").onclick = async () => {
  const data = await api(`/account/export?learner=${LEARNER}`);
  alert(t("export.count").replace("{n}", data.events.length));
};
$("reset").onclick = async () => {
  if (!confirm(t("confirm.reset"))) return;
  await api(`/account?learner=${LEARNER}`, { method: "DELETE" });
  loadNext();
};

// ── 발음: 지각(최소대립쌍) + 산출(섀도잉). TTS는 브라우저 로컬, 목소리는 서버로 전송하지 않음(규칙 6·13) ──
let PHON = null;
let pronMode = "perceive";
const VOICE_LANG = { en: "en-US", es: "es-ES", zh: "zh-CN", ar: "ar-SA", sw: "sw-KE", ja: "ja-JP", hi: "hi-IN" };

function speak(text) {
  try {
    if (!("speechSynthesis" in window)) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = VOICE_LANG[LANG] || "en-US";
    u.rate = 0.9;
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  } catch { /* TTS 없으면 조용히 무시 */ }
}

async function loadPhonology() {
  PHON = await api(`/phonology?lang=${LANG}`);
  renderPron();
}

document.querySelectorAll(".pron-mode").forEach((b) => {
  b.onclick = () => {
    document.querySelectorAll(".pron-mode").forEach((x) => x.classList.remove("active"));
    b.classList.add("active");
    pronMode = b.dataset.pron;
    renderPron();
  };
});

function pronFeedback(cls, text) {
  $("pron-feedback").className = "feedback " + cls;
  $("pron-feedback").textContent = text;
}
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

function renderPron() {
  $("pron-feedback").textContent = "";
  $("pron-feedback").className = "feedback";
  if (!PHON || !PHON.minimalPairs) {
    $("pron-stage").textContent = t("pron.none");
    $("pron-controls").innerHTML = "";
    $("pron-why").textContent = "";
    return;
  }
  if (pronMode === "perceive") renderPerceive();
  else renderShadow();
}

async function logResponse(kc, itemId, correct) {
  const kcArr = Array.isArray(kc) ? kc : [kc]; // deriveState 는 kc 를 배열로 순회(문자열 금지)
  await api("/events", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ learnerRef: LEARNER, type: "item.response", kc: kcArr, itemId, payload: { correct, grade: correct ? "good" : "again" }, consent: "learn" }),
  });
  refreshState();
}

// 지각: 두 단어 중 하나를 들려주고 어느 쪽인지 고르기 → item.response(숙달도 갱신)
function renderPerceive() {
  const mp = pick(PHON.minimalPairs);
  const target = Math.random() < 0.5 ? mp.a : mp.b;
  $("pron-why").textContent = `${t("why.now")} ${mp.contrast} ${t("pron.distinguish")} · ${mp.kc}`;
  $("pron-stage").innerHTML = `<div class="cue">${t("pron.chooseHeard")}</div><div class="prompt">${mp.contrast}</div>`;
  $("pron-controls").innerHTML = "";
  const play = document.createElement("button");
  play.className = "primary";
  play.textContent = t("pron.listenAgain");
  play.onclick = () => speak(target.word);
  const opts = document.createElement("div");
  opts.className = "controls";
  for (const w of [mp.a, mp.b]) {
    const b = document.createElement("button");
    b.className = "opt";
    b.dir = "auto";
    b.textContent = w.word;
    b.onclick = () => {
      const correct = w.word === target.word;
      pronFeedback(correct ? "ok" : "no", correct ? `${t("study.correct")} (${target.word})` : `${t("study.heard")} “${target.word}”`);
      logResponse(mp.kc, "phon:" + mp.a.word + "/" + mp.b.word, correct);
      const next = document.createElement("button");
      next.className = "primary"; next.textContent = t("study.next"); next.onclick = renderPerceive;
      $("pron-controls").innerHTML = ""; $("pron-controls").appendChild(next);
    };
    opts.appendChild(b);
  }
  $("pron-controls").appendChild(play);
  $("pron-controls").appendChild(opts);
  speak(target.word);
}

// 산출: 원음 듣고 따라 말한 뒤 자가평가(또는 선택적 음성 인식) → /pronounce
// 음절+강세 → 강세 음절을 강조한 HTML (운율 시각화)
function stressedWord(sh) {
  if (!sh.syllables || !sh.stress) return sh.word;
  return sh.syllables.map((syl, i) => (sh.stress[i] >= 1 ? `<b class="stressed">${syl.toUpperCase()}</b>` : `<span class="unstressed">${syl}</span>`)).join("·");
}

function renderShadow() {
  const pool = [...(PHON.shadow || []), ...(PHON.prosody || [])];
  const sh = pick(pool);
  if (!sh) { $("pron-stage").textContent = t("pron.noShadow"); $("pron-controls").innerHTML = ""; return; }
  const isProsody = (sh.syllables && sh.syllables.length > 1);
  $("pron-why").textContent = `${t("why.now")} ${isProsody ? t("pron.prosodyPractice") : t("pron.shadowPractice")} · ${sh.kc}`;
  const stressLine = isProsody ? `<div class="cue">${t("pron.stress")}: <span class="stressword">${stressedWord(sh)}</span> — ${t("pron.stressHint")}</div>` : "";
  $("pron-stage").innerHTML = `<div class="prompt">${sh.word}</div><div class="cue">[${(sh.ipa || []).join(" ")}] · ${sh.gloss}</div>${stressLine}`;
  $("pron-controls").innerHTML = "";
  const play = document.createElement("button");
  play.className = "primary";
  play.textContent = t("pron.playNative");
  play.onclick = () => speak(sh.word);
  $("pron-controls").appendChild(play);

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SR) {
    const mic = document.createElement("button");
    mic.className = "opt";
    mic.textContent = t("pron.evaluate");
    mic.onclick = () => recognizeShadow(SR, sh);
    $("pron-controls").appendChild(mic);
  }

  const rate = document.createElement("div");
  rate.className = "controls";
  const label = document.createElement("span");
  label.className = "cue"; label.textContent = t("pron.selfEvalLabel");
  rate.appendChild(label);
  for (const [key, g] of GRADES) {
    const b = document.createElement("button");
    b.className = "grade"; b.textContent = t(key);
    b.onclick = () => submitShadow(sh, { selfGrade: g });
    rate.appendChild(b);
  }
  $("pron-controls").appendChild(rate);
  speak(sh.word);
}

function recognizeShadow(SR, sh) {
  try {
    const rec = new SR();
    rec.lang = VOICE_LANG[LANG] || "en-US";
    rec.maxAlternatives = 1;
    pronFeedback("", t("pron.listening"));
    rec.onresult = (e) => {
      const heard = (e.results[0][0].transcript || "").trim().toLowerCase();
      let producedIPA = null;
      if (heard === sh.word.toLowerCase()) producedIPA = sh.ipa;
      else {
        const partner = (PHON.minimalPairs || []).flatMap((m) => [m.a, m.b]).find((w) => w.word.toLowerCase() === heard);
        if (partner) producedIPA = partner.ipa;
      }
      if (producedIPA) submitShadow(sh, { producedIPA });
      else pronFeedback("no", `${t("pron.recognized")}: “${heard}”`);
    };
    rec.onerror = () => pronFeedback("no", t("pron.noASR"));
    rec.start();
  } catch { pronFeedback("no", t("pron.noASR")); }
}

async function submitShadow(sh, extra) {
  const res = await api("/pronounce", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ learnerRef: LEARNER, kc: sh.kc, itemId: "shadow:" + sh.word, targetIPA: sh.ipa, word: sh.word, ...extra }),
  });
  const pct = Math.round((res.score || 0) * 100);
  const intel = Math.round((res.intelligibility || 0) * 100);
  let msg = `${t("pron.score")} ${pct}% · ${t("pron.intel")} ${intel}%`;
  if (res.hints && res.hints.length) msg += " · " + res.hints.join(" / ");
  else if (res.note) msg += " · " + res.note;
  pronFeedback(intel >= 80 ? "ok" : "no", msg);
  refreshState();
  const next = document.createElement("button");
  next.className = "primary"; next.textContent = t("study.next"); next.onclick = renderShadow;
  $("pron-controls").innerHTML = ""; $("pron-controls").appendChild(next);
}

// ── UI 로케일(화면 언어): 문자열을 데이터(/i18n)로. 배우는 언어와 독립(규칙 11을 UI까지) ──
let UI_DIR = "ltr"; // 화면(셸) 방향 — 로케일 데이터가 결정(아랍어 UI=rtl). 배우는 언어와 독립(규칙 11).
async function loadI18n() {
  try { const r = await api(`/i18n?ui=${UILANG}`); I18N = r.strings || {}; UI_DIR = r.dir === "rtl" ? "rtl" : "ltr"; } catch { I18N = {}; UI_DIR = "ltr"; }
  applyI18n();
}
// data-i18n 표시 요소에 번역을 주입 + 동적 뷰 재렌더. 문서 lang·dir 속성도 화면 언어로(방향은 로케일 데이터).
function applyI18n() {
  document.documentElement.lang = UILANG;
  document.documentElement.dir = UI_DIR; // 셸 전체 방향(아랍어 화면 언어=rtl) — 목표어 콘텐츠는 여전히 요소별 dir="auto"
  for (const el of document.querySelectorAll("[data-i18n]")) {
    const v = I18N[el.dataset.i18n];
    if (v != null) el.textContent = v;
  }
  $("learner").textContent = `${t("learner.label")} ${LEARNER}`; // data-i18n 밖(값 조합)이라 별도 갱신
  const ti = $("tutor-input"); if (ti) ti.placeholder = t("tutor.placeholder"); // 튜터 입력 안내(화면 언어)
  // 현재 열린 뷰의 동적 콘텐츠도 화면 언어로 다시 그림
  refreshState();
  if (current && !$("view-study").classList.contains("hidden")) renderItem(current);
  if (!$("view-tutor").classList.contains("hidden")) renderScenarios(); // 상황 라벨 재번역
  if (!$("view-read").classList.contains("hidden")) renderReading();
  if (!$("view-pron").classList.contains("hidden")) renderPron();
  if (!$("view-contrib").classList.contains("hidden")) { renderQueue(); renderLeaderboard(); }
}

// 팩 메타(/pack)로 표기 방향·언어를 콘텐츠에 반영. 방향은 요소별 dir="auto"가 유니코드 bidi로 처리하고,
// 여기선 lang 속성(브라우저 TTS/맞춤법·스크린리더)을 목표어에 맞춘다. 튜터 안내는 화면 언어(i18n). 코어/서버는 방향 무관(규칙 11).
async function applyPack() {
  let dir = "ltr";
  try { const meta = await api(`/pack?lang=${LANG}`); dir = meta.direction === "rtl" ? "rtl" : "ltr"; } catch { /* 팩 메타 없으면 ltr */ }
  const voice = VOICE_LANG[LANG] || "en-US";
  // 콘텐츠(목표어) 컨테이너에 lang 지정 — dir는 요소별 auto가 담당하므로 방향은 강제하지 않음
  for (const id of ["stage", "place-stage", "read-passage", "read-title", "pron-stage", "messages"]) {
    const el = $(id); if (el) el.setAttribute("lang", voice);
  }
  const ti = $("tutor-input");
  if (ti) { ti.setAttribute("lang", voice); ti.placeholder = t("tutor.placeholder"); } // 화면 언어(언어 중립)
  document.body.dataset.dir = dir; // 스타일 훅(필요 시 RTL 미세조정용)
}

// ── 화면(UI) 언어 전환 — 배우는 언어와 독립 ──
$("uilang").value = UILANG;
$("uilang").onchange = () => {
  UILANG = $("uilang").value;
  localStorage.setItem("ll.ui", UILANG);
  loadI18n(); // 셸 + 동적 뷰 재번역
};

// ── 배우는 언어 전환(같은 엔진, 다른 언어팩 — 규칙 11) ──
$("lang").value = LANG;
$("lang").onchange = () => {
  LANG = $("lang").value;
  localStorage.setItem("ll.lang", LANG);
  applyPack();
  PHON = null;
  READINGS = null;
  // 튜터도 언어에 맞춰 재인사 — 대화 상태 초기화
  tutorGreeted = false;
  history.length = 0;
  $("messages").innerHTML = "";
  if (!$("view-tutor").classList.contains("hidden")) greetTutor();
  loadNext();
  if (!$("view-pron").classList.contains("hidden")) loadPhonology();
  if (!$("view-read").classList.contains("hidden")) loadReading();
  if (!$("view-contrib").classList.contains("hidden")) { renderQueue(); renderLeaderboard(); }
};

loadI18n();
applyPack();
loadNext();
