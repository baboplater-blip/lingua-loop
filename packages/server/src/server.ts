// 최소 HTTP 데이터 백엔드(node:http, 제로 의존성·자가호스팅). 규칙 13.
// 실행: node packages/server/src/server.ts   (기본 포트 8787)
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { promoteVerified } from "../../core/src/index.ts";
import type { ContentItem, KCNode } from "../../core/src/index.ts";
import { createTutorFor, createDefaultPronunciationScorer } from "../../adapters/src/index.ts";
import type { TutorTurn, TutorModel } from "../../adapters/src/index.ts";
import { ingest, stateOf, reviewQueue, serveItems, serveReading, answerReading, efficacyReport, efficacyHistory, recordEfficacy, registerExperiment, assignForLearner, practiceOrderFor, experimentResult, exportLearner, deleteLearner, loadGraph, tutorTurn, scorePronunciation, submitContribution, reviewContribution, listContributions, contributionLeaderboard, communityBank, placementStep, publishContent, publishReading, publishedBank, publishedReadings, certificatesFor, exportCertificate, badgesFor, profileFor, type Store, type PlacementItem, type PlacementResp } from "./handlers.ts";
import type { ReadingPassage, ContentItem as CItem, ReviewVerdict, ReviewFlag } from "../../core/src/index.ts";
import { openFileStore } from "./persist.ts";
import { openSqliteStore } from "./sqlite-store.ts";

const PORT = Number(process.env.PORT ?? 8787);
const LANG = process.env.LANG_PACK ?? "en";
// 이벤트 영속(규칙 13 자가호스팅). LL_DB 지정 시 SQLite(대규모·동시성), 아니면 JSONL 디렉터리(기본).
const DB_PATH = process.env.LL_DB;
const DATA_DIR = process.env.LL_DATA_DIR ?? fileURLToPath(new URL("../../../data/events", import.meta.url));

// 정적 학습 UI 화이트리스트(경로 조작 방지)
const STATIC = new Set(["/app.js", "/style.css", "/ops.html", "/ops.js"]); // 학습 앱 + 운영자 효능 대시보드(ops)
const CTYPE: Record<string, string> = {
  html: "text/html; charset=utf-8",
  js: "text/javascript; charset=utf-8",
  css: "text/css; charset=utf-8",
};

// 언어팩을 요청 시 로드·캐시. 코어는 언어 무관 — 팩(데이터)만 갈아끼운다(규칙 11).
// meta.direction(ltr|rtl)로 표기 방향까지 데이터가 결정 — 코어/서버는 방향을 하드코딩하지 않는다(규칙 11).
interface PackMeta { lang: string; name: string; script: string; direction: "ltr" | "rtl"; cefrSupported?: string[]; role?: string[] }
interface Pack { meta: PackMeta; graph: ReturnType<typeof loadGraph>; bank: ContentItem[]; phonology: Record<string, unknown>; reading: ReadingPassage[]; placement: PlacementItem[] }
const packCache = new Map<string, Pack>();
function readJSON<T>(rel: string, fallback: T): T {
  try {
    return JSON.parse(readFileSync(new URL(rel, import.meta.url), "utf8")) as T;
  } catch {
    return fallback;
  }
}
function getPack(lang: string): Pack {
  let p = packCache.get(lang);
  if (!p) {
    const meta = readJSON<PackMeta>(`../../packs/${lang}/pack.json`, { lang, name: lang, script: "latin", direction: "ltr" }); // 표기 방향 등 팩 메타
    if (meta.direction !== "rtl") meta.direction = "ltr"; // 방어적 정규화(잘못된 값→ltr)
    const kcNodes = JSON.parse(readFileSync(new URL(`../../packs/${lang}/kc-seed.json`, import.meta.url), "utf8")) as KCNode[];
    const seed = JSON.parse(readFileSync(new URL(`../../packs/${lang}/content-seed.json`, import.meta.url), "utf8")) as ContentItem[];
    const phonology = readJSON<Record<string, unknown>>(`../../packs/${lang}/phonology.json`, {}); // 발음 데이터(없으면 빈)
    const reading = readJSON<{ passages: ReadingPassage[] }>(`../../packs/${lang}/reading.json`, { passages: [] }).passages; // 등급 읽기
    const placement = readJSON<PlacementItem[]>(`../../packs/${lang}/placement.json`, []); // 적응형 배치고사 뱅크
    const { verified } = promoteVerified(seed); // 규칙 4 — 통과분만
    p = { meta, graph: loadGraph(kcNodes), bank: verified, phonology, reading, placement };
    packCache.set(lang, p);
  }
  return p;
}

