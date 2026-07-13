// [AI-ASSISTED] by PM Amber, 2026-07-13

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

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
  ['template/.claude/commands/backfill-context.md', 'a53e9c3afa7e89bd947ec455f562dbf842b659ca6b84fd5930d9adcfa7af1922'],
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

function markdownSection(contents, heading) {
  const escapedHeading = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = contents.match(
    new RegExp(`^## ${escapedHeading}\\s*$([\\s\\S]*?)(?=^## |(?![\\s\\S]))`, 'm'),
  );
  assert.ok(match, `缺少 Markdown 區段：## ${heading}`);
  return match[1];
}

test('受保護的既有 Claude Code 檔案位元不變', () => {
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
  const { frontmatter, skillBody: coordinatorBody } = parseSkill(coordinator, 'coordinator');

  assert.match(
    frontmatter,
    /^description: Use when handling PM intake, role routing, blocker triage, or Generator-to-Evaluator handoff in builder-pm projects\.$/m,
  );
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

function runSetup(platform, { codexReview = 'n', prepopulateTarget, brownfield = false } = {}) {
  const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'builder-pm-setup-'));
  const source = path.join(sandbox, 'source');
  const target = path.join(sandbox, 'target');
  fs.mkdirSync(source);
  fs.copyFileSync(path.join(ROOT, 'setup.sh'), path.join(source, 'setup.sh'));
  fs.cpSync(path.join(ROOT, 'template'), path.join(source, 'template'), { recursive: true });

  const answers = [
    platform,
    'matrix-project',
    target,
    '驗證雙執行環境',
    'Amber',
    'Node.js',
    'node:test',
    'node --test',
    '',
    '',
    '',
  ];
  if (prepopulateTarget || brownfield) {
    if (prepopulateTarget) prepopulateTarget(target);
    if (brownfield) {
      fs.mkdirSync(path.join(target, '.git'), { recursive: true });
      fs.writeFileSync(path.join(target, '.git', 'HEAD'), 'ref: refs/heads/main\n');
    }
    answers.push('y');
  }
  answers.push('n');
  if (platform === '' || platform === '1' || platform === 'claude') answers.push(codexReview);

  const result = spawnSync('bash', ['setup.sh'], {
    cwd: source,
    input: `${answers.join('\n')}\n`,
    encoding: 'utf8',
    env: { ...process.env, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1' },
  });
  return {
    ...result,
    target,
    cleanup: () => fs.rmSync(sandbox, { recursive: true, force: true }),
  };
}

function assertReviewConfig(target) {
  const config = JSON.parse(
    fs.readFileSync(path.join(target, '.codex/review-config.json'), 'utf8'),
  );
  assert.deepEqual(
    config.knowledgeSources.map((source) => source.path),
    ['CLAUDE.md', 'SKILLS.md', '.context/SYSTEM.md', '.context/CONVENTIONS.md'],
  );
  for (const source of config.knowledgeSources) {
    assert.equal(fs.existsSync(path.join(target, source.path)), true, source.path);
  }
}

function assertCodexCliContract(modules) {
  assert.match(modules, /codex plugin marketplace add Amber-Chang\/codex-pr-review/);
  assert.match(modules, /enable|啟用/i);
  assert.match(modules, /reload/i);
  assert.match(modules, /pr-review-agent/);
  assert.doesNotMatch(modules, /codex plugin install/);
}

function readInstalledDoc(target, file) {
  return fs.readFileSync(path.join(target, file), 'utf8');
}

function assertInstalledOnboarding(onboarding, policy) {
  assert.match(onboarding, new RegExp(`本次安裝狀態：${policy}`));
  assert.doesNotMatch(onboarding, /\{\{CODEX_REVIEW_POLICY\}\}/);
}

test('Claude 預設安裝保留原入口且不安裝 Codex 入口', () => {
  const run = runSetup('', { codexReview: 'n' });
  try {
    assert.equal(run.status, 0, run.stderr);
    assert.equal(fs.existsSync(path.join(run.target, 'CLAUDE.md')), true);
    assert.equal(fs.existsSync(path.join(run.target, '.claude/agents/coordinator.md')), true);
    assert.equal(fs.existsSync(path.join(run.target, 'AGENTS.md')), false);
    assert.equal(fs.existsSync(path.join(run.target, '.agents')), false);
    assert.equal(fs.existsSync(path.join(run.target, '.codex/review-config.json')), false);
    const onboarding = readInstalledDoc(run.target, 'ONBOARDING.md');
    const modules = readInstalledDoc(run.target, 'MODULES.md');
    assertInstalledOnboarding(
      onboarding,
      'Claude-only／Codex review 未啟用：本節僅供參考，不阻擋交付。',
    );
    assert.match(modules, /^# 模組與必要 Gate 狀態$/m);
    assert.match(modules, /^## Codex PR 審查（Claude-only 選用第二模型）$/m);
  } finally {
    run.cleanup();
  }
});

test('Claude 啟用 Codex review 時建立設定與提供 plugin 安裝指引', () => {
  const run = runSetup('', { codexReview: 'y' });
  try {
    assert.equal(run.status, 0, run.stderr);
    assertReviewConfig(run.target);
    const modules = fs.readFileSync(path.join(run.target, 'MODULES.md'), 'utf8');
    assert.match(modules, /\/plugin marketplace add Amber-Chang\/codex-pr-review/);
    assert.match(modules, /\/plugin install codex-pr-review@codex-pr-review/);
    assert.match(modules, /private repo/i);
    assert.match(modules, /fallback/i);
    assert.equal(fs.existsSync(path.join(run.target, 'AGENTS.md')), false);
    assert.equal(fs.existsSync(path.join(run.target, '.agents')), false);
    const onboarding = readInstalledDoc(run.target, 'ONBOARDING.md');
    assertInstalledOnboarding(
      onboarding,
      'Claude-only／Codex 為選用的第二模型額外審查：不取代既有 Claude 獨立驗收，亦非此 runtime 的必要 PR Gate。',
    );
    assert.match(modules, /^# 模組與必要 Gate 狀態$/m);
    assert.match(modules, /^## Codex PR 審查（Claude-only 選用第二模型）$/m);
  } finally {
    run.cleanup();
  }
});

test('Codex 安裝保留共用 Claude 合約並建立 Codex 入口與 review config', () => {
  const run = runSetup('2');
  try {
    assert.equal(run.status, 0, run.stderr);
    assert.equal(fs.existsSync(path.join(run.target, 'CLAUDE.md')), true);
    assert.equal(fs.existsSync(path.join(run.target, '.claude/agents/coordinator.md')), true);
    assert.equal(fs.existsSync(path.join(run.target, 'AGENTS.md')), true);
    assert.equal(fs.existsSync(path.join(run.target, '.agents/skills/evaluator/SKILL.md')), true);
    assertReviewConfig(run.target);
    const modules = fs.readFileSync(path.join(run.target, 'MODULES.md'), 'utf8');
    assert.match(modules, /PR REVIEW.*待啟用/i);
    assertCodexCliContract(modules);
    const onboarding = readInstalledDoc(run.target, 'ONBOARDING.md');
    assertInstalledOnboarding(
      onboarding,
      'Codex-only／正式 GitHub PR 必須通過 Codex review Gate。',
    );
    assert.match(modules, /^# 模組與必要 Gate 狀態$/m);
    assert.match(modules, /^## Codex PR 審查（Codex／雙平台必要 PR Gate）$/m);
  } finally {
    run.cleanup();
  }
});

test('雙平台安裝同時保留兩邊入口', () => {
  const run = runSetup('3');
  try {
    assert.equal(run.status, 0, run.stderr);
    assert.equal(fs.existsSync(path.join(run.target, 'CLAUDE.md')), true);
    assert.equal(fs.existsSync(path.join(run.target, '.claude')), true);
    assert.equal(fs.existsSync(path.join(run.target, 'AGENTS.md')), true);
    assert.equal(fs.existsSync(path.join(run.target, '.agents')), true);
    assertReviewConfig(run.target);
    const modules = readInstalledDoc(run.target, 'MODULES.md');
    assertCodexCliContract(modules);
    const onboarding = readInstalledDoc(run.target, 'ONBOARDING.md');
    assertInstalledOnboarding(
      onboarding,
      '雙平台／正式 GitHub PR 必須通過 Codex review Gate。',
    );
    assert.match(modules, /^# 模組與必要 Gate 狀態$/m);
    assert.match(modules, /^## Codex PR 審查（Codex／雙平台必要 PR Gate）$/m);
  } finally {
    run.cleanup();
  }
});

test('無效平台會顯示錯誤並重新詢問', () => {
  const run = runSetup('x\n2');
  try {
    assert.equal(run.status, 0, run.stderr);
    assert.match(`${run.stdout}\n${run.stderr}`, /錯誤：請輸入 1、2 或 3/);
    assert.equal(fs.existsSync(path.join(run.target, 'AGENTS.md')), true);
    assert.equal(fs.existsSync(path.join(run.target, '.agents/skills/evaluator/SKILL.md')), true);
    assertReviewConfig(run.target);
  } finally {
    run.cleanup();
  }
});

test('Claude 安裝到既有專案時保留原有 Codex 命名檔案', () => {
  const agentsSentinel = 'user-owned AGENTS.md\n';
  const customSentinel = 'user-owned .agents data\n';
  const run = runSetup('', {
    codexReview: 'n',
    prepopulateTarget: (target) => {
      fs.mkdirSync(path.join(target, '.agents/custom'), { recursive: true });
      fs.writeFileSync(path.join(target, 'AGENTS.md'), agentsSentinel);
      fs.writeFileSync(path.join(target, '.agents/custom/data.txt'), customSentinel);
    },
  });
  try {
    assert.equal(run.status, 0, run.stderr);
    assert.equal(fs.readFileSync(path.join(run.target, 'AGENTS.md'), 'utf8'), agentsSentinel);
    assert.equal(
      fs.readFileSync(path.join(run.target, '.agents/custom/data.txt'), 'utf8'),
      customSentinel,
    );
    assert.equal(fs.existsSync(path.join(run.target, 'CLAUDE.md')), true);
    assert.equal(fs.existsSync(path.join(run.target, '.claude/agents/coordinator.md')), true);
  } finally {
    run.cleanup();
  }
});

test('brownfield 三平台輸出各自可執行的 backfill 路徑', () => {
  const cases = [
    { platform: '', expected: /在 Claude 執行 \/backfill-context/ },
    { platform: '2', expected: /請 Codex 依照 \.claude\/commands\/backfill-context\.md 草擬/ },
    {
      platform: '3',
      expected: /可在 Claude 執行 \/backfill-context，或請 Codex 依照 \.claude\/commands\/backfill-context\.md 執行/,
    },
  ];

  for (const { platform, expected } of cases) {
    const run = runSetup(platform, {
      brownfield: true,
      prepopulateTarget: (target) => {
        fs.mkdirSync(target, { recursive: true });
        fs.writeFileSync(path.join(target, 'existing.txt'), 'brownfield\n');
      },
    });
    try {
      assert.equal(run.status, 0, run.stderr);
      assert.match(run.stdout, expected);
      if (platform === '2') {
        assert.doesNotMatch(run.stdout, /在 Claude 執行 \/backfill-context/);
      }
    } finally {
      run.cleanup();
    }
  }
});

test('使用者文件完整說明 Claude Code 與 Codex 雙執行環境', () => {
  const readme = fs.readFileSync(path.join(ROOT, 'README.md'), 'utf8');
  const onboarding = fs.readFileSync(path.join(ROOT, 'template/ONBOARDING.md'), 'utf8');
  const skills = fs.readFileSync(path.join(ROOT, 'template/SKILLS.md'), 'utf8');
  const installAndStructure = [
    markdownSection(readme, '一鍵安裝'),
    markdownSection(readme, '結構'),
  ].join('\n');
  const codexWorkflow = [
    markdownSection(readme, '角色團隊(交付流水線)'),
    markdownSection(readme, 'Codex 兩階段審查'),
  ].join('\n');
  const modulesAndGate = markdownSection(readme, '模組與必要 Gate');

  assert.match(readme, /Claude Code.*Codex|Codex.*Claude Code/s);
  assert.match(readme, /AGENTS\.md/);
  assert.match(readme, /CLAUDE\.md/);
  assert.match(readme, /AGENTS\.md[\s\S]*(?:轉接|adapter|引用|沿用)[\s\S]*CLAUDE\.md|CLAUDE\.md[\s\S]*(?:共用|共享|正本)[\s\S]*AGENTS\.md/i);
  assert.match(readme, /\.agents\/skills/);
  assert.match(readme, /LOCAL PASS/);
  assert.match(readme, /PR PASS/);
  assert.match(readme, /PR REVIEW BLOCKED/);
  assert.match(readme, /pr-review-agent/);
  assert.match(
    readme,
    /(?=.*\.claude)(?=.*(?:保留|沿用))(?=.*(?:共用|共享).*(?:合約|契約))(?=.*(?:不是|非).*(?:runtime|執行入口))/is,
  );
  assert.match(installAndStructure, /安裝來源/);
  assert.match(installAndStructure, /依平台裁剪/);
  assert.match(installAndStructure, /AGENTS\.md[^\n]*(?:Codex|雙平台|兩者)/);
  assert.match(installAndStructure, /\.agents\/skills[^\n]*(?:Codex|雙平台|兩者)/);
  for (const contract of [
    /AGENTS\.md/,
    /CLAUDE\.md/,
    /\.agents\/skills/,
    /LOCAL PASS/,
    /PR REVIEW BLOCKED/,
    /pr-review-agent/,
  ]) {
    assert.match(codexWorkflow, contract);
  }
  assert.match(modulesAndGate, /^(?=[^\n]*openspec)(?=[^\n]*(?:選用|optional)).*$/im);
  assert.match(modulesAndGate, /^(?=[^\n]*Claude-only)(?=[^\n]*(?:選用|optional)).*$/im);
  assert.match(
    modulesAndGate,
    /^(?=[^\n]*Codex \/ 雙平台)(?=[^\n]*(?:必須|必要|required))(?=[^\n]*(?:正式 PR|PR gate)).*$/im,
  );
  assert.match(onboarding, /LOCAL PASS/);
  assert.match(onboarding, /PR REVIEW BLOCKED/);
  assert.doesNotMatch(onboarding, /\]\(docs\/design\.md(?:[^)]*)\)/);
  assert.match(
    onboarding,
    /https:\/\/github\.com\/Amber-Chang\/builder-pm\/blob\/main\/docs\/design\.md/,
  );
  assert.match(onboarding, /§6\.4/);
  assert.match(onboarding, /§6\.5/);
  assert.match(skills, /\.agents\/skills/);
  assert.match(skills, /pr-review-agent/);
  assert.match(
    `${readme}\n${onboarding}`,
    /(?=.*(?:Codex-only|Codex only|僅 Codex|Codex 單獨))(?=.*\.claude)(?=.*(?:共用|共享).*(?:合約|契約))(?=.*(?:不是|非).*(?:runtime|執行入口))/is,
  );
});
