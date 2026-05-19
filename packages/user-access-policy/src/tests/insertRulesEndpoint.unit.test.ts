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

import type { Logger } from "@prosopo/common";
import { describe, expect, it, vi } from "vitest";
import { InsertRulesEndpoint } from "#policy/api/write/insertRules.js";
import { AccessPolicyType } from "#policy/rule.js";
import type { AccessRulesWriter } from "#policy/rulesStorage.js";

const makeMockLogger = (): Logger =>
	({
		trace: vi.fn(),
		debug: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		fatal: vi.fn(),
		log: vi.fn(),
		setLogLevel: vi.fn(),
		getLogLevel: vi.fn().mockReturnValue("info"),
		with: vi.fn().mockReturnThis(),
		getScope: vi.fn().mockReturnValue("test"),
		getPretty: vi.fn().mockReturnValue(false),
		setPretty: vi.fn(),
		getPrintStack: vi.fn().mockReturnValue(false),
		setPrintStack: vi.fn(),
		getFormat: vi.fn().mockReturnValue("json"),
		setFormat: vi.fn(),
	}) satisfies Logger;

const makeWriter = (): AccessRulesWriter => ({
	insertRules: vi.fn().mockResolvedValue(["rule-1", "rule-2"]),
	deleteRules: vi.fn().mockResolvedValue(undefined),
	deleteAllRules: vi.fn().mockResolvedValue(0),
});

const sampleArgs = [
	{
		accessPolicy: { type: AccessPolicyType.Block },
		userScopes: [{ userId: "user-1" }, { userId: "user-2" }],
	},
];

describe("InsertRulesEndpoint logger selection", () => {
	it("uses the per-request logger when one is provided to processRequest", async () => {
		const ctorLogger = makeMockLogger();
		const requestLogger = makeMockLogger();
		const endpoint = new InsertRulesEndpoint(makeWriter(), ctorLogger);

		// processRequest races against a 5s timeout and resolves PROCESSING first;
		// the actual insert + log happens after. Wait long enough for the .then()
		// chain to fire.
		await endpoint.processRequest(sampleArgs, requestLogger);
		await new Promise((r) => setImmediate(r));

		expect(requestLogger.info).toHaveBeenCalled();
		const calls = (requestLogger.info as ReturnType<typeof vi.fn>).mock.calls;
		const msgs = calls.map(([fn]) => (fn as () => { msg: string })().msg);
		expect(msgs).toContain("Endpoint inserted access rules");

		// Constructor logger must not have been touched for the request-path log.
		expect(ctorLogger.info).not.toHaveBeenCalled();
	});

	it("falls back to the constructor logger when no request logger is provided", async () => {
		const ctorLogger = makeMockLogger();
		const endpoint = new InsertRulesEndpoint(makeWriter(), ctorLogger);

		await endpoint.processRequest(sampleArgs);
		await new Promise((r) => setImmediate(r));

		expect(ctorLogger.info).toHaveBeenCalled();
		const msgs = (ctorLogger.info as ReturnType<typeof vi.fn>).mock.calls.map(
			([fn]) => (fn as () => { msg: string })().msg,
		);
		expect(msgs).toContain("Endpoint inserted access rules");
	});
});
