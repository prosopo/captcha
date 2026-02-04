// Copyright 2021-2026 Prosopo (UK) Ltd.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//
// This file includes code from FingerprintJS (https://github.com/fingerprintjs/fingerprintjs)
// which is licensed under the MIT License. See FINGERPRINTJS_LICENSE for details.

import { load, hashComponents, componentsToDebugString } from './agent'
import type { Agent, LoadOptions, GetOptions, GetResult } from './agent'
import type { BuiltinComponents } from './sources'
import type { Confidence } from './confidence'
import type { Component, UnknownComponents } from './utils/entropy_source'
import { x64hash128 } from './utils/hashing'

// Prosopo convenience function - backwards compatible with the original wrapper
export const getFingerprint = async () => {
  const fp = await load()
  const result = await fp.get()
  return result.visitorId
}

// Runtime exports
export {
  load,
  hashComponents,
  componentsToDebugString,
}

// Type exports
export type {
  Agent,
  LoadOptions,
  GetOptions,
  GetResult,
  Component,
  UnknownComponents,
  BuiltinComponents,
  Confidence,
}

// The default export is a syntax sugar (`import * as FP from '...' → import FP from '...'`).
// It should contain all the public exported values.
export default { load, hashComponents, componentsToDebugString, getFingerprint }

// The exports below are for private usage. They may change unexpectedly. Use them at your own risk.
/** Not documented, out of Semantic Versioning, usage is at your own risk */
export const murmurX64Hash128 = x64hash128
export { prepareForSources } from './agent'
export { sources } from './sources'
export { getUnstableAudioFingerprint } from './sources/audio'
export { getUnstableCanvasFingerprint } from './sources/canvas'
export { getUnstableScreenFrame } from './sources/screen_frame'
export { getUnstableScreenResolution } from './sources/screen_resolution'
export { getWebGLContext } from './sources/webgl'
export {
  getFullscreenElement,
  isAndroid,
  isTrident,
  isEdgeHTML,
  isChromium,
  isWebKit,
  isGecko,
  isDesktopWebKit,
  isSamsungInternet,
} from './utils/browser'
export {
  loadSources,
  transformSource, // Not used here but adds only 222 uncompressed (60 compressed) bytes of code
} from './utils/entropy_source'
export type { Source, SourcesToComponents, UnknownSources } from './utils/entropy_source'
export { withIframe } from './utils/dom'
