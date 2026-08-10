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

import type {
	IProviderAccount,
	ISite,
	KeyringInstance,
	KeyringPair,
	KeyringPair$Json,
} from "@prosopo/types";
import { assertType, describe, expectTypeOf, it } from "vitest";
import {
	Keyring,
	generateMiniSecret,
	generateMnemonic,
	getDefaultProviders,
	getDefaultSiteKeys,
	getPair,
} from "./index.js";
// The testing helpers and `nobody` are deliberately not re-exported from the
// package barrel, so they are imported from their modules directly.
import type {
	DetectMap,
	DetectPairType,
	TestKeyringMapEthereum,
	TestKeyringMapSubstrate,
} from "./keyring/testingPairs.js";
import { nobody } from "./pair/nobody.js";

describe("Keyring types", () => {
	it("implements the shared KeyringInstance contract", () => {
		expectTypeOf<Keyring>().toExtend<KeyringInstance>();
	});

	it("returns KeyringPair from every add and create method", () => {
		const keyring = new Keyring();
		expectTypeOf(keyring.addFromUri("//Alice")).toEqualTypeOf<KeyringPair>();
		expectTypeOf(keyring.addFromMnemonic("x")).toEqualTypeOf<KeyringPair>();
		expectTypeOf(
			keyring.addFromSeed(new Uint8Array()),
		).toEqualTypeOf<KeyringPair>();
		expectTypeOf(keyring.addFromAddress("x")).toEqualTypeOf<KeyringPair>();
		expectTypeOf(keyring.getPair("x")).toEqualTypeOf<KeyringPair>();
		expectTypeOf(keyring.getPairs()).toEqualTypeOf<KeyringPair[]>();
		expectTypeOf(keyring.publicKeys).toEqualTypeOf<Uint8Array[]>();
		expectTypeOf(keyring.toJson("x")).toEqualTypeOf<KeyringPair$Json>();
	});

	it("accepts an address as either a string or raw bytes", () => {
		const keyring = new Keyring();
		assertType(keyring.getPair("5abc"));
		assertType(keyring.getPair(new Uint8Array(32)));
		// @ts-expect-error a number is not an address
		assertType(keyring.getPair(1));
	});

	it("rejects a keyring option object with an unknown key", () => {
		// @ts-expect-error `curve` is not an option
		new Keyring({ curve: "sr25519" });
	});

	it("has a readonly type", () => {
		expectTypeOf<Keyring["type"]>().toEqualTypeOf<
			import("@prosopo/util-crypto").KeypairType
		>();
	});
});

describe("account helper types", () => {
	it("returns a pair from getPair with every argument optional", () => {
		expectTypeOf(getPair).returns.toEqualTypeOf<KeyringPair>();
		assertType(getPair());
		assertType(getPair("secret", "account", "sr25519", 42));
	});

	it("returns the mnemonic and address as a tuple", () => {
		expectTypeOf(generateMnemonic).returns.resolves.toEqualTypeOf<
			[string, string]
		>();
	});

	it("returns the mini secret as bytes paired with an address", () => {
		expectTypeOf(generateMiniSecret).returns.resolves.toEqualTypeOf<
			[Uint8Array, string]
		>();
	});

	it("describes the dev fixtures with the shared account types", () => {
		expectTypeOf(getDefaultSiteKeys()).toEqualTypeOf<ISite[]>();
		expectTypeOf(getDefaultProviders()).toEqualTypeOf<IProviderAccount[]>();
	});

	it("returns a real KeyringPair for nobody", () => {
		expectTypeOf(nobody()).toEqualTypeOf<KeyringPair>();
	});
});

describe("test keyring map inference", () => {
	it("defaults to the substrate map when no options are given", () => {
		expectTypeOf<DetectPairType<undefined>>().toEqualTypeOf<"sr25519">();
		expectTypeOf<
			DetectMap<undefined>
		>().toEqualTypeOf<TestKeyringMapSubstrate>();
	});

	it("selects the ethereum map only for an ethereum keyring", () => {
		expectTypeOf<
			DetectMap<{ type: "ethereum" }>
		>().toEqualTypeOf<TestKeyringMapEthereum>();
		expectTypeOf<
			DetectMap<{ type: "sr25519" }>
		>().toEqualTypeOf<TestKeyringMapSubstrate>();
	});

	it("indexes the map by arbitrary names, always yielding a pair", () => {
		expectTypeOf<
			TestKeyringMapSubstrate["alice"]
		>().toEqualTypeOf<KeyringPair>();
		expectTypeOf<
			TestKeyringMapSubstrate["anything-else"]
		>().toEqualTypeOf<KeyringPair>();
	});
});
