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

import { at } from "./at.js";
import { isArray } from "./checks.js";

type Hash = string | number[];

const U8 = new Array(256);
const U16 = new Array(256 * 256);
for (let n = 0; n < 256; n++) {
	U8[n] = n.toString(16).padStart(2, "0");
}
for (let i = 0; i < 256; i++) {
	const s = i << 8;
	for (let j = 0; j < 256; j++) {
		U16[s | j] = U8[i] + U8[j];
	}
}

/** @internal */
// biome-ignore lint/suspicious/noExplicitAny: TODO replace any
function hex(value: any, result: string) {
	const mod = (value.length % 2) | 0;
	const length = (value.length - mod) | 0;
	for (let i = 0; i < length; i += 2) {
		result += U16[(value[i] << 8) | value[i + 1]];
	}
	if (mod) {
		result += U8[value[length] | 0];
	}
	return result;
}
/**
 * @name u8aToHex
 * @summary Creates a hex string from a Uint8Array object.
 * @description
 * `UInt8Array` input values return the actual hex string. `null` or `undefined` values returns an `0x` string.
 * @example
 * <BR>
 *
 * ```javascript
 * import { u8aToHex } from '@polkadot/util';
 *
 * u8aToHex(new Uint8Array([0x68, 0x65, 0x6c, 0x6c, 0xf])); // 0x68656c0f
 * ```
 */
export function u8aToHex(
	value: Uint8Array | null,
	bitLength = -1,
	isPrefixed = true,
) {
	// this is not 100% correct sinmce we support isPrefixed = false....
	const empty = isPrefixed ? "0x" : "";
	if (!value?.length) {
		return empty;
	}
	if (bitLength > 0) {
		const length = Math.ceil(bitLength / 8);
		if (value.length > length) {
			return `${hex(value.subarray(0, length / 2), empty)}…${hex(value.subarray(value.length - length / 2), "")}`;
		}
	}
	return hex(value, empty);
}

export const hashToHex = (hash: Hash) => {
	if (isArray(hash)) {
		// @ts-ignore
		return u8aToHex(new Uint8Array(hash));
	}
	return hash.toString();
};

export const embedData = (hexString: string, data: number[]): `0x${string}` => {
	const hex = hexString.replace(/^0x/, "").split("");

	let cursorStart = 0;
	let cursorEnd = hex.length - 1;

	const countHex = data.length.toString(16).padStart(2, "0");
	hex[cursorStart++] = at(countHex, 0);
	hex[cursorStart++] = at(countHex, 1);

	const positions: number[] = [];
	const lengths: number[] = [];
	let totalLength = 0;

	for (const d of data) {
		const hexData = d.toString(16); // original hex string

		const len = hexData.length;
		totalLength += len;
		const startPos = cursorEnd - len + 1;

		positions.push(startPos);
		lengths.push(len);

		for (let i = 0; i < len; i++) {
			hex[startPos + i] = at(hexData, i);
		}

		cursorEnd -= len;
	}

	if (totalLength > hexString.length) {
		throw new Error(
			`Hex data length ${totalLength} exceeds length of hex string ${hex.length}`,
		);
	}

	for (let i = 0; i < data.length; i++) {
		const posHex = at(positions, i).toString(16).padStart(2, "0");

		totalLength += posHex.length;

		const lenHex = at(lengths, i).toString(16).padStart(2, "0");

		totalLength += lenHex.length;

		if (totalLength > hexString.length) {
			throw new Error(
				`Hex data length ${totalLength} exceeds length of hex string ${hex.length}`,
			);
		}

		hex[cursorStart++] = at(posHex, 0);
		hex[cursorStart++] = at(posHex, 1);
		hex[cursorStart++] = at(lenHex, 0);
		hex[cursorStart++] = at(lenHex, 1);
	}

	return `0x${hex.join("")}`;
};

export const extractData = (hexString: string) => {
	const hex = hexString.replace(/^0x/, "").split("");
	let cursor = 0;

	const count = Number.parseInt(at(hex, cursor) + hex[cursor + 1], 16);
	cursor += 2;

	const positions: number[] = [];
	const lengths: number[] = [];
	for (let i = 0; i < count; i++) {
		const pos = Number.parseInt(at(hex, cursor) + hex[cursor + 1], 16);
		const len = Number.parseInt(at(hex, cursor + 2) + hex[cursor + 3], 16);
		positions.push(pos);
		lengths.push(len);
		cursor += 4;
	}

	const results: number[] = [];
	for (let i = 0; i < count; i++) {
		const startPos = at(positions, i);
		const len = at(lengths, i);
		const valueHex = hex.slice(startPos, startPos + len).join("");
		results.push(Number.parseInt(valueHex, 16));
	}

	return results;
};
