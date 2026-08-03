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

import type { IUserData, Session, UserCommitment } from "@prosopo/types";
import type { Document, Model } from "mongoose";
import { assertType, describe, expectTypeOf, it } from "vitest";
import {
	type BannedDomain,
	type BannedDomainRecord,
	type CaptchaProperties,
	type ICaptchaDatabase,
	type IClientDatabase,
	type IDatabase,
	type IUserDataSlim,
	type ScheduledTask,
	type ScheduledTaskSchema,
	type SessionRecord,
	type SpamEmailDomain,
	type StoredSession,
	TableNames,
	type Tables,
	type UserCommitmentRecord,
	type UserDataRecord,
} from "./index.js";

describe("record types", () => {
	it("are mongoose documents carrying the domain shape", () => {
		expectTypeOf<UserCommitmentRecord>().toExtend<Document>();
		expectTypeOf<UserCommitmentRecord>().toExtend<UserCommitment>();
		expectTypeOf<SessionRecord>().toExtend<Session>();
		expectTypeOf<UserDataRecord>().toExtend<IUserData>();
	});

	it("keep the plain domain shape free of mongoose", () => {
		expectTypeOf<BannedDomain>().toEqualTypeOf<{ domain: string }>();
		expectTypeOf<SpamEmailDomain>().toEqualTypeOf<{ domain: string }>();
		expectTypeOf<BannedDomainRecord>().toExtend<BannedDomain>();
	});

	it("alias a stored session to the session record itself", () => {
		// The two schemas were merged; keeping the alias means callers on
		// either side of the event store still compile.
		expectTypeOf<StoredSession>().toEqualTypeOf<SessionRecord>();
	});
});

describe("IUserDataSlim", () => {
	it("narrows the user record to what the provider caches", () => {
		expectTypeOf<IUserDataSlim>().toEqualTypeOf<
			Pick<IUserData, "account" | "settings" | "tier">
		>();
	});

	it("drops the fields the provider must not hold", () => {
		// The mnemonic in particular is a secret that belongs only to the
		// client database.
		expectTypeOf<IUserDataSlim>().not.toHaveProperty("mnemonic");
		expectTypeOf<IUserDataSlim>().not.toHaveProperty("email");
	});
});

describe("ScheduledTask", () => {
	it("is inferred from the zod schema", () => {
		expectTypeOf<ScheduledTask>().toEqualTypeOf<
			ReturnType<typeof ScheduledTaskSchema.parse>
		>();
	});

	it("makes only the optional fields optional", () => {
		assertType<ScheduledTask["updated"]>(undefined);
		assertType<ScheduledTask["result"]>(undefined);
		expectTypeOf<ScheduledTask["datetime"]>().toEqualTypeOf<Date>();
	});
});

describe("Tables", () => {
	it("maps every key of the enum to a model", () => {
		expectTypeOf<Tables<TableNames>>().toHaveProperty(TableNames.accounts);
	});

	it("is keyed by the enum, so an unknown table name does not typecheck", () => {
		// @ts-expect-error "sessions" is not a member of TableNames
		const _tables: Tables<TableNames> = { sessions: {} as typeof Model };
	});
});

describe("database interfaces", () => {
	it("extend the shared connection contract", () => {
		expectTypeOf<ICaptchaDatabase>().toExtend<IDatabase>();
		expectTypeOf<IClientDatabase>().toExtend<IDatabase>();
	});

	it("expose the connection lifecycle", () => {
		expectTypeOf<IDatabase["connect"]>().toEqualTypeOf<() => Promise<void>>();
		expectTypeOf<IDatabase["close"]>().toEqualTypeOf<() => Promise<void>>();
		expectTypeOf<IDatabase["connected"]>().toEqualTypeOf<boolean>();
	});
});

describe("CaptchaProperties", () => {
	it("is fully partial, since a filter may name any subset", () => {
		expectTypeOf<CaptchaProperties>().toExtend<Partial<UserCommitment>>();
		assertType<CaptchaProperties>({});
	});
});
