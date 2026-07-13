<!-- [AI-ASSISTED] by PM Amber (via AI Agent), 2026-06-28 -->
<!-- 功能：learning-capture 範本說明——捕捉引擎三元件、grounding、為何走 hook（PreCompact + additionalContext）、怎麼跑、怎麼接進 Claude Code。 -->

# learning-capture（學習捕捉引擎 · 種子範本）

示範「**對的捕捉引擎長怎樣**」：cora 的「踩雷捕捉」靠 PM 手寫，結果 45 天停更、爛條堆積。這個引擎讓捕捉「**真的會動**」（用 hook 主動 nudge）+ 有**品質閘**擋爛教訓（確定性 linter）。

> 這是**治理範本**，不是產品功能。完整設計（為何非建不可、Hermes 對標表、品質閘清單）鎖定在 `maintainers/design.md` §4.2，動手前先讀那節。

## grounding

- **外部 OSS：Hermes `agent/background_review.py`**——每回合 fork 一個便宜的 aux 模型回顧該回合、決定要不要寫記憶，並內建可設定的自動週期（`nudge_interval` / `flush_min_turns` / `creation_nudge_interval`）。證明「半自動捕捉」是**可上線的真機制**，不是行銷話術。
- **它的「Do NOT capture」反模式清單**——4 種絕不記（環境失敗 / 對工具的負面斷言 / 已解暫時錯 / 一次性敘事）。這是 cora §4 只有薄版、Hermes 才有的硬教訓，本範本的品質閘把它**確定性化**。

## 三個元件

| 元件 | 檔案 | 做什麼 |
|------|------|--------|
| **品質閘**（可測核心，runtime 無關） | `check-lesson-quality.cjs` | 給一則草擬教訓，確定性檢查必填欄位 + 摘要長度 + class-level 命名 + 4 反模式 → PASS / REJECT。**這是讓捕捉能長久的關鍵**（沒品質閘 → cora 那種手寫停更 + 爛條堆積）。 |
| **觸發層**（讓它真的會動） | `capture-nudge.hook.cjs` | 最小 PreCompact hook——context 壓縮前把品質閘 checklist + 草擬模板透過 `hookSpecificOutput.additionalContext` JSON 注入給模型，逼 AI 趁還有回合回顧「有沒有該記的雷」。**刻意不用 SessionEnd**：那在 session 已終止後才觸發、模型沒有下一回合可反應，且純 stdout 模型看不到（只進 debug log）；唯一會被模型收到的注入管道是 additionalContext。 |
| **草擬層** | `capture-prompt.md` | 載入式捕捉指令（Hermes review prompt 繁中化）：該記的訊號、🔑 4 反模式、擺放紀律、Memory vs Lesson 分流。 |

## 為何 builder-pm 觸發走 hook，而非自建 runtime

builder-pm 是**治理包、不掌控對話迴圈**（乘客非車），不能像 Hermes 每 N 回合 fork 自己。但 **Claude Code 把觸發點開放成 hook**（SessionEnd / PreCompact / Stop），Hermes 的三個觸發全做得出來 → **不需變成 runtime**。變 runtime 會砍掉「零基建 / PM day1 能用 / 可攜」三條命根，偏離 §1 北極星。所以這裡只提供 hook **腳本**，**不**去動 builder-pm 的 `settings.json` 或真的安裝 hook（怎麼接見下）。

## 怎麼跑品質閘 linter

```bash
node check-lesson-quality.cjs <lesson.md>            # 人類可讀繁中報告（verdict + 逐條 errors/warnings）
node check-lesson-quality.cjs <lesson.md> --json     # 機器可讀 { verdict, errors, warnings }（測試靠這個斷言）
```

GATE 行為：**REJECT → exit 1**、**PASS → exit 0**（WARN 不擋，仍 exit 0）。唯一另一個 exit 1 = 缺檔 / 檔損毀。

教訓檔格式（linter 驗的對象）：

```markdown
---
slug: <kebab-case、class-level>
tags: [<至少一個>]
severity: low|medium|high
strikes: <整數>
---

## 摘要
<一行，≤ 120 字>

## 觸發情境
<什麼時候會踩到>

## 正解
<正確做法>
```

## 怎麼跑測試

```bash
node check-lesson-quality.test.cjs
```

零外部依賴（只用 Node 內建 `fs`/`path`/`node:test`/`node:assert`）。測試用真實子行程黑箱驗證品質閘「**該擋會擋、好教訓會過**」（mutation testing 精神，design.md §5.5）：好教訓過、缺欄位 / 摘要過長 / 負面工具斷言 / 環境失敗 / session-artifact 命名各情境 REJECT、已解暫時錯只 WARN 不擋、缺檔 exit 1，外加 hook 空 stdin 不爆且輸出合法的 PreCompact additionalContext JSON。**治理腳本沒人驗，遲早爛掉沒人發現**——這條鐵則直接焊進範本。

## 怎麼把 hook 接進 Claude Code（settings.json）

> 本範本**不**自動安裝；要啟用就把下面片段加進專案的 `.claude/settings.json`（`command` 路徑改成你 repo 裡的實際位置）。

```json
{
  "hooks": {
    "PreCompact": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node loops/learning-capture/capture-nudge.hook.cjs"
          }
        ]
      }
    ]
  }
}
```

- `PreCompact` 在 context 壓縮前觸發、**模型此時仍有回合可反應**，Claude Code 會把 hook JSON 餵到腳本 stdin（本腳本忽略內容、容錯空 stdin），腳本把 nudge 包成 `{ "hookSpecificOutput": { "hookEventName": "PreCompact", "additionalContext": "<nudge>" } }` JSON 印到 stdout。
- **為何不用 `SessionEnd`**：它在 session 已終止後才觸發、模型沒有下一回合可反應；而且 hook 的純 stdout 模型根本看不到（只進 debug log）。模型唯一收得到的注入管道是 `additionalContext`，所以這裡走 PreCompact + JSON。
- 想每 N 回合提醒可改掛 `Stop` 並自帶計數器（對應 Hermes `nudge_interval`，本範本未實作計數器，留給專案長出來）。

## 設計連結

- 完整設計：`maintainers/design.md` §4.2「學習捕捉引擎」。
- 姊妹範本：`loops/anti-bloat/`（規則防膨脹，捕捉的鏡像——往上加 vs 往下降）、`gates/drift-fact-check/`（字面事實一致性）。
