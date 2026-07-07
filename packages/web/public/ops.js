// 운영자 효능 대시보드 — GET /efficacy 를 읽어 북스타 지표를 시각화(규칙 1 성과가 진실).
// 참여도(세션수·스트릭)는 노출하지 않는다. 제로 의존, 학습 앱과 분리.
const $ = (id) => document.getElementById(id);
const pct = (x) => (x === null || x === undefined ? "—" : (x * 100).toFixed(1) + "%");
const num = (x) => (x === null || x === undefined ? "—" : String(x));
const one = (x) => (x === null || x === undefined ? "—" : x.toFixed(1));
const dur = (ms) => {
  if (ms === null || ms === undefined) return "—";
  const m = ms / 60000;
  if (m < 60) return m.toFixed(1) + "분";
  const h = m / 60;
  if (h < 48) return h.toFixed(1) + "시간";
  return (h / 24).toFixed(1) + "일";
};
const setBar = (id, ratio) => { $(id).style.width = ratio === null || ratio === undefined ? "0%" : Math.round(ratio * 100) + "%"; };

async function load() {
  const lang = $("lang").value;
  $("status").textContent = "불러오는 중…";
  try {
    const r = await (await fetch(`/efficacy?lang=${lang}`)).json();
    const e = r.efficacy;
    // TTM
    $("ttm-pairs").textContent = num(e.ttm.masteredPairs);
    $("ttm-resp").textContent = `${num(e.ttm.medianResponsesToMastery)} / ${one(e.ttm.meanResponsesToMastery)}`;
    $("ttm-elapsed").textContent = dur(e.ttm.medianElapsedMs);
    // Retention
    $("ret-overall").textContent = `${pct(e.retention.overallAccuracy)} (응답 ${e.retention.responses})`;
    $("ret-review").textContent = `${pct(e.retention.reviewAccuracy)} (복습 ${e.retention.reviewResponses})`;
    setBar("ret-overall-bar", e.retention.overallAccuracy);
    setBar("ret-review-bar", e.retention.reviewAccuracy);
    // Coverage
    $("cov-learners").textContent = num(e.coverage.learners);
    $("cov-kcs").textContent = `${num(e.coverage.kcsSeen)} / ${num(e.coverage.kcsMastered)}`;
    $("cov-per").textContent = one(e.coverage.masteredPerLearner);
    // Content Health
    const ch = r.contentHealth;
    $("ch-items").textContent = `${ch.servableItems} / ${ch.calibratedItems} (${pct(ch.calibratedRatio)})`;
    $("ch-kcs").textContent = `${ch.kcsWithContent} / ${ch.totalKCs}`;
    $("ch-gaps").textContent = num(r.gaps.length);
    setBar("ch-calib-bar", ch.calibratedRatio);
    $("gaps-list").textContent = r.gaps.length ? "격차: " + r.gaps.map((g) => g.kc).join(", ") : "";
    $("status").textContent = e.throughput.responses === 0 ? "아직 학습 이벤트 없음(정상 — 사용이 쌓이면 채워짐)" : "";
    await loadTrend(lang);
  } catch (err) {
    $("status").textContent = "불러오기 실패: " + err.message;
  }
}

// 개선 방향 화살표 — better=true면 증가가 개선(정확도·숙달), false면 감소가 개선(TTM 응답 수)
const arrow = (delta, better) => {
  if (delta === null || delta === undefined || delta === 0) return "—";
  const up = delta > 0;
  const good = better ? up : !up;
  return `${up ? "▲" : "▼"} ${good ? "↑개선" : "↓악화"}`;
};
const deltaPct = (d, better) => (d === null || d === undefined ? "—" : `${(d * 100).toFixed(1)}%p  ${arrow(d, better)}`);
const deltaNum = (d, better) => (d === null || d === undefined ? "—" : `${d > 0 ? "+" : ""}${d.toFixed ? d.toFixed(1) : d}  ${arrow(d, better)}`);

// 스파크라인 — 스냅샷 시퀀스를 SVG 꺾은선으로. null 은 건너뛰되 x축 위치는 보존(간격 유지). 제로 의존.
// better: 값 상승이 개선이면 true(정확도·숙달), 하락이 개선이면 false(숙달까지 응답 수).
function sparkline(vals, better = true) {
  const w = 150, h = 32, pad = 4;
  const pts = vals.map((v, i) => ({ i, v })).filter((p) => p.v !== null && p.v !== undefined && !Number.isNaN(p.v));
  if (pts.length === 0) return "";
  const n = vals.length;
  const ys = pts.map((p) => p.v);
  const min = Math.min(...ys), max = Math.max(...ys), span = max - min || 1;
  const px = (i) => pad + (n <= 1 ? (w - 2 * pad) / 2 : (i / (n - 1)) * (w - 2 * pad));
  const py = (v) => pad + (1 - (v - min) / span) * (h - 2 * pad);
  const firstV = pts[0].v, lastP = pts[pts.length - 1], lastV = lastP.v;
  const flat = pts.length < 2 || lastV === firstV;
  const improved = better ? lastV >= firstV : lastV <= firstV;
  const col = flat ? "#6cf" : improved ? "#3ad29a" : "#e06c75";
  const d = pts.map((p, k) => `${k ? "L" : "M"}${px(p.i).toFixed(1)} ${py(p.v).toFixed(1)}`).join(" ");
  return `<svg class="spk-svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="추이 스파크라인 ${pts.length}점">`
    + `<path d="${d}" fill="none" stroke="${col}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />`
    + `<circle cx="${px(lastP.i).toFixed(1)}" cy="${py(lastV).toFixed(1)}" r="2.6" fill="${col}" /></svg>`;
}

async function loadTrend(lang) {
  const sparks = ["sp-acc", "sp-review", "sp-ttm", "sp-kcs"];
  try {
    const h = await (await fetch(`/efficacy/history?lang=${lang}`)).json();
    $("tr-count").textContent = num(h.trend.count);
    const d = h.trend.delta;
    if (!d) {
      ["tr-acc", "tr-review", "tr-ttm", "tr-kcs"].forEach((id) => ($(id).textContent = "—"));
      sparks.forEach((id) => ($(id).innerHTML = ""));
      return;
    }
    $("tr-acc").textContent = deltaPct(d.overallAccuracy, true);
    $("tr-review").textContent = deltaPct(d.reviewAccuracy, true);
    $("tr-ttm").textContent = deltaNum(d.medianResponsesToMastery, false); // 응답 수는 감소가 개선
    $("tr-kcs").textContent = deltaNum(d.kcsMastered, true);
    // 스냅샷 시퀀스 → 지표별 꺾은선(첫→최신)
    const s = Array.isArray(h.snapshots) ? h.snapshots : [];
    $("sp-acc").innerHTML = sparkline(s.map((x) => x.overallAccuracy), true);
    $("sp-review").innerHTML = sparkline(s.map((x) => x.reviewAccuracy), true);
    $("sp-ttm").innerHTML = sparkline(s.map((x) => x.medianResponsesToMastery), false);
    $("sp-kcs").innerHTML = sparkline(s.map((x) => x.kcsMastered), true);
  } catch {
    $("tr-count").textContent = "—";
    sparks.forEach((id) => ($(id).innerHTML = ""));
  }
}

$("refresh").addEventListener("click", load);
$("lang").addEventListener("change", load);
load();
