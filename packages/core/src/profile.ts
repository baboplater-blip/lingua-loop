// 학습자 프로필 카드(동기 층 — 성과 요약) — 언어 무관(규칙 11). 결정적·소유·포터블(규칙 6).
// 인증·배지·누적 학습량을 한 곳에 모은다. ⚠️ 다크패턴 없음(규칙 2·9): 스트릭·연속일 없음, 누적 성과(총 응답·정확도·인증)만.
import type { CertificationReport } from "./certifications.ts";
import type { BadgeReport } from "./badges.ts";

export interface ProfileTotals {
  responses: number; // 총 응답 수(누적, 스트릭 아님)
  correct: number; // 정답 수
  distinctKCs: number; // 연습한 KC 종류 수
  tutorTurns: number; // 튜터 대화 턴(학습자 발화)
  contributions: number; // 수용된 저자 기여 수
}

export interface ProfileCard {
  learnerRef: string;
  lang: string;
  certified: number; // 인증 KC 수
  certifiedLevels: string[]; // 완주 레벨
  earnedBadges: { id: string; category: string; tier: string }[]; // 획득 배지(티어)
  totals: ProfileTotals;
  accuracy: number | null; // 누적 정확도(0..1), 응답 없으면 null
  summary: string; // 기계가독 요약(언어 중립)
}

/**
 * 프로필 카드 조립 — 인증(cert) + 배지(badges) + 누적 통계(totals)를 결정적으로 모은다.
 * 타임스탬프 없음(포터블·재현 가능). 요약은 언어 중립 기계가독; 표시 문자열은 UI가 로케일로 렌더.
 */
export function buildProfile(learnerRef: string, lang: string, cert: CertificationReport, badges: BadgeReport, totals: ProfileTotals): ProfileCard {
  const accuracy = totals.responses > 0 ? Math.round((totals.correct / totals.responses) * 100) / 100 : null;
  const earnedBadges = badges.earned.map((b) => ({ id: b.id, category: b.category, tier: b.tier as string }));
  const summary = `certified=${cert.certified.length} levels=${cert.certifiedLevels.length} badges=${earnedBadges.length} answered=${totals.responses}`;
  return { learnerRef, lang, certified: cert.certified.length, certifiedLevels: cert.certifiedLevels, earnedBadges, totals, accuracy, summary };
}
