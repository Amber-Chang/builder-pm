# drift-fact-check（字面事實一致性檢查 · 種子範本）

示範「對的 drift 自動化長怎樣」：**預防 > 偵測，且必附測試**。它只解一種 drift：同一個字面事實（數字／版本／清單長度）被寫在多份文件、後來漂移不一致（例如 README 說「12 條」、憲章說「10 條」）。

## 它示範什麼原則

1. **單一真相來源（single source of truth）**：`facts.json` 宣告 canonical 值與抓值 pattern；其他文件一律向它對齊，不互相猜。
2. **偵測只是 plan B**：正解是文件 DRY，同一個數字別在兩處各寫一遍；這支腳本是寫不到 DRY 時的安全網，不是把抄寫合理化的藉口。
3. **自帶測試 = 不會變成下一個死殼**：`check-drift-fact.test.cjs` 用真實子行程驗一致案例 exit 0、漂移案例非零並指名漂移檔；治理腳本沒人驗，遲早爛掉沒人發現。

## 怎麼跑

```bash
node check-drift-fact.cjs                       # 用預設 facts.json（指向 consistent fixtures）→ OK
node check-drift-fact.cjs path/to/facts.json    # 指定自己的 facts.json
node check-drift-fact.test.cjs                  # 跑自帶測試
```

零外部依賴，只用 Node 內建模組。要套到自己的專案，複製 `facts.json` 改成你的事實與檔案清單即可。
