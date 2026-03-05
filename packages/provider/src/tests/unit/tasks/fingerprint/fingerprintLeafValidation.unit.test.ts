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

import type { FingerprintLeafProof, LeafValidationResult } from "@prosopo/types";
import { describe, expect, it } from "vitest";
import {
	validateFingerprintLeafValues,
	validateLeafValue,
} from "../../../../tasks/fingerprint/fingerprintLeafValidation.js";

function expectValid(result: LeafValidationResult): void {
	expect(result.status).toBe("valid");
}

function expectInvalid(result: LeafValidationResult): void {
	expect(result.status).toBe("invalid");
}

function expectSuspicious(result: LeafValidationResult): void {
	expect(result.status).toBe("suspicious");
}

describe("validateLeafValue", () => {
	describe("common behavior", () => {
		it('"error" is always valid for any source', () => {
			for (let i = 0; i < 41; i++) {
				expectValid(validateLeafValue(i, '"error"'));
			}
		});

		it("invalid JSON is always invalid", () => {
			expectInvalid(validateLeafValue(0, "not-json{"));
			expectInvalid(validateLeafValue(8, "undefined"));
		});

		it("out-of-range leaf index is invalid", () => {
			expectInvalid(validateLeafValue(-1, '"test"'));
			expectInvalid(validateLeafValue(41, '"test"'));
			expectInvalid(validateLeafValue(100, '"test"'));
		});
	});

	describe("0: fonts", () => {
		it("valid string array", () => {
			expectValid(validateLeafValue(0, JSON.stringify(["Arial", "Verdana"])));
			expectValid(validateLeafValue(0, JSON.stringify([])));
		});

		it("wrong type → invalid", () => {
			expectInvalid(validateLeafValue(0, JSON.stringify("not-an-array")));
			expectInvalid(validateLeafValue(0, JSON.stringify([1, 2])));
		});

		it("too many fonts → suspicious", () => {
			const manyFonts = Array.from({ length: 71 }, (_, i) => `Font${i}`);
			expectSuspicious(validateLeafValue(0, JSON.stringify(manyFonts)));
		});
	});

	describe("1: domBlockers", () => {
		it("valid: null or string array", () => {
			expectValid(validateLeafValue(1, JSON.stringify(null)));
			expectValid(validateLeafValue(1, JSON.stringify(["blocker1"])));
			expectValid(validateLeafValue(1, JSON.stringify([])));
		});

		it("wrong type → invalid", () => {
			expectInvalid(validateLeafValue(1, JSON.stringify(42)));
			expectInvalid(validateLeafValue(1, JSON.stringify([1, 2])));
		});
	});

	describe("2: fontPreferences", () => {
		const validFP = {
			default: 16,
			apple: 16,
			serif: 16,
			sans: 16,
			mono: 13,
			min: 0,
			system: 16,
		};

		it("valid object with all keys", () => {
			expectValid(validateLeafValue(2, JSON.stringify(validFP)));
		});

		it("missing key → invalid", () => {
			const { mono: _, ...incomplete } = validFP;
			expectInvalid(validateLeafValue(2, JSON.stringify(incomplete)));
		});

		it("wrong value type → invalid", () => {
			expectInvalid(
				validateLeafValue(2, JSON.stringify({ ...validFP, default: "str" })),
			);
		});

		it("not object → invalid", () => {
			expectInvalid(validateLeafValue(2, JSON.stringify("string")));
		});
	});

	describe("3: audio", () => {
		it("valid: special codes and normal numbers", () => {
			expectValid(validateLeafValue(3, JSON.stringify(-1)));
			expectValid(validateLeafValue(3, JSON.stringify(-4)));
			expectValid(validateLeafValue(3, JSON.stringify(0.035)));
		});

		it("wrong type → invalid", () => {
			expectInvalid(validateLeafValue(3, JSON.stringify("str")));
		});
	});

	describe("4: screenFrame", () => {
		it("valid: null or 4-element array", () => {
			expectValid(validateLeafValue(4, JSON.stringify(null)));
			expectValid(validateLeafValue(4, JSON.stringify([0, 0, 1920, 40])));
			expectValid(validateLeafValue(4, JSON.stringify([null, 0, null, 40])));
		});

		it("wrong length → invalid", () => {
			expectInvalid(validateLeafValue(4, JSON.stringify([1, 2])));
		});

		it("wrong element type → invalid", () => {
			expectInvalid(validateLeafValue(4, JSON.stringify(["a", 0, 0, 0])));
		});

		it("out-of-range value → suspicious", () => {
			expectSuspicious(
				validateLeafValue(4, JSON.stringify([0, 0, 20000, 0])),
			);
		});
	});

	describe("5: canvas", () => {
		const validCanvas = {
			winding: true,
			geometry: "hash1",
			text: "hash2",
		};

		it("valid object", () => {
			expectValid(validateLeafValue(5, JSON.stringify(validCanvas)));
		});

		it("missing key → invalid", () => {
			expectInvalid(
				validateLeafValue(
					5,
					JSON.stringify({ winding: true, geometry: "h" }),
				),
			);
		});

		it("wrong type → invalid", () => {
			expectInvalid(validateLeafValue(5, JSON.stringify("string")));
		});
	});

	describe("6: osCpu", () => {
		it("valid: string or null", () => {
			expectValid(validateLeafValue(6, JSON.stringify("Windows NT 10.0")));
			expectValid(validateLeafValue(6, JSON.stringify(null)));
		});

		it("wrong type → invalid", () => {
			expectInvalid(validateLeafValue(6, JSON.stringify(42)));
		});
	});

	describe("7: languages", () => {
		it("valid: array of string arrays", () => {
			expectValid(
				validateLeafValue(7, JSON.stringify([["en-US", "en"], ["fr"]])),
			);
			expectValid(validateLeafValue(7, JSON.stringify([])));
		});

		it("wrong structure → invalid", () => {
			expectInvalid(validateLeafValue(7, JSON.stringify(["en", "fr"])));
			expectInvalid(validateLeafValue(7, JSON.stringify([[1, 2]])));
		});
	});

	describe("8: colorDepth", () => {
		it("known values → valid", () => {
			for (const depth of [8, 16, 24, 32, 48]) {
				expectValid(validateLeafValue(8, JSON.stringify(depth)));
			}
		});

		it("unknown positive int → suspicious", () => {
			expectSuspicious(validateLeafValue(8, JSON.stringify(64)));
		});

		it("wrong type → invalid", () => {
			expectInvalid(validateLeafValue(8, JSON.stringify("24")));
		});

		it("non-positive → invalid", () => {
			expectInvalid(validateLeafValue(8, JSON.stringify(-1)));
		});
	});

	describe("9: deviceMemory", () => {
		it("known values → valid", () => {
			expectValid(validateLeafValue(9, JSON.stringify(null)));
			expectValid(validateLeafValue(9, JSON.stringify(4)));
			expectValid(validateLeafValue(9, JSON.stringify(0.25)));
		});

		it("unknown positive → suspicious", () => {
			expectSuspicious(validateLeafValue(9, JSON.stringify(3)));
		});

		it("wrong type → invalid", () => {
			expectInvalid(validateLeafValue(9, JSON.stringify("4")));
		});

		it("non-positive → invalid", () => {
			expectInvalid(validateLeafValue(9, JSON.stringify(-1)));
		});
	});

	describe("10: screenResolution", () => {
		it("valid values", () => {
			expectValid(validateLeafValue(10, JSON.stringify(null)));
			expectValid(validateLeafValue(10, JSON.stringify([1920, 1080])));
			expectValid(validateLeafValue(10, JSON.stringify([null, 1080])));
		});

		it("wrong length → invalid", () => {
			expectInvalid(validateLeafValue(10, JSON.stringify([1920])));
		});

		it("very large → suspicious", () => {
			expectSuspicious(
				validateLeafValue(10, JSON.stringify([200000, 1080])),
			);
		});
	});

	describe("11: hardwareConcurrency", () => {
		it("valid values", () => {
			expectValid(validateLeafValue(11, JSON.stringify(null)));
			expectValid(validateLeafValue(11, JSON.stringify(8)));
		});

		it("very large → suspicious", () => {
			expectSuspicious(validateLeafValue(11, JSON.stringify(2048)));
		});

		it("non-positive → invalid", () => {
			expectInvalid(validateLeafValue(11, JSON.stringify(0)));
		});

		it("wrong type → invalid", () => {
			expectInvalid(validateLeafValue(11, JSON.stringify("8")));
		});
	});

	describe("12: timezone", () => {
		it("valid non-empty string", () => {
			expectValid(
				validateLeafValue(12, JSON.stringify("America/New_York")),
			);
		});

		it("empty string → invalid", () => {
			expectInvalid(validateLeafValue(12, JSON.stringify("")));
		});

		it("wrong type → invalid", () => {
			expectInvalid(validateLeafValue(12, JSON.stringify(5)));
		});
	});

	describe("13-16: storage/database booleans", () => {
		for (const [idx, name] of [
			[13, "sessionStorage"],
			[14, "localStorage"],
			[15, "indexedDB"],
			[16, "openDatabase"],
		] as const) {
			it(`${name}: valid boolean`, () => {
				expectValid(validateLeafValue(idx, JSON.stringify(true)));
				expectValid(validateLeafValue(idx, JSON.stringify(false)));
			});

			it(`${name}: wrong type → invalid`, () => {
				expectInvalid(validateLeafValue(idx, JSON.stringify("true")));
				expectInvalid(validateLeafValue(idx, JSON.stringify(1)));
			});
		}
	});

	describe("17: cpuClass", () => {
		it("valid: string or null", () => {
			expectValid(validateLeafValue(17, JSON.stringify("x86")));
			expectValid(validateLeafValue(17, JSON.stringify(null)));
		});

		it("wrong type → invalid", () => {
			expectInvalid(validateLeafValue(17, JSON.stringify(42)));
		});
	});

	describe("18: platform", () => {
		it("valid string", () => {
			expectValid(validateLeafValue(18, JSON.stringify("Win32")));
		});

		it("wrong type → invalid", () => {
			expectInvalid(validateLeafValue(18, JSON.stringify(null)));
		});
	});

	describe("19: plugins", () => {
		it("valid: null or plugin array", () => {
			expectValid(validateLeafValue(19, JSON.stringify(null)));
			expectValid(
				validateLeafValue(
					19,
					JSON.stringify([
						{
							name: "PDF Viewer",
							description: "View PDFs",
							mimeTypes: [{ type: "application/pdf" }],
						},
					]),
				),
			);
			expectValid(validateLeafValue(19, JSON.stringify([])));
		});

		it("missing plugin key → invalid", () => {
			expectInvalid(
				validateLeafValue(
					19,
					JSON.stringify([{ name: "test", description: "d" }]),
				),
			);
		});

		it("wrong type → invalid", () => {
			expectInvalid(validateLeafValue(19, JSON.stringify("string")));
		});
	});

	describe("20: touchSupport", () => {
		const validTouch = {
			maxTouchPoints: 10,
			touchEvent: true,
			touchStart: true,
		};

		it("valid object", () => {
			expectValid(validateLeafValue(20, JSON.stringify(validTouch)));
			expectValid(
				validateLeafValue(
					20,
					JSON.stringify({
						maxTouchPoints: 0,
						touchEvent: false,
						touchStart: false,
					}),
				),
			);
		});

		it("missing key → invalid", () => {
			expectInvalid(
				validateLeafValue(
					20,
					JSON.stringify({ maxTouchPoints: 10, touchEvent: true }),
				),
			);
		});

		it("wrong type → invalid", () => {
			expectInvalid(validateLeafValue(20, JSON.stringify("string")));
		});
	});

	describe("21: vendor", () => {
		it("known vendors → valid", () => {
			expectValid(validateLeafValue(21, JSON.stringify("")));
			expectValid(validateLeafValue(21, JSON.stringify("Google Inc.")));
			expectValid(
				validateLeafValue(21, JSON.stringify("Apple Computer, Inc.")),
			);
		});

		it("unknown vendor → suspicious", () => {
			expectSuspicious(
				validateLeafValue(21, JSON.stringify("Unknown Vendor")),
			);
		});

		it("wrong type → invalid", () => {
			expectInvalid(validateLeafValue(21, JSON.stringify(42)));
		});
	});

	describe("22: vendorFlavors", () => {
		it("known flavors → valid", () => {
			expectValid(
				validateLeafValue(22, JSON.stringify(["chrome", "safari"])),
			);
			expectValid(validateLeafValue(22, JSON.stringify([])));
		});

		it("unknown flavor → suspicious", () => {
			expectSuspicious(
				validateLeafValue(22, JSON.stringify(["unknownBrowser"])),
			);
		});

		it("wrong type → invalid", () => {
			expectInvalid(validateLeafValue(22, JSON.stringify("chrome")));
		});
	});

	describe("23: cookiesEnabled", () => {
		it("valid boolean", () => {
			expectValid(validateLeafValue(23, JSON.stringify(true)));
		});

		it("wrong type → invalid", () => {
			expectInvalid(validateLeafValue(23, JSON.stringify(1)));
		});
	});

	describe("24: colorGamut", () => {
		it("known values → valid", () => {
			expectValid(validateLeafValue(24, JSON.stringify(null)));
			expectValid(validateLeafValue(24, JSON.stringify("srgb")));
			expectValid(validateLeafValue(24, JSON.stringify("p3")));
		});

		it("unknown gamut → suspicious", () => {
			expectSuspicious(
				validateLeafValue(24, JSON.stringify("display-p3")),
			);
		});

		it("wrong type → invalid", () => {
			expectInvalid(validateLeafValue(24, JSON.stringify(42)));
		});
	});

	describe("25-26: invertedColors, forcedColors", () => {
		for (const [idx, name] of [
			[25, "invertedColors"],
			[26, "forcedColors"],
		] as const) {
			it(`${name}: valid boolean`, () => {
				expectValid(validateLeafValue(idx, JSON.stringify(true)));
				expectValid(validateLeafValue(idx, JSON.stringify(false)));
			});

			it(`${name}: wrong type → invalid`, () => {
				expectInvalid(validateLeafValue(idx, JSON.stringify("true")));
			});
		}
	});

	describe("27: monochrome", () => {
		it("valid non-negative integer", () => {
			expectValid(validateLeafValue(27, JSON.stringify(0)));
			expectValid(validateLeafValue(27, JSON.stringify(8)));
		});

		it("negative → invalid", () => {
			expectInvalid(validateLeafValue(27, JSON.stringify(-1)));
		});

		it("wrong type → invalid", () => {
			expectInvalid(validateLeafValue(27, JSON.stringify("0")));
		});
	});

	describe("28: contrast", () => {
		it("known values → valid", () => {
			expectValid(validateLeafValue(28, JSON.stringify(null)));
			expectValid(validateLeafValue(28, JSON.stringify(0)));
			expectValid(validateLeafValue(28, JSON.stringify(10)));
		});

		it("unknown number → suspicious", () => {
			expectSuspicious(validateLeafValue(28, JSON.stringify(5)));
		});

		it("wrong type → invalid", () => {
			expectInvalid(validateLeafValue(28, JSON.stringify("high")));
		});
	});

	describe("29-31: reducedMotion, reducedTransparency, hdr", () => {
		for (const [idx, name] of [
			[29, "reducedMotion"],
			[30, "reducedTransparency"],
			[31, "hdr"],
		] as const) {
			it(`${name}: valid boolean`, () => {
				expectValid(validateLeafValue(idx, JSON.stringify(false)));
			});

			it(`${name}: wrong type → invalid`, () => {
				expectInvalid(validateLeafValue(idx, JSON.stringify(0)));
			});
		}
	});

	describe("32: math", () => {
		const validMath: Record<string, number> = {
			acos: 1.12,
			acosh: 709.88,
			acoshPf: 355,
			asin: 0.12,
			asinh: 0.88,
			asinhPf: 0.12,
			atanh: 0.55,
			atanhPf: 0.55,
			atan: 0.46,
			sin: 0.84,
			sinh: 1.17,
			cos: 0.54,
			cosh: 1.54,
			coshPf: 1.54,
			tan: 1.55,
			tanh: 0.76,
			tanhPf: 0.76,
			exp: 2.71,
			expm1: 1.71,
			log1p: 0.69,
			powPI: 1.22,
			cbrt: 1.44,
			log10: 0.30,
		};

		it("valid math object", () => {
			expectValid(validateLeafValue(32, JSON.stringify(validMath)));
		});

		it("missing key → invalid", () => {
			const { cbrt: _, ...incomplete } = validMath;
			expectInvalid(validateLeafValue(32, JSON.stringify(incomplete)));
		});

		it("wrong type → invalid", () => {
			expectInvalid(validateLeafValue(32, JSON.stringify("math")));
		});
	});

	describe("33: pdfViewerEnabled", () => {
		it("valid boolean", () => {
			expectValid(validateLeafValue(33, JSON.stringify(true)));
		});

		it("wrong type → invalid", () => {
			expectInvalid(validateLeafValue(33, JSON.stringify("true")));
		});
	});

	describe("34: architecture", () => {
		it("valid 0-255", () => {
			expectValid(validateLeafValue(34, JSON.stringify(0)));
			expectValid(validateLeafValue(34, JSON.stringify(127)));
			expectValid(validateLeafValue(34, JSON.stringify(255)));
		});

		it("out of range → invalid", () => {
			expectInvalid(validateLeafValue(34, JSON.stringify(256)));
			expectInvalid(validateLeafValue(34, JSON.stringify(-1)));
		});

		it("wrong type → invalid", () => {
			expectInvalid(validateLeafValue(34, JSON.stringify("127")));
		});
	});

	describe("35: applePay", () => {
		it("known values → valid", () => {
			for (const v of [0, 1, -1, -2, -3]) {
				expectValid(validateLeafValue(35, JSON.stringify(v)));
			}
		});

		it("unknown value → suspicious", () => {
			expectSuspicious(validateLeafValue(35, JSON.stringify(5)));
		});

		it("wrong type → invalid", () => {
			expectInvalid(validateLeafValue(35, JSON.stringify("1")));
		});
	});

	describe("36: privateClickMeasurement", () => {
		it("valid: string or null", () => {
			expectValid(validateLeafValue(36, JSON.stringify(null)));
			expectValid(validateLeafValue(36, JSON.stringify("supported")));
		});

		it("wrong type → invalid", () => {
			expectInvalid(validateLeafValue(36, JSON.stringify(42)));
		});
	});

	describe("37: audioBaseLatency", () => {
		it("valid: special codes or non-negative", () => {
			expectValid(validateLeafValue(37, JSON.stringify(-1)));
			expectValid(validateLeafValue(37, JSON.stringify(-3)));
			expectValid(validateLeafValue(37, JSON.stringify(0)));
			expectValid(validateLeafValue(37, JSON.stringify(0.005)));
		});

		it("negative non-special → invalid", () => {
			expectInvalid(validateLeafValue(37, JSON.stringify(-5)));
		});

		it("wrong type → invalid", () => {
			expectInvalid(validateLeafValue(37, JSON.stringify("0")));
		});
	});

	describe("38: dateTimeLocale", () => {
		it("valid: string or special number codes", () => {
			expectValid(validateLeafValue(38, JSON.stringify("en-US")));
			expectValid(validateLeafValue(38, JSON.stringify(-1)));
		});

		it("unknown number → suspicious", () => {
			expectSuspicious(validateLeafValue(38, JSON.stringify(42)));
		});

		it("wrong type → invalid", () => {
			expectInvalid(validateLeafValue(38, JSON.stringify(true)));
		});
	});

	describe("39: webGlBasics", () => {
		const validWgl = {
			version: "WebGL 1.0",
			vendor: "Google Inc.",
			vendorUnmasked: "NVIDIA",
			renderer: "WebKit WebGL",
			rendererUnmasked: "GeForce GTX 1080",
			shadingLanguageVersion: "WebGL GLSL ES 1.0",
		};

		it("valid: object with all keys or special code", () => {
			expectValid(validateLeafValue(39, JSON.stringify(validWgl)));
			expectValid(validateLeafValue(39, JSON.stringify(-1)));
			expectValid(validateLeafValue(39, JSON.stringify(-2)));
		});

		it("unknown number code → suspicious", () => {
			expectSuspicious(validateLeafValue(39, JSON.stringify(0)));
		});

		it("missing key → invalid", () => {
			const { version: _, ...incomplete } = validWgl;
			expectInvalid(validateLeafValue(39, JSON.stringify(incomplete)));
		});

		it("wrong type → invalid", () => {
			expectInvalid(validateLeafValue(39, JSON.stringify("string")));
		});
	});

	describe("40: webGlExtensions", () => {
		const validWglExt = {
			contextAttributes: [],
			parameters: [],
			shaderPrecisions: [],
			extensions: [],
			extensionParameters: [],
			fingerprint: [],
		};

		it("valid: object with all keys or special code", () => {
			expectValid(validateLeafValue(40, JSON.stringify(validWglExt)));
			expectValid(validateLeafValue(40, JSON.stringify(-1)));
			expectValid(validateLeafValue(40, JSON.stringify(-2)));
		});

		it("unknown number code → suspicious", () => {
			expectSuspicious(validateLeafValue(40, JSON.stringify(0)));
		});

		it("missing key → invalid", () => {
			const { fingerprint: _, ...incomplete } = validWglExt;
			expectInvalid(validateLeafValue(40, JSON.stringify(incomplete)));
		});

		it("wrong type → invalid", () => {
			expectInvalid(validateLeafValue(40, JSON.stringify(true)));
		});
	});
});

