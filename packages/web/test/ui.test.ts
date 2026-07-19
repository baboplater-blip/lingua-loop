// 학습 UI 계약 + 다크패턴 안티테스트(규칙 9·10). 브라우저 없이 정적 검증.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../public/index.html", import.meta.url), "utf8");
const appjs = readFileSync(new URL("../public/app.js", import.meta.url), "utf8");
const css = readFileSync(new URL("../public/style.css", import.meta.url), "utf8");
// UI 로케일(화면 언어) — 문자열은 이제 데이터(로케일 팩). 검증은 팩을 본다.
const koI18n = JSON.parse(readFileSync(new URL("../../packs/ko/i18n.json", import.meta.url), "utf8")).strings as Record<string, string>;
const enI18n = JSON.parse(readFileSync(new URL("../../packs/en/i18n.json", import.meta.url), "utf8")).strings as Record<string, string>;

test("UI 셸이 자산·브랜드를 올바로 참조", () => {
  assert.ok(html.includes("링구아루프"), "브랜드");
  assert.ok(html.includes("/app.js") && html.includes("/style.css"), "자산 링크");
  assert.ok(css.length > 100, "스타일 존재");
});

test("클라이언트가 데이터 백엔드 엔드포인트를 사용", () => {
  for (const ep of ["/next", "/events", "/state", "/account", "/tutor", "/pronounce", "/phonology", "/reading", "/reading/answer", "/contribute", "/contributions", "/placement/step", "/certificates", "/pack", "/badges", "/profile"]) {
    assert.ok(appjs.includes(ep), "엔드포인트 사용: " + ep);
  }
  assert.ok(html.includes('data-view="tutor"'), "튜터 탭 존재");
  assert.ok(html.includes('data-view="place"'), "레벨(배치고사) 탭 존재");
  assert.ok(html.includes('data-view="pron"'), "발음 탭 존재");
  assert.ok(html.includes('data-view="read"'), "읽기 탭 존재");
  assert.ok(html.includes('data-view="contrib"'), "기여 탭 존재");
  assert.ok(html.includes('id="lang"') && ["es", "zh", "ar", "sw", "ja", "hi"].every((l) => html.includes(`value="${l}"`)), "배우는 언어 전환기(en/es/zh/ar/sw/ja/hi) 존재");
  assert.ok(appjs.includes("ll.lang"), "선택 언어 유지");
});

test("읽기 이해 문항은 서버 채점(정답 미유출·자기보고 금지, 규칙 1·4)", () => {
  // 클라이언트가 /reading/answer 로 선택만 보내고, 정답 판정은 서버가 한다(응답의 correct/correctAnswer 사용).
  assert.ok(/\/reading\/answer/.test(appjs) && /passageId/.test(appjs) && /questionIndex/.test(appjs), "이해 문항 답안을 서버로 전송");
  assert.ok(/r\.correct/.test(appjs) && /r\.correctAnswer/.test(appjs), "서버 응답으로 정오·정답 표시(클라 자기채점 아님)");
  assert.ok(!/===\s*q\.answer/.test(appjs), "클라이언트가 q.answer 로 자기채점하지 않음(정답 미유출)");
  assert.ok(/read\.explanation/.test(appjs), "해설(정답 어휘) 표시");
  // 복수 문항: 모든 문항 렌더 / 주관식: 텍스트 입력
  assert.ok(/p\.questions\.forEach/.test(appjs), "지문의 모든 이해 문항 렌더(복수)");
  assert.ok(/read\.typeAnswer/.test(appjs) && /createElement\("input"\)/.test(appjs), "주관식(보기 없음)은 자유응답 입력");
});

test("보안: 사용자 유래 콘텐츠는 innerHTML 삽입 전 HTML 이스케이프(저장형 XSS 방어)", () => {
  // esc 헬퍼 존재 + 핵심 이스케이프 매핑
  assert.ok(/const esc\s*=/.test(appjs), "esc 헬퍼 정의");
  assert.ok(/&lt;/.test(appjs) && /&gt;/.test(appjs) && /&amp;/.test(appjs), "esc 가 < > & 를 엔티티로 변환");
  // 신뢰 불가 콘텐츠(커뮤니티 기여·기여자·읽기 문항·문항 프롬프트)는 esc 로 감싼다
  assert.ok(/esc\(c\.item\.prompt\)/.test(appjs), "커뮤니티 기여 prompt 이스케이프");
  assert.ok(/esc\(c\.contributorRef\)/.test(appjs), "기여자 ref 이스케이프");
  assert.ok(/esc\(q\.q\)/.test(appjs), "읽기 이해 문항 이스케이프");
  assert.ok(/esc\(item\.prompt\)/.test(appjs), "문항 prompt 이스케이프");
  // 위험한 미이스케이프 보간이 남아있지 않음(음성 테스트)
  assert.ok(!/\$\{c\.item\.prompt\}/.test(appjs), "미이스케이프 c.item.prompt 없음");
  assert.ok(!/\$\{c\.contributorRef\}/.test(appjs), "미이스케이프 contributorRef 없음");
  assert.ok(!/\$\{q\.q\}/.test(appjs), "미이스케이프 q.q 없음");
});

