// [AI-ASSISTED] by PM Amber (via AI Agent), 2026-07-13
// 功能：以 fail-closed 規則驗證 project Skill registry、來源檔案、採用紀錄與受保護候選路徑。

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const START_MARKER = '<!-- project-skill-registry:start -->';
const END_MARKER = '<!-- project-skill-registry:end -->';
const REGISTRY_HEADERS = [
  'skill',
  'role',
  'trigger',
  'priority',
  'canonical',
  'codex_adapter',
  'adoption_record',
];
const PROTECTED_PATHS = [
  'template/.claude',
  '.claude',
  'template/.agents',
  '.agents',
];
const RESERVED_SKILL_NAMES = new Set(['brainstorming', 'code-review', 'tdd']);

function parseScalar(value) {
  return value.trim().replace(/^['"]|['"]$/g, '');
}

function parseFrontmatter(markdown) {
  const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) return { frontmatter: null, body: markdown };

  const frontmatter = {};
  for (const line of match[1].split(/\r?\n/)) {
    const field = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
    if (field) frontmatter[field[1]] = parseScalar(field[2]);
  }
  return { frontmatter, body: markdown.slice(match[0].length) };
}

function registryError(code, message) {
  return { file: 'SKILLS.md', code, message };
}

function markerCount(markdown, marker) {
  return markdown.split(marker).length - 1;
}

function parseTableLine(line) {
  const trimmed = line.trim();
  if (!trimmed.startsWith('|') || !trimmed.endsWith('|')) return null;
  return trimmed
    .slice(1, -1)
    .split('|')
    .map((cell) => cell.trim());
}

function cleanCell(cell) {
  const match = cell.match(/^`([^`]*)`$/);
  return match ? match[1].trim() : cell.trim();
}

function parseRegistry(markdown) {
  const errors = [];
  const entries = [];
  const startCount = markerCount(markdown, START_MARKER);
  const endCount = markerCount(markdown, END_MARKER);
  const start = markdown.indexOf(START_MARKER);
  const end = markdown.indexOf(END_MARKER);

  if (startCount !== 1 || endCount !== 1 || start < 0 || end < start) {
    errors.push(
      registryError(
        'registry-marker',
        'SKILLS.md 必須包含唯一且順序正確的 project-skill-registry start/end 標記'
      )
    );
    return { entries, errors };
  }

  const block = markdown.slice(start + START_MARKER.length, end);
  const lines = block.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const header = lines.length > 0 ? parseTableLine(lines[0]) : null;
  const separator = lines.length > 1 ? parseTableLine(lines[1]) : null;
  const validHeader =
    header !== null &&
    header.length === REGISTRY_HEADERS.length &&
    header.every((cell, index) => cell === REGISTRY_HEADERS[index]);
  const validSeparator =
    separator !== null &&
    separator.length === REGISTRY_HEADERS.length &&
    separator.every((cell) => /^:?-{3,}:?$/.test(cell));

  if (!validHeader || !validSeparator) {
    errors.push(
      registryError(
        'registry-header',
        `registry 表格必須使用固定七欄：${REGISTRY_HEADERS.join(', ')}`
      )
    );
    return { entries, errors };
  }

  for (const line of lines.slice(2)) {
    const cells = parseTableLine(line);
    if (cells === null || cells.length !== REGISTRY_HEADERS.length) {
      errors.push(registryError('registry-row', `registry 列必須恰好有七欄：${line}`));
      continue;
    }
    entries.push(
      Object.fromEntries(REGISTRY_HEADERS.map((headerName, index) => [headerName, cleanCell(cells[index])]))
    );
  }

  return { entries, errors };
}

function loadCandidate(filePath) {
  const candidate = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  if (
    candidate === null ||
    typeof candidate !== 'object' ||
    Array.isArray(candidate) ||
    !Array.isArray(candidate.files) ||
    candidate.files.some((file) => typeof file !== 'string')
  ) {
    throw new Error('candidate 必須是 {files:string[]}');
  }
  return candidate;
}

function compareText(left, right) {
  return left.localeCompare(right);
}

function errorSortKey(error) {
  return `${error.file || ''}\u0000${error.code}\u0000${error.message}`;
}

function sortedErrors(errors) {
  return errors.sort((left, right) => compareText(errorSortKey(left), errorSortKey(right)));
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim() !== '';
}

function existsAsFile(absolutePath) {
  try {
    return fs.statSync(absolutePath).isFile();
  } catch (error) {
    if (error.code === 'ENOENT' || error.code === 'ENOTDIR') return false;
    throw error;
  }
}

function normalizeCandidatePath(file) {
  return path.posix
    .normalize(file.replaceAll('\\', '/'))
    .replace(/^\.\//, '')
    .replace(/\/$/, '');
}

function isProjectRelativePath(file) {
  const normalized = normalizeCandidatePath(file);
  return !path.posix.isAbsolute(normalized) && normalized !== '..' && !normalized.startsWith('../');
}

function isContainedFile(root, relativePath) {
  try {
    const realRoot = fs.realpathSync(root);
    const realFile = fs.realpathSync(path.resolve(root, relativePath));
    return realFile === realRoot || realFile.startsWith(`${realRoot}${path.sep}`);
  } catch {
    return false;
  }
}

function addProtectedPathErrors(errors, candidate, entries = []) {
  if (candidate === null) return;
  if (
    typeof candidate !== 'object' ||
    Array.isArray(candidate) ||
    !Array.isArray(candidate.files) ||
    candidate.files.some((file) => typeof file !== 'string')
  ) {
    errors.push({
      file: '',
      code: 'candidate-format',
      message: 'candidate 必須是 {files:string[]}',
    });
    return;
  }

  for (const file of candidate.files) {
    if (!isProjectRelativePath(file)) {
      errors.push({ file, code: 'invalid-candidate-path', message: 'candidate 路徑必須位於 project root 內' });
      continue;
    }
    const normalized = normalizeCandidatePath(file);
    const allowedCanonical = entries.some((entry) =>
      [
        `.claude/skills/${entry.skill}/`,
        `template/.claude/skills/${entry.skill}/`,
        entry.codex_adapter,
        entry.codex_adapter ? `template/${entry.codex_adapter}` : '',
      ]
        .filter(Boolean)
        .some((path) => path.endsWith('/SKILL.md') ? normalized === path : normalized.startsWith(path))
    );
    if (allowedCanonical) continue;
    const protectedRoot = PROTECTED_PATHS.find(
      (root) => {
        const lower = normalized.toLowerCase();
        return lower === root || lower.startsWith(`${root}/`);
      }
    );
    if (!protectedRoot) continue;
    errors.push({
      file,
      code: 'protected-path',
      message: `候選變更不可修改受保護路徑 ${protectedRoot}`,
    });
  }
}

function validateDuplicateSkills(entries, errors) {
  const bySkill = new Map();
  for (const entry of entries) {
    if (!bySkill.has(entry.skill)) bySkill.set(entry.skill, []);
    bySkill.get(entry.skill).push(entry);
  }
  for (const [skill, occurrences] of bySkill) {
    if (occurrences.length < 2) continue;
    errors.push(
      registryError('duplicate-skill', `skill ${skill || '(空白)'} 在 registry 重複 ${occurrences.length} 次`)
    );
  }
}

function isSafeSkillName(skill) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(skill);
}

function validateRoutes(entries, errors) {
  const routes = new Map();
  for (const entry of entries) {
    if (!/^[1-9]\d*$/.test(entry.priority)) continue;
    const key = `${entry.role}\u0000${entry.trigger}\u0000${entry.priority}`;
    if (!routes.has(key)) routes.set(key, []);
    routes.get(key).push(entry.skill);
  }
  for (const [key, skills] of routes) {
    if (skills.length < 2) continue;
    const [role, trigger, priority] = key.split('\u0000');
    const sortedSkills = [...skills].sort(compareText);
    errors.push({
      ...registryError(
        'route-conflict',
        `role=${role}、trigger=${trigger}、priority=${priority} 同時路由到 ${sortedSkills.join(', ')}`
      ),
      role,
      trigger,
      priority: Number(priority),
      skills: sortedSkills,
    });
  }
}

function validateCanonical(root, entry, errors) {
  const expected = `.claude/skills/${entry.skill}/SKILL.md`;
  if (entry.canonical !== expected) {
    errors.push({
      file: 'SKILLS.md',
      code: 'invalid-canonical-path',
      message: `skill ${entry.skill || '(空白)'} 的 canonical 必須是 ${expected}`,
    });
    return null;
  }

  const absolute = path.join(root, ...entry.canonical.split('/'));
  if (!existsAsFile(absolute) || !isContainedFile(root, entry.canonical)) {
    errors.push({
      file: entry.canonical,
      code: 'missing-canonical',
      message: `canonical 不存在：${entry.canonical}`,
    });
    return null;
  }
  return absolute;
}

function validateAdapter(root, entry, errors) {
  if (entry.codex_adapter === '') return;
  const expected = `.agents/skills/${entry.skill}/SKILL.md`;
  if (entry.codex_adapter !== expected) {
    errors.push({
      file: 'SKILLS.md',
      code: 'invalid-adapter-path',
      message: `skill ${entry.skill || '(空白)'} 的 codex_adapter 必須是 ${expected}`,
    });
    return;
  }

  const absolute = path.join(root, ...entry.codex_adapter.split('/'));
  if (!existsAsFile(absolute) || !isContainedFile(root, entry.codex_adapter)) {
    errors.push({
      file: entry.codex_adapter,
      code: 'missing-adapter',
      message: `Codex adapter 不存在：${entry.codex_adapter}`,
    });
    return;
  }
  const content = fs.readFileSync(absolute, 'utf8');
  const expectedContent = `# ${entry.skill} adapter\n\nFollow \`${entry.canonical}\`.\n`;
  if (content !== expectedContent) {
    errors.push({
      file: entry.codex_adapter,
      code: 'invalid-adapter-contract',
      message: 'Codex adapter 必須使用唯一允許的薄轉接格式',
    });
  }
}

