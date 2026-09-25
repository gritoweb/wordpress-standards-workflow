// Kit-only: runs the kit's block conformance checks over a finished theme and
// prints the result as Markdown for a harvest proposal. It changes nothing in
// the theme.
//
//   node skills/kit-harvest/conformance-report.mjs <theme path> [--full]
//
// The default output groups failures by rule. --full lists every failure
// message under its block.
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { checkBlock, checkProject, formatFailure, listBlocks } from '../../theme/scripts/conformance.mjs';

const list = (items) => items.join(', ');
const cell = (text) => String(text).replace(/\|/g, '\\|').replace(/\n/g, ' ');

function byRule(results) {
  const rules = new Map();
  for (const { slug, failures } of results) {
    for (const failure of failures) {
      const entry = rules.get(failure.rule) ?? { title: failure.title, n: failure.n, blocks: [], example: failure.message, count: 0 };
      if (!entry.blocks.includes(slug)) entry.blocks.push(slug);
      entry.count += 1;
      rules.set(failure.rule, entry);
    }
  }

  return [...rules.entries()].sort(([, a], [, b]) => b.blocks.length - a.blocks.length || String(a.n).localeCompare(String(b.n), 'en', { numeric: true }));
}

// A theme that project-init never installed has no kit.config.json, so the
// checks would expect the kit's placeholders in every block.json. This links
// the theme's files into a temporary folder and adds a kit.config.json read
// from its first block, so the theme's own namespace, category, and text
// domain count as correct. The theme itself is never written to.
function withInferredConfig(themeRoot, slugs) {
  const first = JSON.parse(readFileSync(join(themeRoot, 'resources', 'blocks', slugs[0], 'block.json'), 'utf8'));
  const mirror = mkdtempSync(join(tmpdir(), 'kit-harvest-'));
  for (const entry of readdirSync(themeRoot)) symlinkSync(join(themeRoot, entry), join(mirror, entry));
  const config = { blockNamespace: String(first.name ?? '').split('/')[0], blockCategory: { slug: first.category }, textDomain: first.textdomain };
  writeFileSync(join(mirror, 'kit.config.json'), JSON.stringify(config));

  return { mirror, config };
}

export async function conformanceReport(themePath, { full = false } = {}) {
  const themeRoot = resolve(themePath);
  const blocksDir = join(themeRoot, 'resources', 'blocks');
  const slugs = listBlocks(blocksDir);

  if (slugs.length === 0) return `No blocks found under \`${blocksDir}\`.\n`;

  const inferred = existsSync(join(themeRoot, 'kit.config.json')) ? null : withInferredConfig(themeRoot, slugs);
  const checkRoot = inferred?.mirror ?? themeRoot;

  try {
    return await report({ themeRoot, checkRoot, blocksDir, slugs, inferred, full });
  } finally {
    if (inferred) rmSync(inferred.mirror, { recursive: true, force: true });
  }
}

async function report({ checkRoot, blocksDir, slugs, inferred, full }) {
  const lines = [];
  const results = [];
  for (const slug of slugs) results.push(await checkBlock({ themeRoot: checkRoot, blockDir: join(blocksDir, slug) }));

  let projectFailures;
  try {
    projectFailures = await checkProject({ themeRoot: checkRoot });
  } catch (error) {
    projectFailures = [{ n: 'CRASH', rule: 'PROJECT', title: 'Theme-wide checks', message: `the checks crashed: ${error.message}` }];
  }

  const failing = results.filter((result) => result.failures.length > 0);
  lines.push(`Checked ${slugs.length} blocks: ${slugs.length - failing.length} pass, ${failing.length} fail. Theme-wide failures: ${projectFailures.length}.`, '');

  if (inferred) {
    lines.push(
      '> This theme has no `kit.config.json`, so `project-init` did not install it. The checks used the',
      `> namespace \`${inferred.config.blockNamespace}\`, category \`${inferred.config.blockCategory.slug}\`, and text domain \`${inferred.config.textDomain}\``,
      "> from its first block, and the kit's default grounds.",
      '',
    );
  }

  lines.push(
    "> The checks that render `block.php` use the kit's `app/` classes, not the theme's. A block that needs a",
    "> class only the theme has fails to render (`Class \"App\\...\" not found`). That failure is the harness, not the block.",
    '',
  );

  lines.push('### Failures by rule', '', '| Rule | Check | Blocks failing | Example |', '| --- | --- | --- | --- |');
  for (const [rule, entry] of byRule(results)) {
    lines.push(`| \`${rule}\` | ${cell(entry.title)} | ${entry.blocks.length} of ${slugs.length}: ${list(entry.blocks)} | ${cell(entry.example)} |`);
  }
  if (failing.length === 0) lines.push('| none | | | |');
  lines.push('');

  lines.push('### Theme-wide failures', '');
  if (projectFailures.length === 0) lines.push('None.');
  for (const failure of projectFailures) lines.push(`- ${formatFailure(failure)}`);
  lines.push('');

  lines.push('### Opt-outs', '');
  const skipped = results.flatMap(({ slug, skipped: skips }) => skips.map((skip) => ({ slug, ...skip })));
  if (skipped.length === 0) lines.push('No block opts out of a rule.');
  for (const { slug, rule, reason } of skipped) lines.push(`- \`${slug}\` skips \`${rule}\`: ${reason}`);
  lines.push('');

  if (full) {
    lines.push('### Every failure, by block', '');
    for (const { slug, failures } of failing) {
      lines.push(`#### ${slug}`, '');
      for (const failure of failures) lines.push(`- ${formatFailure(failure)}`);
      lines.push('');
    }
  }

  return `${lines.join('\n')}\n`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [themePath, ...flags] = process.argv.slice(2);
  if (!themePath) {
    console.error('Usage: node skills/kit-harvest/conformance-report.mjs <theme path> [--full]');
    process.exit(1);
  }
  process.stdout.write(await conformanceReport(themePath, { full: flags.includes('--full') }));
}
