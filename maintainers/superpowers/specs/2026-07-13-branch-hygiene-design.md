<!-- [AI-ASSISTED] by PM Amber, 2026-07-13 -->
<!-- 功能：定義所有 AI 工具共用的開工分支規則與可驗證邊界。 -->

# 開工工作分支機制設計

> 狀態：PM 已核准方向，待實作
> 日期：2026-07-13

## 1. 目標

讓 builder-pm 安裝出的每個新專案，在任何 AI 工具開始修改追蹤檔案前，都先使用獨立工作分支。每個可交付工作對應一支分支與一個 PR，降低跨 session 疊改、直接污染 `main`、以及工程師接手時無法辨識變更範圍的風險。

此規則同時適用 Claude Code、Codex 與日後加入的 AI 工具；它是專案工作流，不是某個 runtime 的專屬行為。

## 2. 共用規則與範圍

新增 `WORKFLOW.md` 作為工作分支規則的唯一正本。`CLAUDE.md` 與 `AGENTS.md` 只引用該文件，不重複條文；這會在兩個入口增加最小引用，但不改動既有角色分工、Skill 合約或 Claude Code 的工作邏輯。

規則如下：

1. `/explore` 或其他純唯讀工作不建立分支，也不得修改檔案。
2. 確認需求、計畫與風險後，第一次修改追蹤檔案前，必須先從最新 `main` 建立工作分支。
3. 分支名稱預設為 `codex/<短名稱>`；其他工具可使用自己的前綴，但必須使用描述工作目的的小寫 kebab-case 名稱。
4. 一個可交付工作只使用一支工作分支；不將無關工作混入同一分支。
5. 完成驗證後，以 PR 合併回 `main`，不直接在 `main` 開發或提交。
6. 若工作區已有使用者未提交變更，AI 必須停止並說明風險；不得自行 stash、rebase、reset、checkout 或覆蓋內容。

## 3. 檢查器

新增 `gates/branch-hygiene/check-branch.cjs`，提供一個不修改 Git 狀態的 preflight（開工前）檢查。

輸入為專案根目錄；檢查器會：

- 確認目前在 Git worktree 內。
- 讀取目前分支名稱。
- 在 `main`、`master` 或 detached HEAD 時回報失敗，並印出建立工作分支的建議指令。
- 在其他分支時回報通過。
- 支援可機器讀取的 `--json` 輸出，供日後不同 AI adapter 使用。

檢查器不會自行建立分支，因為分支命名與目前未提交內容都需要由人或協調者判斷。它也不會檢查遠端是否最新，避免在離線環境把網路狀態誤判為程式錯誤。

## 4. 安裝與入口整合

- `setup.sh` 將 `WORKFLOW.md` 與 branch-hygiene gate 安裝到所有平台選項。
- `ONBOARDING.md` 說明新 session 從 `/explore` 進到開發時，何時執行 preflight、何時建立分支。
- `CLAUDE.md` 與 `AGENTS.md` 只引用 `WORKFLOW.md`，確保兩個 runtime 讀到同一份規則。
- README 說明「新 session 動工前先開分支」是模板的共用交付流程。

## 5. GitHub 與本機責任分界

repo 內的規則與檢查器只能提醒或讓 AI 自我檢查，無法阻止人員直接推送 `main`。真正的遠端最後防線是 GitHub 分支保護：禁止直接推送、要求 PR 與要求 CI 通過。

本次不以 Git hook 阻擋 `main` 提交。hook 可被略過，且安裝、跨工具相容性與既有專案維護成本較高；等團隊確定有此需求再評估。

## 6. 驗收標準

1. 新安裝專案包含唯一的 `WORKFLOW.md` 與 branch-hygiene 檢查器。
2. Claude Code 與 Codex 入口都能找到共用規則，但不複製其內容。
3. 檢查器在工作分支回傳成功；在 `main`、`master` 與 detached HEAD 回傳失敗，且 JSON 輸出穩定。
4. `setup.test.cjs` 驗證所有安裝平台都有該檔案與入口引用。
5. 新增 GitHub Actions，在 PR 與推送 `main` 時執行安裝整合測試與各 gate / loop 測試。
6. 文件明確說明 GitHub 分支保護需由 repo 管理者在 GitHub 設定，不能由模板自動保證。

## 7. 非目標

- 不自動建立、切換、合併或刪除 Git 分支。
- 不修改使用者工作區中既有未提交內容。
- 不以模板取代 GitHub 的分支保護設定。
- 不建立跨專案的分支命名中央服務或自動工作項目追蹤。
