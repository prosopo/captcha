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

/**
 * @vitest-environment jsdom
 */

import { PlacementEnum, type PlacementType } from "@prosopo/types";
import { darkTheme, lightTheme } from "@prosopo/widget-skeleton";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	type ChallengeSurfaceProps,
	type SurfaceScrim,
	mountChallengeSurface,
} from "../components/challengeSurface.js";
import { mountCheckbox } from "../components/checkbox.js";
import {
	type PageSnapshot,
	type PageTracker,
	diffPage,
	installPageTracker,
	snapshotPage,
} from "./pageState.js";

/**
 * jsdom has no ResizeObserver, so without a stand-in the floating surface's
 * observer branch never runs and a leaked observer could not be seen.
 */
const observers = new Set<FakeResizeObserver>();

class FakeResizeObserver {
	observe(): void {
		observers.add(this);
	}
	unobserve(): void {}
	disconnect(): void {
		observers.delete(this);
	}
}

const noop = (): void => undefined;

let tracker: PageTracker;
let host: HTMLElement;
let opener: HTMLButtonElement;
let before: PageSnapshot;

beforeEach(() => {
	document.head.replaceChildren();
	document.body.replaceChildren();
	vi.stubGlobal("ResizeObserver", FakeResizeObserver);
	host = document.createElement("div");
	host.id = "host";
	opener = document.createElement("button");
	opener.id = "opener";
	document.body.append(host, opener);
	opener.focus();
	tracker = installPageTracker();
	before = snapshotPage(tracker);
});

afterEach(() => {
	tracker.uninstall();
	observers.clear();
	vi.unstubAllGlobals();
});

const pageChanges = (): string[] => diffPage(before, snapshotPage(tracker));

interface SurfaceCase {
	placement: PlacementType;
	anchored: boolean;
	dismissable: boolean;
	dialog: boolean;
	scrim: SurfaceScrim;
}

const surfaceCases: SurfaceCase[] = Object.values(PlacementEnum).flatMap(
	(placement: PlacementType) =>
		[true, false].flatMap((anchored: boolean) =>
			[true, false].flatMap((dismissable: boolean) =>
				[true, false].flatMap((dialog: boolean) =>
					(["none", "dim"] as const).map(
						(scrim: SurfaceScrim): SurfaceCase => ({
							placement,
							anchored,
							dismissable,
							dialog,
							scrim,
						}),
					),
				),
			),
		),
);

const surfaceProps = (
	surfaceCase: SurfaceCase,
	show: boolean,
): ChallengeSurfaceProps => ({
	show,
	placement: surfaceCase.placement,
	anchor: surfaceCase.anchored ? host : null,
	onDismiss: surfaceCase.dismissable ? noop : undefined,
	dialogLabel: surfaceCase.dialog ? "Challenge" : undefined,
	scrim: surfaceCase.scrim,
});

const describeCase = (c: SurfaceCase): string =>
	`${c.placement}${c.anchored ? " anchored" : ""}${c.dismissable ? " dismissable" : ""}${c.dialog ? " dialog" : ""} scrim=${c.scrim}`;

describe("challenge surface leaves the page as it found it", () => {
	it.each(surfaceCases.map((c: SurfaceCase) => [describeCase(c), c]))(
		"%s, destroyed while open",
		(_name: string, surfaceCase: SurfaceCase) => {
			const surface = mountChallengeSurface(surfaceProps(surfaceCase, true));
			surface.content.appendChild(document.createElement("button"));
			surface.update(surfaceProps(surfaceCase, true));

			surface.destroy();

			expect(pageChanges()).toEqual([]);
			expect(observers.size).toBe(0);
			expect(document.activeElement).toBe(opener);
		},
	);

	it.each(surfaceCases.map((c: SurfaceCase) => [describeCase(c), c]))(
		"%s, opened, closed, reopened, then destroyed",
		(_name: string, surfaceCase: SurfaceCase) => {
			const surface = mountChallengeSurface(surfaceProps(surfaceCase, false));
			surface.update(surfaceProps(surfaceCase, true));
			surface.update(surfaceProps(surfaceCase, false));
			surface.update(surfaceProps(surfaceCase, true));

			surface.destroy();

			expect(pageChanges()).toEqual([]);
			expect(observers.size).toBe(0);
			expect(document.activeElement).toBe(opener);
		},
	);

	it("holds no document listeners or observers while closed", () => {
		const surfaceCase: SurfaceCase = {
			placement: PlacementEnum.float,
			anchored: true,
			dismissable: true,
			dialog: true,
			scrim: "dim",
		};
		const surface = mountChallengeSurface(surfaceProps(surfaceCase, true));
		surface.update(surfaceProps(surfaceCase, false));

		expect(tracker.listeners()).toEqual([]);
		expect(observers.size).toBe(0);

		surface.destroy();
	});

	it("survives being destroyed twice", () => {
		const surface = mountChallengeSurface(
			surfaceProps(surfaceCases[0] as SurfaceCase, true),
		);

		surface.destroy();
		surface.destroy();

		expect(pageChanges()).toEqual([]);
	});
});

describe("checkbox leaves the page as it found it", () => {
	const checkboxProps = {
		checked: false,
		onChange: (): Promise<void> => Promise.resolve(),
		labelText: "I am human",
		loading: false,
	};

	it("removes its markup and styles from the host container", () => {
		const checkbox = mountCheckbox(host, {
			...checkboxProps,
			theme: lightTheme,
		});
		checkbox.update({ ...checkboxProps, theme: darkTheme, loading: true });
		checkbox.update({ ...checkboxProps, theme: lightTheme, checked: true });

		checkbox.destroy();

		expect(pageChanges()).toEqual([]);
		expect(host.childNodes).toHaveLength(0);
	});

	it("leaves a sibling checkbox's styles in place until it goes too", () => {
		const first = mountCheckbox(host, { ...checkboxProps, theme: lightTheme });
		const second = mountCheckbox(host, { ...checkboxProps, theme: darkTheme });

		first.destroy();
		expect(host.querySelectorAll("style")).toHaveLength(1);

		second.destroy();
		expect(pageChanges()).toEqual([]);
		expect(host.childNodes).toHaveLength(0);
	});
});
