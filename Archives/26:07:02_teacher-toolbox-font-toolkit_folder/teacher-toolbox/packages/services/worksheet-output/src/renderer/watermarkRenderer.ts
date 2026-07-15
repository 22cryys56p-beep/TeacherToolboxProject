/**
 * @module watermarkRenderer
 * @description Renders the free-tier "Made with Teacher Toolbox" footer
 * watermark. Called exactly once per page, exclusively from PageAssembler,
 * never from inside the component renderer registry. This file has no
 * dependency on entitlements — the decision of whether to call it at all is
 * made by the caller (WorksheetRenderer reading IIdentityService once before
 * assembly), keeping this function itself a pure "always render the
 * watermark" primitive with zero commercial logic inside it.
 */

import type { Theme } from '@teacher-toolbox/types';
import { createElement, setAttributes } from './svgHelpers.js';
import { mmToUnits } from './units.js';

export function renderWatermark(pageWidth: number, pageHeight: number, theme: Theme): SVGGElement {
  const group = createElement('g') as SVGGElement;
  setAttributes(group, { id: 'platform-watermark' });

  const bottomMargin = mmToUnits(6);
  const text = createElement('text');
  setAttributes(text, {
    x: pageWidth / 2,
    y: pageHeight - bottomMargin,
    'text-anchor': 'middle',
    'font-size': 8,
    'font-family': theme.typography.bodyFont.fallbackFamily,
    fill: theme.colors.textSecondary,
    opacity: 0.55,
  });
  text.textContent = 'Made with Teacher Toolbox';
  group.appendChild(text);

  return group;
}
