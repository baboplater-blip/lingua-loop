// 콘텐츠 품질 게이트. SSOT: content-generation-quality-gate. 미검증 노출 금지(규칙 4).
import type { ContentItem } from "./types.ts";

export interface GateResult {
  pass: boolean;
  reasons: string[];
}

function norm(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

const ANSWER_REQUIRED: ReadonlySet<string> = new Set(["flashcard", "cloze", "mcq", "minimal_pair"]);

/**
 * 아이템이 학습 경로에 노출될 자격이 있는지 검사.
 * 통과(pass=true)만 draft→verified 로 승격 가능.
 */
export function checkItem(item: ContentItem, existing: ContentItem[] = []): GateResult {
  const reasons: string[] = [];

  // 스키마 완결성
  if (!item.id) reasons.push("id 누락");
  if (!item.lang) reasons.push("lang 누락");
  if (!item.type) reasons.push("type 누락");
  if (!item.kc || item.kc.length === 0) reasons.push("KC 태그 누락(규칙: 최소 1개)");
  if (!item.level) reasons.push("level 누락");
  if (!item.prompt || !item.prompt.trim()) reasons.push("prompt 비어 있음");

  // 라이선스(규칙 14)
  if (!item.source || !item.source.license || !item.source.license.trim()) {
    reasons.push("출처/라이선스 누락(규칙 14)");
  }

  // 정답 유효성
  if (ANSWER_REQUIRED.has(item.type)) {
    if (!item.answer || !item.answer.value || !item.answer.value.trim()) {
      reasons.push("정답 누락/비어 있음");
    }
  }

  // 오답보기 타당성
  if (item.type === "mcq") {
    const distractors = item.distractors ?? [];
    if (distractors.length === 0) reasons.push("MCQ 오답보기 없음");
    const ansNorm = item.answer ? norm(item.answer.value) : "";
    const seen = new Set<string>();
    for (const d of distractors) {
      if (!d.value || !d.value.trim()) reasons.push("빈 오답보기");
      const dn = norm(d.value ?? "");
      if (dn && dn === ansNorm) reasons.push("오답보기가 정답과 동일: " + d.value);
      if (seen.has(dn)) reasons.push("중복 오답보기: " + d.value);
      seen.add(dn);
    }
  }

  // 중복(같은 lang+type+prompt(+answer))
  const key = norm(item.lang + "|" + item.type + "|" + item.prompt + "|" + (item.answer?.value ?? ""));
  for (const ex of existing) {
    if (ex.id === item.id) continue;
    const exKey = norm(ex.lang + "|" + ex.type + "|" + ex.prompt + "|" + (ex.answer?.value ?? ""));
    if (exKey === key) {
      reasons.push("기존 아이템과 중복: " + ex.id);
      break;
    }
  }

  return { pass: reasons.length === 0, reasons };
}

/** 게이트 통과분만 verified 로 승격. 실패분은 draft 유지(노출 안 됨). */
export function promoteVerified(items: ContentItem[]): { verified: ContentItem[]; rejected: { item: ContentItem; reasons: string[] }[] } {
  const verified: ContentItem[] = [];
  const rejected: { item: ContentItem; reasons: string[] }[] = [];
  for (let i = 0; i < items.length; i++) {
    const res = checkItem(items[i], items.filter((_, j) => j !== i));
    if (res.pass) {
      verified.push({ ...items[i], quality: items[i].quality === "draft" ? "verified" : items[i].quality });
    } else {
      rejected.push({ item: items[i], reasons: res.reasons });
    }
  }
  return { verified, rejected };
}
