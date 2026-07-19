// 연습 순서 정책 — 실험 개입 레버(SLA 근거). 언어 무관·순수(규칙 11·5).
// 인터리빙(교차연습)은 블록연습보다 리텐션·전이에 유리하다는 것이 인지·SLA 연구의 정설(Rohrer & Taylor 2007 등).
// 핵심: **분량을 바꾸지 않고 순서만** 재배열한다 — 참여도 부풀리기가 아니라 순수 교수법 레버(규칙 1).
// 이 순서 차이가 실제로 학습을 올리는지는 사전등록 통제 실험이 실학습자에서 측정한다([`ab-experiment-framework`]).

export type PracticeOrder = "interleaved" | "blocked";

/**
 * 아이템을 첫 KC(kc[0]) 기준으로 재배열한다. **집합은 보존**(순서만 변경).
 *  - blocked: 같은 KC 아이템을 모아 순차 제시(한 주제를 몰아서).
 *  - interleaved: KC 그룹을 라운드로빈으로 교차 제시(주제를 번갈아).
 * 그룹은 첫 등장 순서를 유지해 결정적(규칙 5).
 */
export function orderByPractice<T extends { kc: string[] }>(items: readonly T[], order: PracticeOrder): T[] {
  const groups = new Map<string, T[]>();
  for (const it of items) {
    const k = Array.isArray(it.kc) && it.kc.length > 0 ? it.kc[0] : "";
    (groups.get(k) ?? groups.set(k, []).get(k)!).push(it);
  }
  const lists = [...groups.values()];
  if (order === "blocked") return lists.flat();
  // interleaved — 라운드로빈: 각 그룹에서 i번째 아이템을 순서대로 뽑는다.
  const out: T[] = [];
  let added = true;
  for (let i = 0; added; i++) {
    added = false;
    for (const l of lists) {
      if (i < l.length) {
        out.push(l[i]);
        added = true;
      }
    }
  }
  return out;
}
