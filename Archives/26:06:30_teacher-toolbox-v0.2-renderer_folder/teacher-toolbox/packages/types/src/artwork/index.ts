/**
 * @package @teacher-toolbox/types/artwork
 */

import type { ArtworkId, GradeLevel, Season, Size } from '../common/index.js';

export type ArtworkFormat = 'svg' | 'png' | 'jpg' | 'webp';
export type ArtworkSource = 'bundled' | 'indexed-db' | 'url' | 'inline';
export type ArtworkType =
  | 'clip-art' | 'border' | 'background' | 'icon'
  | 'mascot' | 'decoration' | 'ai-generated' | 'teacher-uploaded';

export interface ArtworkItem {
  id: ArtworkId;
  name: string;
  description?: string;
  type: ArtworkType;
  format: ArtworkFormat;
  source: ArtworkSource;
  /** Inline SVG string or base64 data URI */
  data?: string;
  /** Path within the assets package (for bundled artwork) */
  assetPath?: string;
  category: string;
  tags: string[];
  seasonality?: Season[];
  gradeLevel?: GradeLevel[];
  naturalSize: Size;
  license: ArtworkLicense;
}

export interface ArtworkLicense {
  spdx: string;
  attribution?: string;
  commercialUse: boolean;
}

export interface ArtworkQuery {
  category?: string;
  tags?: string[];
  type?: ArtworkType;
  season?: Season;
  searchText?: string;
}
