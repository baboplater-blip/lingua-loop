// 음성학적 발음 채점(언어 무관, 규칙 11). SSOT: pronunciation-scoring.
// IPA 음소를 조음 자질로 표현하고, 목표열과 산출열을 자질가중 편집거리로 정렬해 점수를 낸다.
// 원어민 억양 강요가 아니라 **명료도 우선** — 작은 자질 차이(혼동 가능한 오류)는 관대하게,
// 큰 차이(알아듣기 어려움)는 엄격하게 평가한다. 원음성은 다루지 않는다(전사만; 프라이버시=규칙 6).

// 자음: 조음위치(place) · 조음방식(manner, 공명도 척도) · 유성(voice)
// 모음: 혀높이(height) · 전후(backness) · 원순(round)
interface Consonant { t: "C"; place: number; manner: number; voice: 0 | 1 }
interface Vowel { t: "V"; height: number; back: number; round: 0 | 1 }
type Feat = Consonant | Vowel;

const C = (place: number, manner: number, voice: 0 | 1): Consonant => ({ t: "C", place, manner, voice });
const V = (height: number, back: number, round: 0 | 1): Vowel => ({ t: "V", height, back, round });

// place: 순음1 순치2 치3 치경4 후치경5 경구개6 연구개7 성문8
// manner(공명도): 파열0 파찰1 마찰2 탄설3 전동3.5 비4 설측5 접근6
const FEATURES: Record<string, Feat> = {
  p: C(1, 0, 0), b: C(1, 0, 1), t: C(4, 0, 0), d: C(4, 0, 1), k: C(7, 0, 0), g: C(7, 0, 1),
  f: C(2, 2, 0), v: C(2, 2, 1), "θ": C(3, 2, 0), "ð": C(3, 2, 1), s: C(4, 2, 0), z: C(4, 2, 1),
  "ʃ": C(5, 2, 0), "ʒ": C(5, 2, 1), x: C(7, 2, 0), h: C(8, 2, 0),
  "tʃ": C(5, 1, 0), "dʒ": C(5, 1, 1),
  m: C(1, 4, 1), n: C(4, 4, 1), "ŋ": C(7, 4, 1), "ɲ": C(6, 4, 1),
  l: C(4, 5, 1), "ʎ": C(6, 5, 1), r: C(4, 3, 1), rr: C(4, 3.5, 1),
  j: C(6, 6, 1), w: C(7, 6, 1),
  // 모음 — height: 고4 준고3 중2 준저1.5 저1 · back: 전1 중2 후3
  i: V(4, 1, 0), "ɪ": V(3, 1, 0), e: V(2, 1, 0), "æ": V(1, 1, 0),
  "ʌ": V(1.5, 2, 0), "ə": V(2, 2, 0), a: V(1, 2, 0),
  "ɑ": V(1, 3, 0), "ɒ": V(1, 3, 1), "ɔ": V(1.5, 3, 1), o: V(2, 3, 1),
  "ʊ": V(3, 3, 1), u: V(4, 3, 1),
};

const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x);

/** 두 음소 사이 조음 자질 거리(0=동일 … 1=최대 상이). 모르는 기호나 C↔V 는 최대 거리. */
export function featureDistance(p1: string, p2: string): number {
  if (p1 === p2) return 0;
  const a = FEATURES[p1];
  const b = FEATURES[p2];
  if (!a || !b) return 1;
  if (a.t !== b.t) return 1;
  if (a.t === "C" && b.t === "C") {
    const dPlace = Math.abs(a.place - b.place) / 7; // 최대 순음↔성문
    const dManner = Math.abs(a.manner - b.manner) / 6; // 최대 파열↔접근
    const dVoice = Math.abs(a.voice - b.voice);
    return clamp01(0.4 * dPlace + 0.4 * dManner + 0.2 * dVoice);
  }
  const v1 = a as Vowel;
  const v2 = b as Vowel;
  const dH = Math.abs(v1.height - v2.height) / 3; // 저1↔고4
  const dB = Math.abs(v1.back - v2.back) / 2; // 전1↔후3
  const dR = Math.abs(v1.round - v2.round);
  return clamp01(0.45 * dH + 0.45 * dB + 0.1 * dR);
}

