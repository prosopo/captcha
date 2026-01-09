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

import { TextDecoder, TextEncoder } from "node:util";

// Ensure TextDecoder and TextEncoder are available globally for the obfuscated code
// The obfuscated code may reference these in various ways, so we set them on multiple globals
const textDecoder = TextDecoder as typeof globalThis.TextDecoder;
const textEncoder = TextEncoder as typeof globalThis.TextEncoder;

if (typeof globalThis.TextDecoder === "undefined") {
	globalThis.TextDecoder = textDecoder;
}
if (typeof globalThis.TextEncoder === "undefined") {
	globalThis.TextEncoder = textEncoder;
}

// Also ensure they're available on window if it exists
if (typeof window !== "undefined") {
	(window as unknown as Record<string, unknown>).TextDecoder = textDecoder;
	(window as unknown as Record<string, unknown>).TextEncoder = textEncoder;
}

// Mock HTMLCanvasElement.getContext for jsdom
if (typeof HTMLCanvasElement !== "undefined") {
	HTMLCanvasElement.prototype.getContext = function (
		contextId: string,
		options?: CanvasRenderingContext2DSettings,
	): RenderingContext | null {
		if (contextId === "2d") {
			// Return a minimal mock 2D context that satisfies the interface
			const mockContext = {
				// CanvasRenderingContext2D properties
				canvas: this,
				getContextAttributes: () => ({}),
				globalAlpha: 1,
				globalCompositeOperation: "source-over",
				drawImage: () => {},
				getParameter: (param: string) => {
					if (param === "VENDOR") return "Mock Vendor";
					if (param === "RENDERER") return "Mock Renderer";
					return null;
				},
				VENDOR: "Mock Vendor",
				RENDERER: "Mock Renderer",
			};
			return mockContext as unknown as CanvasRenderingContext2D;
		}
		// For other context types, return null
		return null;
	};
}
