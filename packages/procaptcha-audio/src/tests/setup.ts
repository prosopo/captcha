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

// React only flushes work synchronously inside act() when it believes it is
// under test; without this flag every render lands after the assertion and the
// container reads as empty.
// React reads this off the global object rather than an import, so it has to
// be declared before it can be set without widening globalThis to any.
declare global {
	var IS_REACT_ACT_ENVIRONMENT: boolean;
}

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// jsdom implements no media pipeline: HTMLMediaElement.play throws
// "Not implemented" and the element never advances currentTime. The player
// treats a rejected play() as "the browser blocked us", which is a real code
// path, so leaving the default in place would make every test take that
// branch. Tests that want the blocked path override these per-test.
Object.defineProperty(HTMLMediaElement.prototype, "play", {
	configurable: true,
	writable: true,
	value: (): Promise<void> => Promise.resolve(),
});

Object.defineProperty(HTMLMediaElement.prototype, "pause", {
	configurable: true,
	writable: true,
	value: (): void => undefined,
});

export {};
