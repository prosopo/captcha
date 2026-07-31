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

import type { Languages } from "@prosopo/locale";
import type { CaptchaType, ProcaptchaRenderOptions } from "@prosopo/types";
import { assertType, describe, expectTypeOf, it } from "vitest";
import type {
	ProcaptchaRenderOptions as ExportedRenderOptions,
	ProcaptchaLanguages,
	ProcaptchaType,
} from "../index.js";
import { renderProcaptcha } from "../index.js";
import {
	type RendererFunction,
	loadRenderFunction,
	loadScript,
} from "../render/renderFunction.js";
import {
	type LoadRenderFunction,
	type RendererSettings,
	createRenderer,
} from "../render/renderer.js";

// This package is published, so these types are its contract with consumers.
// Runtime tests cannot catch a signature that silently widens or drifts.

describe("RendererFunction", () => {
	it("takes an element and options, and resolves to void", () => {
		expectTypeOf<RendererFunction>().parameters.toEqualTypeOf<
			[HTMLElement, ProcaptchaRenderOptions]
		>();
		expectTypeOf<RendererFunction>().returns.toEqualTypeOf<Promise<void>>();
	});

	it("does not accept a bare Element for the mount point", () => {
		// Narrower than Element on purpose: the render script sets style and
		// dataset properties that only exist on HTMLElement.
		expectTypeOf<Element>().not.toMatchTypeOf<
			Parameters<RendererFunction>[0]
		>();
	});

	it("requires a siteKey in the options", () => {
		assertType<Parameters<RendererFunction>[1]>({ siteKey: "site-key" });
		// @ts-expect-error siteKey is mandatory
		assertType<Parameters<RendererFunction>[1]>({});
	});

	it("rejects an unknown option key", () => {
		assertType<Parameters<RendererFunction>[1]>({
			siteKey: "site-key",
			// @ts-expect-error not part of the render options
			notAnOption: true,
		});
	});
});

describe("renderProcaptcha", () => {
	it("is exposed as a RendererFunction", () => {
		expectTypeOf(renderProcaptcha).toEqualTypeOf<RendererFunction>();
	});
});

describe("re-exported types", () => {
	it("aliases the shared types rather than redeclaring them", () => {
		// These are the names consumers import; they must stay tied to the
		// shared definitions so a change upstream is not silently absorbed.
		expectTypeOf<ProcaptchaType>().toEqualTypeOf<CaptchaType>();
		expectTypeOf<ExportedRenderOptions>().toEqualTypeOf<ProcaptchaRenderOptions>();
	});

	it("exports the language union as a usable type", () => {
		// `Languages` is a const object with no type meaning, so re-exporting the
		// name as a type produced a binding consumers could not use at all.
		expectTypeOf<ProcaptchaLanguages>().toEqualTypeOf<
			(typeof Languages)[keyof typeof Languages]
		>();
		assertType<ProcaptchaLanguages>("en");
	});

	it("keeps the language union aligned with the render options", () => {
		expectTypeOf<ProcaptchaLanguages>().toEqualTypeOf<
			NonNullable<ProcaptchaRenderOptions["language"]>
		>();
	});

	it("rejects a language outside the union", () => {
		// @ts-expect-error not a supported language
		assertType<ProcaptchaLanguages>("not-a-language");
	});
});

describe("createRenderer", () => {
	it("returns a RendererFunction", () => {
		expectTypeOf(createRenderer).returns.toEqualTypeOf<RendererFunction>();
	});

	it("takes settings and an optional loader override", () => {
		expectTypeOf(createRenderer).parameters.toEqualTypeOf<
			[RendererSettings, (LoadRenderFunction | undefined)?]
		>();
	});

	it("accepts a call with settings alone", () => {
		expectTypeOf(createRenderer).toBeCallableWith({
			scriptUrl: "url",
			scriptId: "id",
		});
	});

	it("requires both settings fields", () => {
		// @ts-expect-error scriptId is mandatory
		assertType<RendererSettings>({ scriptUrl: "url" });
		// @ts-expect-error scriptUrl is mandatory
		assertType<RendererSettings>({ scriptId: "id" });
	});

	it("rejects a loader that resolves to the wrong shape", () => {
		// @ts-expect-error the loader must resolve to a RendererFunction
		createRenderer({ scriptUrl: "url", scriptId: "id" }, async () => "nope");
	});
});

describe("LoadRenderFunction", () => {
	it("takes two strings and resolves to a RendererFunction", () => {
		expectTypeOf<LoadRenderFunction>().parameters.toEqualTypeOf<
			[string, string]
		>();
		expectTypeOf<LoadRenderFunction>().returns.toEqualTypeOf<
			Promise<RendererFunction>
		>();
	});

	it("is satisfied by the real loader", () => {
		// The default argument of createRenderer depends on this holding.
		expectTypeOf(loadRenderFunction).toMatchTypeOf<LoadRenderFunction>();
	});
});

describe("loadScript", () => {
	it("resolves to void rather than the tag it created", () => {
		expectTypeOf(loadScript).returns.toEqualTypeOf<Promise<void>>();
	});

	it("takes an optional partial set of script attributes", () => {
		expectTypeOf(loadScript).toBeCallableWith("url");
		expectTypeOf(loadScript).toBeCallableWith("url", { id: "id" });
	});

	it("rejects an attribute that is not on a script element", () => {
		// @ts-expect-error href belongs to link elements, not script
		loadScript("url", { href: "url" });
	});
});

describe("window.procaptcha", () => {
	it("is declared as possibly absent", () => {
		// The global only exists once the render script has run, so consumers
		// must be forced to narrow before reaching for render.
		expectTypeOf<typeof window.procaptcha>().toEqualTypeOf<
			{ render: RendererFunction } | undefined
		>();
	});
});
