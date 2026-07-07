# 라이선스 분리 (Licensing)

> LinguaLoop는 자산 유형별로 라이선스를 **분리**합니다(규칙 14). 코어는 최대한 관용적으로 열어 자가호스팅·재사용을 보장하고(규칙 13), 콘텐츠·데이터는 기여·재사용이 쉬운 개방 라이선스를 씁니다.

## 요약

| 자산 | 라이선스 | 범위 |
|---|---|---|
| **코어 코드** | **MIT** | `packages/**/src`, `scripts/`, `.claude/`, 문서 등 소프트웨어·설정 전부 (아래 콘텐츠 예외 제외) |
| **콘텐츠**(언어팩 데이터) | **CC-BY-4.0** | `packages/packs/**` 의 학습 데이터: `kc-seed.json`·`content-seed.json`·`phonology.json`·`i18n.json`·`pack.json` |
| **모델**(알고리즘 파라미터·규칙셋) | **MIT** | 코드와 함께 배포되는 FSRS 파라미터·교정 규칙 등 |
| **개방 데이터셋**(배포 시) | **CC-BY-4.0** + 동의 조건 | 동의 필터·익명화·재식별 레드팀 통과분만([`docs/DATA_CARD.md`](docs/DATA_CARD.md)) |

전문: 코어=[`LICENSE`](LICENSE)(MIT) · 콘텐츠=[CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/) · 콘텐츠 요약=[`packages/packs/LICENSE.md`](packages/packs/LICENSE.md).

## 왜 이렇게 나누나

- **MIT(코어)** — 채택 장벽을 최소화해 누구나 자가호스팅·개작·상용 이용할 수 있게 합니다. 특허 조항이 없는 대신 단순·관용적입니다.
- **CC-BY-4.0(콘텐츠)** — 학습 콘텐츠(문항·지문·어휘)는 소프트웨어가 아니라 저작물이므로 크리에이티브 커먼즈로 다룹니다. **출처 표시(BY)** 만 지키면 자유롭게 재사용·번안할 수 있습니다.

## 기여자에게

기여물은 위 해당 라이선스로 제공하는 것에 동의하는 것으로 간주합니다(코드→MIT, 콘텐츠→CC-BY-4.0). 커밋 `Signed-off-by`(DCO)로 확인합니다([`CONTRIBUTING.md`](CONTRIBUTING.md)). 제3자 저작권이 있는 콘텐츠는 출처·라이선스 호환을 명시하지 않으면 병합되지 않습니다.

## SPDX

파일 단위 표기가 필요하면 SPDX 식별자를 사용하세요: 코드 `SPDX-License-Identifier: MIT`, 콘텐츠 `SPDX-License-Identifier: CC-BY-4.0`.
