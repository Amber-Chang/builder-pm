# 工作流程

## 開工前的工作分支

這份規則適用所有 AI 工具與人員，是專案工作流程的唯一正本。

1. `/explore` 或其他純唯讀工作不得修改檔案，也不需要建立分支。
2. 確認需求、計畫與風險後，第一次修改追蹤檔案前，必須先從最新 `main` 建立工作分支。
3. 分支名稱預設為 `codex/<短名稱>`；其他工具可用自己的前綴，但名稱必須是描述工作的英文小寫 kebab-case。
4. 一個可交付工作只使用一支工作分支，不混入無關修改。
5. 完成驗證後，透過 Pull Request 合併回 `main`；不得直接在 `main` 開發或提交。
6. 工作區有使用者未提交變更時，停止並說明風險；不得自行 stash、rebase、reset、checkout 或覆蓋內容。

修改前執行 preflight：

```bash
node gates/branch-hygiene/check-branch.cjs . --json
```

若結果是 `protected-branch`，先建立工作分支：

```bash
git switch main
git pull --ff-only origin main
git switch -c codex/<短名稱>
```

這個檢查器只讀取 Git 狀態，不會自行建立或切換分支。GitHub 的分支保護設定才是遠端最後防線：由 repo 管理者設定禁止直接推送 `main`、要求 Pull Request 與要求 CI 通過。
