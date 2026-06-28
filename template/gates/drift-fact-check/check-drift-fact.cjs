// [AI-ASSISTED] by PM Amber (via AI Agent), 2026-06-28
// 功能：逐行比對多份文件中的字面事實（數字）是否與 facts.json 單一真相來源一致

'use strict';

const fs = require('fs');
const path = require('path');

// 讀取 facts.json（單一真相來源）
function loadFacts(factsPath) {
  return JSON.parse(fs.readFileSync(factsPath, 'utf8'));
}

// 對單一 fact 掃描其所有 files，回傳違規清單。
// baseDir：facts.json 所在目錄，files 一律相對於它解析（保持可攜）。
function checkFact(fact, baseDir) {
  const violations = [];
  const re = new RegExp(fact.pattern);

  for (const file of fact.files) {
    const filePath = path.resolve(baseDir, file);

    let content;
    try {
      content = fs.readFileSync(filePath, 'utf8');
    } catch (err) {
      // 被宣告卻讀不到的檔本身就是一種漂移（檔被搬走/改名），不靜默放行
      violations.push({ file, line: 0, expected: fact.value, actual: `(讀檔失敗: ${err.code || err.message})` });
      continue;
    }

    const lines = content.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const m = lines[i].match(re);
      if (!m) continue; // 這行沒提到該事實 → 跳過（文件沒寫就不管）
      const actual = m[1];
      if (String(actual) !== String(fact.value)) {
        violations.push({ file, line: i + 1, expected: fact.value, actual });
      }
    }
  }

  return violations;
}

function main(argv) {
  // 預設讀同目錄 facts.json；給參數時相對 cwd 解析（讓測試能餵 fixture）
  const factsPath = argv[2]
    ? path.resolve(process.cwd(), argv[2])
    : path.join(__dirname, 'facts.json');
  const baseDir = path.dirname(factsPath);

  const config = loadFacts(factsPath);

  const allViolations = [];
  for (const fact of config.facts) {
    for (const v of checkFact(fact, baseDir)) {
      allViolations.push({ factId: fact.id, ...v });
    }
  }

  if (allViolations.length === 0) {
    console.log(`OK：${config.facts.length} 個事實在所有文件中一致，無漂移。`);
    return 0;
  }

  console.error(`偵測到 ${allViolations.length} 筆字面事實漂移：`);
  for (const v of allViolations) {
    console.error(`  [${v.factId}] ${v.file}:${v.line} 期望=${v.expected} 實際=${v.actual}`);
  }
  return 1;
}

if (require.main === module) {
  process.exit(main(process.argv));
}

module.exports = { loadFacts, checkFact, main };
