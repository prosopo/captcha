// Copyright 2017-2025 @polkadot/util-crypto authors & contributors
// SPDX-License-Identifier: Apache-2.0

import type { DeriveJunction } from "./DeriveJunction.js";

import { keyExtractPath } from "./extractPath.js";

export interface ExtractResult {
	derivePath: string;
	password?: string;
	path: DeriveJunction[];
	phrase: string;
}

const RE_CAPTURE = /^(\w+( \w+)*)((\/\/?[^/]+)*)(\/\/\/(.*))?$/;

/**
 * @description Extracts the phrase, path and password from a SURI format for specifying secret keys `<secret>/<soft-key>//<hard-key>///<password>` (the `///password` may be omitted, and `/<soft-key>` and `//<hard-key>` maybe repeated and mixed).
 */
export function keyExtractSuri(suri: string): ExtractResult {
	// eslint-disable-next-line @typescript-eslint/prefer-regexp-exec
	const matches = suri.match(RE_CAPTURE);

	if (matches === null) {
		throw new Error("Unable to match provided value to a secret URI");
	}

	const [, phrase, , derivePath, , , password] = matches;

	if (!phrase) {
		throw new Error("Unable to extract phrase from provided value");
	}

	const { path } = keyExtractPath(derivePath || "");

	return {
		derivePath: derivePath || "",
		password,
		path,
		phrase,
	};
}
