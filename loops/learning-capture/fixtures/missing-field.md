---
slug: tags-empty-and-no-fix-section
tags: []
severity: low
strikes: 1
---

## 摘要
這則教訓故意缺了「正解」區段，而且 tags 是空陣列，用來測品質閘的擋收行為。

## 觸發情境
測試品質閘對「缺必填欄位」是否會 REJECT 並指名缺哪一個欄位。
