// Structural validation for the Orbital Ops assignment.
// Locked file: the grading contract. Fix the repo, not this script.
//
// Run with: npm run validate:structure
// Each check maps 1:1 to a checkbox in ASSIGNMENT.md.

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
let failures = 0;
let passes = 0;

function check(id: string, ok: boolean, message: string, hint: string) {
  if (ok) {
    passes++;
    console.log(`  ✅ ${id}: ${message}`);
  } else {
    failures++;
    console.log(`  ❌ ${id}: ${message}`);
    console.log(`     ↳ ${hint}`);
  }
}

function read(path: string): string {
  try {
    return readFileSync(join(root, path), 'utf8');
  } catch {
    return '';
  }
}

function lineCount(content: string): number {
  return content.split('\n').filter((l) => l.trim().length > 0).length;
}

console.log('\nOrbital Ops — structural validation\n');

// ---------------------------------------------------------------------------
console.log('Exercise 0 — Orient & Instruct');
const claudeMd = read('CLAUDE.md');
check(
  'E0.1',
  lineCount(claudeMd) >= 30,
  'CLAUDE.md has at least 30 non-empty lines',
  'Extend CLAUDE.md with real project guidance (see ASSIGNMENT.md, Exercise 0).'
);
for (const section of ['## Commands', '## Architecture', '## Conventions']) {
  check(
    'E0.2',
    claudeMd.includes(section),
    `CLAUDE.md contains a "${section}" section`,
    `Add a "${section}" section describing this project.`
  );
}

// ---------------------------------------------------------------------------
console.log('\nExercise 1 — The Great Refactor');
check(
  'E1.1',
  existsSync(join(root, 'docs/refactor-plan.md')) && lineCount(read('docs/refactor-plan.md')) >= 20,
  'docs/refactor-plan.md exists with a substantive plan (>= 20 lines)',
  'Produce the plan in plan mode BEFORE refactoring, then commit it.'
);
const dashboard = read('src/components/Dashboard.tsx');
check(
  'E1.2',
  dashboard.length > 0 && lineCount(dashboard) < 150,
  'Dashboard.tsx is under 150 non-empty lines (currently ' + lineCount(dashboard) + ')',
  'Decompose the god component into smaller components + hooks + domain modules.'
);
check(
  'E1.3',
  !existsSync(join(root, 'src/components/OldDashboard.tsx')),
  'OldDashboard.tsx has been deleted',
  'Dead code goes away. Delete it (and anything only it used).'
);
check(
  'E1.4',
  existsSync(join(root, 'src/hooks')) && readdirSync(join(root, 'src/hooks')).length > 0,
  'src/hooks/ exists with at least one shared hook',
  'Extract the copy-pasted fetch logic into a shared hook (e.g. useApiResource).'
);
check(
  'E1.5',
  existsSync(join(root, 'src/domain')) && readdirSync(join(root, 'src/domain')).length > 0,
  'src/domain/ exists with extracted pure business logic',
  'Move status computation / telemetry math out of components into pure modules.'
);
const apiFiles = existsSync(join(root, 'src/api'))
  ? readdirSync(join(root, 'src/api')).filter((f) => f.endsWith('.ts'))
  : [];
const anyInApi = apiFiles.some((f) => /:\s*any\b|<any>|\bas any\b|Promise<any>/.test(read('src/api/' + f)));
check(
  'E1.6',
  apiFiles.length > 0 && !anyInApi,
  'src/api/ contains no `any` types',
  'Type the API layer end to end (complete src/api/types.ts, make getData generic).'
);
check(
  'E1.7',
  existsSync(join(root, 'src/config.ts')),
  'src/config.ts exists (centralized constants)',
  'Centralize poll intervals, thresholds, and colors; resolve the O2 floor discrepancy.'
);

// ---------------------------------------------------------------------------
console.log('\nExercise 2 — Hooks');
let settings: Record<string, unknown> = {};
let settingsParse = false;
try {
  settings = JSON.parse(read('.claude/settings.json'));
  settingsParse = true;
} catch {
  settingsParse = false;
}
check('E2.1', settingsParse, '.claude/settings.json is valid JSON', 'Fix the JSON syntax.');
const hooks = (settings.hooks ?? {}) as Record<string, unknown>;
for (const event of ['PreToolUse', 'PostToolUse', 'UserPromptSubmit']) {
  const entries = hooks[event];
  check(
    'E2.2',
    Array.isArray(entries) && entries.length > 0,
    `hooks.${event} is configured`,
    `Add a ${event} hook (see ASSIGNMENT.md, Exercise 2).`
  );
}
const hookDir = join(root, '.claude/hooks');
const hookScripts = existsSync(hookDir) ? readdirSync(hookDir).filter((f) => f.endsWith('.sh')) : [];
const allExecutable =
  hookScripts.length >= 2 &&
  hookScripts.every((f) => {
    const mode = statSync(join(hookDir, f)).mode;
    return (mode & 0o111) !== 0;
  });