function validateAdoptionRecord(root, entry, errors) {
  if (!isNonEmptyString(entry.adoption_record)) {
    errors.push(
      registryError('missing-adoption-record', `skill ${entry.skill || '(空白)'} 缺少 adoption_record`)
    );
    return;
  }

  const expectedPath = `.governance/skill-adoptions/SKILL-ADOPTION-${entry.skill}.md`;
  if (entry.adoption_record !== expectedPath) {
    errors.push({
      file: 'SKILLS.md',
      code: 'invalid-adoption-path',
      message: `adoption_record 必須是 ${expectedPath}`,
    });
    return;
  }
  const normalized = path.posix.normalize(entry.adoption_record);
  if (path.posix.isAbsolute(normalized) || normalized === '..' || normalized.startsWith('../')) {
    errors.push({
      file: 'SKILLS.md',
      code: 'invalid-adoption-path',
      message: `adoption_record 必須是 project-root 內相對路徑：${entry.adoption_record}`,
    });
    return;
  }

  const absolute = path.join(root, ...normalized.split('/'));
  if (!existsAsFile(absolute) || !isContainedFile(root, normalized)) {
    errors.push({
      file: entry.adoption_record,
      code: 'missing-adoption-record',
      message: `adoption record 不存在：${entry.adoption_record}`,
    });
    return;
  }

  const { frontmatter } = parseFrontmatter(fs.readFileSync(absolute, 'utf8'));
  const record = frontmatter || {};
  if (record.skill !== entry.skill) {
    errors.push({
      file: entry.adoption_record,
      code: 'adoption-skill-mismatch',
      message: `adoption record skill 必須是 ${entry.skill}`,
    });
  }
  if (!isNonEmptyString(record.source)) {
    errors.push({
      file: entry.adoption_record,
      code: 'missing-adoption-source',
      message: 'adoption record source 必須是非空字串',
    });
  }
  if (
    !isNonEmptyString(record.source_version) ||
    !/^(?:[0-9a-fA-F]{40}|v\d+(?:\.\d+)*)$/.test(record.source_version)
  ) {
    errors.push({
      file: entry.adoption_record,
      code: 'invalid-adoption-source-version',
      message: 'source_version 必須是完整 40 位 SHA 或 v 開頭的不可變數字 tag',
    });
  }
  if (!isNonEmptyString(record.approved_by)) {
    errors.push({
      file: entry.adoption_record,
      code: 'missing-adoption-approved-by',
      message: 'adoption record approved_by 必須是非空字串',
    });
  }
  if (record.status !== 'approved') {
    errors.push({
      file: entry.adoption_record,
      code: 'invalid-adoption-status',
      message: 'adoption record status 必須是 approved',
    });
  }
}

