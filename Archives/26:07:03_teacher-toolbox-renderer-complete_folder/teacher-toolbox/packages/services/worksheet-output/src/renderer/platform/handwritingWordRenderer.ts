/**
 * @module handwritingWordRenderer
 * @description Renders a ruled line PLUS a trace/model word on it.
 *
 * EDUCATIONAL DESIGN NOTES:
 *
 * 1. This renderer uses placeWordStrokes() from glyphPositioner.ts, NOT
 *    placeWord(). The whole-glyph path placement (placeWord) is correct for
 *    a static model word a student copies by eye, but a "trace" word in
 *    handwriting instruction specifically means: follow this exact stroke
 *    sequence with your pencil. Collapsing that to one combined <path> per
 *    letter would visually resemble a trace word while teaching nothing
 *    about stroke order — exactly the "looks right, teaches nothing" trap
 *    this implementation is required to avoid.
 *
 * 2. Trace dash/dot spacing has a pedagogical floor, not a typographic
 *    default. A faint, finely-dashed line is elegant on screen and useless
 *    to a 6-year-old's pencil. MIN_TRACE_OPACITY and TRACE_DASH_PATTERN
 *    below encode a floor a teacher's traceOpacity setting cannot go below
 *    when traceOpacity > 0 (a teacher CAN still choose traceOpacity = 0 for
 *    a blank practice line — that's a valid pedagogical choice, not a
 *    degraded trace).
 *
 * 3. Start-point markers are rendered by default whenever strokes are
 *    available, because a start-point dot is one of the most effective,
 *    well-evidenced visual aids for correct stroke initiation in early
 *    handwriting instruction. This can be turned off by the teacher
 *    (showStartPoints: false) but defaults ON — the typographic instinct
 *    would be to default it off for a "cleaner" line.
 *
 * 4. If a glyph in the word has no stroke data, that character is omitted
 *    from the rendered trace strokes (never approximated) and the component
 *    surfaces this visibly so incomplete font data is never silently
 *    presented as if it were complete.
 */

import type { WorksheetComponent, SVGGlyph } from '@teacher-toolbox/types';
import type { ComponentRenderer, RenderContext } from '../types.js';
import { createElement, createGroup, setAttributes } from '../svgHelpers.js';
import { mmToUnits, ptToUnits } from '../units.js';
import { placeWordStrokes } from '../glyphPositioner.js';
import { renderHandwritingLine } from './handwritingLineRenderer.js';
import type { HandwritingLineData } from './handwritingLineRenderer.js';

export interface HandwritingWordData extends HandwritingLineData {
  word: string;
  /**
   * Which handwriting font (FontId) to trace the word in. Required — there
   * is no "default handwriting font" fallback, since rendering a trace word
   * in the wrong script teaches the wrong letterforms.
   */
  fontId: string;
  /**
   * 0 = blank practice line (no trace shown at all — a valid, common
   * pedagogical choice for later practice repetitions).
   * Any value > 0 is clamped to [MIN_TRACE_OPACITY, 1.0] — see module docstring point 2.
   */
  traceOpacity?: number;
  /** Defaults to true — see module docstring point 3. */
  showStartPoints?: boolean;
  /** Defaults to true when stroke data is available — shows a small numeral at each stroke's start point. */
  showStrokeNumbers?: boolean;
  /**
   * Defaults to false — directional arrowheads add visual noise for
   * repeated practice rows; most useful on the FIRST occurrence of a word,
   * which the worksheet builder controls explicitly.
   */
  showDirectionArrows?: boolean;
}

/** A trace line must never be so faint a child's pencil loses the path. */
const MIN_TRACE_OPACITY = 0.35;
/** Tight dash spacing — easy for a young hand to follow without large gaps to "jump". */
const TRACE_DASH_PATTERN = '3,2.5';
const START_POINT_RADIUS = 1.6; // SVG units
const STROKE_NUMBER_FONT_SIZE = 5.5; // pt — small but legible at print resolution

