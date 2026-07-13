// [AI-ASSISTED] by PM Amber (via AI Agent), 2026-07-13
// 功能：驗證 project Skill registry 的解析、檔案契約、保護路徑與 CLI fail-closed 行為。

'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const CHECKER = path.join(__dirname, 'check-skill-registry.cjs');
const FIXTURES = path.join(__dirname, 'fixtures');
const fixture = (name) => path.join(FIXTURES, name);

function loadChecker() {
  return require(CHECKER);
}

function run(projectRoot, extraArgs = []) {
  const result = spawnSync('node', [CHECKER, projectRoot, ...extraArgs], { encoding: 'utf8' });
  return {
    code: result.status,
    stdout: result.stdout || '',
    output: `${result.stdout || ''}${result.stderr || ''}`,
  };
}

function runJson(projectRoot, extraArgs = []) {
  const result = run(projectRoot, [...extraArgs, '--json']);
  let json;
  try {
    json = JSON.parse(result.stdout);
  } catch (error) {
    throw new Error(`--json 輸出無法解析（exit ${result.code}）：\n${result.output}`);
  }
  return { ...result, json };
}

test('公開 API：匯出五個必要函式', () => {
  const checker = loadChecker();

  for (const name of ['parseRegistry', 'parseFrontmatter', 'loadCandidate', 'analyze', 'main']) {
    assert.strictEqual(typeof checker[name], 'function', `${name} 必須公開匯出`);
  }
});

test('parseFrontmatter：解析 adoption record 欄位並保留 body', () => {
  const { parseFrontmatter } = loadChecker();
  const parsed = parseFrontmatter(
    '---\nskill: alpha\nsource: upstream/alpha\nsource_version: v1.2.3\napproved_by: Amber\nstatus: approved\n---\n# Alpha\n'
  );

  assert.deepStrictEqual(parsed.frontmatter, {
    skill: 'alpha',
    source: 'upstream/alpha',
    source_version: 'v1.2.3',
    approved_by: 'Amber',
    status: 'approved',
  });
  assert.strictEqual(parsed.body, '# Alpha\n');
});

test('parseRegistry：解析固定七欄並移除欄位中的 backtick', () => {
  const { parseRegistry } = loadChecker();
  const markdown = [
    '<!-- project-skill-registry:start -->',
    '| skill | role | trigger | priority | canonical | codex_adapter | adoption_record |',
    '|---|---|---|---:|---|---|---|',
    '| `alpha` | Generator | implement | 10 | `.claude/skills/alpha/SKILL.md` | | `.governance/skill-adoptions/alpha.md` |',
    '<!-- project-skill-registry:end -->',
  ].join('\n');
  const result = parseRegistry(markdown);

  assert.deepStrictEqual(result.errors, []);
  assert.deepStrictEqual(result.entries, [
    {
      skill: 'alpha',
      role: 'Generator',
      trigger: 'implement',
      priority: '10',
      canonical: '.claude/skills/alpha/SKILL.md',
      codex_adapter: '',
      adoption_record: '.governance/skill-adoptions/alpha.md',
    },
  ]);
});

test('parseRegistry：marker 或固定表頭錯誤時 fail-closed', () => {
  const { parseRegistry } = loadChecker();
  const missingMarker = parseRegistry('| skill | role | trigger | priority | canonical | codex_adapter | adoption_record |');
  const badHeader = parseRegistry([
    '<!-- project-skill-registry:start -->',
    '| skill | role | when | priority | canonical | codex_adapter | adoption_record |',
    '|---|---|---|---|---|---|---|',
    '<!-- project-skill-registry:end -->',
  ].join('\n'));

  assert.ok(missingMarker.errors.some((error) => error.code === 'registry-marker'));
  assert.ok(badHeader.errors.some((error) => error.code === 'registry-header'));
});

test('valid fixture：canonical、adapter 與核准 adoption record 全部有效', () => {
  const { analyze } = loadChecker();

  assert.deepStrictEqual(analyze(fixture('valid')).errors, []);
});

test('duplicate-skill fixture：skill 重複與非正整數 priority 都回報', () => {
  const { analyze } = loadChecker();
  const result = analyze(fixture('duplicate-skill'));

  assert.ok(result.errors.some((error) => error.code === 'duplicate-skill'));
  assert.ok(result.errors.some((error) => error.code === 'invalid-priority'));
});

