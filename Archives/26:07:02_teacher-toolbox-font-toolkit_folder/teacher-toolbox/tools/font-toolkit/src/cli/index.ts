#!/usr/bin/env node
/**
 * @module cli
 * @description Teacher Toolbox Font Toolkit CLI — the `tt-font` command.
 *
 * Commands:
 *   tt-font new <script-id> <display-name> [dir]
 *       Scaffold a new font project directory.
 *
 *   tt-font validate [dir]
 *       Validate a font project against TTHFS v1.0.0.
 *       Runs all R, S, and C rules and prints a detailed report.
 *       Exits 0 if loadable, 1 if hard failures, 2 if warnings only.
 *
 *   tt-font build [dir]
 *       Build and package a font project into a distributable .ttfont.json file.
 *       Runs validation as part of the build — will not package a font with hard failures.
 *
 *   tt-font info <font-file>
 *       Print the embedded validation report from a built font file.
 *       Re-runs validation and warns if the embedded report is stale.
 *
 *   tt-font check <font-file>
 *       Re-validate a built font file against the current spec.
 *       Useful for confirming a font still passes after a spec update.
 */

import { join, resolve } from 'path';
import { existsSync } from 'fs';
import { scaffoldProject, loadProject } from '../project/index.js';
import { buildFont } from '../builder/index.js';
import { writeFontFile, readFontFile } from '../io/index.js';
import { validateFont } from '../validator/index.js';
import type { FontValidationReport, ValidationFinding } from '../types/index.js';

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

const RESET  = '\x1b[0m';
const RED    = '\x1b[31m';
const YELLOW = '\x1b[33m';
const GREEN  = '\x1b[32m';
const CYAN   = '\x1b[36m';
const BOLD   = '\x1b[1m';
const DIM    = '\x1b[2m';

function red   (s: string) { return `${RED}${s}${RESET}`;    }
function yellow(s: string) { return `${YELLOW}${s}${RESET}`;  }
function green (s: string) { return `${GREEN}${s}${RESET}`;   }
function cyan  (s: string) { return `${CYAN}${s}${RESET}`;    }
function bold  (s: string) { return `${BOLD}${s}${RESET}`;    }
function dim   (s: string) { return `${DIM}${s}${RESET}`;     }

function printDivider() { console.log(dim('─'.repeat(72))); }

function printValidationReport(report: FontValidationReport, fontId: string): void {
  console.log('');
  printDivider();
  console.log(bold(`  TTHFS Validation Report — ${fontId}`));
  printDivider();

  // Status line
  const statusIcon  = report.isLoadable ? green('✅ LOADABLE') : red('❌ REJECTED');
  const scoreColor  = report.completenessScore >= 90 ? green :
                      report.completenessScore >= 60 ? yellow : red;
  console.log(`  Status:             ${statusIcon}`);
  console.log(`  Completeness Score: ${scoreColor(String(report.completenessScore) + '/100')}`);
  console.log(`  Hard Failures:      ${report.hardFailures.length > 0 ? red(String(report.hardFailures.length)) : green('0')}`);
  console.log(`  Warnings:           ${report.warnings.length > 0 ? yellow(String(report.warnings.length)) : green('0')}`);

  // Character coverage
  const { present, missing, required } = report.characterCoverage;
  const pct = Math.round(present.length / required.length * 100);
  const coverageColor = pct === 100 ? green : pct >= 80 ? yellow : red;
  console.log(`  Character Coverage: ${coverageColor(`${present.length}/${required.length} (${pct}%)`)}`);

  if (missing.length > 0 && missing.length <= 20) {
    console.log(`  Missing:            ${red(missing.map(c => `'${c}'`).join(', '))}`);
  } else if (missing.length > 20) {
    console.log(`  Missing:            ${red(`${missing.length} characters`)} — run with --verbose to list them`);
  }

  // Hard failures
  if (report.hardFailures.length > 0) {
    console.log('');
    printDivider();
    console.log(bold(red(`  Hard Failures (font will not load until resolved)`)));
    printDivider();
    printFindings(report.hardFailures);
  }

  // Warnings
  if (report.warnings.length > 0) {
    console.log('');
    printDivider();
    console.log(bold(yellow(`  Warnings (font loads but is flagged incomplete)`)));
    printDivider();
    printFindings(report.warnings);
  }

  // All clear
  if (report.hardFailures.length === 0 && report.warnings.length === 0) {
    console.log('');
    console.log(green(`  ✅  No issues found. This font is fully TTHFS-compliant.`));
  }

  printDivider();
  console.log(dim(`  Generated: ${report.generatedAt}  Spec: TTHFS v${report.specVersion}`));
  printDivider();
  console.log('');
}

