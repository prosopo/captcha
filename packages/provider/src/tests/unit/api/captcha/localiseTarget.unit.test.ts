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
	TranslateFn,
	TranslateOptions,
	TranslationKey,
} from "@prosopo/locale";
import { type Logger, getLogger } from "@prosopo/logger";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { localiseTarget } from "../../../../api/captcha/localiseTarget.js";

// Stands in for req.t on a Turkish request.
const turkish: Partial<Record<TranslationKey, string>> = {
	"TARGET.owl": "baykuş",
	"TARGET.fire-hydrant": "yangın musluğu",
};

const t = vi.fn<TranslateFn>(
	(key: TranslationKey, _options?: TranslateOptions): string =>
		turkish[key] ?? key,
);

let logger: Logger;

beforeEach(() => {
	t.mockClear();
	logger = getLogger("error", "test:localiseTarget");
});

describe("localiseTarget", () => {
	it("translates a known label under its TARGET key", () => {
		expect(localiseTarget(t, "owl", logger)).toBe("baykuş");
		expect(t).toHaveBeenCalledWith("TARGET.owl");
	});

	it("translates a hyphenated label", () => {
		expect(localiseTarget(t, "fire-hydrant", logger)).toBe("yangın musluğu");
	});

	it("shows an unknown label as-is rather than the raw TARGET. key", () => {
		const warn = vi.spyOn(logger, "warn");
		expect(localiseTarget(t, "zeppelin", logger)).toBe("zeppelin");
		expect(t).not.toHaveBeenCalled();
		expect(warn).toHaveBeenCalledTimes(1);
	});

	it("logs the unknown label so the gap can be filled", () => {
		const warn = vi.spyOn(logger, "warn");
		localiseTarget(t, "zeppelin", logger);
		const [record] = warn.mock.calls[0] ?? [];
		expect(record?.()).toEqual({
			msg: "Captcha target has no translation key",
			data: { target: "zeppelin" },
		});
	});

	it("does not warn for a known label", () => {
		const warn = vi.spyOn(logger, "warn");
		localiseTarget(t, "owl", logger);
		expect(warn).not.toHaveBeenCalled();
	});
});
