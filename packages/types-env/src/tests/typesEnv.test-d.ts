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

import type { Keyring } from "@prosopo/keyring";
import type { Logger } from "@prosopo/logger";
import type {
	AssetsResolver,
	EnvironmentTypes,
	IPInfoResponse,
	KeyringPair,
	ProsopoBasicConfigOutput,
	ProsopoConfigOutput,
} from "@prosopo/types";
import type { IProviderDatabase } from "@prosopo/types-database";
import { assertType, describe, expectTypeOf, test } from "vitest";
import type {
	IIpInfoService,
	ProsopoEnvironment,
	ProviderEnvironment,
} from "../index.js";

/**
 * A value of any type, for assertions that care about the shape of a type and
 * not about how one is built. Nothing here is executed: type tests are erased.
 */
const stub = <T>(): T => undefined as T;

/**
 * The members of an environment, inferred rather than annotated, so a test can
 * spread them and replace one member with a value the interface should reject.
 * Annotating the whole thing would widen each member back to its declared type
 * and hide the very mismatch being asserted.
 */
const members = () => ({
	config: stub<ProsopoBasicConfigOutput>(),
	db: stub<IProviderDatabase | undefined>(),
	defaultEnvironment: stub<EnvironmentTypes>(),
	logger: stub<Logger>(),
	assetsResolver: stub<AssetsResolver | undefined>(),
	keyring: stub<Keyring>(),
	pair: stub<KeyringPair | undefined>(),
	authAccount: stub<KeyringPair | undefined>(),
	ipInfoService: stub<IIpInfoService>(),
	getDb: () => stub<IProviderDatabase>(),
	isReady: async (): Promise<void> => undefined,
	importDatabase: async (): Promise<void> => undefined,
});

const environment = (
	overrides: Partial<ProsopoEnvironment> = {},
): ProsopoEnvironment => ({
	config: stub<ProsopoBasicConfigOutput>(),
	db: stub<IProviderDatabase>(),
	defaultEnvironment: stub<EnvironmentTypes>(),
	logger: stub<Logger>(),
	assetsResolver: stub<AssetsResolver>(),
	keyring: stub<Keyring>(),
	pair: stub<KeyringPair>(),
	authAccount: stub<KeyringPair>(),
	ipInfoService: stub<IIpInfoService>(),
	getDb: () => stub<IProviderDatabase>(),
	isReady: async (): Promise<void> => undefined,
	importDatabase: async (): Promise<void> => undefined,
	...overrides,
});

describe("ProsopoEnvironment", () => {
	test("is satisfied by an object carrying every member", () => {
		assertType<ProsopoEnvironment>(environment());
	});

	test("the optional-valued members must still be present as keys", () => {
		// They are typed `T | undefined` rather than `T?`, so an environment that
		// simply omits them is a bug the compiler has to catch: consumers read
		// env.db and branch on it, and a missing key would read as "not connected"
		// on one code path while another had already used it.
		const withoutDb: Omit<ProsopoEnvironment, "db"> = environment();
		// @ts-expect-error db is required, even though its value may be undefined
		assertType<ProsopoEnvironment>(withoutDb);

		const withoutPair: Omit<ProsopoEnvironment, "pair"> = environment();
		// @ts-expect-error pair is required, even though its value may be undefined
		assertType<ProsopoEnvironment>(withoutPair);
	});

	test("undefined is an accepted value for the members that allow it", () => {
		// These four are how "not connected yet" and "no assets configured" are
		// spelt, so they have to be settable to undefined and not merely omitted.
		assertType<ProsopoEnvironment>({
			...members(),
			db: undefined,
			pair: undefined,
			authAccount: undefined,
			assetsResolver: undefined,
		});
	});

	test("the members that must always be there reject undefined", () => {
		// @ts-expect-error an environment without a logger has nowhere to report
		assertType<ProsopoEnvironment>({ ...members(), logger: undefined });
		// @ts-expect-error the keyring is what signs; there is no working default
		assertType<ProsopoEnvironment>({ ...members(), keyring: undefined });
		// @ts-expect-error ip lookups are a hard dependency of the provider
		assertType<ProsopoEnvironment>({ ...members(), ipInfoService: undefined });
		// @ts-expect-error config is read on nearly every request path
		assertType<ProsopoEnvironment>({ ...members(), config: undefined });
		// @ts-expect-error getDb is the accessor every caller is meant to use
		assertType<ProsopoEnvironment>({ ...members(), getDb: undefined });
	});

	test("getDb narrows away the undefined that reading db directly leaves", () => {
		// This is the whole point of the accessor: callers that cannot cope with a
		// missing database call getDb() and get a database or an exception, rather
		// than having to widen their own types.
		expectTypeOf<ProsopoEnvironment["db"]>().toEqualTypeOf<
			IProviderDatabase | undefined
		>();
		expectTypeOf<
			ProsopoEnvironment["getDb"]
		>().returns.toEqualTypeOf<IProviderDatabase>();
		expectTypeOf<ProsopoEnvironment["getDb"]>().parameters.toEqualTypeOf<[]>();
	});

	test("the lifecycle methods are asynchronous and answer nothing", () => {
		// Returning a value would invite callers to treat isReady as a predicate;
		// it either resolves or throws.
		expectTypeOf<ProsopoEnvironment["isReady"]>().toEqualTypeOf<
			() => Promise<void>
		>();
		expectTypeOf<ProsopoEnvironment["importDatabase"]>().toEqualTypeOf<
			() => Promise<void>
		>();
	});

	test("has exactly the members it declares", () => {
		// A member added without thought here lands on every implementation of the
		// interface, so the list is worth pinning.
		expectTypeOf<keyof ProsopoEnvironment>().toEqualTypeOf<
			| "config"
			| "db"
			| "defaultEnvironment"
			| "logger"
			| "assetsResolver"
			| "keyring"
			| "pair"
			| "authAccount"
			| "ipInfoService"
			| "getDb"
			| "isReady"
			| "importDatabase"
		>();
	});
});

