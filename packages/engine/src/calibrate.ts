// 문항 캘리브레이션 배선(/calibrate). SSOT: irt-calibration. 난이도는 데이터로만(규칙 3).
import { eloCalibrate, applyCalibration, flagAnomalousItems } from "../../core/src/index.ts";
import type { LearningEvent, ContentItem } from "../../core/src/index.ts";
import { toResponses } from "./analyze.ts";

export interface CalibrationReport {
  items: ContentItem[]; // 난이도 갱신·verified→calibrated 승격 반영
  calibratedCount: number;
  anomalous: string[];
  nResponses: number;
}

export function runCalibration(events: readonly LearningEvent[], items: ContentItem[]): CalibrationReport {
  const responses = toResponses(events);
  const result = eloCalibrate(responses);
  const updated = applyCalibration(items, result);
  const calibratedCount = updated.filter((it, i) => it.quality === "calibrated" && items[i].quality !== "calibrated").length;
  const anomalous = flagAnomalousItems(responses);
  return { items: updated, calibratedCount, anomalous, nResponses: responses.length };
}