export const renderHandwritingWord: ComponentRenderer = (
  component: WorksheetComponent,
  context: RenderContext,
): SVGGElement => {
  const data = component.data as unknown as HandwritingWordData;
  const group = createGroup(`component-${component.id}`);

  // 1. Ruled line underneath — reuse the line renderer directly so the two
  //    renderers can never drift apart on what "the baseline" means.
  const lineComponent: WorksheetComponent = {
    ...component,
    type: 'platform.handwriting-line',
    data: data as unknown as Record<string, unknown>,
  };
  group.appendChild(renderHandwritingLine(lineComponent, context));

  const traceOpacity = clampTraceOpacity(data.traceOpacity);
  if (traceOpacity === 0) {
    return group; // blank practice line — correct, intentional, nothing more to draw
  }

  const guidelines = data.guidelines ?? {
    lineRatios: [0, 0.55, 1.0],
    lineLabels: ['baseline', 'midline', 'topline'],
    lineCount: 3 as const,
    showMargin: true,
    showDescender: false,
  };
  const rowHeight = context.layoutRect.height;
  const baselineIndex = guidelines.lineLabels.findIndex((l) => l.toLowerCase() === 'baseline');
  const baselineRatio = guidelines.lineRatios[baselineIndex] ?? 0;
  const baselineY = rowHeight - baselineRatio * rowHeight;

  const sizePt = estimateGlyphSizePt(rowHeight);
  const startX = guidelines.showMargin ? mmToUnits(8) : mmToUnits(2);
  const unitsPerEm = getUnitsPerEm(context, data.fontId);

  const glyphMap = getGlyphMap(context, data.fontId);
  const fallbackGlyph = getFallbackGlyph(context, data.fontId);

  const { strokes, missingStrokeData } = placeWordStrokes(
    data.word,
    glyphMap,
    fallbackGlyph,
    startX,
    baselineY,
    sizePt,
    unitsPerEm,
  );

  const traceGroup = createGroup('trace-strokes');
  setAttributes(traceGroup, { opacity: traceOpacity });

  const showStartPoints = data.showStartPoints ?? true;
  const showStrokeNumbers = (data.showStrokeNumbers ?? true) && strokes.length > 0;
  const showDirectionArrows = data.showDirectionArrows ?? false;

  for (const positioned of strokes) {
    const pathEl = createElement('path');
    setAttributes(pathEl, {
      d: positioned.stroke.path,
      transform: positioned.transform,
      fill: 'none',
      stroke: context.theme.colors.textAccent,
      'stroke-width': 1.6,
      'stroke-dasharray': TRACE_DASH_PATTERN,
      'stroke-linecap': 'round',
    });
    traceGroup.appendChild(pathEl);

    if (showStartPoints && positioned.stroke.order === 1) {
      // Only the FIRST stroke of each letter gets a start-point dot by
      // default — marking every stroke's start on a multi-stroke letter
      // adds visual clutter without proportional teaching value for most
      // grade levels; showStrokeNumbers covers full per-stroke detail when needed.
      const dot = createElement('circle');
      setAttributes(dot, {
        cx: positioned.startPointAbsolute.x,
        cy: positioned.startPointAbsolute.y,
        r: START_POINT_RADIUS,
        // Consistent "go" green across the whole platform — never
        // theme-overridden, so the start-point cue stays recognisable
        // worksheet to worksheet, app to app.
        fill: '#2e7d32',
      });
      traceGroup.appendChild(dot);
    }

    if (showStrokeNumbers) {
      const num = createElement('text');
      setAttributes(num, {
        x: positioned.startPointAbsolute.x + START_POINT_RADIUS * 1.8,
        y: positioned.startPointAbsolute.y - START_POINT_RADIUS,
        'font-size': ptToUnits(STROKE_NUMBER_FONT_SIZE),
        fill: context.theme.colors.textSecondary,
        'font-family': context.theme.typography.bodyFont.fallbackFamily,
      });
      num.textContent = String(positioned.stroke.order);
      traceGroup.appendChild(num);
    }

    if (showDirectionArrows) {
      traceGroup.appendChild(renderDirectionArrow(positioned, context));
    }
  }

  group.appendChild(traceGroup);

  if (missingStrokeData.length > 0) {
    group.appendChild(renderMissingStrokeDataNotice(missingStrokeData, rowHeight, context));
  }

  return group;
};

export function handwritingWordDefaultHeight(
  component: WorksheetComponent,
  _context: RenderContext,
): number {
  // Identical sizing rule to the plain ruled line — a trace word must sit on
  // a row exactly the same height as a blank practice row directly below or
  // above it in the same worksheet, or the ruling system stops looking like
  // one consistent system to the student.
  const data = component.data as unknown as HandwritingWordData;
  const sizeScale = data.sizeScale ?? 1.0;
  return mmToUnits(12) * sizeScale; // 12mm primary-band default, matching handwritingLineDefaultHeight's 'primary' band
}

