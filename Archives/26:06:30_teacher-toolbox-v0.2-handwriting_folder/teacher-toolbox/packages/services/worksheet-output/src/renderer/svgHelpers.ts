/**
 * @module svgHelpers
 * @description Shared SVG element creation utilities.
 *
 * Every component renderer needs to create SVG elements. If each renderer
 * re-implements `document.createElementNS(...)`, a typo in the namespace
 * string becomes a multi-file fix instead of a one-file fix. This module is
 * the single place that constant lives.
 */

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Create an SVG element of the given tag name in the correct namespace. */
export function createElement(tag: string): SVGElement {
  return document.createElementNS(SVG_NS, tag) as SVGElement;
}

/** Create an SVG <g> group, optionally with an id attribute. */
export function createGroup(id?: string): SVGGElement {
  const g = document.createElementNS(SVG_NS, 'g') as SVGGElement;
  if (id) g.setAttribute('id', id);
  return g;
}

/** Apply a map of attributes to an SVG element. Numbers are stringified automatically. */
export function setAttributes(el: SVGElement, attrs: Record<string, string | number>): void {
  for (const [key, value] of Object.entries(attrs)) {
    el.setAttribute(key, String(value));
  }
}

/** Convenience: create an element and set its attributes in one call. */
export function createElementWithAttrs(
  tag: string,
  attrs: Record<string, string | number>,
): SVGElement {
  const el = createElement(tag);
  setAttributes(el, attrs);
  return el;
}

/**
 * Namespace every id="" and href/xlink:href reference inside a fragment of
 * inline SVG markup by prefixing them with the given prefix. Required before
 * embedding teacher- or library-sourced SVG artwork into a worksheet page,
 * to prevent id collisions when the same artwork appears twice, or when an
 * artwork's internal ids happen to collide with renderer-generated ids
 * (gradients, clip paths, <use> targets, etc.).
 *
 * This is a string-level operation deliberately kept simple (regex-based)
 * rather than a full SVG DOM parse — it covers the common cases (id, href,
 * xlink:href, url(#...) references) without the overhead of building a
 * second SVG parser. Revisit with a proper parser if a future artwork pack
 * contains constructs this misses (e.g. ids referenced from <style> blocks).
 */
export function namespaceSvgIds(svgMarkup: string, prefix: string): string {
  const idMap = new Map<string, string>();

  // First pass: collect all id="..." values and build the rename map
  const idPattern = /\bid="([^"]+)"/g;
  let match: RegExpExecArray | null;
  while ((match = idPattern.exec(svgMarkup)) !== null) {
    const original = match[1];
    if (original && !idMap.has(original)) {
      idMap.set(original, `${prefix}-${original}`);
    }
  }

  if (idMap.size === 0) return svgMarkup;

  let result = svgMarkup;
  for (const [original, renamed] of idMap) {
    // id="original"
    result = result.replace(new RegExp(`\\bid="${escapeRegExp(original)}"`, 'g'), `id="${renamed}"`);
    // href="#original" and xlink:href="#original"
    result = result.replace(
      new RegExp(`((?:xlink:)?href="#)${escapeRegExp(original)}(")`, 'g'),
      `$1${renamed}$2`,
    );
    // url(#original) inside fill, stroke, clip-path, mask, filter attributes
    result = result.replace(
      new RegExp(`url\\(#${escapeRegExp(original)}\\)`, 'g'),
      `url(#${renamed})`,
    );
  }

  return result;
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
