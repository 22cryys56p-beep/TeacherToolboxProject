/**
 * @package @teacher-toolbox/types/common
 * @description Primitive types and utility types shared across all platform packages.
 */

export type SemVer      = string;
export type ISODateTime = string;

export type BrandedId<Brand extends string> = string & { readonly __brand: Brand };

export type StudentId   = BrandedId<'StudentId'>;
export type ClassroomId = BrandedId<'ClassroomId'>;
export type ThemeId     = BrandedId<'ThemeId'>;
export type FontId      = BrandedId<'FontId'>;
export type ArtworkId   = BrandedId<'ArtworkId'>;
export type TemplateId  = BrandedId<'TemplateId'>;
export type WorksheetId = BrandedId<'WorksheetId'>;
export type AppId       = BrandedId<'AppId'>;
export type UserId      = BrandedId<'UserId'>;
export type OrgId       = BrandedId<'OrgId'>;

/**
 * Generate a globally unique, collision-resistant ID using the Web Crypto API.
 * ALL entity creation in the platform must use this — never Date.now() or Math.random().
 * UUID v4 is offline-generatable, globally unique, and safe for cloud sync conflict detection.
 */
export function generateId<T extends BrandedId<string>>(): T {
  return crypto.randomUUID() as T;
}

export interface PageSize {
  width:  number;
  height: number;
  label:  'A4' | 'Letter' | 'Legal' | 'A3' | 'Custom';
}

export const PAGE_SIZES = {
  Letter: { width: 215.9, height: 279.4, label: 'Letter' } as PageSize,
  A4:     { width: 210,   height: 297,   label: 'A4'     } as PageSize,
  Legal:  { width: 215.9, height: 355.6, label: 'Legal'  } as PageSize,
  A3:     { width: 297,   height: 420,   label: 'A3'     } as PageSize,
} as const;

export interface Margins { top: number; right: number; bottom: number; left: number; }
export interface Position { x: number; y: number; }
export interface Size     { width: number; height: number; }
export interface Rect extends Position, Size {}

export type GradeLevel  = 'K' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | '11' | '12';
export type Season      = 'spring' | 'summer' | 'autumn' | 'winter' | 'year-round';
export type ColorMode   = 'light' | 'dark' | 'system';
export type Orientation = 'portrait' | 'landscape';

export type Result<T, E = string> =
  | { ok: true;  value: T }
  | { ok: false; error: E };

export function ok<T>(value: T): Result<T>                  { return { ok: true,  value }; }
export function err<E = string>(error: E): Result<never, E> { return { ok: false, error }; }

/**
 * Fields present on every entity that participates in cloud sync.
 * Optional on all entities — absence means the entity is local-only.
 */
export interface SyncMetadata {
  /** The user account that owns this entity. Absent = anonymous / local-only. */
  userId?: UserId;
  /** Timestamp of the last successful cloud write. */
  syncedAt?: ISODateTime;
  /**
   * If present, this record is a conflict snapshot created during sync.
   * References the ID of the document it conflicts with.
   */
  conflictOf?: string;
}
