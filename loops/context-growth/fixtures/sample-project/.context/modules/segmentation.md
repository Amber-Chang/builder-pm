# Segmentation 模組

受眾切分。每條切分規則用 `segment_rule` 表示，並引用 `event_type` 做條件比對。命中時回傳 `BLOCK` 動作（非 snake_case，不該被當術語候選）。

## 職責

- 依規則計算受眾命中。
