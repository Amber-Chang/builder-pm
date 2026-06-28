// [AI-ASSISTED] by PM Amber (via AI Agent), 2026-06-28
// 功能：以真實子行程黑箱執行 check-lesson-quality.cjs，證明品質閘「該擋會擋、好教訓會過」
//        （mutation testing 精神，design.md §5.5）：必填/長度/反模式/命名各情境 verdict + exit code 正確。

'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('node:child_process');
const path = require('node:path');

const CHECKER = path.join(__dirname, 'check-lesson-quality.cjs');
const HOOK = path.join(__dirname, 'capture-nudge.hook.cjs');
const FIX = path.join(__dirname, 'fixtures');

// 實際 spawn 跑 checker；execFileSync 在非零 exit 會 throw，從 err 取 status 與輸出
function run(args, opts = {}) {
  try {
    const stdout = execFileSync('node', [CHECKER, ...args], { encoding: 'utf8', ...opts });
    return { code: 0, output: stdout };
  } catch (err) {
    return { code: err.status, output: (err.stdout || '') + (err.stderr || '') };
  }
}

// 跑 --json 模式並解析出 { verdict, errors, warnings }
function runJson(fixture) {
  const { code, output } = run([path.join(FIX, fixture), '--json']);
  let json;
  try {
    json = JSON.parse(output);
  } catch (e) {
    throw new Error(`--json 輸出無法解析（exit ${code}）：\n${output}`);
  }
  return { code, json };
}

test('1. 完整 class-level 好教訓 → verdict=pass、exit 0、無錯誤', () => {
  const { code, json } = runJson('good.md');
  assert.strictEqual(json.verdict, 'pass', `應 pass，實際 ${json.verdict}\nerrors=${JSON.stringify(json.errors)}`);
  assert.strictEqual(code, 0, `pass 應 exit 0，實際 ${code}`);
  assert.strictEqual(json.errors.length, 0, `好教訓不該有錯誤，實際=${JSON.stringify(json.errors)}`);
});

test('2. 缺必填欄位（tags 空 + 缺 ## 正解）→ reject、errors 指名該欄、exit 1', () => {
  const { code, json } = runJson('missing-field.md');
  assert.strictEqual(json.verdict, 'reject');
  assert.strictEqual(code, 1, `reject 應 exit 1，實際 ${code}`);
  assert.ok(
    json.errors.some((e) => e.includes('正解')),
    `errors 應指名缺「正解」，實際=${JSON.stringify(json.errors)}`
  );
  assert.ok(
    json.errors.some((e) => e.includes('tags')),
    `errors 應指名「tags」，實際=${JSON.stringify(json.errors)}`
  );
});

test('3. 摘要超過 120 字 → reject', () => {
  const { code, json } = runJson('summary-too-long.md');
  assert.strictEqual(json.verdict, 'reject');
  assert.strictEqual(code, 1);
  assert.ok(
    json.errors.some((e) => e.includes('摘要過長')),
    `errors 應含「摘要過長」，實際=${JSON.stringify(json.errors)}`
  );
});

test('4. 負面工具斷言（「browser 工具壞了不能用」）→ reject', () => {
  const { code, json } = runJson('negative-tool-claim.md');
  assert.strictEqual(json.verdict, 'reject');
  assert.strictEqual(code, 1);
  assert.ok(
    json.errors.some((e) => e.includes('負面斷言')),
    `errors 應含「負面斷言」反模式，實際=${JSON.stringify(json.errors)}`
  );
});

test('5. 環境失敗當規則（「command not found: go」）→ reject', () => {
  const { code, json } = runJson('env-failure.md');
  assert.strictEqual(json.verdict, 'reject');
  assert.strictEqual(code, 1);
  assert.ok(
    json.errors.some((e) => e.includes('環境失敗')),
    `errors 應含「環境失敗」反模式，實際=${JSON.stringify(json.errors)}`
  );
});

test('6. session-artifact slug（fix-pr-871）→ reject、理由含「命名」', () => {
  const { code, json } = runJson('session-artifact-slug.md');
  assert.strictEqual(json.verdict, 'reject');
  assert.strictEqual(code, 1);
  assert.ok(
    json.errors.some((e) => e.includes('命名')),
    `errors 理由應含「命名」，實際=${JSON.stringify(json.errors)}`
  );
});

test('7. 已解暫時錯（「retry 後就好」其餘合格）→ pass + warnings 非空、exit 0（WARN 不擋）', () => {
  const { code, json } = runJson('transient-warn.md');
  assert.strictEqual(json.verdict, 'pass', `WARN 不該擋，應 pass，errors=${JSON.stringify(json.errors)}`);
  assert.strictEqual(code, 0, `WARN 仍應 exit 0，實際 ${code}`);
  assert.ok(json.warnings.length > 0, `應有警告，實際=${JSON.stringify(json.warnings)}`);
});

test('預設報告（無 --json）→ 含「裁決」「品質閘」字樣', () => {
  const { code, output } = run([path.join(FIX, 'good.md')]);
  assert.strictEqual(code, 0);
  assert.match(output, /裁決/);
  assert.match(output, /品質閘/);
});

test('缺檔 → exit 1（REJECT 以外唯一非 0 出口）', () => {
  const { code } = run([path.join(FIX, '不存在的教訓.md')]);
  assert.strictEqual(code, 1, `缺檔應 exit 1，實際 ${code}`);
});

test('8. capture-nudge hook：空 stdin → 印出 nudge（含「絕不記」與草擬模板標頭）、exit 0', () => {
  let code = 0;
  let output = '';
  try {
    output = execFileSync('node', [HOOK], { encoding: 'utf8', input: '' });
  } catch (err) {
    code = err.status;
    output = (err.stdout || '') + (err.stderr || '');
  }
  assert.strictEqual(code, 0, `hook 應 exit 0，實際 ${code}\n輸出:\n${output}`);
  assert.match(output, /絕不記/, 'nudge 應含「絕不記」反模式提醒');
  assert.match(output, /草擬模板/, 'nudge 應含「教訓草擬模板」標頭');
});
