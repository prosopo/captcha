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

import type {
	ProsopoKeyboardEvent,
	ProsopoMouseEvent,
	ProsopoTouchEvent,
} from "@prosopo/types";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { startCollector } from "./collector.js";

describe("collector", () => {
	let container: HTMLDivElement;
	let form: HTMLFormElement;
	let setMouseEvents: ReturnType<typeof vi.fn>;
	let setTouchEvents: ReturnType<typeof vi.fn>;
	let setKeyboardEvents: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		container = document.createElement("div");
		form = document.createElement("form");
		container.appendChild(form);
		document.body.appendChild(container);

		setMouseEvents = vi.fn((fn) => {
			if (typeof fn === "function") {
				fn([]);
			}
		});
		setTouchEvents = vi.fn((fn) => {
			if (typeof fn === "function") {
				fn([]);
			}
		});
		setKeyboardEvents = vi.fn((fn) => {
			if (typeof fn === "function") {
				fn([]);
			}
		});
	});

	afterEach(() => {
		document.body.removeChild(container);
	});

	describe("startCollector", () => {
		it("should attach event listeners to form element", () => {
			const addEventListenerSpy = vi.spyOn(form, "addEventListener");

			startCollector(
				setMouseEvents,
				setTouchEvents,
				setKeyboardEvents,
				container,
			);

			expect(addEventListenerSpy).toHaveBeenCalled();
			expect(addEventListenerSpy).toHaveBeenCalledWith(
				"mousemove",
				expect.any(Function),
			);
		});

		it("should find form when container is inside form", () => {
			const innerDiv = document.createElement("div");
			form.appendChild(innerDiv);
			const addEventListenerSpy = vi.spyOn(form, "addEventListener");

			startCollector(
				setMouseEvents,
				setTouchEvents,
				setKeyboardEvents,
				innerDiv,
			);

			expect(addEventListenerSpy).toHaveBeenCalled();
		});

		it("should handle case when no form is found", () => {
			const standaloneDiv = document.createElement("div");
			document.body.appendChild(standaloneDiv);

			expect(() => {
				startCollector(
					setMouseEvents,
					setTouchEvents,
					setKeyboardEvents,
					standaloneDiv,
				);
			}).not.toThrow();

			document.body.removeChild(standaloneDiv);
		});

		it("should log mouse events with correct properties", () => {
			let mouseHandler: ((e: MouseEvent) => void) | undefined;
			const addEventListenerSpy = vi.spyOn(form, "addEventListener");
			addEventListenerSpy.mockImplementation((event, handler) => {
				if (event === "mousemove") {
					mouseHandler = handler as (e: MouseEvent) => void;
				}
			});

			const storedEvents: ProsopoMouseEvent[] = [];
			const setMouse = vi.fn((fn) => {
				if (typeof fn === "function") {
					const result = fn(storedEvents);
					storedEvents.length = 0;
					if (Array.isArray(result)) {
						storedEvents.push(...result);
					}
				}
			});

			startCollector(setMouse, setTouchEvents, setKeyboardEvents, container);

			const mockEvent = new MouseEvent("mousemove", {
				clientX: 100,
				clientY: 200,
			});
			Object.defineProperty(mockEvent, "x", { value: 100, writable: false });
			Object.defineProperty(mockEvent, "y", { value: 200, writable: false });

			if (mouseHandler) {
				mouseHandler(mockEvent);
			}

			expect(setMouse).toHaveBeenCalled();
			expect(storedEvents).toHaveLength(1);
			if (storedEvents[0]) {
				expect(storedEvents[0].x).toBe(100);
				expect(storedEvents[0].y).toBe(200);
				expect(typeof storedEvents[0].timestamp).toBe("number");
			}
		});

		it("should log keyboard events with correct properties", () => {
			let keydownHandler: ((e: KeyboardEvent) => void) | undefined;
			const addEventListenerSpy = vi.spyOn(form, "addEventListener");
			addEventListenerSpy.mockImplementation((event, handler) => {
				if (event === "keydown") {
					keydownHandler = handler as (e: KeyboardEvent) => void;
				}
			});

			const storedEvents: ProsopoKeyboardEvent[] = [];
			const setKeyboard = vi.fn((fn) => {
				if (typeof fn === "function") {
					const result = fn(storedEvents);
					storedEvents.length = 0;
					if (Array.isArray(result)) {
						storedEvents.push(...result);
					}
				}
			});

			startCollector(setMouseEvents, setTouchEvents, setKeyboard, container);

			const mockEvent = new KeyboardEvent("keydown", {
				key: "a",
				shiftKey: true,
				ctrlKey: false,
			});

			if (keydownHandler) {
				keydownHandler(mockEvent);
			}

			expect(setKeyboard).toHaveBeenCalled();
			expect(storedEvents).toHaveLength(1);
			if (storedEvents[0]) {
				expect(storedEvents[0].key).toBe("a");
				expect(storedEvents[0].isShiftKey).toBe(true);
				expect(storedEvents[0].isCtrlKey).toBe(false);
				expect(typeof storedEvents[0].timestamp).toBe("number");
			}
		});

		it("should log touch events with correct properties", () => {
			let touchstartHandler: ((e: TouchEvent) => void) | undefined;
			const addEventListenerSpy = vi.spyOn(form, "addEventListener");
			addEventListenerSpy.mockImplementation((event, handler) => {
				if (event === "touchstart") {
					touchstartHandler = handler as (e: TouchEvent) => void;
				}
			});

			const storedEvents: ProsopoTouchEvent[] = [];
			const setTouch = vi.fn((fn) => {
				if (typeof fn === "function") {
					const result = fn(storedEvents);
					storedEvents.length = 0;
					if (Array.isArray(result)) {
						storedEvents.push(...result);
					}
				}
			});

			startCollector(setMouseEvents, setTouch, setKeyboardEvents, container);

			const touch1 = {
				clientX: 50,
				clientY: 75,
			} as Touch;
			const touch2 = {
				clientX: 150,
				clientY: 175,
			} as Touch;

			const mockEvent = {
				touches: [touch1, touch2],
				timeStamp: 123456,
			} as unknown as TouchEvent;

			if (touchstartHandler) {
				touchstartHandler(mockEvent);
			}

			expect(setTouch).toHaveBeenCalled();
			expect(storedEvents).toHaveLength(2);
			expect(storedEvents[0]).toEqual({
				x: 50,
				y: 75,
				timestamp: 123456,
			});
			expect(storedEvents[1]).toEqual({
				x: 150,
				y: 175,
				timestamp: 123456,
			});
		});

		it("should limit stored events to COLLECTOR_LIMIT", () => {
			const storedEvents: ProsopoMouseEvent[] = [];
			const setMouse = vi.fn((fn) => {
				if (typeof fn === "function") {
					const result = fn(storedEvents);
					storedEvents.length = 0;
					if (Array.isArray(result)) {
						storedEvents.push(...result);
					}
				}
			});

			let mouseHandler: ((e: MouseEvent) => void) | undefined;
			const addEventListenerSpy = vi.spyOn(form, "addEventListener");
			addEventListenerSpy.mockImplementation((event, handler) => {
				if (event === "mousemove") {
					mouseHandler = handler as (e: MouseEvent) => void;
				}
			});

			startCollector(setMouse, setTouchEvents, setKeyboardEvents, container);

			for (let i = 0; i < 10001; i++) {
				const mockEvent = new MouseEvent("mousemove");
				Object.defineProperty(mockEvent, "x", {
					value: i,
					writable: false,
				});
				Object.defineProperty(mockEvent, "y", {
					value: i,
					writable: false,
				});
				if (mouseHandler) {
					mouseHandler(mockEvent);
				}
			}

			expect(storedEvents.length).toBeLessThanOrEqual(10000);
		});

		it("should handle nested form elements", () => {
			const outerForm = document.createElement("form");
			const innerDiv = document.createElement("div");
			const innerForm = document.createElement("form");
			innerDiv.appendChild(innerForm);
			outerForm.appendChild(innerDiv);
			document.body.appendChild(outerForm);

			const addEventListenerSpy = vi.spyOn(innerForm, "addEventListener");

			startCollector(
				setMouseEvents,
				setTouchEvents,
				setKeyboardEvents,
				innerDiv,
			);

			expect(addEventListenerSpy).toHaveBeenCalled();

			document.body.removeChild(outerForm);
		});
	});
});
