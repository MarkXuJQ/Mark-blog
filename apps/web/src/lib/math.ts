/**
 * Shared, dependency-free math / easing helpers.
 *
 * These were previously duplicated across several components and hooks.
 * Centralising them here keeps the implementations single-sourced so future
 * edits cannot fall out of sync.
 */

/** Clamp `value` into the inclusive range `[min, max]`. */
export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

/** Clamp `value` into the unit range `[0, 1]`. */
export function clamp01(value: number) {
  return Math.min(Math.max(value, 0), 1)
}

/** Cubic ease-out: a smooth slowdown from 1 → 0 applied to an eased progress. */
export function easeOutCubic(value: number) {
  return 1 - Math.pow(1 - value, 3)
}

const FULL_ROTATION_DEGREES = 360

/** Normalise an angle (in degrees) into the range `[0, 360)`. */
export function normalizeAngle(angle: number) {
  const normalized = angle % FULL_ROTATION_DEGREES
  return normalized < 0 ? normalized + FULL_ROTATION_DEGREES : normalized
}

/** Shortest clockwise signed delta from `from` to `to` (degrees, normalised). */
export function getClockwiseAngleDelta(from: number, to: number) {
  return normalizeAngle(to - from)
}