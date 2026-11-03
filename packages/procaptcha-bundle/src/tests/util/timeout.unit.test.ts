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

import type { ProcaptchaClientConfigOutput } from "@prosopo/types";
import { afterEach, describe, expect, it, vi } from "vitest";
import { setValidChallengeLength } from "../../util/timeout.js";

const makeConfig = () => {
	const captchas = {
		image: { solutionTimeout: 1000 },
		pow: { solutionTimeout: 2000 },
	};
	// Only the two timeouts are read or written.
	const config = { captchas } as ProcaptchaClientConfigOutput;
	return { config, captchas };
};

const elementWith = (value: string | null): Element => {
	const element = document.createElement("div");
	if (value !== null)
		element.setAttribute("data-challenge-valid-length", value);
	return element;
};

describe("setValidChallengeLength", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("applies a render option to both captcha types", () => {
		const { config, captchas } = makeConfig();
		setValidChallengeLength(
			{ siteKey: "site", "challenge-valid-length": "60" },
			elementWith(null),
			config,
		);
		expect(captchas.image.solutionTimeout).toBe(60);
		expect(captchas.pow.solutionTimeout).toBe(60);
	});

	it("falls back to the data attribute", () => {
		const { config, captchas } = makeConfig();
		setValidChallengeLength(undefined, elementWith("90"), config);
		expect(captchas.pow.solutionTimeout).toBe(90);
	});

	it("leaves the defaults when nothing is set", () => {
		const { config, captchas } = makeConfig();
		setValidChallengeLength(undefined, elementWith(null), config);
		expect(captchas.image.solutionTimeout).toBe(1000);
	});

	it.each(["abc", "60s", "0", "-5", "1.5"])(
		"keeps the defaults for invalid value %s",
		(value) => {
			const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
			const { config, captchas } = makeConfig();
			setValidChallengeLength(undefined, elementWith(value), config);
			expect(captchas.image.solutionTimeout).toBe(1000);
			expect(captchas.pow.solutionTimeout).toBe(2000);
			expect(warn).toHaveBeenCalledOnce();
		},
	);
});
