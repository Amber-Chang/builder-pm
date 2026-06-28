---
name: requesting-code-review
description: Use before a review gate — review changes for correctness, SPEC/contract drift, security (RBAC/auth/audit), and missing tests. Evidence-based PASS/FAIL. For the Evaluator role.
---

# Code Review（薄紀律版）

<!-- 種子輕薄版 by builder-pm。裝了 Codex 模組可升級成「第二模型交叉審」。 -->

## 審查視角（findings 先於 summary）
- **SPEC / 契約 drift**：行為有沒有偏離契約。
- **資安**：RBAC / 認證 / audit / 隱私。
- **缺測試**：關鍵路徑有沒有 test。
- **false confidence**：code「會動」但不符契約。

## 輸出
```
Overall: PASS / NEEDS_CHANGES / NEEDS_REDESIGN
```
每個 finding 附**可驗證證據**（指令輸出 + 引用行號）。不准無證據放行。

## 鐵律
審的人必須與寫的人**不同**（憲章鐵律「寫的 ≠ 驗的」）。
