<!-- [AI-ASSISTED] by PM Amber (via AI Agent), 2026-06-28 -->
<!-- 功能：載入式「捕捉指令」——把 Hermes background_review 的 review prompt 繁中化成 builder-pm 版，給 AI 載入照做（非給人讀的文件）。 -->

# 捕捉指令（Capture Prompt）

> 這是給 AI **載入後照做**的指令，不是文件。觸發時機：session 收尾、PM 糾正你、或冒出非顯而易見的修法。
> 對標 Hermes `agent/background_review.py` 的 review prompt；設計鎖定在 `docs/design.md` §4.2。

## 你的任務

回顧剛剛這段對話，判斷「有沒有該記下來、對下次有用的雷」。判定式：

> **（出事或差點出事）且（會再發生 / 對下次有用）**

過濾掉：一次性 typo、純環境問題、已有教訓涵蓋（→ 那條既有教訓 `strikes +1`，不開新檔）。

**偏向記**：「Nothing to save」不該是預設；什麼都沒記 = 錯過學習，不是中性結果。先認真找一遍，找不到才說沒有。

## 該記的訊號（任一觸發即行動）

- PM 糾正你的**風格 / 語氣 / 格式 / 冗長**（「太囉嗦」「直接給答案」「別這樣排版」= 第一級訊號）。
- PM 糾正你的**流程 / 步驟順序**。
- 冒出**非顯而易見**的技巧 / 修法 / debug 路徑。
- 載入的 **skill 被證明錯 / 缺步驟** → 當下 patch 那個 skill / 規則。

## 🔑 4 種絕不記的反模式（記了反而有害——Hermes 硬教訓）

1. **環境依賴的失敗**（缺 binary / 沒裝套件 / 沒設憑證 / `command not found`）—— PM 自己能修，不是耐久規則。要記就把「正解」寫成 **FIX**（裝什麼 / 設什麼）。
2. **對工具的負面斷言**（「X 壞了」「browser 不能用」）—— 會**硬化成 agent 之後幾個月拿來拒絕自己的藉口**，即使原問題早修好。記**修法**，不記「這工具不能用」。
3. **已解的暫時錯**（retry 成功 → 教訓是 **retry pattern**，不是那個錯本身）。
4. **一次性敘事**（「總結今天行情」不是一類工作，不值得成規則 / skill）。

## 擺放紀律（捕捉時就防膨脹，與 anti-bloat 同系統）

- **先 patch 既有 ＞ 才開新的**：先找有沒有同類教訓 / 規則 / skill 可以補一句，有就補、`strikes +1`；真的沒有才開新檔。
- **新名必須 class-level**：禁用 PR 號 / error 字串 / `fix-X` / 「今天這題」當名字 ——「只對今天有意義的名字就是錯的」。命名描述「**這一類**情況」，不綁單次 session。

## Memory vs Lesson 分流

| 記什麼 | 放哪 |
|--------|------|
| 使用者是誰 + 當前狀態（偏好的稱呼、目前在做哪個專案） | Memory |
| **這類任務怎麼做**（修法 / 流程 / 反模式 / 命名規則） | Lesson / Skill / 治理規則 |

> PM 的**風格 / 流程偏好** → 進治理規則本文，不只進 memory（memory 換機 / 換 session 容易掉，規則才是耐久的）。

## 產出格式（草擬一則，丟給品質閘驗）

```markdown
---
slug: <kebab-case、class-level>
tags: [<至少一個>]
severity: low|medium|high
strikes: 1
---

## 摘要
<一行，≤ 120 字>

## 觸發情境
<什麼時候會踩到>

## 正解
<正確做法>
```

草擬完**務必**跑品質閘自驗，REJECT 就照錯誤修：

```bash
node check-lesson-quality.cjs <你的草稿>.md
```
