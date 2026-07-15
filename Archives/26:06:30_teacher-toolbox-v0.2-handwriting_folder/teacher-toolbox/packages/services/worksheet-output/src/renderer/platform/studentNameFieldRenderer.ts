/**
 * @module studentNameFieldRenderer
 * @description Renders "Name: ___________" — a label followed by a ruled line.
 *
 * This is deliberately the FIRST component renderer implemented in v0.2, per
 * the renderer design recommendation: it is simple, has no font-loading
 * dependency (uses the theme's body font via standard SVG <text>, not an SVG
 * path font), produces immediately visible output, and exercises every stage
 * of the pipeline end-to-end (resolve → layout → render → assemble). Proving
 * this one component renders correctly in preview, PDF, and print before
 * building the handwriting components validates the architecture with the
 * lowest-risk component available.
 */

import type { WorksheetComponent } from '@teacher-toolbox/types';
import type { ComponentRenderer, RenderContext } from '../types.js';
import { createElement, createGroup, setAttributes } from '../svgHelpers.js';

export interface StudentNameFieldData {
  label?: string;
  /** Length of the ruled line in SVG units; defaults to filling the component width minus label space */
  lineLength?: number;
}

export const renderStudentNameField: ComponentRenderer = (
  component: WorksheetComponent,
  context: RenderContext,
): SVGGElement => {
  const data = component.data as StudentNameFieldData;
  const label = data.label ?? 'Name:';

  const group = createGroup(`component-${component.id}`);

  const fontSizePt = context.theme.typography.scale.body;
  const baselineY = context.layoutRect.height * 0.75;

  // Label text
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

  // Estimate label width using the same fallback-advance approach as
  // textWrapper.ts, since full font metrics for arbitrary UI fonts aren't
  // guaranteed to be loaded for every theme body font in v0.2.
  const approxCharWidth = fontSizePt * 0.55 * (96 / 72);
  const labelWidth = label.length * approxCharWidth + 8; // 8 unit gap after label

  const lineStartX = labelWidth;
  const lineEndX = data.lineLength
    ? lineStartX + data.lineLength
    : context.layoutRect.width;

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

/** Default height for this component when size.height is not explicitly set. */
export function studentNameFieldDefaultHeight(
  _component: WorksheetComponent,
  context: RenderContext,
): number {
  return context.theme.typography.scale.body * (96 / 72) * 1.8; // single line + breathing room, in SVG units
}
