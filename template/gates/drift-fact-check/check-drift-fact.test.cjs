// [AI-ASSISTED] by PM Amber (via AI Agent), 2026-06-28
// 功能：以真實子行程執行 check-drift-fact.cjs，驗證一致案例 exit 0、漂移案例非零且指名漂移檔

'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('node:child_process');
const path = require('node:path');

const CHECKER = path.join(__dirname, 'check-drift-fact.cjs');

// 實際 spawn 跑 checker；execFileSync 在非零 exit 會 throw，從 err 取 status 與輸出
function runChecker(factsPath) {
  try {
    const stdout = execFileSync('node', [CHECKER, factsPath], { encoding: 'utf8' });
    return { code: 0, output: stdout };
  } catch (err) {
    return { code: err.status, output: (err.stdout || '') + (err.stderr || '') };
  }
}

test('一致案例：所有文件都說 10 條 → exit 0', () => {
  const facts = path.join(__dirname, 'fixtures', 'consistent', 'facts.json');
  const { code, output } = runChecker(facts);
  assert.strictEqual(code, 0, `預期 exit 0，實際 ${code}\n輸出:\n${output}`);
  assert.match(output, /OK/);
});

test('漂移案例：有一個文件說 12 條 → 非零 exit 且指名漂移檔', () => {
  const facts = path.join(__dirname, 'fixtures', 'drifted', 'facts.json');
  const { code, output } = runChecker(facts);
  assert.notStrictEqual(code, 0, `預期非零 exit，實際 ${code}\n輸出:\n${output}`);
  assert.match(output, /02-onboarding\.md/, `輸出應指名漂移檔，實際輸出:\n${output}`);
});

test('預設 facts.json（無參數）→ exit 0', () => {
  // 不傳 factsPath，走 __dirname/facts.json 預設路徑分支
  let code;
  let output;
  try {
    output = execFileSync('node', [CHECKER], { encoding: 'utf8' });
    code = 0;
  } catch (err) {
    code = err.status;
    output = (err.stdout || '') + (err.stderr || '');
  }
  assert.strictEqual(code, 0, `預期 exit 0，實際 ${code}\n輸出:\n${output}`);
});