test('route-conflict fixture：相同 role、trigger、priority 回報 route-conflict', () => {
  const { analyze } = loadChecker();
  const result = analyze(fixture('route-conflict'));
  const conflict = result.errors.find((error) => error.code === 'route-conflict');

  assert.ok(conflict, `應回報 route-conflict，實際=${JSON.stringify(result.errors)}`);
  assert.deepStrictEqual(conflict.skills, ['alpha', 'beta']);
});

test('missing-adoption fixture：adoption record 不存在時回報錯誤', () => {
  const { analyze } = loadChecker();
  const result = analyze(fixture('missing-adoption'));

  assert.ok(result.errors.some((error) => error.code === 'missing-adoption-record'));
});

test('bad-adapter fixture：adapter 不符合薄轉接契約時回報錯誤', () => {
  const { analyze } = loadChecker();
  const result = analyze(fixture('bad-adapter'));

  assert.ok(result.errors.some((error) => error.code === 'invalid-adapter-contract'));
});

test('adoption record 欄位不合約時逐項回報', () => {
  const { analyze } = loadChecker();
  const result = analyze(fixture('bad-adoption'));
  const codes = result.errors.map((error) => error.code);

  assert.ok(codes.includes('adoption-skill-mismatch'));
  assert.ok(codes.includes('missing-adoption-source'));
  assert.ok(codes.includes('invalid-adoption-source-version'));
  assert.ok(codes.includes('missing-adoption-approved-by'));
  assert.ok(codes.includes('invalid-adoption-status'));
});

test('loadCandidate 與 protected candidate：.claude 根目錄只允許 registry canonical Skill', () => {
  const { analyze, loadCandidate } = loadChecker();
  const candidate = loadCandidate(path.join(FIXTURES, 'protected-candidate.json'));
  const result = analyze(fixture('valid'), candidate);
  const protectedErrors = result.errors.filter((error) => error.code === 'protected-path');

  assert.deepStrictEqual(candidate, {
    files: [
      'template/.claude/agents',
      'template/.claude/skills/brainstorming/SKILL.md',
      'template/.claude/skills/code-review',
      'template/.claude/skills/tdd/helpers/assert.cjs',
      'template/.claude/skills/unprotected/SKILL.md',
      'template/.claude/settings.json',
    ],
  });
  assert.deepStrictEqual(protectedErrors.map((error) => error.file), [
    'template/.claude/agents',
    'template/.claude/settings.json',
    'template/.claude/skills/brainstorming/SKILL.md',
    'template/.claude/skills/code-review',
    'template/.claude/skills/tdd/helpers/assert.cjs',
    'template/.claude/skills/unprotected/SKILL.md',
  ]);
});

test('protected candidate：安裝後的 .claude 路徑也必須攔截', () => {
  const { analyze } = loadChecker();
  const result = analyze(fixture('valid'), {
    files: ['.claude/agents/planner.md', '.claude/skills/tdd/SKILL.md', '.claude/settings.json'],
  });

  assert.deepStrictEqual(
    result.errors.filter((error) => error.code === 'protected-path').map((error) => error.file),
    ['.claude/agents/planner.md', '.claude/settings.json', '.claude/skills/tdd/SKILL.md'],
  );
});

test('空 codex_adapter 不會放行任何 .agents 路徑', () => {
  const { analyze } = loadChecker();
  const result = analyze(fixture('missing-adoption'), {
    files: ['.agents/skills/unrelated/SKILL.md'],
  });
  assert.ok(result.errors.some((error) => error.code === 'protected-path'));
});

test('舊 adoption 路徑格式必須回報 invalid-adoption-path', () => {
  const { analyze } = loadChecker();
  const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-registry-adoption-path-'));
  try {
    fs.cpSync(fixture('valid'), sandbox, { recursive: true });
    const skillsPath = path.join(sandbox, 'SKILLS.md');
    fs.writeFileSync(
      skillsPath,
      fs.readFileSync(skillsPath, 'utf8').replace(
        'SKILL-ADOPTION-alpha.md',
        'alpha.md',
      ),
    );
    assert.ok(analyze(sandbox).errors.some((error) => error.code === 'invalid-adoption-path'));
  } finally {
    fs.rmSync(sandbox, { recursive: true, force: true });
  }
});

