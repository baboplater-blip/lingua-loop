// 이벤트 영속 — SQLite 백엔드(Node 24 내장 node:sqlite, 제로 의존·자가호스팅). 규칙 5·6·12·13.
// JSONL 파일 스토어의 다음 단계: 단일 ACID 파일 + WAL(동시 읽기) + 인덱스(학습자별 삭제/조회).
// 인터페이스(Store)는 동일 — sink/remove 만 SQLite 로 바뀐다(규칙 12 pluggable). 코어 코드 불변.
// events 테이블은 append-only(INSERT 전용). 학습자 삭제(규칙 6) 시에만 해당 행 DELETE.
import { DatabaseSync } from "node:sqlite";
import { EventLog, syncCounterFrom } from "../../core/src/index.ts";
import type { LearningEvent } from "../../core/src/index.ts";
import { newStore, type Store } from "./handlers.ts";

interface Row {
  learner_ref: string;
  event_json: string;
}

/**
 * SQLite 파일에서 영속 스토어를 연다. 기존 이벤트를 리플레이 복원하고, 이후 append(sink)·삭제(remove)를
 * SQLite 에 반영한다. 작업 세트는 메모리 EventLog(파생 리플레이용) — 내구성은 SQLite 가 담당.
 */
export function openSqliteStore(dbPath: string): Store {
  const db = new DatabaseSync(dbPath);
  db.exec(
    "PRAGMA journal_mode = WAL;" +
      "CREATE TABLE IF NOT EXISTS events (id INTEGER PRIMARY KEY AUTOINCREMENT, learner_ref TEXT NOT NULL, ts TEXT NOT NULL, event_json TEXT NOT NULL);" +
      "CREATE INDEX IF NOT EXISTS idx_events_learner ON events(learner_ref);",
  );

  const store = newStore();
  const loaded: LearningEvent[] = [];
  const rows = db.prepare("SELECT learner_ref, event_json FROM events ORDER BY id").all() as unknown as Row[];
  for (const row of rows) {
    const ev = JSON.parse(row.event_json) as LearningEvent;
    let log = store.logs.get(row.learner_ref);
    if (!log) {
      log = new EventLog();
      store.logs.set(row.learner_ref, log);
    }
    log.append(ev);
    loaded.push(ev);
  }
  syncCounterFrom(loaded); // 재시작 후 eventId 충돌 방지

  const insert = db.prepare("INSERT INTO events (learner_ref, ts, event_json) VALUES (?, ?, ?)");
  const del = db.prepare("DELETE FROM events WHERE learner_ref = ?");
  store.dir = dbPath;
  store.sink = (ref, ev) => { insert.run(ref, ev.ts, JSON.stringify(ev)); };
  store.remove = (ref) => { del.run(ref); };
  store.close = () => db.close();
  return store;
}
