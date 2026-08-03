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

import { afterEach, describe, expect, test } from "vitest";
import addDataAttr from "../util/index.js";

/**
 * The attribute mapper decides what ends up in the shipped DOM: `dev` entries
 * are hooks for the end-to-end suite and must not survive a production build.
 */
const withNodeEnv = (value: string | undefined, run: () => void): void => {
	const previous = process.env.NODE_ENV;
	if (value === undefined) {
		Reflect.deleteProperty(process.env, "NODE_ENV");
	} else {
		process.env.NODE_ENV = value;
	}
	try {
		run();
	} finally {
		if (previous === undefined) {
			Reflect.deleteProperty(process.env, "NODE_ENV");
		} else {
			process.env.NODE_ENV = previous;
		}
	}
};

afterEach(() => {
	process.env.NODE_ENV = "test";
});

describe("addDataAttr", () => {
	test("prefixes every general key with data-", () => {
		expect(addDataAttr({ general: { cy: "widget", role: "box" } })).toEqual({
			"data-cy": "widget",
			"data-role": "box",
		});
	});

	test("returns nothing at all when handed nothing", () => {
		expect(addDataAttr({})).toEqual({});
	});

	test("treats an empty general map as no attributes", () => {
		expect(addDataAttr({ general: {} })).toEqual({});
	});

	test("keeps an empty string value rather than dropping the key", () => {
		expect(addDataAttr({ general: { cy: "" } })).toEqual({ "data-cy": "" });
	});

	test("emits dev attributes outside production", () => {
		withNodeEnv("development", () => {
			expect(addDataAttr({ dev: { cy: "button-next" } })).toEqual({
				"data-cy": "button-next",
			});
		});
	});

	test("drops dev attributes in a production build", () => {
		// These exist only for the end-to-end suite; shipping them hands an
		// automated solver a stable selector for every control.
		withNodeEnv("production", () => {
			expect(addDataAttr({ dev: { cy: "button-next" } })).toEqual({});
		});
	});

	test("keeps general attributes in production", () => {
		withNodeEnv("production", () => {
			expect(addDataAttr({ general: { cy: "widget" } })).toEqual({
				"data-cy": "widget",
			});
		});
	});

	test("treats an unset NODE_ENV as non-production", () => {
		withNodeEnv(undefined, () => {
			expect(addDataAttr({ dev: { cy: "button-next" } })).toEqual({
				"data-cy": "button-next",
			});
		});
	});

	test("lets a dev attribute override the general one of the same name", () => {
		withNodeEnv("development", () => {
			expect(
				addDataAttr({ general: { cy: "general" }, dev: { cy: "dev" } }),
			).toEqual({ "data-cy": "dev" });
		});
	});

	test("leaves the general value in place once dev entries are stripped", () => {
		withNodeEnv("production", () => {
			expect(
				addDataAttr({ general: { cy: "general" }, dev: { cy: "dev" } }),
			).toEqual({ "data-cy": "general" });
		});
	});

	test("does not mutate the map it was given", () => {
		const general = { cy: "widget" };
		addDataAttr({ general });
		expect(general).toEqual({ cy: "widget" });
	});
});