test('skill 名稱含 ../ 時必須拒絕，且不可讀取 project root 外檔案', () => {
  const { analyze } = loadChecker();
  const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-registry-traversal-'));
  try {
    fs.writeFileSync(path.join(sandbox, 'SKILLS.md'), [
      '<!-- project-skill-registry:start -->',
      '| skill | role | trigger | priority | canonical | codex_adapter | adoption_record |',
      '|---|---|---|---:|---|---|---|',
      '| ../escape | Generator | build | 1 | `.claude/skills/../escape/SKILL.md` | | `.governance/skill-adoptions/escape.md` |',
      '<!-- project-skill-registry:end -->',
    ].join('\n'));
    const result = analyze(sandbox);
    assert.ok(result.errors.some((error) => error.code === 'invalid-skill-name'));
  } finally {
    fs.rmSync(sandbox, { recursive: true, force: true });
  }
});

test('內建 Claude Skill 名稱不可登記，避免放行受保護目錄', () => {
  const { analyze } = loadChecker();
  const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-registry-reserved-'));
  try {
    fs.writeFileSync(path.join(sandbox, 'SKILLS.md'), [
      '<!-- project-skill-registry:start -->',
      '| skill | role | trigger | priority | canonical | codex_adapter | adoption_record |',
      '|---|---|---|---:|---|---|---|',
      '| tdd | Generator | test | 1 | `.claude/skills/tdd/SKILL.md` | | `.governance/skill-adoptions/tdd.md` |',
      '<!-- project-skill-registry:end -->',
    ].join('\n'));
    assert.ok(analyze(sandbox).errors.some((error) => error.code === 'reserved-skill-name'));
  } finally {
    fs.rmSync(sandbox, { recursive: true, force: true });
  }
});

test('protected candidate：大小寫不同的 .CLAUDE 路徑也必須攔截', () => {
  const { analyze } = loadChecker();
  const result = analyze(fixture('valid'), {
    files: ['.CLAUDE/agents/planner.md', 'template/.CLAUDE/settings.json'],
  });
  assert.deepStrictEqual(
    result.errors.filter((error) => error.code === 'protected-path').map((error) => error.file),
    ['.CLAUDE/agents/planner.md', 'template/.CLAUDE/settings.json'],
  );
});

test('protected candidate：已登記 skill 的大小寫變體不可視為 canonical', () => {
  const { analyze } = loadChecker();
  const result = analyze(fixture('valid'), {
    files: ['template/.claude/skills/RESEARCH-SYNTHESIS/SKILL.md'],
  });
  assert.ok(result.errors.some((error) => error.code === 'protected-path'));
});

test('errors 依 file、code、message 穩定排序', () => {
  const { analyze } = loadChecker();
  const result = analyze(fixture('bad-adoption'), {
    files: ['template/.claude/skills/tdd/z.md', 'template/.claude/agents/a.md'],
  });
  const sorted = [...result.errors].sort((left, right) =>
    `${left.file || ''}\u0000${left.code}\u0000${left.message}`.localeCompare(
      `${right.file || ''}\u0000${right.code}\u0000${right.message}`
    )
  );

  assert.deepStrictEqual(result.errors, sorted);
});

test('CLI：有效專案 exit 0；registry 錯誤或 protected candidate exit 1', () => {
  const emptyCandidate = path.join(FIXTURES, 'empty-candidate.json');
  const valid = runJson(fixture('valid'), ['--candidate', emptyCandidate]);
  const invalid = runJson(fixture('duplicate-skill'), ['--candidate', emptyCandidate]);
  const protectedResult = runJson(fixture('valid'), [
    '--candidate',
    path.join(FIXTURES, 'protected-candidate.json'),
  ]);

  assert.strictEqual(valid.code, 0, valid.output);
  assert.deepStrictEqual(valid.json.errors, []);
  assert.strictEqual(invalid.code, 1, invalid.output);
  assert.strictEqual(protectedResult.code, 1, protectedResult.output);
  assert.ok(protectedResult.json.errors.some((error) => error.code === 'protected-path'));
});

test('CLI：缺 project-root、candidate 參數或 candidate 格式錯誤時 exit 1', () => {
  const missingRoot = spawnSync('node', [CHECKER], { encoding: 'utf8' });
  const missingCandidate = run(fixture('valid'), ['--json']);
  const missingCandidatePath = run(fixture('valid'), ['--candidate']);
  const badCandidate = run(fixture('valid'), [
    '--candidate',
    path.join(FIXTURES, 'invalid-candidate.json'),
    '--json',
  ]);

  assert.strictEqual(missingRoot.status, 1);
  assert.strictEqual(missingCandidate.code, 1);
  assert.strictEqual(missingCandidatePath.code, 1);
  assert.strictEqual(badCandidate.code, 1);
});
