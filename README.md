<!-- [AI-ASSISTED] by PM Amber (via AI Agent), 2026-06-26 -->
<!-- Purpose: builder-pm 專案門面 / 願景與現況 -->

# builder-pm

> 會 build 的 PM —— 一套輕量、可重用的「PM × AI 開發治理包」。

給「用 AI 開發、產出最終要交給工程師」的 PM：**一頁核心 + 最小骨架 + 選用模組**，讓 AI 協作有紀律，但不臃腫到記不住、不嚇跑工程師。

## 這是什麼

builder-pm 從一個真實產品專案累積數月的 AI 協作治理經驗萃取而成，砍掉企業級的繁複，只留一個 **PM 腦子裝得下、工程師接手不害怕** 的核心。

它適合這種情境：

- PM 自己用 AI 推進開發，但最終還是要交給工程師 review 或接手
- 想先做出接近可上線的產品原型，而不是只停在 demo
- 需要一套不太重、但有基本紀律的 AI 協作方式

設計四原則：

- **一頁核心** — 10 條原則 / 4 個階段桶(想清楚 → 有紀律 → 可信乾淨 → 會學習),hold 在腦裡
- **選用模組** — 複雜度由「開幾個模組」決定,不逼每個專案吞整套
- **極少硬關卡** — 全包只有 2 個自動攔截,其餘都是建議
- **會學習** — 每個專案長出自己的教訓記憶(LESSONS),踩雷 2 次自動升級

## 快速開始

### 目前狀態

✅ **可安裝**。種子骨架 + 一鍵安裝腳本（`setup.sh`）已就緒，可選 **Claude Code、Codex 或兩者並用**。`template/` 是完整安裝來源集，`setup.sh` 會依平台裁剪後再安裝。

如果你要看設計脈絡、決策理由與維護者文件，請看 [`maintainers/design.md`](maintainers/design.md)。

### 一鍵安裝

```bash
bash setup.sh
```

腳本會先問要使用 Claude Code、Codex 或兩者,再問專案名 / 技術棧 / 測試指令。`template/` 是完整安裝來源集；腳本會**依平台裁剪**不適用的入口,再把結果複製到指定資料夾、填好佔位符並執行 `git init`。

### 安裝後你會得到什麼

```
template/    # ★ 完整安裝來源集；setup.sh 依平台裁剪後安裝
  CLAUDE.md          # 一頁核心憲章(10 條 / 4 桶)
  .claude/agents/    # 4 角色合約(Coordinator / Planner / Generator / Evaluator)
  .claude/skills/    # 三個通用 skill(brainstorming / tdd / code-review)
  AGENTS.md          # Codex / 雙平台安裝；Claude-only 從 staging 裁剪
  .agents/skills/    # Codex / 雙平台安裝；Claude-only 從 staging 裁剪
  SKILLS.md          # 角色 ↔ skill 對照(單一正本)
  WORKFLOW.md        # 所有 AI 工具共用的開工與工作分支規則
  .context/          # 專案知識,隨專案長(SYSTEM / GLOSSARY / CONVENTIONS / modules)
  docs/01-prd/       # 正式產品需求(PRD-NNN-slug.md)
  docs/02-spec/      # 正式實作規格(SPEC-NNN-slug.md)
  loops/             # 自我維持迴圈(防膨脹 / 學習捕捉 / 知識成長)
  gates/             # 自動攔截(drift 事實檢查)
  ONBOARDING.md      # 開工指南
setup.sh       # 一鍵安裝腳本(複製 template/ → 新專案 + 填值 + git init)
maintainers/   # builder-pm 維護者文件(design.md = 正本)
```

### 使用前先知道

每次要修改追蹤檔案時，先依 `WORKFLOW.md` 確認目前在工作分支，完成驗證後以 PR 合併回 `main`。這條規則同時適用 Claude Code、Codex 與其他 AI 工具；模板只提供流程規則，GitHub 分支保護仍需由 repo 管理者在 GitHub 端設定。

