<!-- [AI-ASSISTED] by PM Amber, 2026-07-13 -->
<!-- 功能：定義 builder-pm 同時支援 Claude Code 與 Codex 的雙執行環境設計。 -->

# builder-pm Claude Code / Codex 雙執行環境設計

> 狀態：已由 PM 批准，等待實作計畫
> 日期：2026-07-13

## 1. 目標

讓 `builder-pm` 產生的新專案可以選擇使用 Claude Code、Codex，或兩者並存，同時維持既有 Claude Code 安裝結果與執行邏輯。

Codex 版必須能執行既有四角色流程：

1. Coordinator 分流任務與阻塞。
2. Planner 釐清需求並產出 PRD / SPEC。
3. Generator 依規格與測試實作。
4. Evaluator 獨立驗收，且正式 PR 必須經過 `codex-pr-review` 外掛。

## 2. 不在本次範圍

- 不修改 `Amber-Chang/codex-pr-review` repo。
- 不支援 Codex Cloud 或遠端無人值守任務。
- 不把 Claude Code 與 Codex 的平台能力強行做成完全相同。
- 不重新命名或搬移現有 `CLAUDE.md`、`.claude/agents/`、`.claude/skills/`。
- 不改變 openspec 的既有安裝與使用邏輯，除非為了讓 Codex 找到既有入口而新增薄轉接說明。

## 3. 設計原則

### 3.1 Claude Code 向後相容優先

現有 `template/CLAUDE.md` 是共用治理規則的唯一正本。為避免改變 Claude Code 載入行為，本次不把內容搬到新的中立檔名。

以下既有內容不得改變其規則或行為：

- `template/CLAUDE.md`
- `template/.claude/agents/`
- `template/.claude/skills/`
- Claude Code 專屬 hook 接法
- `setup.sh` 既有 Claude Code、openspec 與 Codex PR 審查選項的結果

若使用者在新增的開發工具問題直接按 Enter，必須預設選擇 Claude Code，讓原本的互動操作維持相容。

### 3.2 共用事實只寫一處

Codex 的 `AGENTS.md` 不複製核心 10 條規則，而是明確要求先讀取 `CLAUDE.md`。Codex skills 只記錄平台專屬觸發與執行差異，共用角色責任仍引用現有角色合約或共用治理正本。

### 3.3 平台差異必須明示

Claude Code agents、hooks 與 Codex sub-agent、CLI 沒有一對一對應。Codex 轉接層必須寫出能力檢查與 fallback，不得宣稱不存在的自動化已生效。

## 4. 目標結構

```text
template/
├── CLAUDE.md                       # 既有共用治理正本，不改邏輯
├── AGENTS.md                       # 新增：Codex 自動載入入口
├── .claude/                        # 既有 Claude Code 執行層
│   ├── agents/
│   └── skills/
├── .agents/skills/                 # 新增：Codex 四角色轉接層
│   ├── coordinator/SKILL.md
│   ├── planner/SKILL.md
│   ├── generator/SKILL.md
│   └── evaluator/SKILL.md
├── .codex/review-config.json       # Codex PR review 專案知識設定
├── .context/                       # 兩個平台共用的專案知識
├── gates/
└── loops/
```

`AGENTS.md` 的責任：

- 要求 Codex 先讀 `CLAUDE.md`。
- 說明 `CLAUDE.md` 在 Codex-only 專案中是共用治理正本，不代表必須使用 Claude Code。
- 路由四角色 skills。
- 定義 PM 協作語言、模式切換、安全邊界與阻塞分流。
- 授權 Coordinator 在驗收階段派出唯讀 Evaluator sub-agent。

Codex-only 安裝仍保留 `.claude/`，因為 `CLAUDE.md` 與 `SKILLS.md` 會引用其中的共用角色合約與 skill 說明。Codex 不會把 `.claude/` 當成執行入口；實際入口仍是 `AGENTS.md` 與 `.agents/skills/`。保留這些檔案可避免失效連結、規則複製及對既有 Claude Code 邏輯的改寫。

## 5. 安裝流程

`setup.sh` 新增第一個選擇：

```text
開發工具：
  1. Claude Code（預設）
  2. Codex
  3. Claude Code + Codex
```

輸入必須只接受定義值；無效輸入顯示選項並重新詢問。空白輸入等同 Claude Code。

### 5.1 安裝矩陣

