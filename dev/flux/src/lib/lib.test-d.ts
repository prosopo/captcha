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
import { assertType, describe, expectTypeOf, it } from "vitest";
import { errorHandler, streamToJson } from "../errorHandler.js";
import type { AppUpdateSpecification } from "./appUpdateSpecification.js";
import { getAuth, main, verifyLogin } from "./auth.js";
import { encryptMessage } from "./encryptMessage.js";
import { formatEnvToArray } from "./formatEnv.js";
import { sign, wifToPrivateKey } from "./sep256k1Sign.js";
import {
	getNodeAPIURL,
	getSocketURL,
	getZelIdAuthHeader,
	prefixIPAddress,
} from "./url.js";

interface Payload {
	status: string;
}

describe("url helpers", () => {
	it("map urls to urls", () => {
		expectTypeOf(getSocketURL).returns.toEqualTypeOf<URL>();
		expectTypeOf(prefixIPAddress).returns.toEqualTypeOf<URL>();
		expectTypeOf(getNodeAPIURL).returns.toEqualTypeOf<URL>();
	});

	it("take a URL for the socket helper but a string elsewhere", () => {
		expectTypeOf(getSocketURL).toBeCallableWith(new URL("http://a"));
		expectTypeOf(prefixIPAddress).toBeCallableWith("1.2.3.4");
		expectTypeOf(getNodeAPIURL).toBeCallableWith("1.2.3.4");
	});

	it("reject a string where a URL is required", () => {
		// @ts-expect-error the socket helper needs a parsed URL
		assertType(getSocketURL("http://a"));
	});

	it("build the auth header from three strings", () => {
		expectTypeOf(getZelIdAuthHeader).toBeCallableWith("a", "b", "c");
		expectTypeOf(getZelIdAuthHeader).returns.toEqualTypeOf<string>();
	});
});

describe("errorHandler", () => {
	it("narrows to the caller's payload type", () => {
		expectTypeOf(
			errorHandler<Payload>,
		).returns.resolves.toEqualTypeOf<Payload>();
	});

	it("reads a byte stream", () => {
		expectTypeOf(streamToJson)
			.parameter(0)
			.toEqualTypeOf<ReadableStream<Uint8Array>>();
	});
});

describe("signing", () => {
	it("takes a partial keypair and resolves to bytes", () => {
		expectTypeOf(sign).toBeCallableWith("m", {});
		expectTypeOf(sign).returns.resolves.toExtend<Uint8Array>();
	});

	it("turns a WIF string into raw key bytes", () => {
		expectTypeOf(wifToPrivateKey).returns.toEqualTypeOf<Uint8Array>();
	});

	it("rejects a raw key in place of a keypair", () => {
		// @ts-expect-error the second argument is a keypair, not the key itself
		assertType(sign("m", new Uint8Array()));
	});
});

describe("auth", () => {
	it("resolves getAuth to the phrase and its signature", () => {
		expectTypeOf(getAuth).returns.resolves.toExtend<{
			signature: string;
			loginPhrase: string;
		}>();
	});

	it("resolves main to node urls and credentials", () => {
		expectTypeOf(main).returns.resolves.toExtend<{
			nodeUIURL: URL;
			nodeAPIURL: URL;
			nodeLoginPhrase: string;
			nodeSignature: string;
		}>();
	});

	it("treats the node url of verifyLogin as optional", () => {
		expectTypeOf(verifyLogin).toBeCallableWith("a", "b", "c");
		expectTypeOf(verifyLogin).toBeCallableWith(
			"a",
			"b",
			"c",
			new URL("http://a"),
		);
	});

	it("treats the app name and ip of main as optional", () => {
		expectTypeOf(main).toBeCallableWith("zel", new Uint8Array());
	});
});

describe("misc helpers", () => {
	it("formats an env file to a single string", () => {
		expectTypeOf(formatEnvToArray).returns.toEqualTypeOf<string>();
	});

	it("resolves encryptMessage to a stream or null", () => {
		expectTypeOf(encryptMessage).parameter(1).toEqualTypeOf<string[]>();
		expectTypeOf(encryptMessage).returns.resolves.toBeNullable();
	});

	it("describes a flux app update with a compose list", () => {
		expectTypeOf<AppUpdateSpecification["compose"]>().toBeArray();
		expectTypeOf<AppUpdateSpecification["nodes"]>().toEqualTypeOf<string[]>();
	});
});
