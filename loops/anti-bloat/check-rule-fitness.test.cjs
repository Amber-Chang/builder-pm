// [AI-ASSISTED] by PM Amber (via AI Agent), 2026-06-28
// 功能：以真實子行程黑箱執行 check-rule-fitness.cjs，證明偵測器「該響時會響、不該響時會閉嘴」
//       （mutation testing 精神，design.md §5.5）：摩擦會列、安全欄/寬限窗會擋、休眠/健康分類正確。

'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('node:child_process');
const path = require('node:path');

const CHECKER = path.join(__dirname, 'check-rule-fitness.cjs');
const MIXED = {
  rules: path.join(__dirname, 'fixtures', 'mixed', 'rules.json'),
  usage: path.join(__dirname, 'fixtures', 'mixed', 'rule-usage.json'),
};

// 實際 spawn 跑 checker；execFileSync 在非零 exit 會 throw，從 err 取 status 與輸出
function run(args) {
  try {
    const stdout = execFileSync('node', [CHECKER, ...args], { encoding: 'utf8' });
    return { code: 0, output: stdout };
  } catch (err) {
    return { code: err.status, output: (err.stdout || '') + (err.stderr || '') };
  }
}

// 跑 --json 模式並解析出 buckets
function runJson(args) {
  const { code, output } = run([...args, '--json']);
  assert.strictEqual(code, 0, `--json 模式應 exit 0，實際 ${code}\n輸出:\n${output}`);
  return JSON.parse(output);
}

test('摩擦規則（override 8/8、觀察數足）→ 出現在 friction', () => {
  const b = runJson([MIXED.rules, MIXED.usage]);
  assert.ok(
    b.friction.includes('grown-done-definition-5seg'),
    `應列為摩擦候選，實際 friction=${JSON.stringify(b.friction)}`
  );
});

test('protected 核心規則就算 override 爆表 → 不在任何候選清單（在 skipped_protected）', () => {
  const b = runJson([MIXED.rules, MIXED.usage]);
  const id = 'core-01-no-guessing'; // usage 是 30/30 = 100%
  assert.ok(b.skipped_protected.includes(id), `應在 skipped_protected，實際=${JSON.stringify(b.skipped_protected)}`);
  assert.ok(!b.friction.includes(id), 'protected 規則不可出現在 friction');
  assert.ok(!b.dormant.includes(id), 'protected 規則不可出現在 dormant');
});

test('寬限窗內規則（trigger < grace_min）就算 override 100% → 不列候選（在 skipped_grace）', () => {
  const b = runJson([MIXED.rules, MIXED.usage]);
  const id = 'grown-codex-review-loop'; // trigger 2 < 5，override 2/2 = 100%
  assert.ok(b.skipped_grace.includes(id), `應在 skipped_grace，實際=${JSON.stringify(b.skipped_grace)}`);
  assert.ok(!b.friction.includes(id), '寬限窗內規則不可出現在 friction');
});

test('休眠規則（last_triggered_at 超過 dormancy_days、override 低）→ 出現在 dormant', () => {
  const b = runJson([MIXED.rules, MIXED.usage]);
  const id = 'grown-pr-merge-harness'; // 2026-03-01 → 2026-06-28 = 119 天 > 30，override 0/9
  assert.ok(b.dormant.includes(id), `應列為休眠候選，實際 dormant=${JSON.stringify(b.dormant)}`);
  assert.ok(!b.friction.includes(id), '休眠規則不可同時在 friction');
});

test('健康規則（override 低、近期有觸發）→ 在 healthy、不在 friction/dormant', () => {
  const b = runJson([MIXED.rules, MIXED.usage]);
  const id = 'grown-tdd-backend'; // override 1/12 ≈ 8%，3 天前觸發
  assert.ok(b.healthy.includes(id), `應為健康，實際 healthy=${JSON.stringify(b.healthy)}`);
  assert.ok(!b.friction.includes(id) && !b.dormant.includes(id), '健康規則不可出現在 friction/dormant');
});

test('預設報告（無 --json，無參數）→ 包含「摩擦候選」字樣且 exit 0', () => {
  const { code, output } = run([]); // 走預設 rules.json + rule-usage.json
  assert.strictEqual(code, 0, `迴圈/報告應 exit 0，實際 ${code}\n輸出:\n${output}`);
  assert.match(output, /摩擦候選/, `預設報告應含「摩擦候選」分區，實際輸出:\n${output}`);
  assert.match(output, /只報告不攔截/, '開頭應標明 Phase 1 只報告不攔截');
});

test('輸入檔缺檔 → exit 1（報告以外唯一的非 0 出口）', () => {
  const { code, output } = run([path.join(__dirname, 'fixtures', '不存在的檔.json')]);
  assert.strictEqual(code, 1, `缺檔應 exit 1，實際 ${code}\n輸出:\n${output}`);
});