test("RTL/양방향(bidi): 콘텐츠 요소가 dir=auto — 표기 방향까지 범용(규칙 11)", () => {
  // 목표어 콘텐츠 컨테이너는 dir="auto"로 유니코드 bidi(아랍어=RTL, 한글/영어=LTR) 자동 처리
  for (const id of ["stage", "read-passage", "pron-stage", "place-stage", "messages"]) {
    const re = new RegExp(`id="${id}"[^>]*dir="auto"`);
    assert.ok(re.test(html), `#${id} dir=auto`);
  }
  // 동적 생성 요소(보기 버튼·말풍선)도 요소별 dir 자동
  assert.ok(appjs.includes('b.dir = "auto"'), "보기 버튼 dir 자동");
  assert.ok(appjs.includes('el.dir = "auto"'), "말풍선 dir 자동");
  // 방향은 하드코딩이 아니라 팩 메타(/pack)에서 — 코어/UI가 방향을 강제하지 않음
  assert.ok(appjs.includes("/pack") && appjs.includes("direction"), "표기 방향은 팩 메타에서 결정");
  assert.ok(appjs.includes('VOICE_LANG') && appjs.includes('ar-SA'), "아랍어 음성 로케일");
});

test("읽기 탭: 이해가능한 입력(i+1) + 클릭 사전 + 어휘 노출 로깅", () => {
  assert.ok(appjs.includes("content.exposure"), "읽기 노출을 이벤트로 로깅");
  assert.ok(appjs.includes("glossable") && appjs.includes("showGloss"), "클릭 사전");
  assert.ok(html.includes("이해가능한 입력") || appjs.includes("이해가능한 입력"), "i+1 원리 노출");
});

test("기여 탭: 제출 + 검토 큐 + 미검증 노출 금지 안내(규칙 4)", () => {
  assert.ok(appjs.includes("/contribute") && appjs.includes("renderQueue"), "제출·검토 큐");
  assert.ok(html.includes("미검증") && html.includes("동료 검증"), "미검증 노출 금지·동료 검증 안내");
  assert.ok(appjs.includes("contributorRef !== LEARNER") || appjs.includes("내 기여는 내가 검토"), "자기 기여 자가검토 방지(UX)");
});

test("기여 탭: 학습효과 재랭킹 리더보드(인기 아닌 실효, 규칙 1)", () => {
  assert.ok(appjs.includes("rank=effect") && appjs.includes("renderLeaderboard"), "효과순 리더보드 조회");
  assert.ok(html.includes("학습효과") && (html.includes("인기가 아니라") || html.includes("망가진 문항")), "인기 아닌 학습효과 안내");
  assert.ok(html.includes("신뢰도로 가중"), "검토자 신뢰가중 투명 안내(규칙 10)");
});

test("레벨 탭: 적응형 배치고사 + 능력 반영(assessment.item)", () => {
  assert.ok(appjs.includes("placeStep") && appjs.includes("적응형"), "적응형 진행");
  assert.ok(appjs.includes("assessment.item") && appjs.includes("thetaEst"), "추정 능력을 학습자 상태에 반영(i+1 시작점)");
  assert.ok(html.includes("정답은 서버"), "정답 서버 채점(치팅 방지) 안내");
});

test("발음 탭: 지각/산출 두 축 + TTS + 음성 프라이버시(규칙 6·13)", () => {
  assert.ok(html.includes('data-pron="perceive"') && html.includes('data-pron="shadow"'), "듣고구별·따라말하기 모드");
  assert.ok(appjs.includes("speechSynthesis"), "브라우저 TTS(로컬)로 원음 제공");
  assert.ok(appjs.includes("서버로 전송하지 않") || html.includes("서버로 전송되지 않"), "목소리 서버 미전송 명시");
  assert.ok(appjs.includes('t("pron.intel")') && koI18n["pron.intel"].includes("명료도"), "명료도 우선 노출(로케일)");
});

test("발음 탭: 운율(강세) 시각화", () => {
  assert.ok(appjs.includes("stressedWord") && appjs.includes("PHON.prosody"), "강세 단어 강조·운율 풀");
  assert.ok(appjs.includes("강세"), "강세 안내");
});

test("투명성(규칙 10): '왜 지금'·숙달도 노출", () => {
  assert.ok(appjs.includes("왜 지금") && appjs.includes("숙달도"), "학습 이유·진척 표시");
  assert.ok(appjs.includes("consent"), "동의 태그 전송");
});

test("성취(마스터리 인증): can-do·레벨 진척 노출, 다크패턴 없이", () => {
  assert.ok(html.includes('id="achievements"') && appjs.includes("renderAchievements"), "성취 섹션");
  assert.ok(appjs.includes("levelProgress") && appjs.includes("certifiedLevels"), "레벨 진척·완주");
  assert.ok(koI18n["ach.canDoNow"].includes("이제 할 수 있어요") && koI18n["ach.soon"].includes("곧 인증"), "달성 인정·격려(손실공포 아님, 로케일)");
  assert.ok(appjs.includes("/account/certificate") && appjs.includes('t("ach.exportCert")'), "인증서 내보내기(데이터 소유, 규칙 6)");
});

