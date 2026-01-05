// Copyright 2021-2025 Prosopo (UK) Ltd.
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

import { describe, expect, expectTypeOf, it } from "vitest";
import {
	ProcaptchaComponent,
	type ProcaptchaLanguages,
	type ProcaptchaRenderOptions,
	type ProcaptchaType,
} from "./index.js";

describe("index exports", () => {
	it("exports ProcaptchaComponent", () => {
		expect(ProcaptchaComponent).toBeDefined();
		expectTypeOf(ProcaptchaComponent).toBeFunction();
	});

	it("exports ProcaptchaRenderOptions type", () => {
		expectTypeOf<ProcaptchaRenderOptions>().toMatchTypeOf<{
			siteKey: string;
		}>();
	});

	it("exports ProcaptchaType type", () => {
		expectTypeOf<ProcaptchaType>().toMatchTypeOf<string>();
	});

	it("exports ProcaptchaLanguages type", () => {
		expectTypeOf<ProcaptchaLanguages>().toMatchTypeOf<string>();
	});

	it("ProcaptchaComponent accepts correct parameter types", () => {
		type ComponentProps = Parameters<typeof ProcaptchaComponent>[0];
		expectTypeOf<ComponentProps>().toMatchTypeOf<{
			siteKey: string;
			htmlAttributes?: Record<string, unknown>;
		}>();
	});

	it("ProcaptchaComponent returns correct return type", () => {
		type ComponentReturn = ReturnType<typeof ProcaptchaComponent>;
		expectTypeOf<ComponentReturn>().toMatchTypeOf<import("react").ReactNode>();
	});
});
