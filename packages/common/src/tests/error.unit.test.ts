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

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
	type ErrorDescription,
	MAX_REPORTED_ISSUES,
	ProsopoError,
	type ZodLikeError,
	boundedIssues,
	describeError,
	isProsopoError,
	isSevereError,
	isZodError,
	toApiError,
	toProsopoError,
	toPublicError,
} from "../error.js";
import { ERROR_CODES, isErrorCode } from "../errorCodes.js";

declare module "../error.js" {
	interface ErrorSites {
		"TEST-1": true;
		"TEST-2": true;
	}
}

const zodError = (count: number): ZodLikeError => ({
	name: "ZodError",
	message: "[]",
	issues: Array.from({ length: count }, (_, i) => ({ path: [i] })),
});

const asDescription = (value: ErrorDescription | string): ErrorDescription => {
	if (typeof value === "string") throw new Error(`not described: ${value}`);
	return value;
};

describe("ProsopoError", () => {
	it("takes status, visibility and message from the code", () => {
		const err = new ProsopoError({
			code: "NO_SESSION_FOUND",
			errorSite: "TEST-1",
		});
		expect(err.message).toBe("No session found");
		expect(err.status).toBe(400);
		expect(err.isPublic).toBe(true);
		expect(err.errorId).toBe("NO_SESSION_FOUND:TEST-1");
		expect(err.name).toBe("ProsopoError");
		expect(err).toBeInstanceOf(Error);
	});

	it("defaults to 500 and not public", () => {
		const err = new ProsopoError({ code: "UNEXPECTED", errorSite: "TEST-1" });
		expect(err.status).toBe(500);
		expect(err.isPublic).toBe(false);
	});

	it("lets the throw override message, status and visibility", () => {
		const err = new ProsopoError({
			code: "DB_QUERY_FAILED",
			errorSite: "TEST-2",
			message: "Failed to get captcha",
			status: 502,
			public: true,
		});
		expect(err.message).toBe("Failed to get captcha");
		expect(err.status).toBe(502);
		expect(err.isPublic).toBe(true);
	});

	it("keeps the cause", () => {
		const cause = new Error("boom");
		const err = new ProsopoError({
			code: "UNEXPECTED",
			errorSite: "TEST-1",
			cause,
		});
		expect(err.cause).toBe(cause);
	});

	it("is an immutable snapshot of its context and data", () => {
		const context: Record<string, unknown> = { siteKey: "a" };
		const err = new ProsopoError({
			code: "UNEXPECTED",
			errorSite: "TEST-1",
			context,
			data: { n: 1 },
		});
		context.siteKey = "b";
		expect(err.context.siteKey).toBe("a");
		expect(Object.isFrozen(err)).toBe(true);
		expect(Object.isFrozen(err.context)).toBe(true);
		expect(Object.isFrozen(err.data)).toBe(true);
	});
});

describe("isProsopoError", () => {
	const err = new ProsopoError({
		code: "NO_SESSION_FOUND",
		errorSite: "TEST-1",
	});

	it("matches any ProsopoError without codes", () => {
		expect(isProsopoError(err)).toBe(true);
		expect(isProsopoError(new Error("x"))).toBe(false);
		expect(isProsopoError("x")).toBe(false);
	});

	it("matches only the given codes", () => {
		expect(isProsopoError(err, "NO_SESSION_FOUND")).toBe(true);
		expect(isProsopoError(err, "UNEXPECTED", "NO_SESSION_FOUND")).toBe(true);
		expect(isProsopoError(err, "UNEXPECTED")).toBe(false);
	});

	it("narrows the code", () => {
		const caught: unknown = err;
		if (!isProsopoError(caught, "NO_SESSION_FOUND"))
			throw new Error("expected a match");
		const code: "NO_SESSION_FOUND" = caught.code;
		expect(code).toBe("NO_SESSION_FOUND");
	});

	it("matches a ProsopoError from another copy of the package", () => {
		const foreign = Object.assign(new Error("x"), {
			name: "ProsopoError",
			code: "UNEXPECTED",
			errorSite: "TEST-1",
		});
		expect(isProsopoError(foreign)).toBe(true);
	});
});

describe("isErrorCode", () => {
	it("accepts only registered codes", () => {
		expect(isErrorCode("NO_SESSION_FOUND")).toBe(true);
		expect(isErrorCode("toString")).toBe(false);
		expect(isErrorCode("CAPTCHA.NO_SESSION_FOUND")).toBe(false);
		expect(isErrorCode(1)).toBe(false);
	});

	it("names every code in screaming snake case", () => {
		for (const code of Object.keys(ERROR_CODES))
			expect(code).toMatch(/^[A-Z][A-Z0-9_]*$/);
	});

	it("is the only thing the widget translates errors by", () => {
		const widget: { ERRORS: Record<string, string> } = JSON.parse(
			readFileSync(
				new URL("../../../locale/src/locales/en/widget.json", import.meta.url),
				"utf8",
			),
		);
		const unknown = Object.keys(widget.ERRORS).filter(
			(code: string) => !isErrorCode(code),
		);
		expect(unknown).toEqual([]);
	});
});

describe("isZodError and boundedIssues", () => {
	it("recognises zod errors by name", () => {
		expect(isZodError(zodError(1))).toBe(true);
		expect(isZodError(new Error("x"))).toBe(false);
		expect(isZodError(null)).toBe(false);
	});

	it("caps reported issues", () => {
		const bounded = boundedIssues(zodError(MAX_REPORTED_ISSUES + 5));
		expect(bounded.issueCount).toBe(MAX_REPORTED_ISSUES + 5);
		expect(bounded.issues).toHaveLength(MAX_REPORTED_ISSUES);
	});

	it("falls back to the message when there is no issue list", () => {
		expect(
			boundedIssues({ name: "ZodError", message: '[{"a":1}]' }),
		).toStrictEqual({ issueCount: 1, issues: [{ a: 1 }] });
		expect(boundedIssues({ name: "ZodError", message: "oops" })).toStrictEqual({
			issueCount: 1,
			issues: ["oops"],
		});
	});
});