// UI 로케일(화면 언어) — 학습 언어와 독립(규칙 11 정신을 UI까지). packs/<uiLang>/i18n.json 의 strings·방향(dir)을 캐시. 미지원은 ko 폴백.
// 화면 방향(dir)까지 데이터가 결정(아랍어=rtl) — 코어/UI에 방향 하드코딩 없음(규칙 11).
interface I18nPack { strings: Record<string, string>; dir: "ltr" | "rtl"; }
const i18nCache = new Map<string, I18nPack>();
function getI18n(uiLang: string): I18nPack {
  let p = i18nCache.get(uiLang);
  if (!p) {
    let raw = readJSON<{ strings?: Record<string, string>; dir?: string }>(`../../packs/${uiLang}/i18n.json`, {});
    if (Object.keys(raw.strings ?? {}).length === 0 && uiLang !== "ko") raw = readJSON<{ strings?: Record<string, string>; dir?: string }>(`../../packs/ko/i18n.json`, {});
    p = { strings: raw.strings ?? {}, dir: raw.dir === "rtl" ? "rtl" : "ltr" };
    i18nCache.set(uiLang, p);
  }
  return p;
}

const store: Store = DB_PATH ? openSqliteStore(DB_PATH) : openFileStore(DATA_DIR); // 디스크에서 기존 학습 로그 복원(영속)
getPack(LANG); // 기본 팩 프리로드
// 언어별 튜터(규칙 11·12) — 요청 언어에 맞는 오프라인 튜터를 캐시. 인젝션 방어 내장.
const tutorCache = new Map<string, TutorModel>();
function tutorFor(lang: string): TutorModel {
  let t = tutorCache.get(lang);
  if (!t) { t = createTutorFor(lang); tutorCache.set(lang, t); }
  return t;
}
const pronScorer = createDefaultPronunciationScorer(); // pluggable(규칙 12) — 오프라인 로컬, 원음성 미수신

function json(res: import("node:http").ServerResponse, code: number, body: unknown): void {
  const s = JSON.stringify(body);
  res.writeHead(code, { "content-type": "application/json; charset=utf-8" });
  res.end(s);
}

// 요청 본문 상한(자가호스팅 기본 방어 — 리버스 프록시 없이도 메모리 고갈 DoS 차단). 초과 시 413.
const MAX_BODY_BYTES = 512 * 1024; // 512KB — 학습 이벤트·기여 콘텐츠에 충분, 남용은 차단
class PayloadTooLarge extends Error { constructor() { super("payload too large"); } }

async function readBody(req: import("node:http").IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const c of req) {
    size += (c as Buffer).length;
    if (size > MAX_BODY_BYTES) throw new PayloadTooLarge(); // 초과 시 읽기 중단 → 상위 catch 가 413 응답(소켓은 파괴하지 않아 응답 전달됨)
    chunks.push(c as Buffer);
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
}