describe("ProviderEnvironment", () => {
	test("is a ProsopoEnvironment, so it can be passed anywhere one is wanted", () => {
		assertType<ProsopoEnvironment>(stub<ProviderEnvironment>());
	});

	test("narrows the config to the full provider config", () => {
		// A provider reads keys the basic config does not carry, so widening this
		// back to the basic config would move the failure to runtime.
		expectTypeOf<
			ProviderEnvironment["config"]
		>().toEqualTypeOf<ProsopoConfigOutput>();
		expectTypeOf<ProsopoConfigOutput>().toExtend<ProsopoBasicConfigOutput>();
	});

	test("a basic config is not enough to build one", () => {
		const basic: Omit<ProviderEnvironment, "config"> & {
			config: ProsopoBasicConfigOutput;
		} = stub();
		// @ts-expect-error the provider config is the narrower of the two
		assertType<ProviderEnvironment>(basic);
	});

	test("the dataset id is optional, because it is only known after import", () => {
		expectTypeOf<ProviderEnvironment["datasetId"]>().toEqualTypeOf<
			string | undefined
		>();
		const noDataset: Omit<ProviderEnvironment, "datasetId"> = stub();
		assertType<ProviderEnvironment>(noDataset);
	});

	test("adds nothing else to the environment", () => {
		expectTypeOf<
			Exclude<keyof ProviderEnvironment, keyof ProsopoEnvironment>
		>().toEqualTypeOf<"datasetId">();
	});
});

describe("IIpInfoService", () => {
	test("is satisfied by a plain implementation", () => {
		assertType<IIpInfoService>({
			initialize: async (): Promise<void> => undefined,
			lookup: async (_ip: string): Promise<IPInfoResponse> =>
				stub<IPInfoResponse>(),
			isAvailable: (): boolean => true,
		});
	});

	test("availability is answered synchronously", () => {
		// Callers check it on the request path; a promise here would either be
		// awaited in a hot loop or, worse, treated as always truthy.
		expectTypeOf<IIpInfoService["isAvailable"]>().toEqualTypeOf<
			() => boolean
		>();
	});

	test("a lookup takes an ip as a string and resolves to a response", () => {
		expectTypeOf<IIpInfoService["lookup"]>()
			.parameter(0)
			.toEqualTypeOf<string>();
		expectTypeOf<IIpInfoService["lookup"]>().returns.toEqualTypeOf<
			Promise<IPInfoResponse>
		>();
	});

	test("a lookup reports failure by rejecting, not by resolving to null", () => {
		// Resolving null would be silently indistinguishable from "no data for
		// this ip", which the response type already expresses.
		expectTypeOf<
			Awaited<ReturnType<IIpInfoService["lookup"]>>
		>().not.toBeNullable();
	});

	test("initialize is asynchronous, so a service may load a database", () => {
		expectTypeOf<IIpInfoService["initialize"]>().toEqualTypeOf<
			() => Promise<void>
		>();
	});

	test("has exactly the three members an implementation must provide", () => {
		expectTypeOf<keyof IIpInfoService>().toEqualTypeOf<
			"initialize" | "lookup" | "isAvailable"
		>();
	});
});

describe("the package entrypoint", () => {
	test("re-exports every type the package declares", () => {
		expectTypeOf<ProsopoEnvironment>().not.toBeNever();
		expectTypeOf<ProviderEnvironment>().not.toBeNever();
		expectTypeOf<IIpInfoService>().not.toBeNever();
	});
});
