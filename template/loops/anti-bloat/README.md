# anti-bloat（規則防膨脹迴圈 · Phase 1 種子範本）

示範「對的防膨脹自動化長怎樣」：學習迴圈只會把踩雷教訓**往上加**成規則，缺對稱的**降級**半邊 → 規則只增不減會膨脹，新專案終究長回那個重到記不住的 cora（正是要逃離的）。這個迴圈用 **override 訊號**偵測「一直觸發卻一直被繞」的規則，列成 PM 審查的**退役/鬆綁候選**。

> 完整設計（為何非建不可、安全欄、降級階梯、兩段式 run）鎖定在 `maintainers/design.md` §4.1，動手前先讀那節。

## grounding（雙背書）

- **外部 OSS：Hermes `Curator`**——把「沒人用的 skill」沿 `active → stale → archived` 推、**從不刪只封存可還原**。本迴圈把同一形狀搬來治「沒人遵守的規則」（first-run 寬限窗 = Curator seed-on-first-sight、protected 清單 = Curator 硬編 built-ins、never-delete + 可還原）。
- **內部實證：cora 自身鐘擺 telemetry**——Rule #6「連續 ≥ 2 次 override 同 PR → 視為規則本身有問題」、Rule #8 因 telemetry `8/8 done_def:false` 砍半。**這也是與 Curator 唯一分家處**：規則的成本在「高摩擦」（override）不在「閒置」，所以主訊號用 override、休眠只當低優先副訊號。

## 它做什麼 / 不做什麼

| | |
|---|---|
| ✅ 做（Phase 1，本範本） | 確定性偵測（無 LLM、便宜、常開）：算 override 率與休眠天數、跨門檻列「規則健身報告」 |
| ✅ 做 | 安全欄：protected 永不列候選、first-run 寬限窗擋觀察數不足的規則 |
| 🚫 不做 | **只報告不攔截**——這是「迴圈」不是「關卡」，永遠 exit 0（除非輸入檔損毀/缺檔才 exit 1）。對照 `gates/`（會擋）是刻意分家 |
| 🚫 不做（留給 Phase 2） | 鬆綁/退役的**判斷**——由 AI 草擬建議、**PM 拍板**。貴的判斷才花成本，本範本不寫死 |
| 🚫 不做 | 自動刪規則、RAG／向量庫（過度工程，規模不到） |

## 怎麼跑

```bash
node check-rule-fitness.cjs                                            # 用預設 rules.json + rule-usage.json → 混合報告
node check-rule-fitness.cjs fixtures/mixed/rules.json fixtures/mixed/rule-usage.json   # 指定自己的兩份 JSON
node check-rule-fitness.cjs <rules.json>                               # 省略第二參數 → 取 rules.json 同目錄的 rule-usage.json
node check-rule-fitness.cjs <rules.json> <rule-usage.json> --json      # 機器可讀輸出（測試靠這個斷言）
```

預設報告會分區列出 🔴 摩擦候選 / 🟡 休眠候選 / ✅ 健康 / 🔒 protected 跳過 / ⏳ 寬限窗內跳過，每條附 override 分數（如 `8/8 = 100%`）與門檻。

## 怎麼跑測試

```bash
node check-rule-fitness.test.cjs
```

零外部依賴（只用 Node 內建 `fs`/`path`/`node:test`/`node:assert`）。測試用真實子行程黑箱驗證偵測器「**該響時會響、不該響時會閉嘴**」（mutation testing 精神，design.md §5.5）：摩擦會列、protected/寬限窗會擋、休眠/健康分類正確、缺檔 exit 1。**治理腳本沒人驗，遲早爛掉沒人發現**——這條鐵則直接焊進範本。

## 判定邏輯（嚴格照 design.md §4.1）

對每條規則，依序：

1. **🔒 protected**（安全欄，最優先）→ 一律跳過，**永不列候選**（即使 override 爆表）。
2. 非 protected 且 **觀察數不足**（`trigger_count < grace_min_observations`）→ **⏳ 寬限窗跳過**（first-run 保護，即使 override 100%）。
3. 觀察數足，**override 率 ≥ 門檻** → **🔴 摩擦候選**（主訊號）。`override_rate = override_count / trigger_count`。
4. 否則 **休眠天數 > `dormancy_days`**（或觀察足卻無觸發時間戳）→ **🟡 休眠候選**（副訊號，低優先）。
5. 其餘 → **✅ 健康**。

> 日期比較用 `rule-usage.json` 的 `asof` 當「今天」（不用系統時間，讓測試可重現）；`last_triggered_at` 到 `asof` 的天數 = 休眠天數。

## 資料模型（兩個 JSON）

### `rules.json`——規則登記表 + 門檻設定（進 repo）

```json
{
  "grace_min_observations": 5,
  "rules": [
    { "id": "core-01-no-guessing", "tier": "core", "protected": true },
    { "id": "grown-done-definition-5seg", "tier": "grown", "protected": false, "override_rate_threshold": 0.5, "dormancy_days": 60 }
  ]
}
```

- `grace_min_observations`：寬限窗門檻，觀察數低於此值不判定（first-run 保護）。
- `protected`：核心憲章 / PM pin，永不自動退役。
- `override_rate_threshold` / `dormancy_days`：非 protected 規則各自的摩擦/休眠門檻。

### `rule-usage.json`——本機 telemetry sidecar（累積計數）

```json
{
  "asof": "2026-06-28",
  "rules": {
    "grown-done-definition-5seg": { "trigger_count": 8, "override_count": 8, "last_triggered_at": "2026-06-20" }
  }
}
```

- `asof`：這份計數的截止日，當作判定的「今天」。
- 某規則可能在 `rules.json` 有登記但這裡沒資料（= 從沒觸發過）；偵測器以零計數處理 → 落入寬限窗。

## ⚠️ gitignore 提醒

實際專案中 **`rule-usage.json` 屬本機 telemetry，應 `.gitignore` 不進 repo**（沿用 design §4 界線：telemetry/.jsonl 永遠不進、只有「降級決定」進 repo）。換機/交接會重置計數 → 由 first-run 寬限窗承接（= Curator fresh-install 行為），可接受。

> 本資料夾 `fixtures/` 與根目錄的 `rule-usage.json` 是**範例樣本**，供開箱即看報告長相，**不算正式 telemetry**，可進 repo。請勿據此把真實專案的 telemetry sidecar 也 commit 進去。
