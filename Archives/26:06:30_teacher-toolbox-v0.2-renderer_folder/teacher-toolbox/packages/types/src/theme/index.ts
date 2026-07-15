/**
 * @package @teacher-toolbox/types/theme
 * @description Theme data model. A theme is a complete visual specification
 * for all rendering output — colours, typography, page decoration, and layout
 * defaults. Themes apply uniformly to screen preview, PDF, and print output.
 */

import type { FontId, Margins, PageSize, ThemeId } from '../common/index.js';

export interface Theme {
  id: ThemeId;
  name: string;
  description?: string;
  version: string;
  /** Whether this theme is bundled with the platform or user-created */
  source: 'bundled' | 'custom' | 'downloaded';
  colors: ThemeColors;
  typography: ThemeTypography;
  decoration: ThemeDecoration;
  layout: ThemeLayout;
  /**
   * App-specific theme extensions. Apps write to their own namespace.
   * e.g. extensions['icanspell'] = { traceOpacity: 0.4 }
   */
  extensions?: Record<string, Record<string, unknown>>;
}

export interface ThemeColors {
  /** Worksheet page background */
  pageBg: string;
  /** Handwriting baseline rule colour */
  baselineColor: string;
  /** Handwriting mid-rule colour */
  midlineColor: string;
  /** Handwriting top-rule colour */
  toplineColor: string;
  /** Left margin rule colour */
  marginLineColor: string;
  /** Primary text colour */
  textPrimary: string;
  /** Secondary / muted text colour */
  textSecondary: string;
  /** Accent text colour (titles, highlights) */
  textAccent: string;
  /** Page border / frame colour */
  borderColor: string;
  /** Brand accent (buttons, indicators in UI — not printed) */
  accentColor: string;
}

export interface ThemeTypography {
  /** Font used for worksheet headings and labels */
  displayFont: FontReference;
  /** Font used for instructions and body text */
  bodyFont: FontReference;
  /** SVG path handwriting font used for trace/model text */
  handwritingFont: FontReference;
  /** Point sizes for each semantic role */
  scale: TypeScale;
}

export interface FontReference {
  fontId: FontId;
  /** CSS font-family fallback stack for elements not rendered via SVG paths */
  fallbackFamily: string;
}

export interface TypeScale {
  /** Worksheet title */
  heading1: number;
  heading2: number;
  heading3: number;
  /** Normal body text */
  body: number;
  /** Small labels, captions */
  caption: number;
}

export interface ThemeDecoration {
  /** Optional decorative border around the page */
  borderStyle?: 'none' | 'single-line' | 'double-line' | 'dashed' | 'themed';
  borderWidth?: number;
  /** Optional header decoration (artwork ID or 'none') */
  headerDecoration?: string;
  /** Optional footer decoration */
  footerDecoration?: string;
}

export interface ThemeLayout {
  defaultPageSize: PageSize;
  defaultMargins: Margins;
  /** Spacing between handwriting lines relative to the font's cap height */
  defaultLineSpacing: 'primary' | 'intermediate' | 'college';
}

/** Lightweight record for listing themes without loading the full object */
export interface ThemeMetadata {
  id: ThemeId;
  name: string;
  description?: string;
  source: Theme['source'];
  /** Base64 thumbnail SVG */
  thumbnail?: string;
}
