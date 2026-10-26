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

import type { startCollector as StartCollector } from "@prosopo/procaptcha";
import type { Component } from "@prosopo/procaptcha-common";
import type {
	Account,
	ProsopoKeyboardEvent,
	ProsopoMouseEvent,
	ProsopoTouchEvent,
	StoredEvents,
} from "@prosopo/types";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
	type CollectorProps,
	mountCollector,
} from "../components/collector.js";
import { account } from "./harness.js";
import { type Mounted, mount } from "./render.js";

// The collector itself belongs to @prosopo/procaptcha; what this component
// owns is when it is wired up, and when the events it has gathered are handed
// back to the manager.
const started = vi.fn<typeof StartCollector>();

vi.mock("@prosopo/procaptcha", () => ({
	startCollector: (
		...args: Parameters<typeof StartCollector>
	): ReturnType<typeof StartCollector> => started(...args),
}));

// Reporting is keyed on the account object, so tests that re-render share one
// instance and only the tests about account changes pass a different one.
const defaultAccount: Account = account();

let mounted: Mounted;
let collector: Component<CollectorProps> | undefined;
const onProcessData = vi.fn<(data: StoredEvents) => void>();

const props = (
	overrides: {
		account?: Account | undefined;
		sendData?: boolean;
	} = {},
): CollectorProps => ({
	onProcessData,
	sendData: overrides.sendData ?? true,
	account: "account" in overrides ? overrides.account : defaultAccount,
});

const render = (overrides: Parameters<typeof props>[0] = {}): void => {
	if (collector) {
		collector.update(props(overrides));
	} else {
		collector = mountCollector(mounted.container, props(overrides));
	}
};

beforeEach(() => {
	vi.clearAllMocks();
	mounted = mount();
	collector = undefined;
});

afterEach(() => {
	collector?.destroy();
	mounted.unmount();
});

describe("wiring the collector up", () => {
	test("starts collecting against its own element", () => {
		render();
		expect(started).toHaveBeenCalledTimes(1);
		const rootElement = started.mock.calls[0]?.[3];
		expect(rootElement).toBe(mounted.container.firstElementChild);
	});

	test("hands the collector setters that feed this component's state", () => {
		// The collector pushes events back through these, so they have to be
		// functions rather than the arrays themselves.
		render();
		const [setMouse, setTouch, setKeyboard] = started.mock.calls[0] ?? [];
		expect(typeof setMouse).toBe("function");
		expect(typeof setTouch).toBe("function");
		expect(typeof setKeyboard).toBe("function");
	});

	test("starts collecting once, however many times it re-renders", () => {
		// Starting again would attach a second set of listeners to the form and
		// double-count every mouse move.
		render();
		render();
		render();
		expect(started).toHaveBeenCalledTimes(1);
	});

	test("renders a single empty div to anchor itself in the page", () => {
		render();
		const element = mounted.container.firstElementChild;
		expect(element?.tagName).toBe("DIV");
		expect(element?.childNodes).toHaveLength(0);
	});
});

describe("handing the events back", () => {
	test("reports as soon as there is an account to report against", () => {
		render();
		expect(onProcessData).toHaveBeenCalledTimes(1);
	});

	test("reports empty event lists before the user has done anything", () => {
		render();
		expect(onProcessData).toHaveBeenCalledWith({
			mouseEvents: [],
			touchEvents: [],
			keyboardEvents: [],
		});
	});

	test("stays quiet until an account exists", () => {
		// Without an account there is nobody to attribute the events to, so
		// sending them would be pointless traffic.
		render({ account: undefined });
		expect(onProcessData).not.toHaveBeenCalled();
	});

	test("reports once the account arrives", () => {
		render({ account: undefined });
		render({ account: defaultAccount });
		expect(onProcessData).toHaveBeenCalledTimes(1);
	});

	test("reports the events the collector has gathered so far", () => {
		render();
		const [setMouse, setTouch, setKeyboard] = started.mock.calls[0] ?? [];
		if (!setMouse || !setTouch || !setKeyboard) {
			throw new Error("expected the collector to be handed its setters");
		}
		const mouseEvents: ProsopoMouseEvent[] = [{ x: 1, y: 2, timestamp: 3 }];
		const touchEvents: ProsopoTouchEvent[] = [{ x: 4, y: 5, timestamp: 6 }];
		const keyboardEvents: ProsopoKeyboardEvent[] = [
			{ key: "a", timestamp: 7, isShiftKey: false, isCtrlKey: false },
		];
		setMouse(mouseEvents);
		setTouch(touchEvents);
		setKeyboard(keyboardEvents);
		// Collecting alone does not report — reporting is keyed on the account,
		// deliberately, so a re-render mid-collection is not a send.
		expect(onProcessData).toHaveBeenCalledTimes(1);
		render();
		expect(onProcessData).toHaveBeenCalledTimes(1);
		// ...but the next report carries what the collector gathered.
		render({ account: { account: { address: "later" } } });
		expect(onProcessData).toHaveBeenLastCalledWith({
			mouseEvents,
			touchEvents,
			keyboardEvents,
		});
	});

	test("accepts an updater function, as the collector's own storeLog uses", () => {
		render();
		const setMouse = started.mock.calls[0]?.[0];
		if (!setMouse) throw new Error("expected a mouse setter");
		setMouse([{ x: 1, y: 1, timestamp: 1 }]);
		setMouse((previous: ProsopoMouseEvent[]) => [
			...previous,
			{ x: 2, y: 2, timestamp: 2 },
		]);
		render({ account: { account: { address: "later" } } });
		expect(onProcessData).toHaveBeenLastCalledWith(
			expect.objectContaining({
				mouseEvents: [
					{ x: 1, y: 1, timestamp: 1 },
					{ x: 2, y: 2, timestamp: 2 },
				],
			}),
		);
	});

	test("reports again when the account changes", () => {
		render();
		render({ account: { account: { address: "different-address" } } });
		expect(onProcessData).toHaveBeenCalledTimes(2);
	});

	test("reports regardless of sendData, which it does not read", () => {
		// The prop is part of the contract but unused; pinning it here so a
		// future change to honour it is a deliberate one.
		render({ sendData: false });
		expect(onProcessData).toHaveBeenCalledTimes(1);
	});

	test("removes its anchor element on destroy", () => {
		render();
		collector?.destroy();
		collector = undefined;
		expect(mounted.container.firstElementChild).toBeNull();
	});
});
