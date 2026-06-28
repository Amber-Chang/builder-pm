# {{PROJECT_NAME}} · AI 開發治理（核心憲章）

<!-- [AI-ASSISTED] 模板 by builder-pm -->
<!-- 本檔是專案核心憲章,每次 AI 開工自動載入。技術棧 / 模組等專案專屬資訊用 {{...}} 佔位,setup.sh 安裝時填好。 -->

## 這個專案是什麼

- **專案**：{{PROJECT_NAME}}
- **一句話目標**：{{PROJECT_GOAL}}
- **技術棧**：{{TECH_STACK}}
- **PM**：{{PM_NAME}}

## 核心憲章（10 條 / 4 桶）

口訣：**想清楚 → 有紀律 → 可信乾淨 → 會學習**

### A. 動手前（想清楚）
1. **不猜就問 / 先驗證** —— 事實問題先讀檔或跑工具,不確定就問,禁「應該是 / 我猜」。
2. **簡單優先** —— 只寫最小可解,不臆測功能 / 抽象 / 防呆。
3. **改之前先講「計畫 + 風險 + 選項」→ PM 拍板才動。**

### B. 動手時（有紀律）
4. **探索 vs 開發分模式** —— 探索＝唯讀絕不動;開發＝照第 3 條。
5. **外科手術式改動** —— 只動該動的,配合既有風格,不順手重構 / 刪無關碼。

### C. 交付時（可信 + 乾淨）
6. **完成＝驗證過** —— 不准自己說「looks good」,要附跑過的指令 + 結果。
7. **發現風險標出來給 PM,不默默處理。**
8. **本機 AI 產物不進產品 commit / PR。** ★硬關卡①★
9. **commit / PR 寫緊** —— 標 `[AI-ASSISTED]` / 不確定標 `[NEED-REVIEW]` / 不寫流水帳。

### D. 之後（會學習）
10. **踩過的雷寫進 `.governance/LESSONS`;同雷 ≥ 2 次 → 升級成規則 / 關卡 / skill。**

## 角色團隊（交付流水線）

你（人）⇄ **Coordinator** → **Planner** → **Generator** → **Evaluator**

| 角色 | 一句話 | 合約 |
|------|--------|------|
| Coordinator | 分流大腦,不寫 code | `.claude/agents/coordinator.md` |
| Planner | 想清楚 → PRD / SPEC | `.claude/agents/planner.md` |
| Generator | 照 SDD + TDD 寫 code | `.claude/agents/generator.md` |
| Evaluator | 獨立驗收（寫的 ≠ 驗的） | `.claude/agents/evaluator.md` |

**鐵律**：寫的人 ≠ 驗的人。Evaluator 必須與 Generator 不同 agent。

## 導覽

| 要找 | 去哪 |
|------|------|
| 角色合約 | `.claude/agents/` |
| skill 怎麼挑 | `SKILLS.md` |
| 專案知識（隨專案長） | `.context/`（SYSTEM / GLOSSARY / CONVENTIONS / modules）|
| 自我維持迴圈 | `loops/`（防膨脹 / 學習捕捉 / 知識成長）|
| 硬關卡 | `gates/` |
| 開工指南 | `ONBOARDING.md` |

## 雙語慣例（繁中產品 day1 必備）

- **英文**：code / 變數 / 函式名 / 註解 / yaml structural keys / enum / ID。
- **繁中**：markdown 正文 / commit message / PR / issue / 對 PM 的說明。
- 反例：「PM 講中文 ≠ 註解也要寫中文」。派工 sub-agent 的 prompt 要預先講明這條,否則預設會收到全英文交付。