| 選擇 | 保留 `CLAUDE.md` | 保留 `.claude/` | 安裝 `AGENTS.md` | 安裝 `.agents/` | 建立 `.codex/review-config.json` |
|---|---:|---:|---:|---:|---:|
| Claude Code | 是 | 是 | 否 | 否 | 依既有 Codex PR 審查選項 |
| Codex | 是 | 是（共用合約來源） | 是 | 是 | 是 |
| 兩者 | 是 | 是 | 是 | 是 | 是 |

### 5.2 選用模組問題

- openspec：三種開發工具都保留既有詢問。
- Codex PR 審查：Claude Code-only 保留既有選用問題；選 Codex 或兩者時列為正式 PR gate 的必要設定，不提供靜默略過。
- 選 Codex 或兩者時，安裝結果先標示外掛「待啟用」；只有確認 `pr-review-agent` 已載入後，才能標示完整驗收流程已就緒。

安裝腳本延續既有安全原則：只建立專案設定並印出外部 CLI 下一步，不自行登入 GitHub、不自行安裝 private plugin、不自動送出 PR comment。

## 6. Codex 四角色流程

### 6.1 Coordinator

- 判斷任務屬於探索、規劃、實作或驗收。
- 將規格問題退回 Planner，實作問題退回 Generator，商業或高風險判斷交給 PM。
- 同一阻塞循環兩次仍未解決時，停止自動分流並詢問 PM。
- Generator 完成後，不自行判定品質，必須啟動 Evaluator 路徑。

### 6.2 Planner

- 只處理需求收斂、PRD / SPEC 與驗收條件。
- 不修改 production code。
- 不確定的商業邏輯直接詢問 PM。

### 6.3 Generator

- 修改前說明檔案、原因、選項與風險。
- 依 SDD / TDD 紀律實作並回報實際驗證結果。
- 不自評「完成」或「品質良好」。
- 完成後交回 Coordinator，由 Coordinator 啟動 Evaluator。

### 6.4 Evaluator

- 預設由 Coordinator 派出新的唯讀 sub-agent。
- sub-agent 不繼承 Generator 的品質結論；只接收需求、驗收條件、變更範圍與必要檔案路徑。
- Evaluator 不修改 production code，只回報 findings、證據與 PASS / FAIL。
- 若 Codex runtime 無法派 sub-agent，本機變更退回 `codex review --uncommitted`。
- 高風險變更可由 PM 升級成另一個 Codex task 做獨立驗收。

## 7. 兩階段驗收

### 7.1 本機初審

Generator 完成後，Evaluator sub-agent 檢查尚未建立 PR 的本機變更。若 sub-agent 不可用，使用：

```bash
codex review --uncommitted
```

本機初審只能產生 `LOCAL PASS` 或 `LOCAL FAIL`，不得代替正式 PR 驗收。

### 7.2 PR 正式審查

建立 GitHub PR 後，必須使用 `Amber-Chang/codex-pr-review` 的 `pr-review-agent`：

1. 讀取目標 PR 與 diff。
2. 載入消費端專案的 `.codex/review-config.json`。
3. 依專案治理知識與模組文件審查。
4. 產出 findings；只有 PM 或明確授權流程可以回貼 PR。

正式狀態只有 `PR PASS`、`PR FAIL` 或 `PR REVIEW BLOCKED`。`LOCAL PASS` 且尚未完成 PR review 時，整體狀態仍是「PR 驗收待完成」。

## 8. review config 預設值

Codex 或雙平台安裝結果建立 `.codex/review-config.json`，預填實際存在的共用知識：

```json
{
  "knowledgeSources": [
    { "id": "core-governance", "title": "核心治理", "path": "CLAUDE.md", "kind": "governance" },
    { "id": "skill-routing", "title": "Skill 路由", "path": "SKILLS.md", "kind": "skill-routing" },
    { "id": "system-context", "title": "系統脈絡", "path": ".context/SYSTEM.md", "kind": "architecture" },
    { "id": "project-conventions", "title": "專案約定", "path": ".context/CONVENTIONS.md", "kind": "conventions" }
  ],
  "moduleDocHints": [],
  "errorPatternsPath": null
}
```

專案安裝後可逐步補上 `moduleDocHints`，但 `setup.sh` 不猜測模組路徑。

## 9. 外掛安裝與能力檢查

Codex 版文件使用該外掛已提供的 `.codex-plugin` 入口，但不得寫死目前 CLI 不存在的 `codex plugin install` 指令。