test("학습자 프로필 카드: 인증·배지·누적 학습량 요약(스트릭 아님, 규칙 2·6·9)", () => {
  assert.ok(html.includes('id="profile"') && appjs.includes("renderProfile") && appjs.includes("/profile"), "프로필 섹션·렌더·조회");
  assert.ok(appjs.includes("profile.answered") && appjs.includes("profile.accuracy") && appjs.includes("profile.contributed"), "누적 성과 지표(응답·정확도·기여)");
  assert.ok(koI18n["profile.title"] && koI18n["profile.accuracy"], "프로필 라벨 로케일");
  // 프로필 내보내기(소유·포터블, 규칙 6) + 공용 exportJson 헬퍼
  assert.ok(appjs.includes("profile.export") && appjs.includes("exportJson"), "프로필 JSON 내보내기");
});

test("배지(성취를 커뮤니티까지): 증거 기반·다크패턴 없음(규칙 1·2·9)", () => {
  assert.ok(html.includes('id="badges"') && appjs.includes("renderBadges") && appjs.includes("/badges"), "배지 섹션·렌더·조회");
  assert.ok(appjs.includes("badge." ) && koI18n["badge.mastery"] && koI18n["badge.review"], "배지 라벨 로케일");
  // 검토 배지는 정확도(신뢰)로 자격 — 양이 아닌 실효(규칙 1)
  assert.ok(appjs.includes("badge.reviewLocked") && koI18n["badge.reviewLocked"], "검토 배지 신뢰 자격 안내");
  assert.ok(appjs.includes("TIER_EMOJI"), "티어 표시(브론즈·실버·골드)");
});

test("역할극(task 시나리오): 상황 선택 + task 전달 → 상황별 대화", () => {
  assert.ok(html.includes('id="scenarios"') && appjs.includes("renderScenarios"), "상황 선택 UI·렌더");
  assert.ok(appjs.includes("SCENARIOS") && ["restaurant", "intro", "shopping", "directions", "hospital", "airport"].every((s) => appjs.includes(s)), "시나리오 뱅크(자유·자기소개·식당·쇼핑·길찾기·병원·공항)");
  assert.ok(["scenario.shopping", "scenario.directions", "scenario.hospital", "scenario.airport"].every((k) => koI18n[k] && enI18n[k]), "확장 시나리오 라벨 로케일");
  assert.ok(appjs.includes("task: tutorTask"), "튜터에 task 전달(상황별 후속 질문)");
  assert.ok(appjs.includes("SCENARIO_GREETING"), "상황별 목표어 오프닝");
  assert.ok(koI18n["scenario.restaurant"] && enI18n["scenario.restaurant"], "시나리오 라벨 로케일");
});

test("다중 모국어 UI(i18n): 문자열은 데이터·화면 언어 선택기·튜터 설명 언어 연동", () => {
  // 화면 언어 선택기(배우는 언어와 독립) — ko·en·es·zh·ar (표시명으로 uilang 선택기 확인)
  assert.ok(html.includes('id="uilang"') && ["한국어", "English", "Español", "中文", "العربية"].every((n) => html.includes(n)), "화면 언어 전환기(ko/en/es/zh/ar)");
  // 화면 방향(dir)까지 데이터가 결정 — 아랍어 UI=rtl. 앱이 /i18n의 dir로 문서 방향 설정(규칙 11을 UI 방향까지)
  assert.ok(appjs.includes("UI_DIR") && appjs.includes("document.documentElement.dir"), "화면 방향을 로케일 데이터(dir)로 설정");
  // 셸 문자열은 data-i18n으로 데이터화 + 앱은 /i18n 로드·t()로 치환
  assert.ok(/data-i18n="tab\.study"/.test(html) && /data-i18n="panel\.progress"/.test(html), "셸 문자열 data-i18n");
  assert.ok(appjs.includes("/i18n") && appjs.includes("function applyI18n") && appjs.includes("ll.ui"), "로케일 로드·적용·유지");
  // 두 로케일이 같은 키 집합을 정의(누락 없음)
  const kk = Object.keys(koI18n).sort(), ek = Object.keys(enI18n).sort();
  assert.deepEqual(ek, kk, "en·ko 로케일 키 동일(번역 누락 없음)");
  assert.ok(kk.length >= 40, "충분한 UI 문자열 커버리지");
  // 튜터 설명 언어(explainLang)를 화면 언어로 전송
  assert.ok(appjs.includes("explainLang: UILANG"), "튜터 설명 언어 = 화면 언어");
});

test("다크패턴 없음(규칙 9): 손실공포·재촉 카피 부재", () => {
  const banned = [/잃(어|게)|사라(져|집)|놓치면|박탈|끊기/, /지금\s*안\s*하면/, /스트릭.*(위험|끊)/, /서둘러|급해|마감 임박/];
  const copy = html + "\n" + appjs;
  for (const re of banned) assert.ok(!re.test(copy), "다크패턴 의심 카피: " + re);
});
