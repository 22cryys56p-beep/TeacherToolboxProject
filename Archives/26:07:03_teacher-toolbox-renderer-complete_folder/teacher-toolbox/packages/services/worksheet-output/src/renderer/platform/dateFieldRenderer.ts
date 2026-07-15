/**
 * @module dateFieldRenderer
 * @description Renders "Date: ___________". Structurally identical to
 * studentNameFieldRenderer — both are label+line components. Kept as
 * separate registrations (rather than one generic "labeled line" component)
 * because they are semantically distinct content types that a future
 * template-editing UI will want to offer as separate, clearly-named options.
 */

import type { WorksheetComponent } from '@teacher-toolbox/types';
import type { ComponentRenderer, RenderContext } from '../types.js';
import { createElement, createGroup, setAttributes } from '../svgHelpers.js';

export interface DateFieldData {
  label?: string;
  lineLength?: number;
}

export const renderDateField: ComponentRenderer = (
  component: WorksheetComponent,
  context: RenderContext,
): SVGGElement => {
  const data = component.data as DateFieldData;
  const label = data.label ?? 'Date:';

  const group = createGroup(`component-${component.id}`);
  const fontSizePt = context.theme.typography.scale.body;
  const baselineY = context.layoutRect.height * 0.75;

  const labelEl = createElement('text');
  setAttributes(labelEl, {
    x: 0,
    y: baselineY,
    'font-size': fontSizePt,
    'font-family': context.theme.typography.bodyFont.fallbackFamily,
    fill: context.theme.colors.textPrimary,
  });
  labelEl.textContent = label;
  group.appendChild(labelEl);

  const approxCharWidth = fontSizePt * 0.55 * (96 / 72);
  const labelWidth = label.length * approxCharWidth + 8;
  const lineStartX = labelWidth;
  const lineEndX = data.lineLength ? lineStartX + data.lineLength : context.layoutRect.width * 0.5;

  const line = createElement('line');
  setAttributes(line, {
    x1: lineStartX,
    y1: baselineY,
    x2: lineEndX,
    y2: baselineY,
    stroke: context.theme.colors.baselineColor,
    'stroke-width': 1,
  });
  group.appendChild(line);

  return group;
};

export function dateFieldDefaultHeight(_component: WorksheetComponent, context: RenderContext): number {
  return context.theme.typography.scale.body * (96 / 72) * 1.8;
}
