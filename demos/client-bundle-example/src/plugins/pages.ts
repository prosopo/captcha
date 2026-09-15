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

import { CaptchaType } from "@prosopo/types";

export type DemoCaptchaType =
	| CaptchaType.frictionless
	| CaptchaType.pow
	| CaptchaType.puzzle
	| CaptchaType.image;

export type DemoMode = "standard" | "invisible";

export type DemoRendering = "implicit" | "explicit" | "manual" | "bound";

export interface DemoSetup {
	captchaType: DemoCaptchaType;
	mode: DemoMode;
	rendering: DemoRendering;
}

export interface DemoPage extends DemoSetup {
	path: string;
}

export interface DemoOption<T> {
	value: T;
	label: string;
}

export interface CaptchaTypeOption extends DemoOption<DemoCaptchaType> {
	description: string;
}

export const captchaTypeOptions: CaptchaTypeOption[] = [
	{
		value: CaptchaType.frictionless,
		label: "Frictionless",
		description: "Humans pass without a challenge. Bots get one.",
	},
	{
		value: CaptchaType.pow,
		label: "Proof of Work",
		description: "The browser does a quick computation.",
	},
	{
		value: CaptchaType.puzzle,
		label: "Puzzle",
		description: "Drag a piece into place.",
	},
	{
		value: CaptchaType.image,
		label: "Image",
		description: "Pick the images that match.",
	},
];

export const modeOptions: DemoOption<DemoMode>[] = [
	{ value: "standard", label: "Standard" },
	{ value: "invisible", label: "Invisible" },
];

export interface RenderingOption extends DemoOption<DemoRendering> {
	description: string;
}

export const renderingOptions: RenderingOption[] = [
	{
		value: "implicit",
		label: "Implicit",
		description:
			"Add a div with your site key and the script renders the widget.",
	},
	{
		value: "explicit",
		label: "Explicit",
		description: "Your own code calls render() when it is ready.",
	},
	{
		value: "manual",
		label: "Manual start",
		description:
			"The widget shows straight away, but checks only start when you say.",
	},
	{
		value: "bound",
		label: "Bound button",
		description: "Your own submit button opens the challenge.",
	},
];

const page = (
	path: string,
	captchaType: DemoCaptchaType,
	mode: DemoMode,
	rendering: DemoRendering,
): DemoPage => ({ path, captchaType, mode, rendering });

const indexPage = page(
	"index.html",
	CaptchaType.frictionless,
	"standard",
	"implicit",
);

export const defaultSetup: DemoSetup = indexPage;

export const demoPages: DemoPage[] = [
	indexPage,
	page(
		"frictionless-explicit.html",
		CaptchaType.frictionless,
		"standard",
		"explicit",
	),
	page(
		"frictionless-manual-start.html",
		CaptchaType.frictionless,
		"standard",
		"manual",
	),
	page(
		"invisible-frictionless-implicit.html",
		CaptchaType.frictionless,
		"invisible",
		"implicit",
	),
	page(
		"invisible-frictionless-explicit.html",
		CaptchaType.frictionless,
		"invisible",
		"explicit",
	),
	page("pow-implicit.html", CaptchaType.pow, "standard", "implicit"),
	page("pow-explicit.html", CaptchaType.pow, "standard", "explicit"),
	page("invisible-pow-implicit.html", CaptchaType.pow, "invisible", "implicit"),
	page("invisible-pow-explicit.html", CaptchaType.pow, "invisible", "explicit"),
	page("puzzle-implicit.html", CaptchaType.puzzle, "standard", "implicit"),
	page("puzzle-explicit.html", CaptchaType.puzzle, "standard", "explicit"),
	page("puzzle-bind-explicit.html", CaptchaType.puzzle, "standard", "bound"),
	page(
		"invisible-puzzle-implicit.html",
		CaptchaType.puzzle,
		"invisible",
		"implicit",
	),
	page(
		"invisible-puzzle-explicit.html",
		CaptchaType.puzzle,
		"invisible",
		"explicit",
	),
	page("image-implicit.html", CaptchaType.image, "standard", "implicit"),
	page("image-explicit.html", CaptchaType.image, "standard", "explicit"),
	page(
		"invisible-image-implicit.html",
		CaptchaType.image,
		"invisible",
		"implicit",
	),
	page(
		"invisible-image-explicit.html",
		CaptchaType.image,
		"invisible",
		"explicit",
	),
];

const isSetup = (candidate: DemoSetup, setup: DemoSetup): boolean =>
	candidate.captchaType === setup.captchaType &&
	candidate.mode === setup.mode &&
	candidate.rendering === setup.rendering;

export const findPageByPath = (path: string): DemoPage | undefined =>
	demoPages.find((demoPage) => demoPage.path === path);

// Not every combination has a page (there is no invisible manual start, for
// example), so fall back to implicit rendering, then to the standard mode.
export const resolvePage = (setup: DemoSetup): DemoPage =>
	demoPages.find((demoPage) => isSetup(demoPage, setup)) ??
	demoPages.find((demoPage) =>
		isSetup(demoPage, { ...setup, rendering: "implicit" }),
	) ??
	demoPages.find((demoPage) =>
		isSetup(demoPage, { ...setup, mode: "standard", rendering: "implicit" }),
	) ??
	indexPage;

export const renderingsFor = (
	captchaType: DemoCaptchaType,
	mode: DemoMode,
): RenderingOption[] =>
	renderingOptions.filter(({ value }) =>
		demoPages.some((demoPage) =>
			isSetup(demoPage, { captchaType, mode, rendering: value }),
		),
	);

export const labelOf = <T>(options: DemoOption<T>[], value: T): string =>
	options.find((option) => option.value === value)?.label ?? String(value);

export const pagePathFromFilename = (filename: string | undefined): string => {
	const normalized = (filename ?? "").replace(/\\/g, "/");
	return normalized.match(/^(?:.*\/)?(?:src|dist)\/(.+)$/)?.[1] ?? "";
};

export const relativePrefix = (pagePath: string): string =>
	"../".repeat((pagePath.match(/\//g) ?? []).length);
