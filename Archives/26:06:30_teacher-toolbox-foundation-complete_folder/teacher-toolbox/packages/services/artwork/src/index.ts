/**
 * @module artwork
 * @description Artwork filtering and resolution utilities.
 *
 * Phase 1: Simple filter function over a static index.json manifest.
 *          All bundled artwork served as static asset files.
 *
 * Phase 2: Promote to a full ArtworkLibrary service with IndexedDB storage
 *          for teacher-uploaded artwork and downloadable art packs.
 *          The ArtworkItem type and ArtworkQuery interface are already
 *          defined in @teacher-toolbox/types — no type changes needed.
 *
 * @status PLACEHOLDER — returns empty array until artwork assets are added in v1.0
 */

import type { ArtworkItem, ArtworkQuery } from '@teacher-toolbox/types';

/** The bundled artwork index — populated in v1.0 when assets are added */
const BUNDLED_ARTWORK: ArtworkItem[] = [
  // TODO v1.0: import from packages/assets/artwork/index.json
];

/**
 * Filter the bundled artwork catalogue.
 * This function is intentionally simple — no service class, no async,
 * no IndexedDB. Upgrade path: replace call sites with ArtworkLibrary.search()
 * when the full service is needed.
 */
export function filterArtwork(query: ArtworkQuery): ArtworkItem[] {
  return BUNDLED_ARTWORK.filter((item) => {
    if (query.category && item.category !== query.category) return false;
    if (query.type && item.type !== query.type) return false;
    if (query.season && !item.seasonality?.includes(query.season)) return false;
    if (query.tags?.length) {
      const hasTag = query.tags.some((t) => item.tags.includes(t));
      if (!hasTag) return false;
    }
    if (query.searchText) {
      const q = query.searchText.toLowerCase();
      if (!item.name.toLowerCase().includes(q)) return false;
    }
    return true;
  });
}

/**
 * Retrieve a single artwork item by ID.
 */
export function getArtworkById(id: string): ArtworkItem | null {
  return BUNDLED_ARTWORK.find((a) => a.id === id) ?? null;
}

/**
 * List all unique category names in the bundled catalogue.
 */
export function listArtworkCategories(): string[] {
  const cats = new Set(BUNDLED_ARTWORK.map((a) => a.category));
  return [...cats].sort();
}

// Re-export types so consumers only need to import from this package
export type { ArtworkItem, ArtworkQuery } from '@teacher-toolbox/types';
