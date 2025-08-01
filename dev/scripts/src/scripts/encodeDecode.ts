// Copyright 2021-2025 Prosopo (UK) Ltd.
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
	BN,
	hexToNumber,
	hexToString,
	hexToU8a,
	isHex,
	stringToHex,
	u8aToHex,
	u8aToString,
} from "@polkadot/util";
import { blake2AsHex, isAddress } from "@polkadot/util-crypto";
import { at, consoleTableWithWrapping } from "@prosopo/util";
import { decodeAddress, encodeAddress } from "@prosopo/util-crypto";

function isJSON(arg: string): boolean {
	try {
		JSON.parse(arg);
		return true;
	} catch (e) {
		return false;
	}
}

function isBN(arg: string): boolean {
	try {
		new BN(`0x${arg}`);
		return true;
	} catch (e) {
		return false;
	}
}

function main() {
	const ss58Format = process.env.PROSOPO_SS58_FORMAT
		? Number.parseInt(process.env.PROSOPO_SS58_FORMAT)
		: 42;
	const arg = at(process.argv.slice(2), 0).trim();
	const argIsHex = isHex(arg);
	const argIsAddress = isAddress(arg, false, ss58Format);
	const output: { name: string; value: string }[] = [];
	output.push({ name: "arg", value: arg });
	output.push({ name: "length", value: arg.length.toString() });
	output.push({ name: "argIsAddress", value: argIsAddress.toString() });
	output.push({ name: "argIsHex", value: argIsHex.toString() });
	if (argIsAddress) {
		try {
			const encodedAddress = encodeAddress(
				decodeAddress(arg, false, ss58Format),
				ss58Format,
			);
			const decodedAddress = decodeAddress(encodedAddress, false, ss58Format);
			if (encodedAddress === arg) {
				const hexAddress = u8aToHex(decodedAddress);
				output.push({ name: "Hex address", value: hexAddress });
				output.push({
					name: "Address bytes",
					value: decodedAddress.toString(),
				});
			} else {
				output.push({ name: "Encoded address", value: encodedAddress });
				output.push({
					name: "Address as hex",
					value: u8aToHex(decodeAddress(encodedAddress)),
				});
			}
		} catch (e) {
			output.push({
				name: "Failure encoding/decoding address",
				value: `FAIL - ${e}`,
			});
		}
	}
	if (argIsHex) {
		output.push({ name: "Decoding hex to string", value: hexToString(arg) });
		try {
			output.push({
				name: "Decoding hex to number",
				value: hexToNumber(arg).toString(),
			});
		} catch (e) {
			output.push({ name: "Decoding hex to number", value: `FAIL - ${e}` });
		}
		output.push({
			name: "Decoding string to hex to u8a",
			value: hexToU8a(stringToHex(arg)).toString(),
		});
	} else {
		output.push({
			name: "Hashing string using blake2AsHex",
			value: blake2AsHex(arg),
		});
	}

	if (isJSON(arg)) {
		const u8aMaybe = JSON.parse(arg);
		output.push({ name: "Found JSON", value: u8aMaybe });
		// pad the array
		const padded = new Uint8Array(new Uint8ClampedArray(u8aMaybe));
		padded.set(u8aMaybe);
		output.push({ name: "uint8array", value: padded.toString() });

		const hex = u8aToHex(padded);
		output.push({ name: "u8aToHex", value: u8aToHex(padded) });
		output.push({
			name: "encodeAddress(_, ss58Format)",
			value: encodeAddress(hex, ss58Format),
		});
		output.push({ name: "u8aToString", value: u8aToString(padded) });

		output.push({ name: "stringToHex", value: stringToHex(arg) });
	}

	if (isBN(arg)) {
		output.push({ name: "BN", value: new BN(arg).toString() });
	}

	console.log("\nTABLE OUTPUT\n");
	consoleTableWithWrapping(output);
	console.log("\nJSON OUTPUT\n");
	console.log(JSON.stringify(output, null, 4));
}

main();