function printFindings(findings: ValidationFinding[]): void {
  for (const f of findings) {
    const ruleTag   = f.severity === 'hard' ? red(`[${f.rule}]`) : yellow(`[${f.rule}]`);
    const charTag   = f.glyphCharacter === '*' ? '' : cyan(` '${f.glyphCharacter}'`);
    const codeTag   = dim(` ${f.code}`);
    console.log(`\n  ${ruleTag}${charTag}${codeTag}`);
    // Word-wrap the message at ~68 chars
    const lines = wrapText(f.message, 68);
    for (const line of lines) console.log(`    ${line}`);
    if (f.remediation) {
      console.log(`    ${dim('→')} ${dim(wrapText(f.remediation, 64).join('\n      '))}`);
    }
  }
}

function wrapText(text: string, width: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    if (current.length + word.length + 1 > width && current.length > 0) {
      lines.push(current);
      current = word;
    } else {
      current = current ? `${current} ${word}` : word;
    }
  }
  if (current) lines.push(current);
  return lines.length > 0 ? lines : [''];
}

// ---------------------------------------------------------------------------
// Command handlers
// ---------------------------------------------------------------------------

function cmdNew(args: string[]): number {
  const scriptId   = args[0];
  const displayName = args[1];
  const dir        = resolve(args[2] ?? `./${scriptId ?? 'new-font'}`);

  if (!scriptId || !displayName) {
    console.error(red('Usage: tt-font new <script-id> <display-name> [directory]'));
    console.error(red('Example: tt-font new zaner-bloser-print "Zaner-Bloser Print" ./zb-print'));
    return 1;
  }

  try {
    scaffoldProject(dir, scriptId, displayName);
    return 0;
  } catch (err) {
    console.error(red(`Error: ${err instanceof Error ? err.message : String(err)}`));
    return 1;
  }
}

function cmdValidate(args: string[]): number {
  const projectDir = resolve(args[0] ?? '.');

  try {
    console.log(dim(`Loading font project from: ${projectDir}`));
    const project = loadProject(projectDir);

    // Assemble without full build (skip embedding report — just validate)
    const { buildFont: _build } = { buildFont };
    const result = buildFont(project);

    printValidationReport(result.font.validation, result.font.id);

    if (result.font.validation.hardFailures.length > 0) return 1;
    if (result.font.validation.warnings.length > 0)     return 2;
    return 0;
  } catch (err) {
    console.error(red(`\nError: ${err instanceof Error ? err.message : String(err)}\n`));
    return 1;
  }
}

function cmdBuild(args: string[]): number {
  const projectDir = resolve(args[0] ?? '.');

  try {
    console.log(dim(`Building font from: ${projectDir}`));
    const project = loadProject(projectDir);
    const result  = buildFont(project);

    printValidationReport(result.font.validation, result.font.id);

    if (result.blocked) {
      console.error(red(`\n❌  Build blocked: ${result.font.validation.hardFailures.length} hard failure(s) must be resolved first.\n`));
      return 1;
    }

    if (!result.success) {
      console.error(red(`\n❌  Build failed.\n`));
      return 1;
    }

    const outDir  = resolve(projectDir, project.manifest.build.outDir);
    const outPath = writeFontFile(result.font, outDir);

    console.log(green(`\n✅  Font packaged successfully.`));
    console.log(`    Output:     ${outPath}`);
    console.log(`    Glyphs:     ${result.summary.glyphCount}`);
    console.log(`    Score:      ${result.summary.completenessScore}/100`);
    console.log(`    Version:    ${result.font.version}`);
    if (result.summary.warningCount > 0) {
      console.log(yellow(`    Warnings:   ${result.summary.warningCount} (see report above)`));
    }
    console.log('');
    return 0;
  } catch (err) {
    console.error(red(`\nError: ${err instanceof Error ? err.message : String(err)}\n`));
    return 1;
  }
}

