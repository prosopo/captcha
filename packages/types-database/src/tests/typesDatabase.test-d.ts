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

import type { Logger } from "@prosopo/logger";
import type { Connection, Document } from "mongoose";
import { assertType, describe, expectTypeOf, test } from "vitest";
import type {
	BannedDomain,
	BannedDomainRecord,
	BrowserInfo,
	IDatabase,
	OSInfo,
	SpamEmailDomain,
	SpamEmailDomainRecord,
	StoredSession,
	UserAgentInfo,
} from "../index.js";
import type { SessionRecord } from "../types/provider.js";

describe("the database handle every caller is given", () => {
	test("hands back a live connection, never an optional one", () => {
		// `connection` is optional because it does not exist before connect(),
		// but getConnection() is the accessor callers use and it must not make
		// them null-check.
		expectTypeOf<
			IDatabase["getConnection"]
		>().returns.toEqualTypeOf<Connection>();
		expectTypeOf<IDatabase["connection"]>().toEqualTypeOf<
			Connection | undefined
		>();
	});

	test("connects and closes asynchronously", () => {
		expectTypeOf<IDatabase["connect"]>().returns.toEqualTypeOf<Promise<void>>();
		expectTypeOf<IDatabase["close"]>().returns.toEqualTypeOf<Promise<void>>();
	});

	test("always carries a logger and a connected flag", () => {
		expectTypeOf<IDatabase["logger"]>().toEqualTypeOf<Logger>();
		expectTypeOf<IDatabase["connected"]>().toEqualTypeOf<boolean>();
		expectTypeOf<IDatabase["url"]>().toEqualTypeOf<string>();
		expectTypeOf<IDatabase["dbname"]>().toEqualTypeOf<string>();
	});

	test("cannot be satisfied by an object missing the accessors", () => {
		// @ts-expect-error - a bag of fields is not a database
		const partial: IDatabase = {
			url: "mongodb://localhost",
			dbname: "db",
			connected: false,
		};
		void partial;
	});
});

describe("the records that are just a document plus their fields", () => {
	test("a banned domain record is a mongoose document", () => {
		expectTypeOf<BannedDomainRecord>().toMatchTypeOf<Document>();
		expectTypeOf<BannedDomainRecord>().toMatchTypeOf<BannedDomain>();
		expectTypeOf<BannedDomain>().toEqualTypeOf<{ domain: string }>();
	});

	test("a spam email domain record is shaped the same way", () => {
		expectTypeOf<SpamEmailDomainRecord>().toMatchTypeOf<Document>();
		expectTypeOf<SpamEmailDomain>().toEqualTypeOf<{ domain: string }>();
	});

	test("the two domain records stay distinct types despite the same shape", () => {
		// They live in different collections; only the plain payloads coincide.
		expectTypeOf<BannedDomain>().toEqualTypeOf<SpamEmailDomain>();
		assertType<BannedDomain>({ domain: "example.com" });
	});

	test("a domain is required, not optional", () => {
		// @ts-expect-error - a record with no domain identifies nothing
		const empty: BannedDomain = {};
		void empty;
	});
});

describe("a stored session", () => {
	test("is the live session record itself, not a copy of its fields", () => {
		// The schemas were merged; if these ever diverge, the stored alias has
		// silently stopped tracking the live one.
		expectTypeOf<StoredSession>().toEqualTypeOf<SessionRecord>();
	});
});

describe("the parsed user agent", () => {
	test("guarantees a raw string and a named browser and os", () => {
		// Everything else about a user agent is best-effort, but these three
		// are what the detector rules key off, so they are not optional.
		expectTypeOf<UserAgentInfo["ua"]>().toEqualTypeOf<string>();
		expectTypeOf<BrowserInfo["name"]>().toEqualTypeOf<string>();
		expectTypeOf<OSInfo["name"]>().toEqualTypeOf<string>();
	});

	test("leaves every version and detail optional", () => {
		expectTypeOf<BrowserInfo["version"]>().toEqualTypeOf<string | undefined>();
		expectTypeOf<OSInfo["version"]>().toEqualTypeOf<string | undefined>();
		expectTypeOf<UserAgentInfo["device"]["model"]>().toEqualTypeOf<
			string | undefined
		>();
		expectTypeOf<UserAgentInfo["cpu"]["architecture"]>().toEqualTypeOf<
			string | undefined
		>();
	});

	test("still requires the sub-objects even when they are empty", () => {
		// A parse always produces every section, so consumers can read
		// `info.device.type` without guarding the intermediate.
		assertType<UserAgentInfo>({
			ua: "Mozilla/5.0",
			browser: { name: "Firefox" },
			cpu: {},
			device: {},
			engine: {},
			os: { name: "Linux" },
		});
	});

	test("rejects a parse with no browser section at all", () => {
		// @ts-expect-error - browser is not optional
		const noBrowser: UserAgentInfo = {
			ua: "Mozilla/5.0",
			cpu: {},
			device: {},
			engine: {},
			os: { name: "Linux" },
		};
		void noBrowser;
	});
});