describe("toProsopoError", () => {
	it("returns a ProsopoError unchanged", () => {
		const err = new ProsopoError({ code: "FORBIDDEN", errorSite: "TEST-1" });
		expect(toProsopoError(err, "TEST-2")).toBe(err);
	});

	it("turns a zod error into INVALID_REQUEST with bounded issues", () => {
		const err = toProsopoError(zodError(20), "TEST-2");
		expect(err.code).toBe("INVALID_REQUEST");
		expect(err.errorSite).toBe("TEST-2");
		expect(err.data.issueCount).toBe(20);
	});

	it("turns a SyntaxError into INVALID_REQUEST", () => {
		const err = toProsopoError(new SyntaxError("bad json"), "TEST-2");
		expect(err.code).toBe("INVALID_REQUEST");
		expect(err.status).toBe(400);
	});

	it("keeps the status of an exposed 4xx http-error", () => {
		const tooLarge = Object.assign(new Error("too large"), {
			status: 413,
			expose: true,
		});
		const err = toProsopoError(tooLarge, "TEST-2");
		expect(err.code).toBe("INVALID_REQUEST");
		expect(err.status).toBe(413);
	});

	it("treats anything else as UNEXPECTED", () => {
		const unexposed = Object.assign(new Error("x"), { status: 404 });
		expect(toProsopoError(unexposed, "TEST-2").code).toBe("UNEXPECTED");
		expect(toProsopoError("x", "TEST-2").code).toBe("UNEXPECTED");
		expect(toProsopoError(new Error("x"), "TEST-2").status).toBe(500);
	});
});

describe("toPublicError and toApiError", () => {
	it("sends a public error's code, message and data", () => {
		const err = new ProsopoError({
			code: "DOMAIN_LIMIT_REACHED",
			errorSite: "TEST-1",
			context: { secret: "s" },
			data: { limit: 3 },
		});
		expect(toPublicError(err, "BACKEND_ERROR")).toStrictEqual({
			code: "DOMAIN_LIMIT_REACHED",
			errorId: "DOMAIN_LIMIT_REACHED:TEST-1",
			status: 400,
			message: "Domain limit reached",
			data: { limit: 3 },
		});
	});

	it("omits empty data", () => {
		const err = new ProsopoError({ code: "FORBIDDEN", errorSite: "TEST-1" });
		expect(toPublicError(err, "BACKEND_ERROR")).not.toHaveProperty("data");
	});

	it("reduces a non-public error to its origin and site", () => {
		const err = new ProsopoError({
			code: "DB_UNAVAILABLE",
			errorSite: "TEST-1",
			data: { host: "h" },
		});
		expect(toPublicError(err, "FRONTEND_ERROR")).toStrictEqual({
			code: "FRONTEND_ERROR",
			errorId: "FRONTEND_ERROR:TEST-1",
			status: 503,
		});
	});

	it("wraps the public error in the response envelope", () => {
		const result = toApiError(new Error("x"), "TEST-2");
		expect(result.status).toBe(500);
		expect(result.error.code).toBe("UNEXPECTED");
		expect(result.body).toStrictEqual({
			error: {
				code: "BACKEND_ERROR",
				errorId: "BACKEND_ERROR:TEST-2",
				status: 500,
			},
		});
	});
});

describe("describeError", () => {
	it("describes a ProsopoError and its cause chain", () => {
		const err = new ProsopoError({
			code: "DB_QUERY_FAILED",
			errorSite: "TEST-1",
			cause: new Error("socket closed"),
			context: { siteKey: "a", error: zodError(20) },
		});
		const described = asDescription(describeError(err));
		expect(described.code).toBe("DB_QUERY_FAILED");
		expect(described.errorId).toBe("DB_QUERY_FAILED:TEST-1");
		expect(described.data).toBeUndefined();
		expect(described.context?.siteKey).toBe("a");
		expect(described.context?.error).toStrictEqual(boundedIssues(zodError(20)));
		expect(asDescription(described.cause ?? "").message).toBe("socket closed");
	});

	it("bounds a zod error's issues", () => {
		const zod = Object.assign(new Error("[huge]"), zodError(50));
		const described = asDescription(describeError(zod));
		expect(described.message).toBe("Validation failed");
		expect(described.issues?.issues).toHaveLength(MAX_REPORTED_ISSUES);
	});

	it("stringifies a non-error", () => {
		expect(describeError(42)).toBe("42");
	});

	it("stops following causes at a fixed depth", () => {
		let err = new Error("root");
		for (let i = 0; i < 20; i++)
			err = Object.assign(new Error(`level ${i}`), { cause: err });
		let described: ErrorDescription | string | undefined = describeError(err);
		let depth = 0;
		while (typeof described === "object" && described.cause !== undefined) {
			described = described.cause;
			depth++;
		}
		expect(depth).toBe(5);
	});
});

describe("isSevereError", () => {
	it("is true for 5xx only", () => {
		expect(
			isSevereError(
				new ProsopoError({ code: "UNEXPECTED", errorSite: "TEST-1" }),
			),
		).toBe(true);
		expect(
			isSevereError(
				new ProsopoError({ code: "FORBIDDEN", errorSite: "TEST-1" }),
			),
		).toBe(false);
	});
});
