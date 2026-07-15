/**
 * @module handwritingLineRenderer
 * @description Renders the ruled guide lines (baseline, midline, topline,
 * descender as applicable) for one row of handwriting practice.
 *
 * EDUCATIONAL DESIGN NOTES — read before changing any default in this file:
 *
 * 1. Line proportions are NEVER hardcoded here. They come from
 *    GuidelineSpec.lineRatios on the active handwriting font's metadata.
 *    Zaner-Bloser, D'Nealian, and HWT all have different correct proportions;
 *    this renderer is a generic interpreter of whichever ratios it is given,
 *    not an opinion about what "looks like" a ruled line. Grade-level size
 *    differences are handled the same way: via `component.data.sizeScale`
 *    (a multiplier applied uniformly to the whole row height), never via a
 *    grade-specific branch in this file. Uniform scaling is the
 *    educationally correct choice here — it preserves the ratio between
 *    baseline/midline/topline exactly, which is what a child is meant to
 *    internalize, regardless of the absolute size on the page.
 *
 * 2. This component assumes meta.protectedDimensions = true is set at the
 *    data-authoring layer (the iCanSpell worksheet builder, not here). If
 *    the Layout Engine is doing its job, this component's rect height
 *    always equals exactly what was requested — this renderer does not try
 *    to gracefully handle a squashed layoutRect.
 *
 * 3. Line colour and weight come from the theme, but stroke width has a
 *    pedagogical floor: the baseline must always be visually dominant
 *    (heavier stroke) relative to midline/topline guide lines, because in
 *    classroom handwriting instruction the baseline is the one line a child
 *    must never lose track of. This is enforced below, not left to theme
 *    authors to accidentally invert.
 */

import type { WorksheetComponent, GuidelineSpec } from '@teacher-toolbox/types';
import type { ComponentRenderer, RenderContext } from '../types.js';
import { createElement, createGroup, setAttributes } from '../svgHelpers.js';
import { mmToUnits } from '../units.js';

export interface HandwritingLineData {
  /**
   * Which guideline system to draw. If omitted, the renderer uses a
   * standard fallback — apps should always pass explicit guidelines once a
   * real handwriting font is selected (see getDefaultGuidelines below).
   */
  guidelines?: GuidelineSpec;
  /**
   * Uniform multiplier applied to row height for grade-appropriate sizing
   * (e.g. larger rows for Kindergarten, smaller for Grade 3). This is the
   * ONLY sanctioned mechanism for grade-level size variation — see module
   * docstring point 1. Default 1.0.
   */
  sizeScale?: number;
  /** Override the margin line colour for this specific row (rare; theme default is the normal path) */
  marginLineColor?: string;
}

const MIN_BASELINE_STROKE_WIDTH = 1.4;
const GUIDE_LINE_STROKE_WIDTH = 0.75;
const MARGIN_LINE_STROKE_WIDTH = 1.0;

export const renderHandwritingLine: ComponentRenderer = (
  component: WorksheetComponent,
  context: RenderContext,
): SVGGElement => {
  const data = component.data as unknown as HandwritingLineData;
  const guidelines = data.guidelines ?? getDefaultGuidelines();
  const rowHeight = context.layoutRect.height;

  const group = createGroup(`component-${component.id}`);

  if (guidelines.lineRatios.length !== guidelines.lineLabels.length) {
    // Pedagogical data integrity check: a mismatched ratio/label array means
    // we cannot trust the proportions at all. Render a visible warning
    // rather than a guess — a blank-but-flagged line is safer for a teacher
    // to notice than a subtly wrong ruling that gets printed for 25 students.
    renderIntegrityWarning(group, component.id, rowHeight);
    return group;
  }

  // Lines are measured from the BOTTOM of the row upward, matching
  // lineRatios' documented convention (0 = bottom of row). This is the
  // inverse of SVG's y-down convention and must be applied consistently.
  guidelines.lineLabels.forEach((label, i) => {
    const ratio = guidelines.lineRatios[i] ?? 0;
    const y = rowHeight - ratio * rowHeight;
    const isBaseline = label.toLowerCase() === 'baseline';

    const line = createElement('line');
    setAttributes(line, {
      x1: guidelines.showMargin ? mmToUnits(6) : 0,
      y1: y,
      x2: context.layoutRect.width,
      y2: y,
      stroke: resolveLineColor(label, context),
      'stroke-width': isBaseline
        ? Math.max(MIN_BASELINE_STROKE_WIDTH, GUIDE_LINE_STROKE_WIDTH)
        : GUIDE_LINE_STROKE_WIDTH,
    });
    group.appendChild(line);
  });

  if (guidelines.showMargin) {
    const marginLine = createElement('line');
    setAttributes(marginLine, {
      x1: mmToUnits(6),
      y1: 0,
      x2: mmToUnits(6),
      y2: rowHeight,
      stroke: data.marginLineColor ?? context.theme.colors.marginLineColor,
      'stroke-width': MARGIN_LINE_STROKE_WIDTH,
    });
    group.appendChild(marginLine);
  }

  return group;
};

/**
 * Default height when component.size.height is 0. Derived from a
 * grade-band base (see lineSpacingToMm) then scaled uniformly by sizeScale —
 * never a single hardcoded constant, and never a per-grade branch beyond the
 * three coarse bands documented below.
 */
export function handwritingLineDefaultHeight(
  component: WorksheetComponent,
  _context: RenderContext,
): number {
  const data = component.data as unknown as HandwritingLineData;
  const sizeScale = data.sizeScale ?? 1.0;
  const base = lineSpacingToMm('primary');
  return mmToUnits(base) * sizeScale;
}

function lineSpacingToMm(spacing: 'primary' | 'intermediate' | 'college'): number {
  // These three values are the only place row-height-by-grade-band lives,
  // and they are explicitly NOT per-grade — 'primary' covers K-2,
  // 'intermediate' covers 3-5, 'college' is unruled/adult-width. Finer
  // grade granularity is handled exclusively via sizeScale (see module docstring).
  switch (spacing) {
    case 'primary':      return 12; // mm — generous row height for early writers
    case 'intermediate': return 8;
    case 'college':      return 6;
  }
}

function resolveLineColor(label: string, context: RenderContext): string {
  const l = label.toLowerCase();
  if (l === 'baseline') return context.theme.colors.baselineColor;
  if (l === 'midline')  return context.theme.colors.midlineColor;
  if (l === 'topline')  return context.theme.colors.toplineColor;
  return context.theme.colors.midlineColor; // descender or any other labeled guide
}

function getDefaultGuidelines(): GuidelineSpec {
  // v0.2 fallback when no font-specific guidelines have been supplied yet
  // (full font-metadata wiring lands with the first bundled SVG path font
  // in v0.3). This fallback is a standard 3-line primary system and is
  // documented here as a placeholder — it is not presented as a specific
  // named handwriting method (Zaner-Bloser, D'Nealian, HWT), since claiming
  // that without real font data would be educationally misleading.
  return {
    lineCount: 3,
    lineLabels: ['baseline', 'midline', 'topline'],
    lineRatios: [0, 0.55, 1.0],
    showMargin: true,
    showDescender: false,
  };
}

function renderIntegrityWarning(group: SVGGElement, componentId: string, rowHeight: number): void {
  const text = createElement('text');
  setAttributes(text, {
    x: 0,
    y: rowHeight / 2,
    'font-size': 9,
    fill: '#c0392b',
  });
  text.textContent = `[handwriting-line: invalid guideline data for ${componentId}]`;
  group.appendChild(text);
}