function analyze(projectRoot, candidate = null) {
  const root = path.resolve(projectRoot);
  const errors = [];
  const registryPath = path.join(root, 'SKILLS.md');
  let markdown;

  try {
    markdown = fs.readFileSync(registryPath, 'utf8');
  } catch (error) {
    errors.push({
      file: 'SKILLS.md',
      code: 'registry-read',
      message: `無法讀取 SKILLS.md：${error.code || error.message}`,
    });
    addProtectedPathErrors(errors, candidate);
    return { errors: sortedErrors(errors), entries: [] };
  }

  const parsed = parseRegistry(markdown);
  errors.push(...parsed.errors);
  if (parsed.errors.length === 0) {
    validateDuplicateSkills(parsed.entries, errors);
    for (const entry of parsed.entries) {
      if (!isSafeSkillName(entry.skill)) {
        errors.push(
          registryError(
            'invalid-skill-name',
            `registry skill 必須是小寫英數與連字號組成的安全名稱：${entry.skill || '(空白)'}`
          )
        );
        continue;
      }
      if (RESERVED_SKILL_NAMES.has(entry.skill)) {
        errors.push(
          registryError('reserved-skill-name', `registry 不可登記既有內建 Skill：${entry.skill}`)
        );
        continue;
      }
      if (!/^[1-9]\d*$/.test(entry.priority)) {
        errors.push(
          registryError(
            'invalid-priority',
            `skill ${entry.skill || '(空白)'} 的 priority 必須是正整數：${entry.priority || '(空白)'}`
          )
        );
      }
      validateCanonical(root, entry, errors);
      validateAdapter(root, entry, errors);
      validateAdoptionRecord(root, entry, errors);
    }
    validateRoutes(parsed.entries, errors);
  }

  addProtectedPathErrors(errors, candidate, parsed.entries);
  return { errors: sortedErrors(errors), entries: parsed.entries };
}

