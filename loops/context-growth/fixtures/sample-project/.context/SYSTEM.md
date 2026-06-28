# 系統總覽（System Overview）

本系統核心是 journey 引擎，負責編排使用者旅程事件與節點調度。

## 重大結構決策

- 事件流以 journey 為中心，所有節點掛在 journey 圖上。
