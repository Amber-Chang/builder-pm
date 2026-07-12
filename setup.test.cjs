// [AI-ASSISTED] by PM Amber, 2026-07-13

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = __dirname;

const CLAUDE_BASELINE = new Map([
  ['template/CLAUDE.md', 'afd0c7d715036356795456de112fa3c11eb589b196fe39024d0228fdc228b2cc'],
  ['template/.claude/agents/coordinator.md', '1c0e08b5b6d771e46ac51410a2c2e3573f81c6fd7d095d6af4791f5937d6ee43'],
  ['template/.claude/agents/evaluator.md', '383c41ceee779f3dedc6b45926a458b29abbf67c0f2389497486bc5935a42824'],
  ['template/.claude/agents/generator.md', '1de961689db180f4464656dfe98341eb07f5fdcdce82adf0e00e2e7c93fc59f7'],
  ['template/.claude/agents/planner.md', '09fa3f05571578f5886e921e7acdb626e395385e1a06a17ef9092889ff68f845'],
  ['template/.claude/skills/brainstorming/SKILL.md', 'eecf19a0cd1b2f15e2d2695ca6890e0e33dc8f13e9fa6ea1a0a02162747cab41'],
  ['template/.claude/skills/code-review/SKILL.md', '681db8f08effad6a7d0d7c20548502fb1940c1df4b61648b790a79a485d6de3a'],
  ['template/.claude/skills/tdd/SKILL.md', '9108edbd1b6c2e9d99ff31b3b05f2acb6543bc32977f56279ba22418e6bb1f90'],
]);

function sha256(file) {
  const contents = fs.readFileSync(path.join(ROOT, file));
  return crypto.createHash('sha256').update(contents).digest('hex');
}

function parseSkill(contents, role) {
  const frontmatterMatch = contents.match(/^---\n([\s\S]+?)\n---\n/);
  assert.ok(frontmatterMatch, `${role} 缺少完整 YAML frontmatter`);
  return {
    frontmatter: frontmatterMatch[1],
    skillBody: contents.slice(frontmatterMatch[0].length),
  };
}

test('既有 Claude Code 核心檔案位元不變', () => {
  for (const [file, expected] of CLAUDE_BASELINE) {
    assert.equal(sha256(file), expected, `${file} 的 SHA-256 與 Claude 相容性基準不符`);
  }
});

const CODEX_SKILLS = ['coordinator', 'planner', 'generator', 'evaluator'];

test('Codex 入口存在且引用共用正本，不複製核心條文', () => {
  const agents = fs.readFileSync(path.join(ROOT, 'template/AGENTS.md'), 'utf8');
  assert.match(agents, /^<!-- \[AI-ASSISTED\] by PM Amber, 2026-07-13 -->/);
  assert.match(agents, /CLAUDE\.md/);
  for (const role of CODEX_SKILLS) {
    assert.match(agents, new RegExp(`\\.agents/skills/${role}/SKILL\\.md`));
  }
  assert.doesNotMatch(agents, /核心憲章（10 條/);
  for (const duplicatedRule of [
    '永遠使用繁體中文',
    '資料庫 migration',
    'LOCAL PASS',
    'PR REVIEW BLOCKED',
    'codex review --uncommitted',
  ]) {
    assert.doesNotMatch(agents, new RegExp(duplicatedRule));
  }
});

test('Codex 四角色 skills 有合法 frontmatter 與角色觸發', () => {
  for (const role of CODEX_SKILLS) {
    const file = path.join(ROOT, 'template/.agents/skills', role, 'SKILL.md');
    const body = fs.readFileSync(file, 'utf8');
    const { frontmatter } = parseSkill(body, role);
    assert.match(frontmatter, new RegExp(`^name: builder-pm-${role}$`, 'm'));
    assert.match(frontmatter, /^description: Use when .+$/m);
    assert.match(body, new RegExp(`\\.claude/agents/${role}\\.md`));
    assert.match(body, /^<!-- \[AI-ASSISTED\] by PM Amber, 2026-07-13 -->/m);
  }
});

test('Evaluator 定義唯一且完整的 Codex 審查契約', () => {
  const evaluator = fs.readFileSync(
    path.join(ROOT, 'template/.agents/skills/evaluator/SKILL.md'),
    'utf8',
  );
  const { skillBody: evaluatorBody } = parseSkill(evaluator, 'evaluator');

  assert.match(
    evaluator,
    /description: Use when performing independent local review after Generator work or executing the required codex-pr-review GitHub PR gate\./,
  );
  assert.match(evaluator, /不得.*另一個 Evaluator/);
  assert.match(evaluator, /LOCAL PASS.*LOCAL FAIL/);
  assert.match(evaluator, /PR PASS.*PR FAIL.*PR REVIEW BLOCKED/);
  assert.match(evaluator, /PR 驗收待完成/);
  assert.match(evaluator, /LOCAL PASS.*不得.*PR PASS/);
  assert.match(evaluatorBody, /Codex override/);
  assert.match(evaluatorBody, /優先於.*\.claude\/agents\/evaluator\.md/);
  assert.match(evaluatorBody, /不得輸出.*Overall/);
  assert.match(evaluatorBody, /LOCAL PASS/);
  assert.match(evaluatorBody, /PR PASS/);
  assert.match(evaluatorBody, /PR REVIEW BLOCKED/);
});

test('Coordinator adapter 只保留 Codex Evaluator 交接', () => {
  const coordinator = fs.readFileSync(
    path.join(ROOT, 'template/.agents/skills/coordinator/SKILL.md'),
    'utf8',
  );
  const { skillBody: coordinatorBody } = parseSkill(coordinator, 'coordinator');

  assert.match(coordinatorBody, /\.agents\/skills\/evaluator\/SKILL\.md/);
  assert.doesNotMatch(coordinatorBody, /codex review --uncommitted|LOCAL PASS|PR REVIEW BLOCKED/);
  assert.match(coordinatorBody, /全新、唯讀.*sub-agent/);
  assert.match(coordinatorBody, /不得.*Generator.*品質結論/);
  assert.match(coordinatorBody, /無法.*fallback/);
  assert.doesNotMatch(
    coordinatorBody,
    /不清楚的需求|模糊需求|production code|2 個處理週期|兩次/,
  );
});
