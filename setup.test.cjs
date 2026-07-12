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

test('既有 Claude Code 核心檔案位元不變', () => {
  for (const [file, expected] of CLAUDE_BASELINE) {
    assert.equal(sha256(file), expected, `${file} 的 SHA-256 與 Claude 相容性基準不符`);
  }
});