// ---------------------------------------------------------------------------
// Internal
// ---------------------------------------------------------------------------

function clampTraceOpacity(requested: number | undefined): number {
  if (requested === undefined) return 1.0; // default: full visibility model word — the safest default for a setting a teacher hasn't configured
  if (requested <= 0) return 0; // explicit blank line — always honored exactly
  return Math.min(1.0, Math.max(MIN_TRACE_OPACITY, requested));
}

function estimateGlyphSizePt(rowHeightUnits: number): number {
  // Glyph point size is derived from row height so the trace word always
  // fills its ruled row correctly regardless of grade-band sizeScale — never
  // an independent font-size setting that could drift out of proportion
  // with the ruling underneath it.
  const rowHeightPt = rowHeightUnits / (96 / 72);
  return rowHeightPt * 0.62; // leaves headroom below topline and above baseline for ascenders/descenders
}

function getGlyphMap(context: RenderContext, fontId: string): Record<string, SVGGlyph> {
  // Build a map for the characters in the word by calling context.fonts.getGlyph()
  // per character. FontManager.getGlyphMap() exposes the full map; we access it
  // through the FontRenderContext interface which is the correct abstraction boundary.
  // Since FontRenderContext exposes getGlyph per-character (not the full map), we
  // return a Proxy-like Record that delegates to context.fonts.getGlyph at lookup
  // time. This keeps the interface clean without needing a separate "bulk" method
  // on FontRenderContext, and is efficient since we only resolve the characters
  // actually present in the word being rendered.
  return new Proxy({} as Record<string, SVGGlyph>, {
    get(_target, prop: string) {
      return context.fonts.getGlyph(fontId as import('@teacher-toolbox/types').FontId, prop) ?? undefined;
    },
    has(_target, prop: string) {
      return context.fonts.getGlyph(fontId as import('@teacher-toolbox/types').FontId, prop) !== null;
    },
  });
}

function getFallbackGlyph(context: RenderContext, fontId: string): SVGGlyph | undefined {
  return context.fonts.getFallbackGlyph(fontId as import('@teacher-toolbox/types').FontId) ?? undefined;
}

function getUnitsPerEm(context: RenderContext, fontId: string): number {
  // Fall back to 1000 (PostScript convention) only if the font is not yet
  // loaded — this produces a warning-level mismatch via C1 validation
  // rather than a silent scaling error, which is the correct failure mode.
  return context.fonts.getUnitsPerEm(fontId as import('@teacher-toolbox/types').FontId) ?? 1000;
}

function renderDirectionArrow(
  positioned: ReturnType<typeof placeWordStrokes>['strokes'][number],
  context: RenderContext,
): SVGGElement {
  const g = createGroup();
  const marker = createElement('text');
  setAttributes(marker, {
    x: positioned.startPointAbsolute.x,
    y: positioned.startPointAbsolute.y + 6,
    'font-size': 6,
    fill: context.theme.colors.textSecondary,
  });
  marker.textContent = directionGlyph(positioned.stroke.direction);
  g.appendChild(marker);
  return g;
}

function directionGlyph(direction: string): string {
  switch (direction) {
    case 'down':                   return '↓';
    case 'up':                     return '↑';
    case 'left':                   return '←';
    case 'right':                  return '→';
    case 'down-right':             return '↘';
    case 'down-left':              return '↙';
    case 'curve-clockwise':        return '↻';
    case 'curve-counterclockwise': return '↺';
    default:                       return '';
  }
}

function renderMissingStrokeDataNotice(
  missingChars: string[],
  rowHeight: number,
  context: RenderContext,
): SVGGElement {
  const g = createGroup('missing-stroke-data-notice');
  const text = createElement('text');
  setAttributes(text, {
    x: context.layoutRect.width - 2,
    y: rowHeight + 9,
    'text-anchor': 'end',
    'font-size': 6,
    fill: '#c0392b',
  });
  text.textContent = `⚠ no stroke data: ${missingChars.join(', ')}`;
  g.appendChild(text);
  return g;
}
