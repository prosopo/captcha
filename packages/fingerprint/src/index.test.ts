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

import { type UnknownComponents, hashComponents } from "@prosopo/fingerprintjs";
import { describe, expect, it } from "vitest";
import { forIdentity } from "./index.js";

const asComponents = (values: Record<string, unknown>): UnknownComponents =>
	Object.fromEntries(
		Object.entries(values).map(([key, value]) => [key, { value, duration: 1 }]),
	);

describe("forIdentity", () => {
	const device: Record<string, unknown> = {
		platform: "MacIntel",
		fonts: ["Arial"],
		audio: 1.5,
	};
	const withBucket: Record<string, unknown> = {
		...device,
		deviceBucket: "9f1c3a0e",
	};

	it("leaves the visitorId where it was before deviceBucket existed", () => {
		expect(hashComponents(forIdentity(asComponents(withBucket)))).toBe(
			hashComponents(asComponents(device)),
		);
	});

	it("would have moved it without the exclusion", () => {
		expect(hashComponents(asComponents(withBucket))).not.toBe(
			hashComponents(asComponents(device)),
		);
	});

	it("keeps every other component", () => {
		expect(Object.keys(forIdentity(asComponents(withBucket)))).toStrictEqual(
			Object.keys(device),
		);
	});
});
