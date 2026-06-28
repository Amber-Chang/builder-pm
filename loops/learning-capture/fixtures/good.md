---
slug: subagent-git-needs-worktree-isolation
tags: [subagent, git, isolation]
severity: high
strikes: 2
---

## 摘要
派工會動 git 的 sub-agent 必須加 worktree 隔離，否則共用工作樹會被切分支污染。

## 觸發情境
同時派多個會 checkout / commit 的 sub-agent 在同一個工作樹上跑時。

## 正解
派工前替每個會動 git 的 sub-agent 開獨立 worktree，互不干擾，完成後再合併回主分支。
