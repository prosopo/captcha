/* tslint:disable */
/* eslint-disable */
/* prettier-ignore */

/**
 * Synthesise a puzzle background. Byte-identical to `generateBackground`
 * from @prosopo/puzzle-assets for the same seed.
 *
 * Returns straight (non-premultiplied) RGBA, row-major, 4 bytes per pixel.
 * `seed` must be at least 16 bytes.
 */
export declare function generateBackground(seed: Buffer, width: number, height: number): Buffer

/**
 * As `generateBackground`, evaluating each Gaussian field as a product of its
 * two axes: `width + height` exponentials per field instead of one per pixel.
 * Same picture, measurably faster, but the arithmetic differs in the last
 * place or two so equality with the JS is empirical rather than structural.
 */
export declare function generateBackgroundSeparable(seed: Buffer, width: number, height: number): Buffer