function renderReport(projectRoot, result) {
  const lines = [
    'Project Skill Registry 檢查報告',
    `掃描根目錄：${projectRoot}`,
    `結果：${result.errors.length === 0 ? 'PASS' : `FAIL（${result.errors.length} 筆錯誤）`}`,
    '',
  ];
  if (result.errors.length === 0) lines.push('錯誤：（無）');
  else {
    lines.push('錯誤：');
    for (const error of result.errors) {
      lines.push(`  - [${error.code}] ${error.file || '(無路徑)'}：${error.message}`);
    }
  }
  return lines.join('\n');
}

function parseArgs(argv) {
  let projectRoot = null;
  let candidatePath = null;
  let jsonMode = false;
  let error = null;

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--json') {
      jsonMode = true;
    } else if (argument === '--candidate') {
      if (index + 1 >= argv.length || argv[index + 1].startsWith('--')) {
        error = '--candidate 後必須提供路徑';
        break;
      }
      candidatePath = argv[index + 1];
      index += 1;
    } else if (argument.startsWith('--')) {
      error = `未知參數：${argument}`;
      break;
    } else if (projectRoot === null) {
      projectRoot = argument;
    } else {
      error = `多餘參數：${argument}`;
      break;
    }
  }
  return { projectRoot, candidatePath, jsonMode, error };
}

function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  if (args.error || args.projectRoot === null || args.candidatePath === null) {
    if (args.error) console.error(args.error);
    if (args.candidatePath === null && !args.error) console.error('--candidate 必須提供完整候選檔案清單');
    console.error('用法：node check-skill-registry.cjs <project-root> --candidate path [--json]');
    return 1;
  }

  const root = path.resolve(process.cwd(), args.projectRoot);
  try {
    if (!fs.statSync(root).isDirectory()) throw new Error('不是目錄');
  } catch (error) {
    console.error(`讀取 project-root 失敗（${args.projectRoot}）：${error.code || error.message}`);
    return 1;
  }

  let candidate;
  try {
    candidate = loadCandidate(path.resolve(process.cwd(), args.candidatePath));
  } catch (error) {
      const result = {
        errors: [
          {
            file: args.candidatePath,
            code: 'candidate-load',
            message: `無法載入 candidate：${error.code || error.message}`,
          },
        ],
        entries: [],
      };
      if (args.jsonMode) console.log(JSON.stringify(result, null, 2));
      else console.error(result.errors[0].message);
      return 1;
  }

  const result = analyze(root, candidate);
  if (args.jsonMode) console.log(JSON.stringify(result, null, 2));
  else console.log(renderReport(root, result));
  return result.errors.length === 0 ? 0 : 1;
}

if (require.main === module) {
  process.exit(main());
}

module.exports = { parseRegistry, parseFrontmatter, loadCandidate, analyze, main };
