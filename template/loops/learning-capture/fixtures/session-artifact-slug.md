---
slug: fix-pr-871
tags: [worktree]
severity: medium
strikes: 1
---

## 摘要
合 PR 時 worktree 被佔用，要先移除舊 worktree 再 checkout。

## 觸發情境
接手既有 PR 分支、而同一條分支已被另一個 worktree 佔用時。

## 正解
用 checkout -B FETCH_HEAD 後 push HEAD:branch 繞開佔用，避免兩個 worktree 搶同一分支。
