import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildArtifacts, loadFixtures, writeArtifacts } from './lib/example-system.mjs';
import { loadApiRegistry } from './lib/reference-parser.mjs';

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function parseArgs(argv) {
  const args = {
    all: false,
    missingOnly: false,
    className: null,
    methodSlug: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === '--all') {
      args.all = true;
    } else if (value === '--missing-only') {
      args.missingOnly = true;
    } else if (value === '--class') {
      args.className = argv[index + 1] || null;
      index += 1;
    } else if (value === '--method') {
      args.methodSlug = argv[index + 1] || null;
      index += 1;
    } else if (value === '--help' || value === '-h') {
      args.help = true;
    }
  }

  return args;
}

function printHelp() {
  console.log(`Usage:
  node scripts/generate-examples.mjs --all
  node scripts/generate-examples.mjs --class DMT_Project
  node scripts/generate-examples.mjs --method PCB_PrimitiveLine.create
  node scripts/generate-examples.mjs --missing-only
`);
}

async function syncSkillExamplesSection(rootDir, catalogCount) {
  const skillPath = path.join(rootDir, 'SKILL.md');
  const skillText = await readFile(skillPath, 'utf8');
  const startMarker = '<!-- EXAMPLES:START -->';
  const endMarker = '<!-- EXAMPLES:END -->';

  const generatedSection = [
    startMarker,
    '## Example System',
    '',
    'Use the generated example catalog before writing custom snippets from scratch.',
    '',
    '1. Open `examples/catalog.json` and locate the target method by `className` + `methodName`.',
    '2. Read the matching file under `examples/methods/<ClassName>/<method>.md` for the full runnable example.',
    '3. If you update `references/`, regenerate the examples with `npm run generate-examples -- --missing-only` or `npm run generate-examples -- --all`.',
    '4. Verify examples through the bridge with `npm run verify-examples -- --mode safe`, `--class <ClassName>`, or `--method <ClassName.methodName>`.',
    '',
    '### Example Quality Rules',
    '',
    '- Generated examples are expected to be runnable bridge payloads that explicitly `return` results.',
    '- Prefer generated examples over improvising short snippets when a method already has an example file.',
    '- Examples should keep the required context checks (project, document type, selection state) instead of omitting them for brevity.',
    '- Mutating examples must describe or encode cleanup expectations; high-risk examples stay marked as `needs-review` in the catalog.',
    '',
    `Current catalog size: **${catalogCount}** method examples.`,
    endMarker,
  ].join('\n');

  let nextText = skillText;
  const blockPattern = new RegExp(`${startMarker}[\\s\\S]*?${endMarker}`);
  if (blockPattern.test(skillText)) {
    nextText = skillText.replace(blockPattern, generatedSection);
  } else {
    nextText = `${skillText.trim()}\n\n${generatedSection}\n`;
  }

  if (nextText !== skillText) {
    await writeFile(skillPath, nextText);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  if (!args.all && !args.className && !args.methodSlug) {
    args.all = true;
  }

  const registry = await loadApiRegistry(ROOT_DIR);
  const fixtures = await loadFixtures(ROOT_DIR);
  const artifacts = buildArtifacts(registry, fixtures, {
    className: args.className,
    methodSlug: args.methodSlug,
  });

  const result = await writeArtifacts(ROOT_DIR, artifacts, {
    missingOnly: args.missingOnly,
  });
  await syncSkillExamplesSection(ROOT_DIR, result.catalogCount);

  console.log(JSON.stringify({
    selectedArtifacts: artifacts.length,
    writtenCount: result.writtenCount,
    catalogCount: result.catalogCount,
    missingOnly: args.missingOnly,
    className: args.className,
    methodSlug: args.methodSlug,
  }, null, 2));
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
