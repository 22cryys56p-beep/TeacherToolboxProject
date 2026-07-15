/**
 * @module units
 * @description The single source of truth for coordinate conversion between
 * millimetres (the unit used throughout WorksheetDocument) and SVG user units
 * (px at 96dpi, the native SVG coordinate space).
 *
 * EVERY file in the renderer that converts between mm and SVG units imports
 * the constant from here. Never inline this conversion factor — if it needs
 * to change (e.g. targeting a different reference DPI), it changes in one place.
 */

/** SVG user units per millimetre, at the standard 96dpi screen reference. */
export const SVG_UNITS_PER_MM = 96 / 25.4;

/** Convert a millimetre value to SVG user units. */
export function mmToUnits(mm: number): number {
  return mm * SVG_UNITS_PER_MM;
}

/** Convert an SVG user unit value back to millimetres. */
export function unitsToMm(units: number): number {
  return units / SVG_UNITS_PER_MM;
}

/** Convert a point size (1/72 inch — typography's native unit) to SVG user units. */
export function ptToUnits(pt: number): number {
  return pt * (96 / 72);
}