check(
  'E2.3',
  allExecutable,
  '.claude/hooks/ contains at least 2 executable hook scripts',
  'Hook scripts must exist and be chmod +x.'
);
check(
  'E2.4',
  existsSync(join(root, 'docs/hooks-demo.md')) && lineCount(read('docs/hooks-demo.md')) >= 10,
  'docs/hooks-demo.md shows your hooks firing (>= 10 lines)',
  'Paste a session excerpt showing the PreToolUse hook blocking an edit.'
);

// ---------------------------------------------------------------------------
console.log('\nExercise 3 — Agent Skill');
const skillsDir = join(root, '.claude/skills');
const skillDirs = existsSync(skillsDir)
  ? readdirSync(skillsDir).filter((d) => {
      try {
        return statSync(join(skillsDir, d)).isDirectory() && existsSync(join(skillsDir, d, 'SKILL.md'));
      } catch {
        return false;
      }
    })
  : [];
check(
  'E3.1',
  skillDirs.length === 1,
  'exactly one skill exists under .claude/skills/ (found ' + skillDirs.length + ')',
  'Create .claude/skills/<name>/SKILL.md (see ASSIGNMENT.md, Exercise 3).'
);
if (skillDirs.length === 1) {
  const skillPath = '.claude/skills/' + skillDirs[0] + '/SKILL.md';
  const skill = read(skillPath);
  const fmMatch = skill.match(/^---\n([\s\S]*?)\n---/);
  const frontmatter = fmMatch ? fmMatch[1] : '';
  check(
    'E3.2',
    /^name:\s*\S+/m.test(frontmatter) && /^description:\s*\S+/m.test(frontmatter),
    'SKILL.md frontmatter has name and description',
    'Add YAML frontmatter with at least name: and description:.'
  );
  check(
    'E3.3',
    /^allowed-tools:\s*\S+/m.test(frontmatter),
    'SKILL.md frontmatter restricts allowed-tools',
    'Scope the skill: allowed-tools: Read, Write, Edit, Bash(npx vitest:*), ...'
  );
  check(
    'E3.4',
    lineCount(skill) < 100,
    'SKILL.md is under 100 non-empty lines (progressive disclosure)',
    'Keep SKILL.md lean; move the full template into references/.'
  );
  const refDir = join(skillsDir, skillDirs[0], 'references');
  check(
    'E3.5',
    existsSync(refDir) && readdirSync(refDir).length > 0 && skill.includes('references/'),
    'skill uses a references/ directory and links to it from SKILL.md',
    'Add references/widget-template.md and mention it in SKILL.md.'
  );
}

// ---------------------------------------------------------------------------
console.log('\nExercise 4 — Fuel Reserves widget');
check(
  'E4.1',
  existsSync(join(root, 'public/api/fuel.json')),
  'public/api/fuel.json exists',
  'Add the fuel dataset from ASSIGNMENT.md, Exercise 4.'
);
const componentFiles = existsSync(join(root, 'src/components'))
  ? readdirSync(join(root, 'src/components'))
  : [];
check(
  'E4.2',
  componentFiles.some((f) => /fuel/i.test(f)),
  'a Fuel widget component exists in src/components/',
  'Scaffold it with YOUR skill from Exercise 3.'
);
const domainFiles = existsSync(join(root, 'src/domain')) ? readdirSync(join(root, 'src/domain')) : [];
check(
  'E4.3',
  domainFiles.some((f) => /fuel/i.test(f)),
  'fuel domain logic exists in src/domain/ (days-of-fuel-remaining)',
  'Pure function + unit test, rendered by the widget.'
);

// ---------------------------------------------------------------------------
console.log('');
if (failures > 0) {
  console.log(`${failures} check(s) failing, ${passes} passing.`);
  console.log('This is expected on the starting repo — work through ASSIGNMENT.md.\n');
  process.exit(1);
}
console.log(`All ${passes} structural checks pass. 🚀\n`);
