/**
 * @module svgPathValidator
 * @description Lightweight SVG path data validator for the font toolkit.
 *
 * The toolkit runs in Node.js (no browser DOM), so we cannot use
 * DOMParser or SVGElement to validate path data. This module implements
 * a structural check sufficient to catch the common authoring errors
 * (invalid command letters, missing coordinates, non-numeric values)
 * without implementing a full SVG path renderer.
 *
 * This intentionally does NOT evaluate whether the path makes visual
 * sense — only whether it is structurally valid SVG path data. Visual
 * correctness is a human authoring responsibility, not a validator one.
 */

/** SVG path command letters and their required coordinate counts */
const COMMAND_ARITIES: Record<string, number> = {
  M: 2, m: 2,  // moveto
  L: 2, l: 2,  // lineto
  H: 1, h: 1,  // horizontal lineto
  V: 1, v: 1,  // vertical lineto
  C: 6, c: 6,  // cubic bezier
  S: 4, s: 4,  // smooth cubic bezier
  Q: 4, q: 4,  // quadratic bezier
  T: 2, t: 2,  // smooth quadratic bezier
  A: 7, a: 7,  // arc
  Z: 0, z: 0,  // closepath
};

export interface PathValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Check whether a string is structurally valid SVG path data.
 * Returns { valid: true } on success or { valid: false, error: '...' } on failure.
 */
export function validateSvgPath(path: string): PathValidationResult {
  if (typeof path !== 'string') {
    return { valid: false, error: 'Path is not a string.' };
  }

  const trimmed = path.trim();
  if (trimmed === '') {
    return { valid: false, error: 'Path is an empty string.' };
  }

  // Tokenise: split on command letters, keeping the command letter
  const tokenPattern = /([MmLlHhVvCcSsQqTtAaZz])|([+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)/g;
  const tokens: string[] = [];
  let match: RegExpExecArray | null;
  let lastIndex = 0;

  while ((match = tokenPattern.exec(trimmed)) !== null) {
    tokens.push(match[0]);
    lastIndex = tokenPattern.lastIndex;
  }

  // Check for characters that couldn't be tokenised (invalid content)
  const reconstructed = tokens.join('').replace(/\s/g, '');
  const original = trimmed.replace(/[\s,]/g, '');
  if (reconstructed !== original) {
    return { valid: false, error: `Path contains invalid characters. Could not parse the full path string.` };
  }

  // Walk the token stream and validate command/argument structure
  let i = 0;
  let hasM = false;

  while (i < tokens.length) {
    const token = tokens[i];
    if (token === undefined) break;

    if (!(token in COMMAND_ARITIES)) {
      // It's a number where a command was expected
      return { valid: false, error: `Expected a path command letter at token position ${i}, found '${token}'.` };
    }

    const command = token;
    const arity = COMMAND_ARITIES[command] ?? 0;

    if ((command === 'M' || command === 'm') && i === 0) hasM = true;

    i++;

    // Consume the required number of numeric arguments
    for (let arg = 0; arg < arity; arg++) {
      const val = tokens[i];
      if (val === undefined || val in COMMAND_ARITIES) {
        return {
          valid: false,
          error: `Command '${command}' requires ${arity} argument${arity === 1 ? '' : 's'} but only ${arg} found.`,
        };
      }
      if (isNaN(Number(val))) {
        return { valid: false, error: `Command '${command}' argument ${arg + 1} is not a number: '${val}'.` };
      }
      i++;
    }
  }

  if (!hasM) {
    return { valid: false, error: `Path does not begin with a moveto (M or m) command.` };
  }

  return { valid: true };
}