export type AlignOp = "match" | "sub" | "ins" | "del";
export interface PhonemeCompare {
  op: AlignOp;
  target: string | null; // del/ins 시 한쪽은 null
  produced: string | null;
  distance: number; // 이 위치의 자질 거리(ins/del=1)
  hint?: string; // 조음 교정 힌트(오류일 때)
}

const GAP = 0.95; // 삽입/삭제 비용(완전 상이보다 살짝 관대 — 누락이 대체보다 덜 치명적이지 않게)

/** 목표 IPA 열과 산출 IPA 열을 자질가중 편집거리로 정렬(Needleman–Wunsch). */
function align(target: string[], produced: string[]): PhonemeCompare[] {
  const n = target.length;
  const m = produced.length;
  const d: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = 1; i <= n; i++) d[i][0] = i * GAP;
  for (let j = 1; j <= m; j++) d[0][j] = j * GAP;
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const sub = d[i - 1][j - 1] + featureDistance(target[i - 1], produced[j - 1]);
      const del = d[i - 1][j] + GAP;
      const ins = d[i][j - 1] + GAP;
      d[i][j] = Math.min(sub, del, ins);
    }
  }
  // 역추적
  const ops: PhonemeCompare[] = [];
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0) {
      const dist = featureDistance(target[i - 1], produced[j - 1]);
      if (Math.abs(d[i][j] - (d[i - 1][j - 1] + dist)) < 1e-9) {
        ops.push(compare(target[i - 1], produced[j - 1], dist));
        i--; j--; continue;
      }
    }
    if (i > 0 && Math.abs(d[i][j] - (d[i - 1][j] + GAP)) < 1e-9) {
      ops.push({ op: "del", target: target[i - 1], produced: null, distance: 1, hint: `[${target[i - 1]}] 소리가 빠졌어요` });
      i--; continue;
    }
    ops.push({ op: "ins", target: null, produced: produced[j - 1], distance: 1, hint: `[${produced[j - 1]}] 소리가 더 들어갔어요` });
    j--;
  }
  return ops.reverse();
}

function compare(target: string, produced: string, dist: number): PhonemeCompare {
  if (dist === 0) return { op: "match", target, produced, distance: 0 };
  return { op: "sub", target, produced, distance: dist, hint: articulationHint(target, produced) };
}

/** 지배적 자질 차이에서 구체적 조음 힌트를 도출한다. */
export function articulationHint(target: string, produced: string): string {
  const a = FEATURES[target];
  const b = FEATURES[produced];
  if (!a || !b) return `[${target}]로 발음해 보세요`;
  if (a.t !== b.t) return a.t === "V" ? `모음 [${target}]로` : `자음 [${target}]로`;
  if (a.t === "C" && b.t === "C") {
    if (a.voice !== b.voice) return a.voice ? "성대를 울려 유성음으로" : "성대를 울리지 말고 무성음으로";
    const dManner = Math.abs(a.manner - b.manner);
    const dPlace = Math.abs(a.place - b.place);
    if (dManner >= dPlace) {
      if (a.manner === 3.5) return "혀끝을 여러 번 떨어 전동음(rr)으로";
      if (a.manner === 3) return "혀끝을 한 번만 튕겨 탄설음으로";
      if (a.manner <= 0) return "공기를 막았다 터뜨려 파열음으로";
      if (a.manner === 2) return "좁은 틈으로 공기를 흘려 마찰음으로";
      return "조음 방식을 바꿔 보세요";
    }
    return a.place > b.place ? "혀를 더 뒤쪽에서" : "혀를 더 앞쪽에서";
  }
  const v1 = a as Vowel;
  const v2 = b as Vowel;
  if (Math.abs(v1.height - v2.height) >= Math.abs(v1.back - v2.back)) return v1.height > v2.height ? "혀를 더 높이(입을 덜 벌려)" : "혀를 더 낮춰(입을 더 벌려)";
  return v1.back > v2.back ? "혀를 더 뒤로" : "혀를 더 앞으로";
}

