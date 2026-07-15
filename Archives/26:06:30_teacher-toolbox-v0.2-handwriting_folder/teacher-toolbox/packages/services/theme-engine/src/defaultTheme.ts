/**
 * The built-in "default" theme — clean, minimal, black rules on white.
 * System font IDs reference FontManager.SYSTEM_FONT_IDS — always registered,
 * never need loading. No casting workarounds needed.
 */
import type { FontId, Theme, ThemeId } from '@teacher-toolbox/types';
import { PAGE_SIZES } from '@teacher-toolbox/types';
import { SYSTEM_FONT_IDS } from '@teacher-toolbox/font-manager';

export const DEFAULT_THEME: Theme = {
  id:          'default' as ThemeId,
  name:        'Default',
  description: 'Clean, minimal — black rules on white.',
  version:     '1.0.0',
  source:      'bundled',
  colors: {
    pageBg:          '#ffffff',
    baselineColor:   '#000000',
    midlineColor:    '#aaaaaa',
    toplineColor:    '#aaaaaa',
    marginLineColor: '#ff6b6b',
    textPrimary:     '#1a1a1a',
    textSecondary:   '#555555',
    textAccent:      '#1d6fb8',
    borderColor:     '#cccccc',
    accentColor:     '#1d6fb8',
  },
  typography: {
    displayFont:     { fontId: SYSTEM_FONT_IDS.Sans,  fallbackFamily: 'system-ui, sans-serif' },
    bodyFont:        { fontId: SYSTEM_FONT_IDS.Sans,  fallbackFamily: 'system-ui, sans-serif' },
    handwritingFont: { fontId: 'zaner-bloser-print' as FontId, fallbackFamily: 'cursive' },
    scale: { heading1: 24, heading2: 18, heading3: 14, body: 12, caption: 10 },
  },
  decoration: {
    borderStyle: 'none',
  },
  layout: {
    defaultPageSize:    PAGE_SIZES.Letter,
    defaultMargins:     { top: 20, right: 20, bottom: 20, left: 20 },
    defaultLineSpacing: 'primary',
  },
};
