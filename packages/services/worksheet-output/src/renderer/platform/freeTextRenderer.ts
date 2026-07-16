/**
 * @module freeTextRenderer
 * @description Renders an arbitrary text block with word wrap. The first
 * (and currently only) component that needs the
 * ComponentRendererRegistration.defaultHeight callback, since its content
 * height genuinely depends on word-wrapped line count — something only the
 * renderer can determine, not the Layout Engine.
 */

import type { WorksheetComponent } from '@teacher-toolbox/types';
import type { ComponentRenderer, RenderContext } from '../types.js';
import { createElement, createGroup, setAttributes } from '../svgHelpers.js';
import { wrapText } from '../textWrapper.js';
import { ptToUnits } from '../units.js';

export interface FreeTextData {
  text: string;
  align?: 'left' | 'center' | 'right';
  role?: 'heading1' | 'heading2' | 'heading3' | 'body' | 'caption';
}

const LINE_HEIGHT_MULTIPLIER = 1.35;

export const renderFreeText: ComponentRenderer = (
  component: WorksheetComponent,
  context: RenderContext,
): SVGGElement => {
  const data = component.data as unknown as FreeTextData;
  const role = data.role ?? 'body';
  const sizePt = context.theme.typography.scale[role];
  const metrics = context.fonts.getFontMetrics(context.theme.typography.bodyFont.fontId);

  const wrap = wrapText(data.text, context.layoutRect.width, sizePt, LINE_HEIGHT_MULTIPLIER, metrics);

  const group = createGroup(`component-${component.id}`);
  const lineHeightUnits = ptToUnits(sizePt) * LINE_HEIGHT_MULTIPLIER;
  const isHeading = role === 'heading1' || role === 'heading2' || role === 'heading3';

  const anchorX =
    data.align === 'center' ? context.layoutRect.width / 2 :
    data.align === 'right'  ? context.layoutRect.width :
    0;
  const textAnchor = data.align === 'center' ? 'middle' : data.align === 'right' ? 'end' : 'start';

  wrap.lines.forEach((line, index) => {
    const el = createElement('text');
    setAttributes(el, {
      x: anchorX,
      y: lineHeightUnits * (index + 0.85),
      'font-size': sizePt,
      'font-family': context.theme.typography.bodyFont.fallbackFamily,
      'font-weight': isHeading ? 700 : 400,
      'text-anchor': textAnchor,
      fill: isHeading ? context.theme.colors.textAccent : context.theme.colors.textPrimary,
    });
    el.textContent = line;
    group.appendChild(el);
  });

  return group;
};

export function freeTextDefaultHeight(component: WorksheetComponent, context: RenderContext): number {
  const data = component.data as unknown as FreeTextData;
  const role = data.role ?? 'body';
  const sizePt = context.theme.typography.scale[role];
  const metrics = context.fonts.getFontMetrics(context.theme.typography.bodyFont.fontId);
  const wrap = wrapText(data.text, context.layoutRect.width, sizePt, LINE_HEIGHT_MULTIPLIER, metrics);
  return wrap.totalHeight;
}
