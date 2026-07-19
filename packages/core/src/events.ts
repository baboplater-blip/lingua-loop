// append-only 이벤트 로그(규칙 5). SSOT: telemetry-event-schema.
// 이벤트는 추가만 — 수정/삭제 없음. 반환 이벤트는 동결(freeze)되어 변경 시 throw.
import type { LearningEvent, EventType, Consent } from "./types.ts";

let counter = 0;
function nextId(): string {
  counter += 1;
  return "evt_" + counter.toString(36).padStart(6, "0");
}

/**
 * 영속 로그를 복원한 뒤 호출 — 새 이벤트 id 카운터를 이미 발급된 최대 id 뒤로 민다.
 * 재시작해도 새 eventId 가 기존 것과 충돌하지 않도록 보장(규칙 5 이력 무결성).
 */
export function syncCounterFrom(events: Iterable<{ eventId: string }>): void {
  for (const e of events) {
    const m = /^evt_([0-9a-z]+)$/.exec(e.eventId);
    if (m) counter = Math.max(counter, parseInt(m[1], 36));
  }
}

export interface MakeEventInput {
  learnerRef: string;
  type: EventType;
  payload?: Record<string, unknown>;
  kc?: string[];
  itemId?: string;
  sessionId?: string;
  consent?: Consent;
  ts?: string; // 테스트 결정성용
  eventId?: string;
}

export function makeEvent(input: MakeEventInput): LearningEvent {
  return Object.freeze({
    eventId: input.eventId ?? nextId(),
    ts: input.ts ?? new Date().toISOString(),
    learnerRef: input.learnerRef,
    sessionId: input.sessionId,
    type: input.type,
    kc: input.kc,
    itemId: input.itemId,
    payload: Object.freeze({ ...(input.payload ?? {}) }),
    consent: input.consent ?? "learn",
    schemaVersion: 1,
  }) as LearningEvent;
}

/** append-only 로그. update/delete 메서드는 존재하지 않는다. */
export class EventLog {
  #events: LearningEvent[] = [];

  append(input: MakeEventInput | LearningEvent): LearningEvent {
    const e = "eventId" in input && "schemaVersion" in input ? (Object.freeze(input) as LearningEvent) : makeEvent(input as MakeEventInput);
    this.#events.push(e);
    return e;
  }

  all(): readonly LearningEvent[] {
    return Object.freeze(this.#events.slice());
  }

  count(): number {
    return this.#events.length;
  }

  /** JSONL 직렬화(자가호스팅 파일 스토어). 파싱 역은 fromJSONL. */
  toJSONL(): string {
    return this.#events.map((e) => JSON.stringify(e)).join("\n");
  }

  /**
   * JSONL 역직렬화. 기본은 엄격(불량 라인에서 throw — toJSONL 왕복 계약 보존).
   * `onError` 를 주면 파싱 실패 라인을 건너뛰고 콜백에 넘긴다 — 파일 스토어가 전원 손실·디스크 풀로
   * 잘린 append(마지막 줄이 미완성)를 만나도 유효 이벤트를 복원하고 부팅을 잇기 위함(규칙 13 내구성).
   * 유효 이벤트는 하나도 버리지 않는다(규칙 5).
   */
  static fromJSONL(text: string, opts: { onError?: (line: string, err: unknown) => void } = {}): EventLog {
    const log = new EventLog();
    for (const line of text.split("\n")) {
      const t = line.trim();
      if (!t) continue;
      try {
        log.append(JSON.parse(t) as LearningEvent);
      } catch (err) {
        if (opts.onError) opts.onError(t, err);
        else throw err;
      }
    }
    return log;
  }
}