function cmdInfo(args: string[]): number {
  const fontPath = args[0];
  if (!fontPath) {
    console.error(red('Usage: tt-font info <font-file.ttfont.json>'));
    return 1;
  }

  const resolved = resolve(fontPath);
  if (!existsSync(resolved)) {
    console.error(red(`File not found: ${resolved}`));
    return 1;
  }

  try {
    const font = readFontFile(resolved);
    console.log('');
    console.log(bold(`  Font: ${font.id} v${font.version}`));
    console.log(`  Script:   ${font.meta.script}`);
    console.log(`  Method:   ${font.meta.methodName}`);
    console.log(`  Grades:   ${font.meta.gradeRange[0]}–${font.meta.gradeRange[1]}`);
    console.log(`  Glyphs:   ${Object.keys(font.glyphs).length}`);
    console.log(`  License:  ${font.license.spdx}`);
    console.log(`  Spec:     TTHFS v${font.specVersion}`);
    if (font.meta.pedagogicalSource) {
      console.log(`  Source:   ${font.meta.pedagogicalSource}`);
    }

    // Re-verify the embedded report
    const fresh = validateFont(font);
    const embedded = font.validation;

    if (Math.abs(embedded.completenessScore - fresh.completenessScore) > 5) {
      console.log(yellow(`\n  ⚠  Embedded report appears stale (score: embedded=${embedded.completenessScore}, current=${fresh.completenessScore}).`));
      console.log(yellow(`     Re-run 'tt-font build' to refresh it.`));
    } else {
      printValidationReport(embedded, font.id);
    }
    return 0;
  } catch (err) {
    console.error(red(`\nError: ${err instanceof Error ? err.message : String(err)}\n`));
    return 1;
  }
}

function cmdCheck(args: string[]): number {
  const fontPath = args[0];
  if (!fontPath) {
    console.error(red('Usage: tt-font check <font-file.ttfont.json>'));
    return 1;
  }

  const resolved = resolve(fontPath);
  if (!existsSync(resolved)) {
    console.error(red(`File not found: ${resolved}`));
    return 1;
  }

  try {
    const font   = readFontFile(resolved);
    const report = validateFont(font);

    printValidationReport(report, font.id);

    if (report.hardFailures.length > 0) return 1;
    if (report.warnings.length > 0)     return 2;
    return 0;
  } catch (err) {
    console.error(red(`\nError: ${err instanceof Error ? err.message : String(err)}\n`));
    return 1;
  }
}

function printHelp(): void {
  console.log(`
${bold('Teacher Toolbox Font Toolkit')} — ${dim('TTHFS v1.0.0')}

${bold('Usage:')}
  tt-font ${cyan('new')} <script-id> <display-name> [directory]
      Scaffold a new font project.

  tt-font ${cyan('validate')} [directory]
      Validate a project against all TTHFS rules.
      Exit code: 0 = all clear, 1 = hard failures, 2 = warnings only.

  tt-font ${cyan('build')} [directory]
      Build and package a font project into a distributable .ttfont.json.
      Validation runs as part of the build. Will not package a rejected font.

  tt-font ${cyan('info')} <font-file.ttfont.json>
      Show metadata and embedded validation report for a built font.

  tt-font ${cyan('check')} <font-file.ttfont.json>
      Re-validate a built font against the current spec.

${bold('Examples:')}
  tt-font new zaner-bloser-print "Zaner-Bloser Print" ./my-font
  tt-font validate ./my-font
  tt-font build ./my-font
  tt-font info ./my-font/dist/zaner-bloser-print.ttfont.json
`);
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

const [,, command, ...rest] = process.argv;

let exitCode = 0;
switch (command) {
  case 'new':      exitCode = cmdNew(rest);      break;
  case 'validate': exitCode = cmdValidate(rest); break;
  case 'build':    exitCode = cmdBuild(rest);    break;
  case 'info':     exitCode = cmdInfo(rest);     break;
  case 'check':    exitCode = cmdCheck(rest);    break;
  case '--help':
  case '-h':
  case 'help':
  default:
    printHelp();
    exitCode = command && !['--help', '-h', 'help'].includes(command) ? 1 : 0;
}

process.exit(exitCode);
