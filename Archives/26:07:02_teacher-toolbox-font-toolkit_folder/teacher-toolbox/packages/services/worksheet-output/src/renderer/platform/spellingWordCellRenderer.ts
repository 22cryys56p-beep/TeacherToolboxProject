/**
 * @module spellingWordCellRenderer
 * @description Renders a complete spelling practice row: a number label, the
 * target word as a full-stroke model on the first line, then N additional
 * blank or progressively-faded practice lines below it.
 *
 * EDUCATIONAL DESIGN NOTE — the "fade" practice progression:
 *
 * A common, evidence-informed handwriting practice pattern is: full trace on
 * line 1, lighter/partial trace on line 2, blank by line 3+ — the gradual
 * removal of support is intentional pedagogy (scaffolding withdrawal), not a
 * visual flourish. This renderer implements that as the DEFAULT progression
 * for practiceLineCount > 1, via traceOpacityForLine(), rather than repeating
 * the same full-opacity trace on every line (typographically "more
 * consistent" but pedagogically wrong — it never asks the student to recall
 * the letterform without support) or making every repetition line blank
 * (visually simpler, but removes support too abruptly for early writers).
 *
 * A teacher can override this via fadeProgression: 'none' (every line at the
 * same opacity) or 'immediate' (only line 1 has a trace, rest are blank) —
 * both are legitimate pedagogical choices for different skill levels, so
 * this is exposed as a setting, not hardcoded, but the default is the
 * gradual-fade progression because it is correct for the most common case
 * (initial word introduction).
 */

import type { WorksheetComponent } from '@teacher-toolbox/types';
import type { ComponentRenderer, RenderContext } from '../types.js';
import { createElement, createGroup, setAttributes } from '../svgHelpers.js';
import { mmToUnits, ptToUnits } from '../units.js';
import { renderHandwritingWord } from './handwritingWordRenderer.js';
import type { HandwritingWordData } from './handwritingWordRenderer.js';

export type FadeProgression = 'gradual' | 'none' | 'immediate';

export interface SpellingWordCellData extends Omit<HandwritingWordData, 'traceOpacity'> {
  wordNumber: number;
  /** Total practice lines including the initial model line. Minimum 1. */
  practiceLineCount: number;
  fadeProgression?: FadeProgression;
}

const NUMBER_LABEL_WIDTH_MM = 8;
const ROW_GAP_UNITS = 2;

export const renderSpellingWordCell: ComponentRenderer = (
  component: WorksheetComponent,
  context: RenderContext,
): SVGGElement => {
  const data = component.data as unknown as SpellingWordCellData;
  const group = createGroup(`component-${component.id}`);
  const lineCount = Math.max(1, data.practiceLineCount);
  const progression = data.fadeProgression ?? 'gradual';

  const singleRowHeight = mmToUnits(12) * (data.sizeScale ?? 1.0);
  const numberLabelWidth = mmToUnits(NUMBER_LABEL_WIDTH_MM);

  // Word number label — vertically centered across the FULL cell height
  // (all practice lines combined), not just the first line, so it reads as
  // labeling the whole row, which is how a teacher visually parses it.
  const totalHeight = lineCount * singleRowHeight + (lineCount - 1) * ROW_GAP_UNITS;
  const numberLabel = createElement('text');
  setAttributes(numberLabel, {
    x: 0,
    y: totalHeight / 2 + 3,
    'font-size': ptToUnits(11),
    'font-family': context.theme.typography.bodyFont.fallbackFamily,
    fill: context.theme.colors.textSecondary,
  });
  numberLabel.textContent = `${data.wordNumber}.`;
  group.appendChild(numberLabel);

  let cursorY = 0;
  for (let line = 0; line < lineCount; line++) {
    const lineData: HandwritingWordData = {
      ...data,
      traceOpacity: traceOpacityForLine(line, lineCount, progression),
    };

    const lineComponent: WorksheetComponent = {
      ...component,
      id: `${component.id}-line-${line}`,
      type: 'platform.handwriting-word',
      data: lineData as unknown as Record<string, unknown>,
    };

    const lineContext: RenderContext = {
      ...context,
      layoutRect: {
        x: numberLabelWidth,
        y: cursorY,
        width: context.layoutRect.width - numberLabelWidth,
        height: singleRowHeight,
      },
    };

    const lineGroup = renderHandwritingWord(lineComponent, lineContext);
    setAttributes(lineGroup, {
      transform: `translate(${numberLabelWidth}, ${cursorY})`,
    });
    group.appendChild(lineGroup);

    cursorY += singleRowHeight + ROW_GAP_UNITS;
  }

  return group;
};

export function spellingWordCellDefaultHeight(
  component: WorksheetComponent,
  _context: RenderContext,
): number {
  const data = component.data as unknown as SpellingWordCellData;
  const lineCount = Math.max(1, data.practiceLineCount);
  const singleRowHeight = mmToUnits(12) * (data.sizeScale ?? 1.0);
  return lineCount * singleRowHeight + (lineCount - 1) * ROW_GAP_UNITS;
}

// ---------------------------------------------------------------------------
// Internal
// ---------------------------------------------------------------------------

/**
 * Computes the trace opacity for a given practice line index within a
 * spelling word cell, according to the chosen fade progression. See module
 * docstring for the pedagogical rationale behind each mode.
 */
function traceOpacityForLine(lineIndex: number, totalLines: number, progression: FadeProgression): number {
  if (progression === 'none') {
    return 1.0; // every line fully traced — appropriate for students who need consistent support
  }

  if (progression === 'immediate') {
    return lineIndex === 0 ? 1.0 : 0; // only the model line is traced; rest are blank
  }

  // 'gradual' — the default. Line 0 is always full opacity (the model the
  // student first copies). Subsequent lines step down linearly toward 0.
  // The floor enforced inside handwritingWordRenderer's clampTraceOpacity
  // additionally guarantees any non-zero step never becomes too faint to
  // see, even on a long practiceLineCount where a naive linear ramp would
  // otherwise produce a nearly-invisible step.
  if (totalLines === 1) return 1.0;
  if (lineIndex === 0) return 1.0;

  // Last line is always fully blank (0) regardless of fraction rounding —
  // the end state of "withdraw support" must actually reach zero support,
  // not asymptotically approach it.
  if (lineIndex === totalLines - 1) return 0;

  const remainingLines = totalLines - 1; // lines after the model line
  const fadeFraction = 1 - lineIndex / remainingLines;
  return Math.max(0, fadeFraction);
}