正式文件規則：PRD 放 `docs/01-prd/PRD-<三位數>-<slug>.md`，SPEC 放 `docs/02-spec/SPEC-<三位數>-<slug>.md`。每份 SPEC 必須以 frontmatter 的 `related_prd` 指向一份主要 PRD；一份 PRD 對多份 SPEC 的對照由檢查器導出，不維護人工第三張表。新安裝採新結構，既有專案不會自動遷移。

不要預先建立 `docs/inbox/`、`docs/research/` 或 `docs/decisions/`，首次真的需要時才建立。敏感逐字稿留在受控外部位置，Git 只放安全摘要。

> **「輕量」不是「沒有檔案」,而是「預設心智模型夠小」**:你每天要 hold 在腦裡的只有 **10 條原則、4 個角色、2 個硬關卡**;`loops/` `gates/` `.context/` 是會自己長 / 自動跑的機制,不是 day1 要讀完的負擔。

## 設計原則

### 角色團隊(交付流水線)

人 ⇄ **Coordinator**(分流,不寫 code)→ **Planner**(PRD / SPEC)→ **Generator**(SDD + TDD 寫 code)→ **Evaluator**(獨立驗收,寫的 ≠ 驗的)

Claude Code 直接讀 `CLAUDE.md` 與 `.claude/`;Codex 先讀 `AGENTS.md`,再沿用同一份 `CLAUDE.md` 與 `.claude/agents/` 角色合約。`CLAUDE.md` 不因加入 Codex 而改寫,`AGENTS.md` 只是 Codex adapter（轉接層）。Codex-only（僅 Codex）仍保留 `.claude`,因為它存放兩平台共用合約,**不是 Codex runtime（執行入口）**;Codex 的執行入口始終是 `AGENTS.md` + `.agents/skills/`。

四個 Codex 角色 skill 分工如下：`coordinator` 接收 PM 需求、分流與交接；`planner` 收斂需求與規格；`generator` 依規格用 TDD 實作；`evaluator` 獨立執行本機驗收與正式 PR gate（關卡）。這些 adapter 只負責 Codex 路由,角色契約仍以 `.claude/agents/` 為正本。

### Codex 兩階段審查

1. **本機驗收**：Generator 完成後啟動一個全新的唯讀 Evaluator subagent（子代理）審查；無法啟動時才退回 `codex review --uncommitted`。結果只會是 `LOCAL PASS` 或 `LOCAL FAIL`。
2. **正式 PR 驗收**：GitHub PR 建立後,必須由 `codex-pr-review` 的 `pr-review-agent` 執行,結果為 `PR PASS`、`PR FAIL` 或 `PR REVIEW BLOCKED`（外掛、PR、授權或知識來源不足,無法完成審查）。

`LOCAL PASS` 只代表本機變更通過獨立檢查,**永遠不代表正式交付完成,也不是 `PR PASS`**。Claude-only 專案可選擇用 Codex 做第二模型審查；選擇 Codex 或雙平台時,正式 GitHub PR gate 是必要設定,安裝後仍須啟用 / reload 外掛並確認 `pr-review-agent` 可被找到。

### 模組與必要 Gate

| 類型 | 模組 / Gate | 接給誰 | 規則 |
|------|-------------|--------|------|
| 選用 | openspec | Generator | 選用正式 SDD:把功能轉成 change(proposal / spec / tasks)再實作 |
| 選用 | Claude-only 的 Codex 第二模型審查 | Evaluator | Claude-only 可選用 `codex-pr-review`,增加跨模型 PR 審查 |
| 必要 | Codex / 雙平台正式 PR gate | Evaluator | 必須啟用 `codex-pr-review` 並驗證 `pr-review-agent`;未就緒時回報 `PR REVIEW BLOCKED` |

### 專案 Skill 採用

外部 Skill 先在個人環境試用；PM 核准後，固定來源版本並完整納入專案 Git。專案以 `SKILLS.md` 的 project Skill registry 管理角色與觸發路由，並在納入前執行 `loops/skill-registry/check-skill-registry.cjs`；名稱、路由、adapter 或受保護 Claude Code 路徑衝突時會阻擋。此流程不掃描或管理個人全域 Skill，也不自動下載或升版外部來源。

## 來源

萃取自一個真實產品專案的治理體系(13 規則 / 7 層 / 21 細則 → 壓成核心 + 模組)。