describe("validateFingerprintLeafValues", () => {
	it("validates all proofs in a batch", () => {
		const proofs: FingerprintLeafProof[] = [
			{
				leafIndex: 8,
				value: JSON.stringify(24),
				proof: [["a", "b"]],
			},
			{
				leafIndex: 12,
				value: JSON.stringify("America/New_York"),
				proof: [["c", "d"]],
			},
			{
				leafIndex: 0,
				value: '"error"',
				proof: [["e", "f"]],
			},
		];

		const results = validateFingerprintLeafValues(proofs);
		expect(results).toHaveLength(3);
		const [r0, r1, r2] = results;
		expect(r0?.status).toBe("valid");
		expect(r0?.sourceName).toBe("colorDepth");
		expect(r1?.status).toBe("valid");
		expect(r1?.sourceName).toBe("timezone");
		expect(r2?.status).toBe("valid");
		expect(r2?.sourceName).toBe("fonts");
	});

	it("detects invalid values in batch", () => {
		const proofs: FingerprintLeafProof[] = [
			{
				leafIndex: 8,
				value: JSON.stringify("banana"),
				proof: [["a", "b"]],
			},
		];

		const results = validateFingerprintLeafValues(proofs);
		expect(results).toHaveLength(1);
		const [first] = results;
		expect(first?.status).toBe("invalid");
		expect(first?.sourceName).toBe("colorDepth");
	});
});
