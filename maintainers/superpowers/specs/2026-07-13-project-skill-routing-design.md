# 專案 Skill 路由與採用治理設計

## 目標

讓 builder-pm 專案能安全地把已核准的外部 Skill 納入專案 Git，並清楚管理 Skill 的角色、觸發時機、跨 Claude Code / Codex 的來源關係與相容性。

此設計只管理專案內 Skill。使用者的個人全域 Skill 不納入清單，也不會被自動掃描或修改。

## 決策

採用「所有正式專案 Skill 都納入專案 Git」的策略。外部 Skill 只能先在個人環境試用；PM 核准後，固定其來源版本，再完整納入專案。

相容性檢查採 fail-closed：只要發現衝突或必要資訊缺失，拒絕納入，不修改路由表或既有 Skill。

## Skill 採用流程

1. 在個人環境試用外部 Skill，不寫入專案。
2. PM 核准採用後，建立採用紀錄，記錄來源、固定版本或 commit、用途、觸發時機、已知限制與 Codex 支援狀態。
3. 執行相容性檢查。
4. 通過後，將核准版本納入 `.claude/skills/<skill-name>/` 作為 canonical Skill。
5. 若 Codex 需要使用，新增 `.agents/skills/<skill-name>/SKILL.md` 薄 adapter，只導向 canonical Skill，不複製工作流程。
6. 更新 `SKILLS.md` 路由表。
7. 補齊安裝與相容性測試，經 PR review 後才視為正式可用。

不自動下載、不自動更新或自動升版外部 Skill。

## 路由表

`SKILLS.md` 是人類可讀的單一正本（SSOT）。每個專案 Skill 必須有以下資訊：

| 欄位 | 說明 |
|---|---|
| skill | 專案內唯一名稱 |
| 角色 | 例如 Planner、Generator、Evaluator |
| 觸發時機 | 何時使用該 Skill |
| 優先順序 | 同類需求只能有一個預設 Skill |
| canonical | `.claude/skills/` 內的正式來源 |
| Codex adapter | 需要時才填寫 `.agents/skills/` 路徑 |
| 採用紀錄 | 對應的核准紀錄 |

路由表只說明「誰在何時使用什麼」。實際的安全檢查由機器工具負責，不把檢查規則複製到每個 Skill。

## 衝突規則

以下任一情況都必須阻擋納入：

- 專案內已有相同 Skill 名稱。
- 新舊 Skill 的角色、觸發時機與優先順序形成不明確的預設路由。
- 缺少 canonical Skill，或 Codex adapter 沒有指向同一份 canonical Skill。
- 缺少採用紀錄、外部來源或固定版本資訊。
- 嘗試修改既有受保護的 Claude Code 角色或 Skill。

當候選 Skill 與使用者個人全域 Skill 同名時，不自動判定衝突；只有候選內容準備寫入專案路徑時，才依上述規則檢查專案內的名稱與路由。

## 檔案結構

```text
template/
  .governance/skill-adoptions/
    SKILL-ADOPTION-TEMPLATE.md
  loops/skill-registry/
    check-skill-registry.cjs
    check-skill-registry.test.cjs
  SKILLS.md
```

- `SKILL-ADOPTION-<skill-name>.md`：來源、固定版本或 commit、核准人、採用理由、限制與相容性結果。
- `check-skill-registry`：讀取路由表與採用紀錄，檢查名稱、路由、canonical/adaptor 路徑、來源版本及受保護檔案。
- `setup.test.cjs`：驗證新安裝專案含有採用範本與檢查器。

## 測試與驗收

必須覆蓋以下情況：

- 合法的 canonical Skill、Codex adapter、路由表與採用紀錄。
- Skill 名稱衝突。
- 角色、觸發時機與優先順序造成的路由衝突。
- 缺少採用紀錄、外部來源或固定版本。
- Codex adapter 指向錯誤位置。
- 嘗試修改受保護的 Claude Code 檔案。
- 新安裝專案包含範本與檢查器。

## 範圍外

- 管理、列舉或修改個人全域 Skill。
- 自動下載、更新或升級外部 Skill。
- 以外部來源取代專案 Git 中的 canonical Skill。
- 自動解決衝突或自動選擇預設路由。
