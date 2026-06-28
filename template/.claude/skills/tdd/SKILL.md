---
name: test-driven-development
description: Use when implementing backend or logic-sensitive code — write a failing test first (RED), then code to green. For the Generator role.
---

# Test-Driven Development（薄紀律版）

<!-- 種子輕薄版 by builder-pm。專案要重型版可自行換成外部 skill。 -->

## 流程
1. **RED**：先寫一個會失敗的 test,描述「正確行為長怎樣」。跑它,確認紅。
2. **GREEN**：寫最小的 code 讓它綠。
3. **REFACTOR**：在綠的保護下整理。

## 鐵律
- 沒先看到紅,不算 TDD（test 可能恆真＝假綠）。
- **「X 不該發生」的否定斷言**,要有一個「會產出 X」的輸入當對照,否則是恆真假綠。
- backend / RBAC / audit / migration / bugfix：TDD 必跑。

## 證據
交付時附 RED 證據：失敗 test 的名稱,或 RED commit hash。
