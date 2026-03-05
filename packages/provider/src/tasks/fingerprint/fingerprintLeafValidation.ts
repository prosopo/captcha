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

import {
	FINGERPRINT_SOURCE_NAMES,
	type FingerprintLeafProof,
	type LeafValidationResult,
	type LeafValidationStatus,
} from "@prosopo/types";

const ERROR_VALUE = '"error"';

function result(
	leafIndex: number,
	sourceName: string,
	status: LeafValidationStatus,
	reason: string,
): LeafValidationResult {
	return { leafIndex, sourceName, status, reason };
}

function valid(leafIndex: number, sourceName: string): LeafValidationResult {
	return result(leafIndex, sourceName, "valid", "ok");
}

function invalid(
	leafIndex: number,
	sourceName: string,
	reason: string,
): LeafValidationResult {
	return result(leafIndex, sourceName, "invalid", reason);
}

function suspicious(
	leafIndex: number,
	sourceName: string,
	reason: string,
): LeafValidationResult {
	return result(leafIndex, sourceName, "suspicious", reason);
}

function isArray(v: unknown): v is unknown[] {
	return Array.isArray(v);
}

function isString(v: unknown): v is string {
	return typeof v === "string";
}

function isNumber(v: unknown): v is number {
	return typeof v === "number";
}

function isBoolean(v: unknown): v is boolean {
	return typeof v === "boolean";
}

