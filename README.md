<!-- [AI-ASSISTED] by PM Amber (via AI Agent), 2026-06-26 -->
<!-- Purpose: builder-pm 專案門面 / 願景與現況 -->

# builder-pm

> 會 build 的 PM —— 一套輕量、可重用的「PM × AI 開發治理包」。

給「用 AI 開發、產出最終要交給工程師」的 PM:**一頁核心 + 選用模組**,讓 AI 協作有紀律,但不臃腫到記不住、不嚇跑工程師。

## 這是什麼

builder-pm 從一個真實產品專案累積數月的 AI 協作治理經驗萃取而成,砍掉企業級的繁複,只留一個 **PM 腦子裝得下、工程師接手不害怕** 的核心。

設計四原則:

- **一頁核心** — 10 條原則 / 4 個階段桶(想清楚 → 有紀律 → 可信乾淨 → 會學習),hold 在腦裡
- **選用模組** — 複雜度由「開幾個模組」決定,不逼每個專案吞整套
- **極少硬關卡** — 全包只有 2 個自動攔截,其餘都是建議
- **會學習** — 每個專案長出自己的教訓記憶(LESSONS),踩雷 2 次自動升級

## 目前狀態

✅ **可安裝**。種子骨架 + 一鍵安裝腳本(`setup.sh`)已就緒;`template/` 就是會被裝進新專案的全部內容。
完整設計見 [`docs/design.md`](docs/design.md)。三個自我維持迴圈(防膨脹 / 學習捕捉 / 知識成長)與選用模組持續長中。

## 一鍵安裝

```bash
bash setup.sh
```

腳本會問專案名 / 技術棧 / 測試指令,把 `template/` 複製到你指定的新資料夾、填好佔位符、`git init`,並詢問是否啟用兩個選用模組。

## 結構

```
template/    # ★ 會被裝進新專案的全部內容(種子)
  CLAUDE.md          # 一頁核心憲章(10 條 / 4 桶)
  .claude/agents/    # 4 角色合約(Coordinator / Planner / Generator / Evaluator)
  .claude/skills/    # 三個通用 skill(brainstorming / tdd / code-review)
  SKILLS.md          # 角色 ↔ skill 對照(單一正本)
  .context/          # 專案知識,隨專案長(SYSTEM / GLOSSARY / CONVENTIONS / modules)
  loops/             # 自我維持迴圈(防膨脹 / 學習捕捉 / 知識成長)
  gates/             # 自動攔截(drift 事實檢查)
  ONBOARDING.md      # 開工指南
setup.sh     # 一鍵安裝腳本(複製 template/ → 新專案 + 填值 + git init)
docs/        # 設計與說明(design.md = 正本)
```

## 角色團隊(交付流水線)

人 ⇄ **Coordinator**(分流,不寫 code)→ **Planner**(PRD / SPEC)→ **Generator**(SDD + TDD 寫 code)→ **Evaluator**(獨立驗收,寫的 ≠ 驗的)

## 選用模組(setup.sh 安裝時詢問)

| 模組 | 接給誰 | 作用 |
|------|--------|------|
| openspec | Generator | 正式 SDD:把功能轉成 change(proposal / spec / tasks)再實作 |
| Codex PR 審查 | Evaluator | 用 Codex 當第二模型交叉審 PR(一鍵裝 plugin `Amber-Chang/codex-pr-review`)|

## 來源

萃取自一個真實產品專案的治理體系(13 規則 / 7 層 / 21 細則 → 壓成核心 + 模組)。