export interface PronunciationScore {
  score: number; // 0..1 종합(자질 정확도)
  intelligibility: number; // 0..1 명료도(알아들을 수 있는가) — 작은 오류엔 관대
  perPhoneme: PhonemeCompare[];
  errors: PhonemeCompare[]; // op !== match
}

/**
 * 목표 IPA 열 vs 산출 IPA 열 → 발음 점수. 명료도 우선(규칙): 자질상 가까운 오류(혼동쌍)는
 * 명료도를 크게 깎지 않고, 누락/삽입/큰 자질 차이만 명료도를 낮춘다.
 */
export function scorePronunciation(targetIPA: string[], producedIPA: string[]): PronunciationScore {
  if (targetIPA.length === 0) return { score: 1, intelligibility: 1, perPhoneme: [], errors: [] };
  const per = align(targetIPA, producedIPA);
  const cost = per.reduce((s, c) => s + c.distance, 0);
  const denom = Math.max(targetIPA.length, producedIPA.length, 1);
  const score = clamp01(1 - cost / denom);
  // 명료도: 목표 음소 중 "충분히 알아들을 만하게"(거리<0.5, 누락 아님) 실현된 비율
  const gross = per.filter((c) => c.op === "del" || (c.op === "sub" && c.distance >= 0.5)).length;
  const intelligibility = clamp01(1 - gross / targetIPA.length);
  const errors = per.filter((c) => c.op !== "match");
  return { score, intelligibility, perPhoneme: per, errors };
}

// ── 운율(강세) 채점 ────────────────────────────────────────────────────
// 분절음(음소)만큼이나 **강세**가 명료도를 좌우한다(예: PHOtograph vs phoTOGraph).
// 강세 패턴 = 음절별 강세 강도 배열(0=무강세, 1=주강세, 0.5=부강세 등).
export interface StressResult {
  score: number; // 0..1
  primaryMatch: boolean; // 주강세 음절이 일치하는가
  note?: string;
}

const argmax = (a: number[]): number => a.reduce((bi, v, i, arr) => (v > arr[bi] ? i : bi), 0);

/**
 * 강세 패턴 일치 점수. 주강세 위치 일치(가중 0.7) + 음절별 강세 유무 일치(0.3).
 * 주강세가 틀리면 알아듣기 어려워지므로 크게 감점한다(명료도 우선의 운율 판).
 */
export function stressScore(target: number[], produced: number[]): StressResult {
  if (!target || target.length === 0) return { score: 1, primaryMatch: true };
  const prod = Array.isArray(produced) ? produced : []; // 누락/비배열 산출 방어(크래시 방지) — 전체를 미일치로 처리
  const ti = argmax(target);
  const pi = prod.length ? argmax(prod) : -1;
  const primaryMatch = ti === pi;
  const n = Math.max(target.length, prod.length);
  let agree = 0;
  for (let i = 0; i < n; i++) if (((target[i] ?? 0) >= 1) === ((prod[i] ?? 0) >= 1)) agree++;
  const score = clamp01(0.7 * (primaryMatch ? 1 : 0) + 0.3 * (agree / Math.max(n, 1)));
  return { score, primaryMatch, note: primaryMatch ? undefined : `강세를 ${ti + 1}번째 음절에 두세요` };
}

export interface ToneResult {
  score: number; // 0..1
  matched: number;
  total: number;
  note?: string;
}

/**
 * 성조 일치 점수(성조어: 중국어 등). 성조는 음절별 **범주**(1~4성·경성) — 틀리면 다른 단어가 되므로
 * 명료도에 치명적이다. 음절별 정확 일치 비율. (강세=위치, 성조=범주 — 다른 운율 축)
 */
export function toneScore(target: number[], produced: number[]): ToneResult {
  if (!target || target.length === 0) return { score: 1, matched: 0, total: 0 };
  const total = target.length;
  let matched = 0;
  const wrong: number[] = [];
  for (let i = 0; i < total; i++) {
    if ((produced[i] ?? -1) === target[i]) matched += 1;
    else wrong.push(i + 1);
  }
  return { score: matched / total, matched, total, note: wrong.length ? `${wrong.join("·")}번째 음절 성조를 확인하세요` : undefined };
}