function isObject(v: unknown): v is Record<string, unknown> {
	return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isStringArray(v: unknown): v is string[] {
	return isArray(v) && v.every(isString);
}

function isPositiveInt(v: number): boolean {
	return Number.isInteger(v) && v > 0;
}

// --- Validators for each source ---

function validateFonts(
	idx: number,
	name: string,
	v: unknown,
): LeafValidationResult {
	if (!isStringArray(v))
		return invalid(idx, name, "expected string[]");
	if (v.length > 70) return suspicious(idx, name, `font count ${v.length} > 70`);
	return valid(idx, name);
}

function validateDomBlockers(
	idx: number,
	name: string,
	v: unknown,
): LeafValidationResult {
	if (v === null) return valid(idx, name);
	if (!isStringArray(v))
		return invalid(idx, name, "expected string[] or null");
	return valid(idx, name);
}

function validateFontPreferences(
	idx: number,
	name: string,
	v: unknown,
): LeafValidationResult {
	if (!isObject(v)) return invalid(idx, name, "expected object");
	const requiredKeys = [
		"default",
		"apple",
		"serif",
		"sans",
		"mono",
		"min",
		"system",
	];
	for (const key of requiredKeys) {
		if (!(key in v)) return invalid(idx, name, `missing key "${key}"`);
		if (!isNumber(v[key])) return invalid(idx, name, `"${key}" is not a number`);
	}
	return valid(idx, name);
}

function validateAudio(
	idx: number,
	name: string,
	v: unknown,
): LeafValidationResult {
	if (!isNumber(v)) return invalid(idx, name, "expected number");
	const specialCodes = new Set([-1, -2, -3, -4]);
	if (specialCodes.has(v)) return valid(idx, name);
	if (!Number.isFinite(v))
		return invalid(idx, name, "expected finite number or special code");
	return valid(idx, name);
}

function validateScreenFrame(
	idx: number,
	name: string,
	v: unknown,
): LeafValidationResult {
	if (v === null) return valid(idx, name);
	if (!isArray(v) || v.length !== 4)
		return invalid(idx, name, "expected [n|null,n|null,n|null,n|null] or null");
	for (const el of v) {
		if (el !== null && !isNumber(el))
			return invalid(idx, name, "array elements must be number or null");
	}
	for (const el of v) {
		if (isNumber(el) && (el < 0 || el > 10000))
			return suspicious(idx, name, `screenFrame value ${el} out of 0-10000`);
	}
	return valid(idx, name);
}

function validateCanvas(
	idx: number,
	name: string,
	v: unknown,
): LeafValidationResult {
	if (!isObject(v)) return invalid(idx, name, "expected object");
	if (!isBoolean(v.winding))
		return invalid(idx, name, '"winding" must be boolean');
	if (!isString(v.geometry))
		return invalid(idx, name, '"geometry" must be string');
	if (!isString(v.text)) return invalid(idx, name, '"text" must be string');
	return valid(idx, name);
}

function validateStringOrNull(
	idx: number,
	name: string,
	v: unknown,
): LeafValidationResult {
	if (v === null) return valid(idx, name);
	if (!isString(v)) return invalid(idx, name, "expected string or null");
	return valid(idx, name);
}

function validateLanguages(
	idx: number,
	name: string,
	v: unknown,
): LeafValidationResult {
	if (!isArray(v)) return invalid(idx, name, "expected string[][]");
	for (const sub of v) {
		if (!isStringArray(sub))
			return invalid(idx, name, "expected array of string arrays");
	}
	return valid(idx, name);
}

const KNOWN_COLOR_DEPTHS = new Set([8, 16, 24, 32, 48]);

function validateColorDepth(
	idx: number,
	name: string,
	v: unknown,
): LeafValidationResult {
	if (!isNumber(v)) return invalid(idx, name, "expected number");
	if (KNOWN_COLOR_DEPTHS.has(v)) return valid(idx, name);
	if (isPositiveInt(v))
		return suspicious(idx, name, `colorDepth ${v} not in known set`);
	return invalid(idx, name, `colorDepth ${v} is not a positive integer`);
}

const KNOWN_DEVICE_MEMORY = new Set([
	0.25, 0.5, 1, 2, 4, 8, 16, 32, 64, 128,
]);

function validateDeviceMemory(
	idx: number,
	name: string,
	v: unknown,
): LeafValidationResult {
	if (v === null) return valid(idx, name);
	if (!isNumber(v)) return invalid(idx, name, "expected number or null");
	if (KNOWN_DEVICE_MEMORY.has(v)) return valid(idx, name);
	if (v > 0) return suspicious(idx, name, `deviceMemory ${v} not in known set`);
	return invalid(idx, name, `deviceMemory ${v} is not positive`);
}

function validateScreenResolution(
	idx: number,
	name: string,
	v: unknown,
): LeafValidationResult {
	if (v === null) return valid(idx, name);
	if (!isArray(v) || v.length !== 2)
		return invalid(idx, name, "expected [n|null,n|null] or null");
	for (const el of v) {
		if (el !== null && !isNumber(el))
			return invalid(idx, name, "elements must be number or null");
	}
	for (const el of v) {
		if (isNumber(el) && el > 100000)
			return suspicious(idx, name, `resolution value ${el} > 100000`);
	}
	return valid(idx, name);
}

function validateHardwareConcurrency(
	idx: number,
	name: string,
	v: unknown,
): LeafValidationResult {
	if (v === null) return valid(idx, name);
	if (!isNumber(v)) return invalid(idx, name, "expected number or null");
	if (!isPositiveInt(v))
		return invalid(idx, name, "expected positive integer");
	if (v > 1024) return suspicious(idx, name, `concurrency ${v} > 1024`);
	return valid(idx, name);
}

function validateNonEmptyString(
	idx: number,
	name: string,
	v: unknown,
): LeafValidationResult {
	if (!isString(v)) return invalid(idx, name, "expected string");
	if (v.length === 0) return invalid(idx, name, "expected non-empty string");
	return valid(idx, name);
}

function validateBoolean(
	idx: number,
	name: string,
	v: unknown,
): LeafValidationResult {
	if (!isBoolean(v)) return invalid(idx, name, "expected boolean");
	return valid(idx, name);
}

function validateString(
	idx: number,
	name: string,
	v: unknown,
): LeafValidationResult {
	if (!isString(v)) return invalid(idx, name, "expected string");
	return valid(idx, name);
}

function validatePlugins(
	idx: number,
	name: string,
	v: unknown,
): LeafValidationResult {
	if (v === null) return valid(idx, name);
	if (!isArray(v)) return invalid(idx, name, "expected array or null");
	for (const plugin of v) {
		if (!isObject(plugin)) return invalid(idx, name, "plugin must be object");
		if (!isString(plugin.name))
			return invalid(idx, name, 'plugin missing "name" string');
		if (!isString(plugin.description))
			return invalid(idx, name, 'plugin missing "description" string');
		if (!isArray(plugin.mimeTypes))
			return invalid(idx, name, 'plugin missing "mimeTypes" array');
	}
	return valid(idx, name);
}

function validateTouchSupport(
	idx: number,
	name: string,
	v: unknown,
): LeafValidationResult {
	if (!isObject(v)) return invalid(idx, name, "expected object");
	if (!isNumber(v.maxTouchPoints) || (v.maxTouchPoints as number) < 0)
		return invalid(idx, name, '"maxTouchPoints" must be non-negative number');
	if (!isBoolean(v.touchEvent))
		return invalid(idx, name, '"touchEvent" must be boolean');
	if (!isBoolean(v.touchStart))
		return invalid(idx, name, '"touchStart" must be boolean');
	return valid(idx, name);
}

const KNOWN_VENDORS = new Set([
	"",
	"Google Inc.",
	"Apple Computer, Inc.",
	"Mozilla",
]);

function validateVendor(
	idx: number,
	name: string,
	v: unknown,
): LeafValidationResult {
	if (!isString(v)) return invalid(idx, name, "expected string");
	if (KNOWN_VENDORS.has(v)) return valid(idx, name);
	return suspicious(idx, name, `vendor "${v}" not in known set`);
}

const KNOWN_VENDOR_FLAVORS = new Set([
	"chrome",
	"safari",
	"firefox",
	"opera",
	"edge",
	"brave",
	"vivaldi",
	"yandex",
	"chromium",
	"silk",
	"samsung",
	"whale",
	"uc",
]);

function validateVendorFlavors(
	idx: number,
	name: string,
	v: unknown,
): LeafValidationResult {
	if (!isStringArray(v)) return invalid(idx, name, "expected string[]");
	for (const flavor of v) {
		if (!KNOWN_VENDOR_FLAVORS.has(flavor))
			return suspicious(idx, name, `unknown vendor flavor "${flavor}"`);
	}
	return valid(idx, name);
}

const KNOWN_COLOR_GAMUTS = new Set(["srgb", "p3", "rec2020"]);

function validateColorGamut(
	idx: number,
	name: string,
	v: unknown,
): LeafValidationResult {
	if (v === null) return valid(idx, name);
	if (!isString(v)) return invalid(idx, name, "expected string or null");
	if (KNOWN_COLOR_GAMUTS.has(v)) return valid(idx, name);
	return suspicious(idx, name, `colorGamut "${v}" not in known set`);
}

function validateMonochrome(
	idx: number,
	name: string,
	v: unknown,
): LeafValidationResult {
	if (!isNumber(v)) return invalid(idx, name, "expected number");
	if (!Number.isInteger(v) || v < 0)
		return invalid(idx, name, "expected non-negative integer");
	return valid(idx, name);
}

const KNOWN_CONTRAST_VALUES = new Set([-1, 0, 1, 10]);

function validateContrast(
	idx: number,
	name: string,
	v: unknown,
): LeafValidationResult {
	if (v === null) return valid(idx, name);
	if (!isNumber(v)) return invalid(idx, name, "expected number or null");
	if (KNOWN_CONTRAST_VALUES.has(v)) return valid(idx, name);
	return suspicious(idx, name, `contrast ${v} not in known set`);
}

const MATH_KEYS = [
	"acos",
	"acosh",
	"acoshPf",
	"asin",
	"asinh",
	"asinhPf",
	"atanh",
	"atanhPf",
	"atan",
	"sin",
	"sinh",
	"cos",
	"cosh",
	"coshPf",
	"tan",
	"tanh",
	"tanhPf",
	"exp",
	"expm1",
	"log1p",
	"powPI",
	"cbrt",
	"log10",
];

function validateMath(
	idx: number,
	name: string,
	v: unknown,
): LeafValidationResult {
	if (!isObject(v)) return invalid(idx, name, "expected object");
	for (const key of MATH_KEYS) {
		if (!(key in v)) return invalid(idx, name, `missing key "${key}"`);
		if (!isNumber(v[key]))
			return invalid(idx, name, `"${key}" is not a number`);
	}
	return valid(idx, name);
}

function validateArchitecture(
	idx: number,
	name: string,
	v: unknown,
): LeafValidationResult {
	if (!isNumber(v)) return invalid(idx, name, "expected number");
	if (!Number.isInteger(v) || v < 0 || v > 255)
		return invalid(idx, name, `architecture ${v} not in 0-255`);
	return valid(idx, name);
}

const KNOWN_APPLE_PAY = new Set([0, 1, -1, -2, -3]);

function validateApplePay(
	idx: number,
	name: string,
	v: unknown,
): LeafValidationResult {
	if (!isNumber(v)) return invalid(idx, name, "expected number");
	if (KNOWN_APPLE_PAY.has(v)) return valid(idx, name);
	return suspicious(idx, name, `applePay ${v} not in known set`);
}

function validateAudioBaseLatency(
	idx: number,
	name: string,
	v: unknown,
): LeafValidationResult {
	if (!isNumber(v)) return invalid(idx, name, "expected number");
	const specialCodes = new Set([-1, -2, -3]);
	if (specialCodes.has(v)) return valid(idx, name);
	if (!Number.isFinite(v) || v < 0)
		return invalid(idx, name, "expected non-negative finite number or special code");
	return valid(idx, name);
}

function validateDateTimeLocale(
	idx: number,
	name: string,
	v: unknown,
): LeafValidationResult {
	if (isString(v)) return valid(idx, name);
	if (isNumber(v)) {
		const specialCodes = new Set([-1, -2, -3]);
		if (specialCodes.has(v)) return valid(idx, name);
		return suspicious(idx, name, `dateTimeLocale number ${v} not a known code`);
	}
	return invalid(idx, name, "expected string or number");
}

const WEBGL_BASICS_STRING_KEYS = [
	"version",
	"vendor",
	"vendorUnmasked",
	"renderer",
	"rendererUnmasked",
	"shadingLanguageVersion",
];

function validateWebGlBasics(
	idx: number,
	name: string,
	v: unknown,
): LeafValidationResult {
	if (isNumber(v)) {
		const specialCodes = new Set([-1, -2]);
		if (specialCodes.has(v)) return valid(idx, name);
		return suspicious(idx, name, `webGlBasics number ${v} not a known code`);
	}
	if (!isObject(v)) return invalid(idx, name, "expected object or number");
	for (const key of WEBGL_BASICS_STRING_KEYS) {
		if (!(key in v)) return invalid(idx, name, `missing key "${key}"`);
		if (!isString(v[key]))
			return invalid(idx, name, `"${key}" is not a string`);
	}
	return valid(idx, name);
}

const WEBGL_EXTENSIONS_ARRAY_KEYS = [
	"contextAttributes",
	"parameters",
	"shaderPrecisions",
	"extensions",
	"extensionParameters",
	"fingerprint",
];

function validateWebGlExtensions(
	idx: number,
	name: string,
	v: unknown,
): LeafValidationResult {
	if (isNumber(v)) {
		const specialCodes = new Set([-1, -2]);
		if (specialCodes.has(v)) return valid(idx, name);
		return suspicious(
			idx,
			name,
			`webGlExtensions number ${v} not a known code`,
		);
	}
	if (!isObject(v)) return invalid(idx, name, "expected object or number");
	for (const key of WEBGL_EXTENSIONS_ARRAY_KEYS) {
		if (!(key in v)) return invalid(idx, name, `missing key "${key}"`);
		if (!isArray(v[key]))
			return invalid(idx, name, `"${key}" is not an array`);
	}
	return valid(idx, name);
}

type SourceValidator = (
	idx: number,
	name: string,
	v: unknown,
) => LeafValidationResult;

const SOURCE_VALIDATORS: SourceValidator[] = [
	/* 0  fonts */ validateFonts,
	/* 1  domBlockers */ validateDomBlockers,
	/* 2  fontPreferences */ validateFontPreferences,
	/* 3  audio */ validateAudio,
	/* 4  screenFrame */ validateScreenFrame,
	/* 5  canvas */ validateCanvas,
	/* 6  osCpu */ validateStringOrNull,
	/* 7  languages */ validateLanguages,
	/* 8  colorDepth */ validateColorDepth,
	/* 9  deviceMemory */ validateDeviceMemory,
	/* 10 screenResolution */ validateScreenResolution,
	/* 11 hardwareConcurrency */ validateHardwareConcurrency,
	/* 12 timezone */ validateNonEmptyString,
	/* 13 sessionStorage */ validateBoolean,
	/* 14 localStorage */ validateBoolean,
	/* 15 indexedDB */ validateBoolean,
	/* 16 openDatabase */ validateBoolean,
	/* 17 cpuClass */ validateStringOrNull,
	/* 18 platform */ validateString,
	/* 19 plugins */ validatePlugins,
	/* 20 touchSupport */ validateTouchSupport,
	/* 21 vendor */ validateVendor,
	/* 22 vendorFlavors */ validateVendorFlavors,
	/* 23 cookiesEnabled */ validateBoolean,
	/* 24 colorGamut */ validateColorGamut,
	/* 25 invertedColors */ validateBoolean,
	/* 26 forcedColors */ validateBoolean,
	/* 27 monochrome */ validateMonochrome,
	/* 28 contrast */ validateContrast,
	/* 29 reducedMotion */ validateBoolean,
	/* 30 reducedTransparency */ validateBoolean,
	/* 31 hdr */ validateBoolean,
	/* 32 math */ validateMath,
	/* 33 pdfViewerEnabled */ validateBoolean,
	/* 34 architecture */ validateArchitecture,
	/* 35 applePay */ validateApplePay,
	/* 36 privateClickMeasurement */ validateStringOrNull,
	/* 37 audioBaseLatency */ validateAudioBaseLatency,
	/* 38 dateTimeLocale */ validateDateTimeLocale,
	/* 39 webGlBasics */ validateWebGlBasics,
	/* 40 webGlExtensions */ validateWebGlExtensions,
];

/**
 * Validates a single fingerprint leaf value against expected type and structure
 * for the given source index.
 *
 * @param leafIndex - The source index (0-40) matching FINGERPRINT_SOURCE_NAMES
 * @param rawValue - The JSON.stringify'd component value from the proof
 * @returns Validation result with status and reason
 */
export function validateLeafValue(
	leafIndex: number,
	rawValue: string,
): LeafValidationResult {
	const sourceName =
		FINGERPRINT_SOURCE_NAMES[leafIndex] ?? `unknown(${leafIndex})`;

	if (leafIndex < 0 || leafIndex >= FINGERPRINT_SOURCE_NAMES.length) {
		return invalid(leafIndex, sourceName, "leaf index out of range");
	}

	// "error" is always valid — means the component wasn't available on the client
	if (rawValue === ERROR_VALUE) {
		return valid(leafIndex, sourceName);
	}

	// Parse JSON — JSON.stringify always produces valid JSON, so invalid JSON means tampering
	let parsed: unknown;
	try {
		parsed = JSON.parse(rawValue);
	} catch {
		return invalid(leafIndex, sourceName, "invalid JSON");
	}

	const validator = SOURCE_VALIDATORS[leafIndex];
	if (!validator) {
		return invalid(leafIndex, sourceName, "no validator for leaf index");
	}
	return validator(leafIndex, sourceName, parsed);
}

/**
 * Validates all fingerprint leaf values in a set of proofs.
 *
 * @param proofs - Array of fingerprint leaf proofs from the client
 * @returns Array of validation results, one per proof
 */
export function validateFingerprintLeafValues(
	proofs: FingerprintLeafProof[],
): LeafValidationResult[] {
	return proofs.map((proof) => validateLeafValue(proof.leafIndex, proof.value));
}