最低流程：

1. 執行 `codex plugin marketplace add Amber-Chang/codex-pr-review`。
2. 依當前 Codex 版本完成 plugin 啟用或 reload。
3. 確認 `pr-review-agent` 已出現在 Codex 可用 skills。
4. 確認 `gh auth status` 對 private repo 與目標 repo 有效。

只完成 marketplace add 不代表安裝成功。若 skill 未載入，必須回報 `PR REVIEW BLOCKED` 與可操作的修復說明，不得靜默退回一般 diff review 後宣稱正式通過。

## 10. 錯誤處理

| 情境 | 行為 |
|---|---|
| 開發工具輸入無效 | 重新詢問，不猜測 |
| Codex CLI 不存在 | 專案骨架仍可建立；顯示安裝前置條件 |
| runtime 無 sub-agent | 本機初審退回 `codex review --uncommitted` |
| 尚未建立 GitHub PR | 標示 `PR 驗收待完成` |
| `pr-review-agent` 未載入 | `PR REVIEW BLOCKED`，提示完成 plugin 啟用 / reload |
| `gh auth` 無效 | `PR REVIEW BLOCKED`，提示重新登入，不降級冒充通過 |
| review config 損毀 | 依 plugin 安全預設仍可審 diff，但標示未載入專案知識，不得視為完整 PR gate |
| Evaluator 發現問題 | 回 Coordinator 依根因分流，不由 Evaluator 修 code |

## 11. 測試策略

### 11.1 Claude Code 回歸

- 驗證 `template/CLAUDE.md` 與既有 `.claude/agents/`、`.claude/skills/` 的內容未被改寫。
- 模擬所有新增問題按 Enter，確認產出的 Claude Code 核心檔案與原流程一致。
- 跑既有 loops、gates 與 onboarding 測試，確認沒有行為回歸。

### 11.2 安裝矩陣

以暫存目錄分別安裝 Claude Code、Codex、兩者，驗證：

- 應存在與不應存在的入口及資料夾。
- Codex-only 結果保留 `.claude/` 共用合約，但只有 `AGENTS.md` 與 `.agents/skills/` 被宣告為 Codex 執行入口。
- 9 個既有 placeholder 均正確取代。
- `MODULES.md` 正確記錄平台與模組狀態。
- Git 初始化失敗時仍保留已產生的專案檔案。

### 11.3 Codex 靜態驗證

- 四個 `SKILL.md` 具備合法 frontmatter 與清楚觸發條件。
- `AGENTS.md` 指向存在的 `CLAUDE.md` 與四角色 skills。
- `AGENTS.md` 不重複核心 10 條規則。
- `.codex/review-config.json` 是合法 JSON，且預設 `knowledgeSources` 全部存在。
- 文件中的 Codex CLI 指令與實際 `--help` 能力一致。

### 11.4 驗收情境

- sub-agent 可用：Coordinator 能完成 Generator → Evaluator 唯讀交接。
- sub-agent 不可用：明確退回 CLI 初審。
- 無 PR：只允許 `LOCAL PASS`，整體仍顯示 PR 待驗收。
- plugin 或 GitHub 權限缺失：正式 gate 為 BLOCKED。
- plugin 可用：`pr-review-agent` 能讀取預填 knowledge sources 並產生 review packet。

## 12. 驗收標準

本功能完成必須同時滿足：

1. Claude Code 預設安裝與既有核心邏輯沒有回歸。
2. Codex-only 專案可從 `AGENTS.md` 進入四角色流程。
3. 雙平台專案不重複維護核心 10 條規則。
4. 本機初審與 PR 正式審查的狀態不混用。
5. Codex PR 正式審查實際使用 `codex-pr-review`，缺外掛或權限時會阻塞而非靜默降級。
6. 安裝矩陣、靜態驗證與既有測試全部通過。

## 13. 已知取捨

- 共用正本仍命名為 `CLAUDE.md`，平台中立性不完美，但能避免本次重構改變 Claude Code 行為。
- Codex sub-agent 能力依 runtime 而異，因此保留 CLI fallback。
- `codex-pr-review` 只審 GitHub PR；本機變更必須由 Evaluator sub-agent 或 `codex review --uncommitted` 初審。
- private plugin 安裝受 GitHub 權限與 Codex plugin 版本影響；builder-pm 負責偵測與說明，不繞過權限或自行改動全域設定。
