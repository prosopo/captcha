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

// Asserted against the package entrypoint, which is what consumers import — a
// barrel that stops re-exporting something fails here rather than at a
// downstream build.

import { assertType, describe, expectTypeOf, it } from "vitest";
import {
	LanguageSchema,
	Languages,
	type Ti18n,
	type TranslationKey,
	TranslationKeysSchema,
	createTranslator,
	i18nMiddleware,
	isClientSide,
	loadI18next,
} from "../index.js";

describe("Languages", () => {
	it("is a frozen const map of name to code, not a widened record", () => {
		// `as const` is what lets LanguageSchema derive its enum. Widening this
		// to Record<string, string> would silently turn the schema into a
		// runtime-only constraint.
		expectTypeOf(Languages.english).toEqualTypeOf<"en">();
		expectTypeOf(Languages.chinese).toEqualTypeOf<"zh-CN">();
	});

	it("rejects assignment to a code", () => {
		// @ts-expect-error Languages is const
		Languages.english = "fr";
	});

	it("has no member for a language that is not shipped", () => {
		// @ts-expect-error klingon is not a supported language
		Languages.klingon;
	});
});

describe("LanguageSchema", () => {
	it("parses to a string", () => {
		// The enum is built from a runtime `Object.values` cast, so the parsed
		// type is string rather than the union of codes. Pinned deliberately:
		// a consumer must not assume narrowing it does not get.
		expectTypeOf(LanguageSchema.parse("en")).toEqualTypeOf<string>();
	});

	it("exposes .enum as a lookup of codes", () => {
		expectTypeOf(LanguageSchema.enum).toExtend<Record<string, string>>();
	});

	it("accepts unknown input at the parse boundary", () => {
		expectTypeOf(LanguageSchema.parse).toBeCallableWith("anything");
	});
});

describe("TranslationKey", () => {
	it("is inferred from the schema", () => {
		expectTypeOf<TranslationKey>().toEqualTypeOf<
			ReturnType<typeof TranslationKeysSchema.parse>
		>();
	});

	it("accepts a key literal, so error call sites need no cast", () => {
		// packages/common's ProsopoError takes TranslationKey and is called
		// with literals throughout.
		assertType<TranslationKey>("API.UNKNOWN");
	});

	it("exposes the derived keys as an array of options", () => {
		// A non-empty tuple, which is what z.enum requires and what the mongoose
		// schemas in types-database spread into their `enum` fields.
		expectTypeOf(TranslationKeysSchema.options).toExtend<readonly string[]>();
	});
});

describe("isClientSide", () => {
	it("takes no arguments and returns a boolean", () => {
		expectTypeOf(isClientSide).parameters.toEqualTypeOf<[]>();
		expectTypeOf(isClientSide).returns.toEqualTypeOf<boolean>();
	});
});

describe("loadI18next", () => {
	it("requires the backend flag", () => {
		expectTypeOf(loadI18next).toBeCallableWith(true);
		expectTypeOf(loadI18next).toBeCallableWith(false, "fr");
	});

	it("rejects a call with no arguments", () => {
		// @ts-expect-error the backend flag is required
		loadI18next();
	});

	it("rejects a non-boolean first argument", () => {
		// Catches the easy mistake of passing the language positionally.
		// @ts-expect-error the first parameter is the backend flag
		loadI18next("fr");
	});

	it("resolves to the i18next instance type the package re-exports", () => {
		expectTypeOf(loadI18next).returns.toEqualTypeOf<Promise<Ti18n>>();
	});
});

describe("Ti18n", () => {
	it("carries the i18next surface consumers need", () => {
		expectTypeOf<Ti18n>().toHaveProperty("t");
		expectTypeOf<Ti18n>().toHaveProperty("language");
		expectTypeOf<Ti18n>().toHaveProperty("changeLanguage");
	});
});

describe("i18nMiddleware", () => {
	it("takes handler options and resolves to an express handler", () => {
		expectTypeOf(i18nMiddleware).toBeCallableWith({});
		expectTypeOf(i18nMiddleware).returns.toExtend<Promise<unknown>>();
	});

	it("rejects an unknown option", () => {
		// @ts-expect-error notAnOption is not part of HandleOptions
		i18nMiddleware({ notAnOption: true });
	});

	it("rejects being called with no options", () => {
		// @ts-expect-error options are required
		i18nMiddleware();
	});
});

describe("createTranslator", () => {
	it("is callable with no instance, so a standalone widget can boot one", () => {
		expectTypeOf(createTranslator).toBeCallableWith();
	});

	it("returns the translator surface the widgets render against", () => {
		expectTypeOf(createTranslator).returns.toHaveProperty("t");
		expectTypeOf(createTranslator).returns.toHaveProperty("isReady");
		expectTypeOf(createTranslator).returns.toHaveProperty("subscribe");
		expectTypeOf(createTranslator).returns.toHaveProperty("i18n");
	});

	it("rejects anything that is not an i18next instance", () => {
		// @ts-expect-error the only parameter is an existing i18next instance
		createTranslator({ notAnInstance: 1 });
	});
});
