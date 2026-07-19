// 이벤트 영속 — JSONL 파일 스토어(자가호스팅·제로 의존). 규칙 5(append-only)·6(소유권)·13(자가호스팅).
// 학습자당 한 파일(<dir>/<safe>.jsonl). 이벤트를 한 줄씩 append — 파일 자체도 append-only(수정/삭제 없음,
// 학습자 삭제 시에만 파일 통째 제거). 재시작하면 디렉터리를 스캔해 로그를 리플레이 복원한다.
import { mkdirSync, readdirSync, readFileSync, appendFileSync, writeFileSync, renameSync, rmSync } from "node:fs";
import { join } from "node:path";
import { EventLog, syncCounterFrom } from "../../core/src/index.ts";
import type { LearningEvent } from "../../core/src/index.ts";
import { newStore, type Store } from "./handlers.ts";

/**
 * learnerRef → 파일시스템 안전 파일명. 영문·숫자·`.`·`-` 만 통과시키고 나머지(경로 구분자·와일드카드·
 * 공백 등)는 `_<hex>` 로 이스케이프한다. `_` 는 항상 이스케이프 접두어이므로 문자→파일명 매핑이 단사(injective)
 * — 서로 다른 learnerRef 는 서로 다른 파일이 된다. 경로 조작(`../`, 절대경로)도 원천 차단.
 */
export function safeName(ref: string): string {
  const enc = ref.replace(/[^a-zA-Z0-9.-]/g, (c) => "_" + c.charCodeAt(0).toString(16).padStart(2, "0"));
  return enc + ".jsonl";
}

/**
 * 디스크에서 영속 스토어를 연다. 기존 `<dir>/*.jsonl` 을 모두 로드해 인메모리 로그를 복원하고,
 * 이후 append(sink)·삭제(remove)를 파일에 반영한다. learnerRef 는 파일명이 아니라 이벤트에서 되읽어
 * 안전 인코딩과 무관하게 정확히 복원한다.
 */
export function openFileStore(dir: string): Store {
  mkdirSync(dir, { recursive: true });
  const store = newStore();
  const loaded: LearningEvent[] = [];
  for (const f of readdirSync(dir)) {
    if (!f.endsWith(".jsonl")) continue;
    const path = join(dir, f);
    // 불량 라인(전원 손실·디스크 풀·프로세스 강제종료로 잘린 append)에 내성 — throw 대신 건너뛴다.
    // 하나의 손상 파일이 서버 부팅 전체를 막지 않게(모든 학습자 데이터 접근 상실 방지, 규칙 13).
    let bad = 0;
    const log = EventLog.fromJSONL(readFileSync(path, "utf8"), { onError: () => { bad++; } });
    const events = log.all();
    if (bad > 0) {
      // 자가복구 — 유효 이벤트만으로 원자적 재기록(tmp→rename). 잘린 꼬리 파편을 제거해
      // 이후 append 가 미완성 라인에 붙어 재손상되는 것을 막는다. 유효 이벤트는 하나도 잃지 않는다(규칙 5).
      const tmp = path + ".tmp";
      writeFileSync(tmp, events.length ? log.toJSONL() + "\n" : "");
      renameSync(tmp, path);
      console.warn(`[persist] ${f}: ${events.length}개 이벤트 복원, 손상 라인 ${bad}개 제거(잘린 append 추정)`);
    }
    if (events.length === 0) continue;
    store.logs.set(events[0].learnerRef, log);
    for (const e of events) loaded.push(e);
  }
  syncCounterFrom(loaded); // 새 eventId 를 복원분 최대 id 뒤로 밀어 재시작 후 충돌 방지
  store.dir = dir;
  store.sink = (ref, ev) => appendFileSync(join(dir, safeName(ref)), JSON.stringify(ev) + "\n");
  store.remove = (ref) => rmSync(join(dir, safeName(ref)), { force: true });
  return store;
}
