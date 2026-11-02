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

import { describe, expect, it } from "vitest";
import {
	INTEGRATION_HEADER,
	integrationHeaders,
	normaliseIntegration,
} from "./integration.js";

describe("normaliseIntegration", () => {
	it("lowercases and trims a slug", () => {
		expect(normaliseIntegration(" MC4WP ")).toBe("mc4wp");
		expect(normaliseIntegration("gravity-forms")).toBe("gravity-forms");
	});

	it("rejects empty, long and non-slug values", () => {
		expect(normaliseIntegration(undefined)).toBeUndefined();
		expect(normaliseIntegration(null)).toBeUndefined();
		expect(normaliseIntegration("")).toBeUndefined();
		expect(normaliseIntegration("a".repeat(33))).toBeUndefined();
		expect(normaliseIntegration("mc4wp\r\nx-evil: 1")).toBeUndefined();
		expect(normaliseIntegration("-leading-dash")).toBeUndefined();
	});
});

describe("integrationHeaders", () => {
	it("sends the header for a valid name", () => {
		expect(integrationHeaders("mc4wp")).toEqual({
			[INTEGRATION_HEADER]: "mc4wp",
		});
	});

	it("sends nothing without a valid name", () => {
		expect(integrationHeaders(undefined)).toEqual({});
		expect(integrationHeaders("not valid")).toEqual({});
	});
});
