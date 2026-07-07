// 콘텐츠 자동생성 오케스트레이션(/new-content) — 진화 루프의 3번째 축.
// 격차 → 생성기 → 코어 품질게이트(checkItem) → 통과분만 verified 편입(규칙 4).
import { checkItem } from "../../core/src/index.ts";
import type { ContentItem, KCGraph } from "../../core/src/index.ts";
import type { ContentGenerator } from "../../adapters/src/index.ts";

export interface NewContentInput {
  generator: ContentGenerator;
  lang: string;
  kc: string;
  type?: string;
  level?: string;
  count: number;
  existing: ContentItem[];
}

export interface NewContentResult {
  verified: ContentItem[];
  rejected: { item: ContentItem; reasons: string[] }[];
}

/**
 * 한 KC용 콘텐츠 배치 생성 → 품질 게이트.
 * 생성물은 draft; 게이트 통과분만 verified 로 승격(규칙 4). 기존/누적과 중복 검사.
 */
export function runNewContent(input: NewContentInput): NewContentResult {
  const cands = input.generator.generate({ lang: input.lang, kc: input.kc, type: input.type, level: input.level, count: input.count });
  const verified: ContentItem[] = [];
  const rejected: { item: ContentItem; reasons: string[] }[] = [];
  for (const item of cands) {
    const res = checkItem(item, input.existing.concat(verified));
    if (res.pass) verified.push({ ...item, quality: "verified" });
    else rejected.push({ item, reasons: res.reasons });
  }
  return { verified, rejected };
}

export interface GapFillResult {
  generated: ContentItem[];
  byKc: Record<string, number>;
  skipped: string[]; // 생성기가 지원하지 않는 KC
}

/**
 * 탐지된 콘텐츠 격차를 자동 생성으로 메운다. 생성기가 지원하는 KC만.
 * 반환 아이템은 게이트 통과분(verified). 편입 결정은 호출측(진화/승인).
 */
export function generateForGaps(generator: ContentGenerator, gaps: { kc: string }[], graph: KCGraph, existing: ContentItem[], lang: string, perKc = 3): GapFillResult {
  const generated: ContentItem[] = [];
  const byKc: Record<string, number> = {};
  const skipped: string[] = [];
  for (const gap of gaps) {
    if (!generator.supports(gap.kc)) {
      skipped.push(gap.kc);
      continue;
    }
    const level = graph.nodes[gap.kc]?.level ?? "A1";
    const { verified } = runNewContent({ generator, lang, kc: gap.kc, level, count: perKc, existing: existing.concat(generated) });
    byKc[gap.kc] = verified.length;
    generated.push(...verified);
  }
  return { generated, byKc, skipped };
}
