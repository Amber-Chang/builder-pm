---
slug: prefer-absolute-paths-in-subagent-bash
tags: [subagent, bash]
severity: low
strikes: 1
---

## 摘要
sub-agent 的 bash cwd 會在呼叫間重置，路徑一律用絕對路徑。

## 觸發情境
sub-agent 連續跑多個 bash 指令時。

## 正解
所有檔案操作用絕對路徑，不依賴 cwd 狀態。