export const app = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);
    const learner = url.searchParams.get("learner") ?? "";
    const lang = url.searchParams.get("lang") ?? LANG;

    if (req.method === "POST" && url.pathname === "/events") {
      const body = await readBody(req);
      const ev = ingest(store, { learnerRef: String(body.learnerRef), type: body.type as never, kc: body.kc as string[] | undefined, itemId: body.itemId as string | undefined, payload: (body.payload as Record<string, unknown>) ?? {}, consent: (body.consent as never) ?? "learn" });
      return json(res, 201, { ok: true, eventId: ev.eventId });
    }
    if (req.method === "POST" && url.pathname === "/tutor") {
      const body = await readBody(req);
      const resp = await tutorTurn(store, tutorFor(lang), {
        learnerRef: String(body.learnerRef),
        message: String(body.message ?? ""),
        lang,
        task: body.task as string | undefined,
        history: Array.isArray(body.history) ? (body.history as TutorTurn[]) : undefined, // 비배열 history 방어(어댑터 .filter 크래시 방지)
        explainLang: body.explainLang as string | undefined,
      });
      return json(res, 200, resp);
    }
    if (req.method === "POST" && url.pathname === "/pronounce") {
      const body = await readBody(req);
      const resp = await scorePronunciation(store, pronScorer, {
        learnerRef: String(body.learnerRef),
        kc: body.kc as string | undefined,
        itemId: body.itemId as string | undefined,
        targetIPA: (body.targetIPA as string[]) ?? [],
        producedIPA: body.producedIPA as string[] | undefined,
        targetStress: body.targetStress as number[] | undefined,
        producedStress: body.producedStress as number[] | undefined,
        targetTones: body.targetTones as number[] | undefined,
        producedTones: body.producedTones as number[] | undefined,
        selfGrade: body.selfGrade as never,
        word: body.word as string | undefined,
      });
      return json(res, 200, resp);
    }
    if (req.method === "GET" && url.pathname === "/state") return json(res, 200, stateOf(store, learner, lang));
    if (req.method === "GET" && url.pathname === "/review") return json(res, 200, { queue: reviewQueue(store, learner, lang, getPack(lang).graph) });
    if (req.method === "GET" && url.pathname === "/efficacy") {
      // 효능 대시보드(북스타 지표, 규칙 1) — TTM·리텐션·커버리지·콘텐츠 건강. 학습자 무관 집계(운영자용).
      const bank = [...getPack(lang).bank, ...communityBank(store, lang), ...publishedBank(store, lang)];
      return json(res, 200, efficacyReport(store, lang, getPack(lang).graph, bank));
    }
    if (req.method === "GET" && url.pathname === "/efficacy/history") {
      // 효능 추이(진화 사이클 스냅샷 누적) — 개선 추세. 운영자용.
      return json(res, 200, efficacyHistory(store, lang));
    }
    if (req.method === "POST" && url.pathname === "/efficacy/snapshot") {
      // 현재 효능을 append-only 스냅샷으로 기록(운영자·cron). 추이 축적.
      const bank = [...getPack(lang).bank, ...communityBank(store, lang), ...publishedBank(store, lang)];
      return json(res, 201, recordEfficacy(store, lang, getPack(lang).graph, bank));
    }
    // ── 사전등록 통제 실험(규칙 17: 관측 Gain Score → 인과 증거) — 운영자·실험 설계자용 ──
    if (req.method === "POST" && url.pathname === "/experiment") {
      // 데이터 수집 전에 프로토콜을 append-only 로 고정(p-해킹 방지). primaryOutcome 은 서버가 gainScore 로 고정(참여도 실험 금지).
      const body = await readBody(req);
      try {
        // 개입(선택): { intervention: { kind: "practice_order" } } — 실험군에 인터리빙 연습을 배선.
        const iv = body.intervention as { kind?: string } | undefined;
        const intervention = iv && iv.kind === "practice_order" ? { kind: "practice_order" as const } : undefined;
        const out = registerExperiment(store, {
          experimentId: String(body.experimentId ?? ""),
          hypothesis: String(body.hypothesis ?? ""),
          treatmentShare: body.treatmentShare as number | undefined,
          minSamplePerArm: body.minSamplePerArm as number | undefined,
          guardrail: body.guardrail as string | undefined,
          intervention,
        });
        return json(res, out.created ? 201 : 200, out);
      } catch (e) {
        return json(res, 400, { error: (e as Error).message });
      }
    }
    if (req.method === "GET" && url.pathname === "/experiment/assign") {
      // 결정적 배정(앱이 어떤 팔의 개입을 줄지 결정). practiceOrder = 실제 적용될 연습 순서(개입 없으면 null). 등록 없으면 404.
      const exp = url.searchParams.get("exp") ?? "";
      const variant = assignForLearner(store, exp, learner);
      if (variant === null) return json(res, 404, { error: "experiment not registered: " + exp });
      return json(res, 200, { experimentId: exp, learnerRef: learner, variant, practiceOrder: practiceOrderFor(store, learner) });
    }
    if (req.method === "GET" && url.pathname === "/experiment/result") {
      // 통제군/실험군 Gain 집단 간 비교(인과 주의 병기·규칙 17). 등록 없으면 404.
      const exp = url.searchParams.get("exp") ?? "";
      const result = experimentResult(store, exp);
      if (result === null) return json(res, 404, { error: "experiment not registered: " + exp });
      return json(res, 200, result);
    }
    if (req.method === "GET" && url.pathname === "/certificates") return json(res, 200, certificatesFor(store, learner, lang, getPack(lang).graph));
    if (req.method === "GET" && url.pathname === "/badges") return json(res, 200, badgesFor(store, learner, lang, getPack(lang).graph)); // 배지(학습 인증+기여+검토, 증거 기반)
    if (req.method === "GET" && url.pathname === "/profile") return json(res, 200, profileFor(store, learner, lang, getPack(lang).graph)); // 프로필 카드(인증·배지·누적 학습량)
    if (req.method === "GET" && url.pathname === "/next") {
      // 시드 + 승격 커뮤니티 + 발행(진화 생성/큐레이션) 콘텐츠 — 전부 규칙 4 통과분만
      const bank = [...getPack(lang).bank, ...communityBank(store, lang), ...publishedBank(store, lang)];
      return json(res, 200, { items: serveItems(store, learner, lang, getPack(lang).graph, bank) });
    }

    // ── 커뮤니티 기여(진화의 인간 축) ──
    if (req.method === "POST" && url.pathname === "/contribute") {
      const body = await readBody(req);
      const item = body.item as CItem;
      const existing = [...getPack(item?.lang ?? lang).bank, ...communityBank(store, item?.lang ?? lang)];
      return json(res, 201, submitContribution(store, { contributorRef: String(body.contributorRef ?? learner), item }, existing));
    }
    if (req.method === "POST" && url.pathname === "/contribute/review") {
      const body = await readBody(req);
      const updated = reviewContribution(store, {
        reviewerRef: String(body.reviewerRef ?? learner),
        cid: String(body.cid),
        verdict: body.verdict as ReviewVerdict,
        reason: body.reason as string | undefined,
        flag: body.flag as ReviewFlag | undefined,
      });
      return json(res, 200, { contribution: updated });
    }
    if (req.method === "GET" && url.pathname === "/contributions") {
      const status = url.searchParams.get("status") as never;
      const opts = { status: status || undefined, lang: url.searchParams.get("lang") || undefined };
      // rank=effect → 학습효과 재랭킹(인기 아닌 실효 순, 규칙 1). 기본은 동료검증 순.
      const contributions = url.searchParams.get("rank") === "effect" ? contributionLeaderboard(store, opts) : listContributions(store, opts);
      return json(res, 200, { contributions });
    }
    if (req.method === "POST" && url.pathname === "/placement/step") {
      const body = await readBody(req);
      return json(res, 200, placementStep(getPack(lang).placement, (body.responses as PlacementResp[]) ?? [], { maxItems: body.maxItems as number | undefined }));
    }
    if (req.method === "GET" && url.pathname === "/i18n") { const ui = url.searchParams.get("ui") ?? "ko"; const p = getI18n(ui); return json(res, 200, { uiLang: ui, strings: p.strings, dir: p.dir }); } // UI 로케일(화면 언어·방향, 학습 언어와 독립)
    if (req.method === "GET" && url.pathname === "/pack") return json(res, 200, getPack(lang).meta); // 표기 방향·이름·문자(웹이 dir/UI에 사용)
    if (req.method === "GET" && url.pathname === "/phonology") return json(res, 200, getPack(lang).phonology);
    if (req.method === "GET" && url.pathname === "/reading") {
      const passages = [...getPack(lang).reading, ...publishedReadings(store, lang)]; // 시드 + 발행 지문
      return json(res, 200, { passages: serveReading(store, learner, lang, passages, { limit: 3 }) }); // 정답은 서빙에서 제거(규칙 4)
    }
    if (req.method === "POST" && url.pathname === "/reading/answer") {
      const body = await readBody(req);
      const passages = [...getPack(lang).reading, ...publishedReadings(store, lang)]; // 소스(정답 보유)로 서버 채점
      return json(res, 200, answerReading(store, lang, passages, {
        learnerRef: String(body.learnerRef),
        passageId: String(body.passageId),
        questionIndex: body.questionIndex as number | undefined,
        choice: String(body.choice ?? ""),
      }));
    }
    // 진화 산출/큐레이션 발행(게이트 통과분만 서빙 편입, 규칙 4). 운영 도구·자동 잡이 호출.
    if (req.method === "POST" && url.pathname === "/content") {
      const body = await readBody(req);
      const item = body.item as ContentItem;
      const existing = [...getPack(item?.lang ?? lang).bank, ...communityBank(store, item?.lang ?? lang), ...publishedBank(store, item?.lang ?? lang)];
      return json(res, 201, publishContent(store, item, existing));
    }
    if (req.method === "POST" && url.pathname === "/content/reading") {
      const body = await readBody(req);
      return json(res, 201, publishReading(store, body.passage as ReadingPassage, String(body.lang ?? lang)));
    }
    if (req.method === "GET" && url.pathname === "/account/export") return json(res, 200, { events: exportLearner(store, learner) });
    if (req.method === "GET" && url.pathname === "/account/certificate") return json(res, 200, exportCertificate(store, learner, lang, getPack(lang).graph));
    if (req.method === "DELETE" && url.pathname === "/account") return json(res, 200, { deleted: deleteLearner(store, learner) });

    // 정적 학습 UI(제로 의존 브라우저 앱)
    if (req.method === "GET" && (url.pathname === "/" || STATIC.has(url.pathname))) {
      const name = url.pathname === "/" ? "index.html" : url.pathname.slice(1);
      const ext = name.split(".").pop() ?? "";
      try {
        const buf = readFileSync(new URL(`../../web/public/${name}`, import.meta.url));
        res.writeHead(200, { "content-type": CTYPE[ext] ?? "application/octet-stream" });
        return res.end(buf);
      } catch {
        return json(res, 404, { error: "asset not found: " + name });
      }
    }

    return json(res, 404, { error: "not found" });
  } catch (e) {
    if (e instanceof PayloadTooLarge) return json(res, 413, { error: e.message });
    return json(res, 400, { error: (e as Error).message });
  }
});

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("server.ts")) {
  app.listen(PORT, () => console.log(`LinguaLoop server (lang=${LANG}) → http://localhost:${PORT}  ·  ${DB_PATH ? "sqlite=" + DB_PATH : "data=" + DATA_DIR}`));
  // 우아한 종료 — 영속 핸들(SQLite 등)을 닫고 나간다.
  for (const sig of ["SIGINT", "SIGTERM"] as const) {
    process.on(sig, () => { store.close?.(); app.close(); process.exit(0); });
  }
}
