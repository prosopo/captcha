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

import type { Component } from "../dom/component.js";
import { type CheckboxProps, mountCheckbox } from "./checkbox.js";
import { CHECKBOX_FRAME_FILE, mountFramedCheckbox } from "./framedCheckbox.js";

// Replaced at bundle time by vite's `define`; see packages/procaptcha-bundle/
// vite.config.ts. Undeclared in any other build, hence the `typeof` guard.
declare const __PROSOPO_FRAMED_CHECKBOX__: boolean | undefined;

const framedCheckboxEnabled = (): boolean =>
	typeof __PROSOPO_FRAMED_CHECKBOX__ !== "undefined" &&
	__PROSOPO_FRAMED_CHECKBOX__;

/** The frame page beside the chunk this code was loaded from, if it can be named. */
export const checkboxFrameUrl = (base: string): URL | undefined => {
	try {
		const url = new URL(CHECKBOX_FRAME_FILE, base);
		return "https:" === url.protocol ? url : undefined;
	} catch {
		return undefined;
	}
};

/**
 * The checkbox every widget mounts: drawn in a frame of ours where the build
 * enables it and the bundle was served over https, in the page otherwise.
 */
export const mountWidgetCheckbox = (
	container: HTMLElement,
	props: CheckboxProps,
): Component<CheckboxProps> => {
	const frameUrl = framedCheckboxEnabled()
		? checkboxFrameUrl(import.meta.url)
		: undefined;

	return frameUrl
		? mountFramedCheckbox(container, props, frameUrl)
		: mountCheckbox(container, props);
};
