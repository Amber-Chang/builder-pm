---
slug: flaky-external-api-call
tags: [api, reliability]
severity: low
strikes: 1
---

## 摘要
呼叫外部 API 偶爾第一次失敗，retry 後就好了。

## 觸發情境
建卡 / 更新狀態這類外部 API 呼叫偶發 5xx 時。

## 正解
偶發失敗就自動再試一次，記錄重試次數上限避免無限重試。
