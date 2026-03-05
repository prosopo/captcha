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

import { array, number, object, string } from "zod";

/**
 * The canonical ordering of fingerprint sources.
 * Index in this array = leaf index in the Merkle tree.
 */
export const FINGERPRINT_SOURCE_NAMES = [
	"fonts",
	"domBlockers",
	"fontPreferences",
	"audio",
	"screenFrame",
	"canvas",
	"osCpu",
	"languages",
	"colorDepth",
	"deviceMemory",
	"screenResolution",
	"hardwareConcurrency",
	"timezone",
	"sessionStorage",
	"localStorage",
	"indexedDB",
	"openDatabase",
	"cpuClass",
	"platform",
	"plugins",
	"touchSupport",
	"vendor",
	"vendorFlavors",
	"cookiesEnabled",
	"colorGamut",
	"invertedColors",
	"forcedColors",
	"monochrome",
	"contrast",
	"reducedMotion",
	"reducedTransparency",
	"hdr",
	"math",
	"pdfViewerEnabled",
	"architecture",
	"applePay",
	"privateClickMeasurement",
	"audioBaseLatency",
	"dateTimeLocale",
	"webGlBasics",
	"webGlExtensions",
] as const;

export type FingerprintSourceName = (typeof FINGERPRINT_SOURCE_NAMES)[number];

export const FINGERPRINT_SOURCE_COUNT = FINGERPRINT_SOURCE_NAMES.length;

/**
 * A single leaf proof: the raw component value + Merkle proof path to root.
 */
export interface FingerprintLeafProof {
	leafIndex: number;
	value: string; // JSON.stringify'd component value
	proof: string[][]; // Merkle proof path: array of [left, right] pairs, last element is [root]
}

/**
 * What the provider sends when requesting fingerprint proofs.
 */
export interface FingerprintProofRequest {
	requestedLeaves: number[];
}

/** Zod schema for fingerprint proof request (inside challenge responses). */
export const FingerprintProofRequestSchema = object({
	requestedLeaves: array(number()),
});

/** Zod schema for a single leaf proof in a submission. */
export const FingerprintLeafProofSchema = object({
	leafIndex: number(),
	value: string(),
	proof: array(array(string())),
});

/** Zod schema for the array of proofs submitted with a solution. */
export const FingerprintProofsSchema = array(FingerprintLeafProofSchema);

/**
 * Holds the client-side Merkle tree state for generating proofs on demand.
 */
export interface FingerprintMerkleState {
	merkleRoot: string;
	leafHashes: string[];
	componentValues: string[]; // JSON.stringify'd values, indexed same as leafHashes
}

/**
 * Result status for validating a fingerprint leaf value.
 * - "valid": value matches expected type and range
 * - "suspicious": correct type but unusual value
 * - "invalid": wrong type, structure, or unparseable
 */
export type LeafValidationStatus = "valid" | "suspicious" | "invalid";

/**
 * Validation result for a single fingerprint leaf value.
 */
export interface LeafValidationResult {
	leafIndex: number;
	sourceName: string;
	status: LeafValidationStatus;
	reason: string;
}
